import { useMemo, useState } from 'react';
import type { PlannerState } from '../lib/types';
import { calcEMI, daafBalanceAtYear, formatINR, formatINRFull, runProjection, targetAllocationForAge } from '../lib/finance';
import { Card, NumberField, Pill, SectionTitle, StatTile } from './ui';
import { SipVsEmiChart, TimeSeriesChart } from './charts';
import { CASHFLOW_COLORS, CURVE_COLORS, SCENARIO_COLORS } from '../lib/palette';

export function LandScenario({
  state,
  setState,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
}) {
  const patchLand = (key: keyof PlannerState['land'], v: number) =>
    setState((s) => ({ ...s, land: { ...s.land, [key]: v } }));

  const [scenarioLabel, setScenarioLabel] = useState<string>('Expected');

  const daafAtPurchase = useMemo(() => daafBalanceAtYear(state, state.land.purchaseYear), [state]);
  const downPayment = Math.min(daafAtPurchase, state.land.landPriceEstimate);
  const loanAmount = Math.max(0, state.land.landPriceEstimate - downPayment);
  const emi = calcEMI(loanAmount, state.land.loanInterestRate, state.land.loanTenureYears);

  const scenarios = useMemo(
    () =>
      state.scenarioDeltas.map((sd) => ({
        ...sd,
        data: runProjection(state, { land: state.land, deltaPct: sd.deltaPct }),
      })),
    [state]
  );

  const totalSip = state.monthlySipTotal;
  const sipAfterEmi = Math.max(0, totalSip - emi);
  const sipShortfall = emi - totalSip;
  const cashFlowData = scenarios[0]?.data ?? [];

  const fireMultiplier = state.fireSwrPct > 0 ? 100 / state.fireSwrPct : 25;
  const withFireTarget = (data: typeof cashFlowData) =>
    data.map((d) => ({ ...d, fireTarget: d.monthlyExpenseThisYear * 12 * fireMultiplier }));
  // Inflation-adjusted expenses don't depend on the investment-growth scenario, so any scenario's
  // final year gives the same FIRE target — used to judge every scenario's final net worth against it.
  const finalFireTarget = (() => {
    const data = scenarios[0]?.data;
    const last = data?.[data.length - 1];
    return last ? last.monthlyExpenseThisYear * 12 * fireMultiplier : 0;
  })();

  const currentYear = new Date().getFullYear();
  const ageAtPurchase = state.currentAge + (state.land.purchaseYear - currentYear);
  const targetAtPurchase = targetAllocationForAge(ageAtPurchase);
  const equityAfterEmi = sipAfterEmi * (targetAtPurchase.riskyPct / 100);
  const safeAfterEmi = sipAfterEmi * (targetAtPurchase.safePct / 100);
  const targetNow = targetAllocationForAge(state.currentAge);
  const equityNow = totalSip * (targetNow.riskyPct / 100);
  const safeNow = totalSip * (targetNow.safePct / 100);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Land purchase scenario" subtitle="Down payment is drawn from the Parag Parikh DAAF balance" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField label="Purchase year" value={state.land.purchaseYear} onChange={(v) => patchLand('purchaseYear', v)} />
          <NumberField label="Land price estimate" value={state.land.landPriceEstimate} onChange={(v) => patchLand('landPriceEstimate', v)} prefix="₹" />
          <NumberField label="Loan interest rate" value={state.land.loanInterestRate} onChange={(v) => patchLand('loanInterestRate', v)} suffix="%/yr" />
          <NumberField label="Loan tenure" value={state.land.loanTenureYears} onChange={(v) => patchLand('loanTenureYears', v)} suffix="yrs" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="DAAF balance at purchase" value={formatINR(daafAtPurchase)} sub={`Expected growth, Jan ${state.land.purchaseYear}`} />
          <StatTile label="Down payment" value={formatINR(downPayment)} />
          <StatTile label="Loan amount" value={formatINR(loanAmount)} />
          <StatTile label="Monthly EMI" value={formatINRFull(emi)} sub={loanAmount > 0 ? `${state.land.loanTenureYears}yr @ ${state.land.loanInterestRate}%` : 'No loan needed'} />
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Monthly SIP vs. EMI"
          subtitle={`What happens to your equity + debt SIP once the EMI kicks in, starting ${state.land.purchaseYear}`}
        />
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="SIP before purchase"
            value={formatINRFull(totalSip)}
            sub={`≈ ${formatINR(equityNow)} equity + ${formatINR(safeNow)} DAAF (${targetNow.riskyPct.toFixed(0)}/${targetNow.safePct.toFixed(0)} split at age ${state.currentAge})`}
          />
          <StatTile
            label={`SIP from ${state.land.purchaseYear} onward`}
            value={formatINRFull(sipAfterEmi)}
            sub={
              sipAfterEmi === 0
                ? 'Fully absorbed by EMI'
                : `≈ ${formatINR(equityAfterEmi)} equity + ${formatINR(safeAfterEmi)} DAAF (age ${ageAtPurchase})`
            }
          />
          <StatTile label="Monthly EMI" value={formatINRFull(emi)} sub={`${state.land.loanTenureYears}yr loan @ ${state.land.loanInterestRate}%`} />
        </div>
        {sipShortfall > 0 && loanAmount > 0 && (
          <div className="mb-4">
            <Pill tone="rose">
              EMI is {formatINR(sipShortfall)} more than your SIP — equity/DAAF investing pauses entirely from {state.land.purchaseYear} until the loan is paid off or SIP grows.
            </Pill>
          </div>
        )}
        <p className="mb-2 text-xs font-medium text-zinc-500">
          Bars show your monthly SIP split by target allocation — teal for equity, blue for DAAF (safe) — stacked next to the
          EMI you owe (red), year by year. The dashed line marks the purchase year.
        </p>
        <SipVsEmiChart
          data={cashFlowData}
          purchaseYear={state.land.purchaseYear}
          equityColor={CASHFLOW_COLORS.equity}
          safeColor={CASHFLOW_COLORS.safe}
          emiColor={CASHFLOW_COLORS.emi}
        />
      </Card>

      <Card>
        <SectionTitle
          title="Net worth growth"
          subtitle="Your current net worth, projected forward with the reduced SIP after the land purchase kicks in"
        />
        <div className="mb-4 flex gap-2">
          {state.scenarioDeltas.map((sd) => (
            <button
              key={sd.label}
              onClick={() => setScenarioLabel(sd.label)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                scenarioLabel === sd.label ? 'border-transparent text-zinc-950' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
              style={scenarioLabel === sd.label ? { backgroundColor: SCENARIO_COLORS[sd.label] } : undefined}
            >
              {sd.label} growth
            </button>
          ))}
        </div>

        {(() => {
          const active = scenarios.find((sc) => sc.label === scenarioLabel) ?? scenarios[0];
          const chartData = withFireTarget(active.data);
          const final = chartData[chartData.length - 1];
          const enough = final ? final.netWorthWithoutLand >= final.fireTarget : false;
          return (
            <>
              <p className="mb-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-300">Blue line</span> = your full net worth if you count the land as an
                asset once you own it. <span className="font-medium text-zinc-300">Teal line</span> = just your liquid
                investments (cash, SIPs, DAAF, etc.) — the land is left out.{' '}
                <span className="font-medium text-zinc-300">Dashed yellow line</span> = what your monthly expense today (₹
                {state.monthlyExpense.toLocaleString('en-IN')}) actually costs to sustain forever in that future year, after{' '}
                {state.inflationRate}% inflation — your real "enough to retire" bar. Both net-worth lines already reflect the
                lower SIP from {state.land.purchaseYear} onward.
              </p>
              <TimeSeriesChart
                data={chartData}
                height={320}
                referenceX={state.land.purchaseYear}
                referenceLabel={`Purchase (${state.land.purchaseYear})`}
                series={[
                  { key: 'netWorthWithLand', label: 'Net worth incl. land', color: CURVE_COLORS.withLand },
                  { key: 'netWorthWithoutLand', label: 'Liquid net worth (no land)', color: CURVE_COLORS.withoutLand },
                  { key: 'fireTarget', label: 'FIRE target (inflation-adjusted)', color: CURVE_COLORS.fireTarget, dashed: true },
                ]}
              />
              {final && (
                <p className={`mt-3 text-xs ${enough ? 'text-emerald-400' : 'text-amber-400'}`}>
                  By {state.projectionEndYear}: your ₹{state.monthlyExpense.toLocaleString('en-IN')}/mo expense today becomes ≈{' '}
                  {formatINR(final.monthlyExpenseThisYear)}/mo (₹{formatINR(final.monthlyExpenseThisYear * 12)}/yr) — needing a
                  FIRE corpus of ≈ {formatINR(final.fireTarget)}. Your projected liquid net worth then is ≈{' '}
                  {formatINR(final.netWorthWithoutLand)}, which is{' '}
                  {enough ? 'enough ✓' : `short by ${formatINR(final.fireTarget - final.netWorthWithoutLand)}`}.
                </p>
              )}
            </>
          );
        })()}

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-5">
          {scenarios.map((sc) => {
            const final = sc.data[sc.data.length - 1];
            const enough = final ? final.netWorthWithoutLand >= finalFireTarget : false;
            return (
              <button
                key={sc.label}
                onClick={() => setScenarioLabel(sc.label)}
                className={`rounded-xl border p-3 text-left transition ${
                  scenarioLabel === sc.label ? 'border-zinc-600 bg-zinc-800/60' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[sc.label] }} />
                  <span className="text-xs text-zinc-400">{sc.label}</span>
                  <span className={`ml-auto text-xs ${enough ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {enough ? '✓ enough' : '✗ short'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-100">{formatINR(final?.netWorthWithLand ?? 0)}</p>
                <p className="text-[11px] text-zinc-600">
                  net worth by {state.projectionEndYear} · FIRE target ≈ {formatINR(finalFireTarget)}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Cumulative interest paid on the loan" subtitle={`${scenarioLabel} growth scenario`} />
        <TimeSeriesChart
          data={(scenarios.find((sc) => sc.label === scenarioLabel) ?? scenarios[0]).data}
          series={[{ key: 'cumulativeInterest', label: 'Cumulative interest', color: CURVE_COLORS.interest }]}
          showLegend={false}
          referenceX={state.land.purchaseYear}
          referenceLabel={`Purchase (${state.land.purchaseYear})`}
        />
      </Card>
    </div>
  );
}
