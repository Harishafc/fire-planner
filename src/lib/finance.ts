import type {
  AllocationTarget,
  GrowthRates,
  Holdings,
  LandInputs,
  PlannerState,
  YearSnapshot,
} from './types';

const AGE_ALLOCATION_CAP = 50;

/** Age-based glide path: safe/debt % rises with age until it caps at 50 (then holds steady). */
export function targetAllocationForAge(age: number): AllocationTarget {
  const safePct = Math.min(Math.max(age, 0), AGE_ALLOCATION_CAP);
  return { safePct, riskyPct: 100 - safePct };
}

/** Actual current portfolio split: NPS + EPF + travel fund count as safe, DAAF splits by its equity-equivalent %. */
export function currentAllocation(state: PlannerState): AllocationTarget {
  const h = state.holdings;
  const netWorth = currentNetWorth(state);
  if (netWorth <= 0) return { safePct: 0, riskyPct: 0 };
  const daafRisky = (state.daaf.balance * state.daaf.equityEquivalentPct) / 100;
  const daafSafe = state.daaf.balance - daafRisky;
  const risky = equityTotal(h) + daafRisky;
  const safe = h.cash + h.debt + h.gold + h.nps + h.epf + h.travelFund + daafSafe;
  return { safePct: (safe / netWorth) * 100, riskyPct: (risky / netWorth) * 100 };
}

/**
 * Today's monthly household cash-flow check. EPF and NPS are payroll-style deductions that never
 * reach your bank account, so "combined in-hand salary" already excludes them — only what you
 * actively pay out of that in-hand money (RD, SIP, Travel, Expenses) reduces the surplus.
 */
export interface CashFlowCheck {
  inHandSalary: number;
  rdOutflow: number;
  sipOutflow: number;
  travelOutflow: number;
  expenseOutflow: number;
  surplus: number;
  epfInfo: number;
  npsInfo: number;
}

export function todaysEpfContribution(state: PlannerState): number {
  const s = state.salary;
  const currentYear = new Date().getFullYear();
  const spouseActive = s.spouseBasicSalary > 0 && currentYear >= s.spouseIncomeStartYear;
  return (
    (s.yourBasicSalary * (s.yourEpfEmployeePct + s.yourEpfEmployerPct)) / 100 +
    (spouseActive ? (s.spouseBasicSalary * (s.spouseEpfEmployeePct + s.spouseEpfEmployerPct)) / 100 : 0)
  );
}

export function cashFlowCheck(state: PlannerState): CashFlowCheck {
  const inHandSalary = state.salary.combinedInHandSalary;
  const rdOutflow = state.monthlyRd;
  const sipOutflow = state.monthlySipTotal;
  const travelOutflow = state.monthlyTravelContribution;
  const expenseOutflow = state.monthlyExpense;

  const surplus = inHandSalary - rdOutflow - sipOutflow - travelOutflow - expenseOutflow;
  const epfInfo = todaysEpfContribution(state);
  const npsInfo = state.monthlyNpsContribution;

  return { inHandSalary, rdOutflow, sipOutflow, travelOutflow, expenseOutflow, surplus, epfInfo, npsInfo };
}

/**
 * What actually happens to your money every month across every bucket — EPF, NPS, RD, and the
 * DAAF (safe) / Equity (risky) split of your SIP — so you can see the real safe vs. risky mix
 * of new money going in, not just your existing portfolio's composition.
 */
export interface MonthlyContributionBreakdown {
  epf: number;
  nps: number;
  rd: number;
  debtFundSip: number;
  equityMf: number;
  safeTotal: number;
  riskyTotal: number;
  total: number;
  safePct: number;
  riskyPct: number;
}

export function monthlyContributionBreakdown(state: PlannerState): MonthlyContributionBreakdown {
  const epf = todaysEpfContribution(state);
  const nps = state.monthlyNpsContribution;
  const rd = state.monthlyRd;
  const target = targetAllocationForAge(state.currentAge);
  const debtFundSip = state.monthlySipTotal * (target.safePct / 100);
  const equityMf = state.monthlySipTotal * (target.riskyPct / 100);

  const safeTotal = epf + nps + rd + debtFundSip;
  const riskyTotal = equityMf;
  const total = safeTotal + riskyTotal;

  return {
    epf,
    nps,
    rd,
    debtFundSip,
    equityMf,
    safeTotal,
    riskyTotal,
    total,
    safePct: total > 0 ? (safeTotal / total) * 100 : 0,
    riskyPct: total > 0 ? (riskyTotal / total) * 100 : 0,
  };
}

export function calcEMI(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function equityTotal(h: Holdings): number {
  return h.equityIndianMF + h.equityOverseas + h.equityStocks;
}

export function currentNetWorth(state: PlannerState): number {
  const h = state.holdings;
  return (
    h.cash + h.debt + equityTotal(h) + h.gold + h.nps + h.epf + h.travelFund + state.daaf.balance
  );
}

export type RiskProfile = 'Conservative' | 'Balanced' | 'Aggressive';

export interface RiskResult {
  profile: RiskProfile;
  equityPct: number;
  score: number;
}

export function classifyRisk(state: PlannerState): RiskResult {
  const h = state.holdings;
  const netWorth = currentNetWorth(state);
  const equityValue =
    equityTotal(h) + (state.daaf.balance * state.daaf.equityEquivalentPct) / 100;
  const equityPct = netWorth > 0 ? (equityValue / netWorth) * 100 : 0;

  let score = 0;
  if (equityPct >= 60) score += 2;
  else if (equityPct >= 35) score += 1;

  if (state.risk.horizonYears >= 8) score += 2;
  else if (state.risk.horizonYears >= 4) score += 1;

  if (state.risk.liquidBufferMonths <= 3) score += 1;
  else if (state.risk.liquidBufferMonths >= 9) score -= 1;

  let profile: RiskProfile = 'Conservative';
  if (score >= 4) profile = 'Aggressive';
  else if (score >= 2) profile = 'Balanced';

  return { profile, equityPct, score };
}

function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

function applyDelta(rates: GrowthRates, deltaPct: number): GrowthRates {
  return {
    cash: rates.cash,
    debt: rates.debt + deltaPct,
    equity: rates.equity + deltaPct,
    gold: rates.gold + deltaPct,
    nps: rates.nps + deltaPct,
    daaf: rates.daaf + deltaPct,
    land: rates.land,
    epf: rates.epf,
    travel: rates.travel + deltaPct,
  };
}

interface ProjectionOptions {
  land: LandInputs;
  deltaPct: number;
}

export function runProjection(state: PlannerState, opts: ProjectionOptions): YearSnapshot[] {
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  const rates = applyDelta(state.growthRates, opts.deltaPct);
  const mRate = {
    cash: monthlyRate(rates.cash),
    debt: monthlyRate(rates.debt),
    equity: monthlyRate(rates.equity),
    gold: monthlyRate(rates.gold),
    nps: monthlyRate(rates.nps),
    daaf: monthlyRate(rates.daaf),
    land: monthlyRate(rates.land),
    epf: monthlyRate(rates.epf),
    travel: monthlyRate(rates.travel),
  };

  let cash = state.holdings.cash;
  let debt = state.holdings.debt;
  let equity = equityTotal(state.holdings);
  let gold = state.holdings.gold;
  let nps = state.holdings.nps;
  let epf = state.holdings.epf;
  let travelFund = state.holdings.travelFund;
  let daaf = state.daaf.balance;
  let land = 0;

  let loanPrincipal = 0;
  let loanMonthsRemaining = 0;
  let emi = 0;
  let cumulativeInterest = 0;
  let purchased = false;

  const salaryGrowth = state.salary.salaryGrowthPct / 100;

  const daafLumpSumsByMonth = new Map<string, number>();
  for (const ls of state.daaf.lumpSums) {
    const key = `${ls.year}-${ls.month}`;
    daafLumpSumsByMonth.set(key, (daafLumpSumsByMonth.get(key) ?? 0) + ls.amount);
  }

  const snapshots: YearSnapshot[] = [];
  const totalMonths = (state.projectionEndYear - startYear + 1) * 12;

  for (let i = 0; i < totalMonths; i++) {
    const offset = startMonth + i;
    const year = startYear + Math.floor(offset / 12);
    const month = offset % 12;

    if (year > state.projectionEndYear) break;

    // growth
    cash *= 1 + mRate.cash;
    debt *= 1 + mRate.debt;
    equity *= 1 + mRate.equity;
    gold *= 1 + mRate.gold;
    nps *= 1 + mRate.nps;
    epf *= 1 + mRate.epf;
    travelFund *= 1 + mRate.travel;
    daaf *= 1 + mRate.daaf;
    if (land > 0) land *= 1 + mRate.land;

    // land purchase trigger: January of purchase year, or immediately if the purchase year
    // is already underway (i.e. it's the current year and January has already passed)
    if (!purchased && year === opts.land.purchaseYear && (month === 0 || year === startYear)) {
      purchased = true;
      const downPayment = Math.min(daaf, opts.land.landPriceEstimate);
      daaf -= downPayment;
      loanPrincipal = Math.max(0, opts.land.landPriceEstimate - downPayment);
      land = opts.land.landPriceEstimate;
      if (loanPrincipal > 0) {
        emi = calcEMI(loanPrincipal, opts.land.loanInterestRate, opts.land.loanTenureYears);
        loanMonthsRemaining = opts.land.loanTenureYears * 12;
      }
    }

    // loan amortization
    let sipReduction = 0;
    if (loanPrincipal > 0 && loanMonthsRemaining > 0) {
      const loanMonthlyRate = opts.land.loanInterestRate / 12 / 100;
      const interestPortion = loanPrincipal * loanMonthlyRate;
      const principalPortion = Math.min(loanPrincipal, emi - interestPortion);
      loanPrincipal = Math.max(0, loanPrincipal - principalPortion);
      cumulativeInterest += interestPortion;
      loanMonthsRemaining -= 1;
      sipReduction = emi;
    }

    // salary-linked contributions — SIP, EPF, and expenses all step up yearly with salary growth / inflation
    const yearsElapsed = year - startYear;
    const stepUp = Math.pow(1 + salaryGrowth, yearsElapsed);
    const steppedSip = state.monthlySipTotal * stepUp;

    const yourBasicThisYear = state.salary.yourBasicSalary * stepUp;
    const yourEpfMonthly = (yourBasicThisYear * (state.salary.yourEpfEmployeePct + state.salary.yourEpfEmployerPct)) / 100;

    const spouseActive = state.salary.spouseBasicSalary > 0 && year >= state.salary.spouseIncomeStartYear;
    const spouseYearsElapsed = year - state.salary.spouseIncomeStartYear;
    const spouseBasicThisYear = spouseActive
      ? state.salary.spouseBasicSalary * Math.pow(1 + salaryGrowth, spouseYearsElapsed)
      : 0;
    const spouseEpfMonthly = spouseActive
      ? (spouseBasicThisYear * (state.salary.spouseEpfEmployeePct + state.salary.spouseEpfEmployerPct)) / 100
      : 0;

    epf += yourEpfMonthly + spouseEpfMonthly;
    nps += state.monthlyNpsContribution;
    travelFund += state.monthlyTravelContribution;

    // age-based target allocation splits the investable SIP into equity (risky) and DAAF (safe)
    const age = state.currentAge + yearsElapsed;
    const target = targetAllocationForAge(age);
    const effectiveSip = Math.max(0, steppedSip - sipReduction);
    const equityPortion = effectiveSip * (target.riskyPct / 100);
    const safePortion = effectiveSip * (target.safePct / 100);

    const lumpSum = daafLumpSumsByMonth.get(`${year}-${month}`) ?? 0;
    daaf += safePortion + lumpSum;
    equity += equityPortion;
    debt += state.monthlyRd;

    if (month === 11) {
      const liquidNetWorth = cash + debt + equity + gold + nps + epf + travelFund + daaf;
      const monthlyExpenseThisYear = state.monthlyExpense * Math.pow(1 + state.inflationRate / 100, yearsElapsed);
      snapshots.push({
        year,
        cash,
        debt,
        equity,
        gold,
        nps,
        epf,
        travelFund,
        daaf,
        land,
        loanOutstanding: loanPrincipal,
        cumulativeInterest,
        netWorthWithLand: liquidNetWorth + land - loanPrincipal,
        netWorthWithoutLand: liquidNetWorth,
        emi,
        monthlySipInvested: effectiveSip,
        monthlySipOriginal: steppedSip,
        equitySipPortion: equityPortion,
        safeSipPortion: safePortion,
        targetRiskyPct: target.riskyPct,
        targetSafePct: target.safePct,
        monthlyExpenseThisYear,
      });
    }
  }

  return snapshots;
}

/**
 * FIRE status: your target corpus (annual expenses x 1/SWR), how close you are today, and the
 * year/age you're projected to cross it — using your real, land-purchase-adjusted trajectory at
 * the Expected growth scenario, comparing against inflation-adjusted expenses each year.
 */
export interface FireStatus {
  fireNumberToday: number;
  netWorthToday: number;
  progressPct: number;
  fireYear: number | null;
  fireAge: number | null;
  yearsToFire: number | null;
}

export function fireStatus(state: PlannerState): FireStatus {
  const multiplier = state.fireSwrPct > 0 ? 100 / state.fireSwrPct : 25;
  const annualExpenseToday = state.monthlyExpense * 12;
  const fireNumberToday = annualExpenseToday * multiplier;
  const netWorthToday = currentNetWorth(state);
  const progressPct = fireNumberToday > 0 ? (netWorthToday / fireNumberToday) * 100 : 0;

  const startYear = new Date().getFullYear();
  const snaps = runProjection(state, { land: state.land, deltaPct: 0 });

  let fireYear: number | null = null;
  for (const snap of snaps) {
    const fireTargetThatYear = snap.monthlyExpenseThisYear * 12 * multiplier;
    if (snap.netWorthWithoutLand >= fireTargetThatYear) {
      fireYear = snap.year;
      break;
    }
  }
  const fireAge = fireYear !== null ? state.currentAge + (fireYear - startYear) : null;
  const yearsToFire = fireYear !== null ? fireYear - startYear : null;

  return { fireNumberToday, netWorthToday, progressPct, fireYear, fireAge, yearsToFire };
}

export function daafBalanceAtYear(state: PlannerState, targetYear: number): number {
  // Quick helper for a no-purchase-yet projection to preview DAAF balance at a candidate purchase year.
  const dummyLand: LandInputs = {
    purchaseYear: targetYear + 1000,
    landPriceEstimate: 0,
    loanInterestRate: state.land.loanInterestRate,
    loanTenureYears: state.land.loanTenureYears,
  };
  const snaps = runProjection(state, { land: dummyLand, deltaPct: 0 });
  const snap = snaps.find((s) => s.year === targetYear);
  return snap ? snap.daaf : state.daaf.balance;
}

export function formatINR(value: number): string {
  if (!isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

export function formatINRFull(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }).format(
    value
  );
}
