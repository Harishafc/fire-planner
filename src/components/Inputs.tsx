import type { PlannerState, LumpSum } from '../lib/types';
import { targetAllocationForAge } from '../lib/finance';
import { Card, NumberField, SectionTitle } from './ui';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function Inputs({
  state,
  setState,
}: {
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
}) {
  const patchHoldings = (key: keyof PlannerState['holdings'], v: number) =>
    setState((s) => ({ ...s, holdings: { ...s.holdings, [key]: v } }));

  const patchGrowth = (key: keyof PlannerState['growthRates'], v: number) =>
    setState((s) => ({ ...s, growthRates: { ...s.growthRates, [key]: v } }));

  const patchDaaf = (key: keyof PlannerState['daaf'], v: number) =>
    setState((s) => ({ ...s, daaf: { ...s.daaf, [key]: v } }));

  const patchRisk = (key: keyof PlannerState['risk'], v: number) =>
    setState((s) => ({ ...s, risk: { ...s.risk, [key]: v } }));

  const patchSalary = (key: keyof PlannerState['salary'], v: number) =>
    setState((s) => ({ ...s, salary: { ...s.salary, [key]: v } }));

  const addLumpSum = () =>
    setState((s) => ({
      ...s,
      daaf: {
        ...s.daaf,
        lumpSums: [
          ...s.daaf.lumpSums,
          { id: uid(), year: s.land.purchaseYear, month: 0, amount: 100000, label: 'Bonus' },
        ],
      },
    }));

  const updateLumpSum = (id: string, patch: Partial<LumpSum>) =>
    setState((s) => ({
      ...s,
      daaf: {
        ...s.daaf,
        lumpSums: s.daaf.lumpSums.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    }));

  const removeLumpSum = (id: string) =>
    setState((s) => ({ ...s, daaf: { ...s.daaf, lumpSums: s.daaf.lumpSums.filter((l) => l.id !== id) } }));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <SectionTitle
          title="Monthly contributions"
          subtitle="Your total investable SIP is auto-split into equity vs. DAAF (safe) by your target allocation below"
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Monthly SIP (total)"
            value={state.monthlySipTotal}
            onChange={(v) => setState((s) => ({ ...s, monthlySipTotal: v }))}
            prefix="₹"
            hint="Split automatically between equity and DAAF"
          />
          <NumberField
            label="Monthly RD"
            value={state.monthlyRd}
            onChange={(v) => setState((s) => ({ ...s, monthlyRd: v }))}
            prefix="₹"
          />
          <NumberField
            label="Monthly Travel fund"
            value={state.monthlyTravelContribution}
            onChange={(v) => setState((s) => ({ ...s, monthlyTravelContribution: v }))}
            prefix="₹"
            hint="A separate savings pot for trips, like a dedicated RD"
          />
          <NumberField
            label="Monthly expense"
            value={state.monthlyExpense}
            onChange={(v) => setState((s) => ({ ...s, monthlyExpense: v }))}
            prefix="₹"
            hint="Basic household needs only — grows with inflation"
          />
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Asset allocation"
          subtitle="Age-based rule: Safe/Debt % = your age (capped at 50), Risky/Equity % = the rest"
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Current age"
            value={state.currentAge}
            onChange={(v) => setState((s) => ({ ...s, currentAge: v }))}
            suffix="yrs"
          />
        </div>
        {(() => {
          const t = targetAllocationForAge(state.currentAge);
          return (
            <p className="mt-3 text-xs text-zinc-500">
              Today's target: <span className="text-zinc-300">{t.riskyPct.toFixed(0)}% equity</span> /{' '}
              <span className="text-zinc-300">{t.safePct.toFixed(0)}% safe (DAAF)</span>. This shifts by 1 point a year
              until you turn 50, then holds steady.
            </p>
          );
        })()}
      </Card>

      <Card>
        <SectionTitle
          title="Household income"
          subtitle="In-hand salary drives your cash-flow check; everything below is automatic, pre-deducted, and doesn't reduce it further"
        />
        <div className="mb-4 grid grid-cols-2 gap-4">
          <NumberField
            label="Combined in-hand salary"
            value={state.salary.combinedInHandSalary}
            onChange={(v) => patchSalary('combinedInHandSalary', v)}
            prefix="₹"
            hint="You + spouse, after EPF/NPS/tax are already deducted"
          />
          <NumberField
            label="Salary growth"
            value={state.salary.salaryGrowthPct}
            onChange={(v) => patchSalary('salaryGrowthPct', v)}
            suffix="%/yr"
            hint="Steps up EPF contributions and your SIP each year"
          />
        </div>
        <div className="border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold text-zinc-400">Automatic payroll deductions — before in-hand pay</p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Your basic salary"
              value={state.salary.yourBasicSalary}
              onChange={(v) => patchSalary('yourBasicSalary', v)}
              prefix="₹"
            />
            <NumberField
              label="Monthly NPS"
              value={state.monthlyNpsContribution}
              onChange={(v) => setState((s) => ({ ...s, monthlyNpsContribution: v }))}
              prefix="₹"
              hint="Fixed — doesn't scale with salary"
            />
            <NumberField
              label="EPF + VPF (employee)"
              value={state.salary.yourEpfEmployeePct}
              onChange={(v) => patchSalary('yourEpfEmployeePct', v)}
              suffix="%"
              hint="12% EPF + your VPF top-up, of basic"
            />
            <NumberField
              label="EPF (employer match)"
              value={state.salary.yourEpfEmployerPct}
              onChange={(v) => patchSalary('yourEpfEmployerPct', v)}
              suffix="%"
            />
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <p className="mb-2 text-xs font-semibold text-zinc-400">Spouse — basic salary (EPF calc only)</p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Spouse basic salary"
              value={state.salary.spouseBasicSalary}
              onChange={(v) => patchSalary('spouseBasicSalary', v)}
              prefix="₹"
              hint="0 until she starts working"
            />
            <NumberField
              label="Starts in year"
              value={state.salary.spouseIncomeStartYear}
              onChange={(v) => patchSalary('spouseIncomeStartYear', v)}
            />
            <NumberField
              label="EPF (employee)"
              value={state.salary.spouseEpfEmployeePct}
              onChange={(v) => patchSalary('spouseEpfEmployeePct', v)}
              suffix="%"
            />
            <NumberField
              label="EPF (employer match)"
              value={state.salary.spouseEpfEmployerPct}
              onChange={(v) => patchSalary('spouseEpfEmployerPct', v)}
              suffix="%"
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Current holdings" subtitle="Bank balance / emergency fund lives under Cash" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Cash / Emergency fund" value={state.holdings.cash} onChange={(v) => patchHoldings('cash', v)} prefix="₹" />
          <NumberField label="FD / RD" value={state.holdings.debt} onChange={(v) => patchHoldings('debt', v)} prefix="₹" />
          <NumberField label="Equity - Indian MF" value={state.holdings.equityIndianMF} onChange={(v) => patchHoldings('equityIndianMF', v)} prefix="₹" />
          <NumberField label="Equity - Overseas" value={state.holdings.equityOverseas} onChange={(v) => patchHoldings('equityOverseas', v)} prefix="₹" />
          <NumberField label="Equity - Stocks" value={state.holdings.equityStocks} onChange={(v) => patchHoldings('equityStocks', v)} prefix="₹" />
          <NumberField label="Gold" value={state.holdings.gold} onChange={(v) => patchHoldings('gold', v)} prefix="₹" />
          <NumberField label="NPS" value={state.holdings.nps} onChange={(v) => patchHoldings('nps', v)} prefix="₹" />
          <NumberField label="EPF (incl. VPF)" value={state.holdings.epf} onChange={(v) => patchHoldings('epf', v)} prefix="₹" />
          <NumberField label="Travel fund" value={state.holdings.travelFund} onChange={(v) => patchHoldings('travelFund', v)} prefix="₹" />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Parag Parikh DAAF" subtitle="Funds the land down payment — receives the 'safe' share of your monthly SIP automatically" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Current balance" value={state.daaf.balance} onChange={(v) => patchDaaf('balance', v)} prefix="₹" />
          <NumberField
            label="Equity-equivalent %"
            value={state.daaf.equityEquivalentPct}
            onChange={(v) => patchDaaf('equityEquivalentPct', v)}
            suffix="%"
            hint="Used for risk classification only"
          />
          <NumberField label="Growth rate" value={state.growthRates.daaf} onChange={(v) => patchGrowth('daaf', v)} suffix="%/yr" />
        </div>
        {(() => {
          const t = targetAllocationForAge(state.currentAge);
          const monthlyDaafSip = state.monthlySipTotal * (t.safePct / 100);
          return (
            <p className="mt-3 text-xs text-zinc-500">
              Current monthly DAAF contribution: <span className="text-zinc-300">₹{Math.round(monthlyDaafSip).toLocaleString('en-IN')}</span> (
              {t.safePct.toFixed(0)}% of your total SIP, per the asset allocation target)
            </p>
          );
        })()}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Lump sum additions</span>
            <button
              onClick={addLumpSum}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {state.daaf.lumpSums.length === 0 && (
              <p className="text-xs text-zinc-600">No lump sum additions yet.</p>
            )}
            {state.daaf.lumpSums.map((ls) => (
              <div key={ls.id} className="grid grid-cols-[1fr_70px_70px_90px_28px] items-center gap-2">
                <input
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none"
                  value={ls.label}
                  onChange={(e) => updateLumpSum(ls.id, { label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  type="number"
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none"
                  value={ls.year}
                  onChange={(e) => updateLumpSum(ls.id, { year: e.target.valueAsNumber || ls.year })}
                />
                <select
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-1 py-1.5 text-xs text-zinc-200 outline-none"
                  value={ls.month}
                  onChange={(e) => updateLumpSum(ls.id, { month: Number(e.target.value) })}
                >
                  {Array.from({ length: 12 }).map((_, m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m, 1).toLocaleString('en-US', { month: 'short' })}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none"
                  value={ls.amount}
                  onChange={(e) => updateLumpSum(ls.id, { amount: e.target.valueAsNumber || 0 })}
                />
                <button
                  onClick={() => removeLumpSum(ls.id)}
                  className="rounded-md text-zinc-500 hover:text-rose-400"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Growth & inflation assumptions" subtitle="Editable annual rates used across projections" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Inflation" value={state.inflationRate} onChange={(v) => setState((s) => ({ ...s, inflationRate: v }))} suffix="%/yr" />
          <NumberField label="Cash" value={state.growthRates.cash} onChange={(v) => patchGrowth('cash', v)} suffix="%/yr" />
          <NumberField label="Equity" value={state.growthRates.equity} onChange={(v) => patchGrowth('equity', v)} suffix="%/yr" />
          <NumberField label="Debt" value={state.growthRates.debt} onChange={(v) => patchGrowth('debt', v)} suffix="%/yr" />
          <NumberField label="Gold" value={state.growthRates.gold} onChange={(v) => patchGrowth('gold', v)} suffix="%/yr" />
          <NumberField label="NPS" value={state.growthRates.nps} onChange={(v) => patchGrowth('nps', v)} suffix="%/yr" />
          <NumberField label="EPF" value={state.growthRates.epf} onChange={(v) => patchGrowth('epf', v)} suffix="%/yr" hint="Govt-notified rate, ~8.25%" />
          <NumberField label="Travel fund" value={state.growthRates.travel} onChange={(v) => patchGrowth('travel', v)} suffix="%/yr" />
          <NumberField label="Land appreciation" value={state.growthRates.land} onChange={(v) => patchGrowth('land', v)} suffix="%/yr" />
          <NumberField
            label="Projection end year"
            value={state.projectionEndYear}
            onChange={(v) => setState((s) => ({ ...s, projectionEndYear: v }))}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Investor risk profile inputs" subtitle="Used alongside equity allocation to classify your profile" />
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Investment horizon"
            value={state.risk.horizonYears}
            onChange={(v) => patchRisk('horizonYears', v)}
            suffix="yrs"
          />
          <NumberField
            label="Desired liquid buffer"
            value={state.risk.liquidBufferMonths}
            onChange={(v) => patchRisk('liquidBufferMonths', v)}
            suffix="mo of exp."
          />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Scenario growth adjustments" subtitle="Delta applied uniformly to equity/debt/gold/NPS/DAAF rates" />
        <div className="grid grid-cols-3 gap-4">
          {state.scenarioDeltas.map((sd, i) => (
            <NumberField
              key={sd.label}
              label={sd.label}
              value={sd.deltaPct}
              onChange={(v) =>
                setState((s) => {
                  const next = [...s.scenarioDeltas];
                  next[i] = { ...next[i], deltaPct: v };
                  return { ...s, scenarioDeltas: next };
                })
              }
              suffix="pp"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
