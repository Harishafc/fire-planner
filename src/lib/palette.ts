// Dark-mode categorical palette (fixed order — see dataviz skill reference/palette.md)
export const CATEGORICAL = {
  blue: '#3987e5',
  green: '#008300',
  magenta: '#d55181',
  yellow: '#c98500',
  aqua: '#199e70',
  orange: '#d95926',
  violet: '#9085e9',
  red: '#e66767',
} as const;

export const CHART = {
  surface: '#18181b',
  gridline: '#2c2c2a',
  axis: '#3f3f46',
  mutedInk: '#898781',
  secondaryInk: '#c3c2b7',
  primaryInk: '#ffffff',
};

export const HOLDINGS_COLORS: Record<string, string> = {
  cash: CATEGORICAL.blue,
  debt: CATEGORICAL.green,
  equityIndianMF: CATEGORICAL.magenta,
  equityOverseas: CATEGORICAL.yellow,
  equityStocks: CATEGORICAL.aqua,
  gold: CATEGORICAL.orange,
  nps: CATEGORICAL.violet,
  daaf: CATEGORICAL.red,
};

export const SCENARIO_COLORS: Record<string, string> = {
  Expected: CATEGORICAL.blue,
  Optimistic: CATEGORICAL.green,
  Conservative: CATEGORICAL.yellow,
};

export const CURVE_COLORS = {
  withLand: CATEGORICAL.blue,
  withoutLand: CATEGORICAL.aqua,
  interest: CATEGORICAL.orange,
};
