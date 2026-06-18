import { UNDERVALUED_THEME_LABELS } from "@/types/undervalued";
import type { UndervaluedTheme } from "@/types/undervalued";

export interface UndervaluedThemeScreenConfig {
  theme: UndervaluedTheme;
  themeLabel: string;
  industryCodes: number[];
  defaultSectorAvgPer: number;
}

/** 네이버 증권 업종 코드 — 테마별 스크리닝 유니버스 */
export const UNDERVALUED_THEME_SCREENS: UndervaluedThemeScreenConfig[] = [
  {
    theme: "semiconductor",
    themeLabel: UNDERVALUED_THEME_LABELS.semiconductor,
    industryCodes: [278],
    defaultSectorAvgPer: 18.4,
  },
  {
    theme: "bio",
    themeLabel: UNDERVALUED_THEME_LABELS.bio,
    industryCodes: [261, 286, 262],
    defaultSectorAvgPer: 38.6,
  },
  {
    theme: "battery",
    themeLabel: UNDERVALUED_THEME_LABELS.battery,
    industryCodes: [272, 306, 283],
    defaultSectorAvgPer: 42.0,
  },
  {
    theme: "auto",
    themeLabel: UNDERVALUED_THEME_LABELS.auto,
    industryCodes: [273, 270],
    defaultSectorAvgPer: 9.8,
  },
  {
    theme: "finance",
    themeLabel: UNDERVALUED_THEME_LABELS.finance,
    industryCodes: [301, 315, 321, 319, 330],
    defaultSectorAvgPer: 8.9,
  },
  {
    theme: "platform",
    themeLabel: UNDERVALUED_THEME_LABELS.platform,
    industryCodes: [267, 287, 308, 263],
    defaultSectorAvgPer: 28.2,
  },
];

export const UNDERVALUED_THEME_SCREEN_MAP = Object.fromEntries(
  UNDERVALUED_THEME_SCREENS.map((config) => [config.theme, config]),
) as Record<UndervaluedTheme, UndervaluedThemeScreenConfig>;
