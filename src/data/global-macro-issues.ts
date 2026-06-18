import type { MacroSensitivity } from "@/types/insights";

export interface GlobalMacroIssue {
  id: string;
  title: string;
  hashtag: string;
  riskLevel: MacroSensitivity;
  usSignal: string;
  krImpact: string;
  watchSectors: string[];
}

export const globalMacroIssues: GlobalMacroIssue[] = [
  {
    id: "rates",
    title: "미국 금리·Fed 정책",
    hashtag: "#미국금리",
    riskLevel: "high",
    usSignal: "연준 금리 경로·달러 강세 지속 여부",
    krImpact: "성장주·자동차·플랫폼 밸류에이션 압력, 금융주 상대 강세",
    watchSectors: ["반도체", "자동차", "인터넷", "은행"],
  },
  {
    id: "oil",
    title: "국제 유가·에너지",
    hashtag: "#국제유가",
    riskLevel: "high",
    usSignal: "중동 지정학·OPEC+ 감산 기대",
    krImpact: "조선·정유·화학 수혜, 항공·운송·내수 소비 부담",
    watchSectors: ["조선", "정유", "화학", "항공"],
  },
  {
    id: "fx",
    title: "원·달러 환율",
    hashtag: "#원달러환율",
    riskLevel: "high",
    usSignal: "달러 인덱스·미 국채 금리 연동",
    krImpact: "수출주 실적 환산 이익 vs 외국인 수급 변동성",
    watchSectors: ["반도체", "자동차", "조선", "바이오"],
  },
  {
    id: "semis",
    title: "반도체·AI 사이클",
    hashtag: "#필라델피아반도체지수",
    riskLevel: "high",
    usSignal: "SOX·엔비디아·메모리 가격 동향",
    krImpact: "국내 메모리·파운드리·장비주 고베타 반응",
    watchSectors: ["반도체", "반도체장비", "HBM"],
  },
  {
    id: "geopolitics",
    title: "지정학·무역 리스크",
    hashtag: "#미중기술갈등",
    riskLevel: "medium",
    usSignal: "대선·관세·수출 통제 이슈",
    krImpact: "공급망 재편 수혜주와 피해주 분화",
    watchSectors: ["방산", "전자", "소재"],
  },
  {
    id: "china",
    title: "중국 경기·부동산",
    hashtag: "#중국경기",
    riskLevel: "medium",
    usSignal: "부양책·PMI·소비 회복 속도",
    krImpact: "화학·철강·화장품·여행 관련주 민감",
    watchSectors: ["화학", "철강", "화장품", "카지노"],
  },
];
