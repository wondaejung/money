import { inflateRawSync } from "node:zlib";

import { getLlmCache, setLlmCache } from "@/lib/llm-cache";
import { getLlmStoreJson, setLlmStoreJson } from "@/lib/llm-store";
import type { Disclosure } from "@/types/disclosure";

const DART_BASE = "https://opendart.fss.or.kr/api";
const CORP_MAP_CACHE_KEY = "dart:corp-map:v1";
const CORP_MAP_TTL_SECONDS = 7 * 24 * 60 * 60;
const DISCLOSURE_CACHE_TTL_MS = 30 * 60 * 1000;
const LOOKBACK_DAYS = 30;
const MAX_DISCLOSURES = 30;

const IMPORTANT_KEYWORDS = [
  "공급계약",
  "수주",
  "유상증자",
  "무상증자",
  "합병",
  "분할",
  "소송",
  "감자",
  "전환사채",
  "자기주식",
  "최대주주",
];

type CorpMap = Record<string, { corpCode: string; corpName: string }>;

export function isDartConfigured(): boolean {
  return Boolean(process.env.DART_API_KEY);
}

function kstToday(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function formatDartDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * DART corpCode.xml은 단일 XML 파일이 든 ZIP으로 내려온다.
 * 중앙 디렉터리에서 첫 엔트리의 오프셋·압축 방식을 읽어 zlib로 직접 푼다.
 */
function extractZipEntry(zip: Buffer): Buffer {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  const searchStart = Math.max(0, zip.length - 65536);
  for (let i = zip.length - 22; i >= searchStart; i--) {
    if (zip.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP EOCD를 찾지 못했습니다.");

  const centralOffset = zip.readUInt32LE(eocdOffset + 16);
  if (zip.readUInt32LE(centralOffset) !== 0x02014b50) {
    throw new Error("ZIP 중앙 디렉터리가 올바르지 않습니다.");
  }

  const method = zip.readUInt16LE(centralOffset + 10);
  const compressedSize = zip.readUInt32LE(centralOffset + 20);
  const localOffset = zip.readUInt32LE(centralOffset + 42);

  if (zip.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error("ZIP 로컬 헤더가 올바르지 않습니다.");
  }

  const fileNameLength = zip.readUInt16LE(localOffset + 26);
  const extraLength = zip.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const data = zip.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return Buffer.from(data);
  if (method === 8) return inflateRawSync(data);
  throw new Error(`지원하지 않는 ZIP 압축 방식: ${method}`);
}

function parseCorpMap(xml: string): CorpMap {
  const map: CorpMap = {};
  const listPattern =
    /<corp_code>(\d{8})<\/corp_code>\s*<corp_name>([^<]+)<\/corp_name>[\s\S]*?<stock_code>([^<]*)<\/stock_code>/g;

  let match: RegExpExecArray | null;
  while ((match = listPattern.exec(xml)) !== null) {
    const stockCode = match[3].trim();
    if (!/^\d{6}$/.test(stockCode)) continue;
    map[stockCode] = { corpCode: match[1], corpName: match[2].trim() };
  }

  return map;
}

async function loadCorpMap(apiKey: string): Promise<CorpMap> {
  const memory = getLlmCache<CorpMap>(CORP_MAP_CACHE_KEY);
  if (memory) return memory;

  const remote = await getLlmStoreJson<CorpMap>(CORP_MAP_CACHE_KEY);
  if (remote && Object.keys(remote).length > 0) {
    setLlmCache(CORP_MAP_CACHE_KEY, remote, CORP_MAP_TTL_SECONDS * 1000);
    return remote;
  }

  const response = await fetch(
    `${DART_BASE}/corpCode.xml?crtfc_key=${apiKey}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`DART corpCode 다운로드 실패 (HTTP ${response.status})`);
  }

  const zip = Buffer.from(await response.arrayBuffer());
  if (zip.length < 100 || zip.readUInt16LE(0) !== 0x4b50) {
    // ZIP이 아니면 API 키 오류 등 XML 에러 응답
    const text = zip.toString("utf8", 0, Math.min(zip.length, 500));
    throw new Error(`DART corpCode 응답 오류: ${text.slice(0, 200)}`);
  }

  const xml = extractZipEntry(zip).toString("utf8");
  const map = parseCorpMap(xml);
  if (Object.keys(map).length === 0) {
    throw new Error("DART corp code 매핑이 비어 있습니다.");
  }

  setLlmCache(CORP_MAP_CACHE_KEY, map, CORP_MAP_TTL_SECONDS * 1000);
  await setLlmStoreJson(CORP_MAP_CACHE_KEY, map, CORP_MAP_TTL_SECONDS);
  return map;
}

interface DartListItem {
  corp_name?: string;
  stock_code?: string;
  report_nm?: string;
  rcept_no?: string;
  rcept_dt?: string;
  flr_nm?: string;
}

function isImportantReport(reportName: string): boolean {
  return IMPORTANT_KEYWORDS.some((keyword) => reportName.includes(keyword));
}

async function fetchDisclosuresForCorp(
  apiKey: string,
  symbol: string,
  corpCode: string,
  corpName: string,
): Promise<Disclosure[]> {
  const cacheKey = `dart:list:${corpCode}`;
  const cached = getLlmCache<Disclosure[]>(cacheKey);
  if (cached) return cached;

  const end = kstToday();
  const begin = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: corpCode,
    bgn_de: formatDartDate(begin),
    end_de: formatDartDate(end),
    page_no: "1",
    page_count: "20",
  });

  const response = await fetch(`${DART_BASE}/list.json?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    status?: string;
    list?: DartListItem[];
  };

  // status 013 = 조회 데이터 없음
  if (data.status !== "000" || !Array.isArray(data.list)) {
    const empty: Disclosure[] = [];
    if (data.status === "013") {
      setLlmCache(cacheKey, empty, DISCLOSURE_CACHE_TTL_MS);
    }
    return empty;
  }

  const disclosures = data.list
    .filter(
      (item): item is DartListItem & { report_nm: string; rcept_no: string } =>
        typeof item.report_nm === "string" &&
        typeof item.rcept_no === "string",
    )
    .map((item) => ({
      symbol,
      corpName: item.corp_name?.trim() || corpName,
      reportName: item.report_nm.trim(),
      rceptNo: item.rcept_no,
      receiptDate: item.rcept_dt ?? "",
      submitter: item.flr_nm?.trim() ?? "",
      important: isImportantReport(item.report_nm),
    }));

  setLlmCache(cacheKey, disclosures, DISCLOSURE_CACHE_TTL_MS);
  return disclosures;
}

export async function fetchDisclosures(
  symbols: string[],
): Promise<Disclosure[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return [];

  const krSymbols = [...new Set(symbols.filter((s) => /^\d{6}$/.test(s)))];
  if (krSymbols.length === 0) return [];

  const corpMap = await loadCorpMap(apiKey);

  const results = await Promise.all(
    krSymbols.map((symbol) => {
      const corp = corpMap[symbol];
      if (!corp) return Promise.resolve<Disclosure[]>([]);
      return fetchDisclosuresForCorp(
        apiKey,
        symbol,
        corp.corpCode,
        corp.corpName,
      ).catch(() => []);
    }),
  );

  return results
    .flat()
    .sort((a, b) => {
      if (a.receiptDate !== b.receiptDate) {
        return b.receiptDate.localeCompare(a.receiptDate);
      }
      return b.rceptNo.localeCompare(a.rceptNo);
    })
    .slice(0, MAX_DISCLOSURES);
}
