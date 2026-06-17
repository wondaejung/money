import type {
  LiveHolding,
  SellActionType,
  SellRecommendation,
  SellUrgency,
} from "@/types/portfolio";

const URGENCY_RANK: Record<SellUrgency, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const ACTION_HEADLINE: Record<SellActionType, string> = {
  take_profit: "익절 검토",
  stop_loss: "손절 검토",
  decline_review: "하락 검토",
};

export interface SellCandidate {
  holding: LiveHolding;
  action: SellActionType;
  urgency: SellUrgency;
  headline: string;
  ruleReason: string;
}

function pickAction(holding: LiveHolding): {
  action: SellActionType;
  urgency: SellUrgency;
  ruleReason: string;
} | null {
  const { gainPercent, gainPercentAfterTax, changePercent } = holding;

  if (gainPercent <= -20) {
    return {
      action: "stop_loss",
      urgency: "high",
      ruleReason: `매수가 대비 ${gainPercent.toFixed(1)}% — 손실 확대`,
    };
  }

  if (gainPercent <= -10) {
    return {
      action: "decline_review",
      urgency: "medium",
      ruleReason: `매수가 대비 ${gainPercent.toFixed(1)}% — 하락 지속`,
    };
  }

  if (changePercent <= -4 && gainPercent < 0) {
    return {
      action: "decline_review",
      urgency: changePercent <= -6 ? "high" : "medium",
      ruleReason: `당일 ${changePercent.toFixed(1)}% 추가 하락`,
    };
  }

  if (gainPercent >= 25) {
    return {
      action: "take_profit",
      urgency: "high",
      ruleReason: `매수가 대비 +${gainPercent.toFixed(1)}% — 익절 구간`,
    };
  }

  if (gainPercent >= 15) {
    return {
      action: "take_profit",
      urgency: "medium",
      ruleReason: `매수가 대비 +${gainPercent.toFixed(1)}% — 수익 실현 검토`,
    };
  }

  if (changePercent >= 5 && gainPercent > 0) {
    return {
      action: "take_profit",
      urgency: "medium",
      ruleReason: `당일 +${changePercent.toFixed(1)}% 급등 — 차익실현 타이밍`,
    };
  }

  if (gainPercentAfterTax >= 10 && changePercent >= 2) {
    return {
      action: "take_profit",
      urgency: "low",
      ruleReason: `세후 +${gainPercentAfterTax.toFixed(1)}% — 차익실현 검토`,
    };
  }

  return null;
}

export function getSellCandidates(holdings: LiveHolding[]): SellCandidate[] {
  const candidates: SellCandidate[] = [];

  for (const holding of holdings) {
    const picked = pickAction(holding);
    if (!picked) continue;

    candidates.push({
      holding,
      action: picked.action,
      urgency: picked.urgency,
      headline: ACTION_HEADLINE[picked.action],
      ruleReason: picked.ruleReason,
    });
  }

  return candidates.sort(
    (a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency],
  );
}

export function candidatesToRecommendations(
  candidates: SellCandidate[],
): SellRecommendation[] {
  return candidates.map((candidate) => ({
    holdingId: candidate.holding.id,
    symbol: candidate.holding.symbol,
    name: candidate.holding.name,
    market: candidate.holding.market,
    urgency: candidate.urgency,
    action: candidate.action,
    headline: candidate.headline,
    reason: candidate.ruleReason,
    adviceSource: "rule",
    gainPercent: candidate.holding.gainPercent,
    changePercent: candidate.holding.changePercent,
    currentPrice: candidate.holding.currentPrice,
    purchasePrice: candidate.holding.purchasePrice,
  }));
}

export function getSellRecommendations(
  holdings: LiveHolding[],
): SellRecommendation[] {
  return candidatesToRecommendations(getSellCandidates(holdings));
}
