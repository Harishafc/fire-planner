import { useMemo, useState } from 'react';
import type { PlannerState } from '../lib/types';
import { calcEMI, daafBalanceAtYear, formatINR, formatINRFull, runProjection } from '../lib/finance';
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

  const totalSip = state.monthlySipEquity + state.monthlySipDebt;
  const sipAfterEmi = Math.max(0, totalSip - emi);
  const sipShortfall = emi - totalSip;
  const cashFlowData = scenarios[0]?.data ?? [];

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
          <StatTile label="SIP before purchase" value={formatINRFull(totalSip)} sub="Equity + Debt SIP today" />
          <StatTile
            label={`SIP from ${state.land.purchaseYear} onward`}
            value={formatINRFull(sipAfterEmi)}
            sub={sipAfterEmi === 0 ? 'Fully absorbed by EMI' : 'After EMI is deducted'}
          />
          <StatTile label="Monthly EMI" value={formatINRFull(emi)} sub={`${state.land.loanTenureYears}yr loan @ ${state.land.loanInterestRate}%`} />
        </div>
        {sipShortfall > 0 && loanAmount > 0 && (
          <div className="mb-4">
            <Pill tone="rose">
              EMI is {formatINR(sipShortfall)} more than your SIP — equity/debt investing pauses entirely from {state.land.purchaseYear} until the loan is paid off or SIP grows.
            </Pill>
          </div>
        )}
        <p className="mb-2 text-xs font-medium text-zinc-500">
          Bars show your actual monthly SIP investment (teal) next to the EMI you owe (red), year by year — the dashed line marks the purchase year.
        </p>
        <SipVsEmiChart
          data={cashFlowData}
          purchaseYear={state.land.purchaseYear}
          sipColor={CASHFLOW_COLORS.sip}
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
          return (
            <>
              <p className="mb-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-300">Blue line</span> = your full net worth if you count the land as an
                asset once you own it. <span className="font-medium text-zinc-300">Teal line</span> = just your liquid
                investments (cash, SIPs, DAAF, etc.) — the land is left out. Both already reflect the lower SIP from{' '}
                {state.land.purchaseYear} onward.
              </p>
              <TimeSeriesChart
                data={active.data}
                height={320}
                referenceX={state.land.purchaseYear}
                referenceLabel={`Purchase (${state.land.purchaseYear})`}
                series={[
                  { key: 'netWorthWithLand', label: 'Net worth incl. land', color: CURVE_COLORS.withLand },
                  { key: 'netWorthWithoutLand', label: 'Liquid net worth (no land)', color: CURVE_COLORS.withoutLand },
                ]}
              />
            </>
          );
        })()}

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-5">
          {scenarios.map((sc) => {
            const final = sc.data[sc.data.length - 1];
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
                </div>
                <p className="text-sm font-semibold text-zinc-100">{formatINR(final?.netWorthWithLand ?? 0)}</p>
                <p className="text-[11px] text-zinc-600">net worth by {state.projectionEndYear}</p>
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
