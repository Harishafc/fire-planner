import { useMemo } from 'react';
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

      <div className="grid grid-cols-1 gap-5">
        {scenarios.map((sc) => (
          <Card key={sc.label}>
            <SectionTitle
              title={`${sc.label} scenario`}
              subtitle={`Growth delta: ${sc.deltaPct >= 0 ? '+' : ''}${sc.deltaPct}pp applied to equity/debt/gold/NPS/DAAF rates`}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Net worth — with vs. without land</p>
                <TimeSeriesChart
                  data={sc.data}
                  series={[
                    { key: 'netWorthWithLand', label: 'Incl. land', color: CURVE_COLORS.withLand },
                    { key: 'netWorthWithoutLand', label: 'Excl. land (liquid)', color: CURVE_COLORS.withoutLand },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Cumulative interest paid on loan</p>
                <TimeSeriesChart
                  data={sc.data}
                  series={[{ key: 'cumulativeInterest', label: 'Cumulative interest', color: CURVE_COLORS.interest }]}
                  showLegend={false}
                />
              </div>
            </div>
            <div
              className="mt-2 h-1 w-10 rounded-full"
              style={{ backgroundColor: SCENARIO_COLORS[sc.label] }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
