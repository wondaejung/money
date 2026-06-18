const JSON_OUTPUT_RULES = [
  "인사·서론·결론·설명·마크다운·코드펜스·주석 금지.",
  '"안녕하세요", "분석해 드리겠습니다" 등 부가 문구 금지.',
  "오직 아래 스키마를 따르는 단일 JSON 객체만 출력.",
  "키 이름·배열 길이·enum 값을 스키마와 정확히 일치.",
].join("\n");

export function buildJsonSystemPrompt(parts: {
  role: string;
  schema: string;
  rules?: string[];
}): string {
  const extraRules = parts.rules?.length
    ? `\n추가 규칙:\n${parts.rules.map((rule) => `- ${rule}`).join("\n")}`
    : "";

  return `${parts.role}

${JSON_OUTPUT_RULES}

스키마:
${parts.schema}${extraRules}`;
}
