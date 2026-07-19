export interface Holdings {
  cash: number;
  debt: number;
  equityIndianMF: number;
  equityOverseas: number;
  equityStocks: number;
  gold: number;
  nps: number;
  epf: number;
  travelFund: number;
}

export interface GrowthRates {
  cash: number;
  debt: number;
  equity: number;
  gold: number;
  nps: number;
  daaf: number;
  land: number;
  epf: number;
  travel: number;
}

export interface SalaryInputs {
  combinedInHandSalary: number;
  yourBasicSalary: number;
  yourEpfEmployeePct: number;
  yourEpfEmployerPct: number;
  spouseBasicSalary: number;
  spouseIncomeStartYear: number;
  spouseEpfEmployeePct: number;
  spouseEpfEmployerPct: number;
  salaryGrowthPct: number;
}

export interface LumpSum {
  id: string;
  year: number;
  month: number; // 0-11
  amount: number;
  label: string;
}

export interface DaafFund {
  balance: number;
  equityEquivalentPct: number;
  lumpSums: LumpSum[];
}

export interface RiskInputs {
  horizonYears: number;
  liquidBufferMonths: number;
}

export interface AllocationTarget {
  safePct: number;
  riskyPct: number;
}

export interface LandInputs {
  purchaseYear: number;
  landPriceEstimate: number;
  loanInterestRate: number;
  loanTenureYears: number;
}

export type ScenarioLabel = 'Conservative' | 'Expected' | 'Optimistic';

export interface ScenarioDelta {
  label: ScenarioLabel;
  deltaPct: number;
}

export interface PlannerState {
  currentAge: number;
  monthlySipTotal: number;
  monthlyRd: number;
  monthlyNpsContribution: number;
  monthlyTravelContribution: number;
  holdings: Holdings;
  monthlyExpense: number;
  inflationRate: number;
  growthRates: GrowthRates;
  daaf: DaafFund;
  salary: SalaryInputs;
  risk: RiskInputs;
  land: LandInputs;
  comparisonYears: number[];
  projectionEndYear: number;
  scenarioDeltas: ScenarioDelta[];
}

export interface YearSnapshot {
  [key: string]: number;
  year: number;
  cash: number;
  debt: number;
  equity: number;
  gold: number;
  nps: number;
  epf: number;
  travelFund: number;
  daaf: number;
  land: number;
  loanOutstanding: number;
  cumulativeInterest: number;
  netWorthWithLand: number;
  netWorthWithoutLand: number;
  emi: number;
  monthlySipInvested: number;
  monthlySipOriginal: number;
  equitySipPortion: number;
  safeSipPortion: number;
  targetRiskyPct: number;
  targetSafePct: number;
  monthlyExpenseThisYear: number;
}
