import type { PlannerState } from './types';

const currentYear = new Date().getFullYear();

export const defaultState: PlannerState = {
  currentAge: 30,
  monthlySipTotal: 55000,
  monthlyRd: 10000,
  holdings: {
    cash: 500000,
    debt: 800000,
    equityIndianMF: 1200000,
    equityOverseas: 300000,
    equityStocks: 400000,
    gold: 250000,
    nps: 350000,
  },
  monthlyExpense: 60000,
  inflationRate: 6,
  growthRates: {
    cash: 4,
    debt: 7,
    equity: 11,
    gold: 8,
    nps: 9,
    daaf: 10,
    land: 8,
  },
  daaf: {
    balance: 600000,
    equityEquivalentPct: 65,
    lumpSums: [
      { id: 'ls-1', year: currentYear + 1, month: 3, amount: 200000, label: 'Annual bonus' },
    ],
  },
  risk: {
    horizonYears: 10,
    liquidBufferMonths: 6,
  },
  land: {
    purchaseYear: currentYear + 2,
    landPriceEstimate: 5000000,
    loanInterestRate: 9,
    loanTenureYears: 15,
  },
  comparisonYears: [currentYear + 1, currentYear + 3, currentYear + 5],
  projectionEndYear: currentYear + 20,
  scenarioDeltas: [
    { label: 'Conservative', deltaPct: -2 },
    { label: 'Expected', deltaPct: 0 },
    { label: 'Optimistic', deltaPct: 2 },
  ],
};
