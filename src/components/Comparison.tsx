import { useMemo, useState } from 'react';
import type { PlannerState } from '../lib/types';
import { calcEMI, daafBalanceAtYear, formatINR, runProjection } from '../lib/finance';
import { Card, SectionTitle, StatTile } from './ui';
import { TimeSeriesChart } from './charts';
import { CURVE_COLORS, SCENARIO_COLORS } from '../lib/palette';

export function Comparison({ state, setState }: { state: PlannerState; setState: React.Dispatch<React.SetStateAction<PlannerState>> }) {
  const [newYear, setNewYear] = useState('');
  const [scenarioLabel, setScenarioLabel] = useState<string>('Expected');

  const scenarioDelta = state.scenarioDeltas.find((s) => s.label === scenarioLabel)?.deltaPct ?? 0;

  const addYear = () => {
    const y = parseInt(newYear, 10);
    if (!Number.isFinite(y) || state.comparisonYears.includes(y)) return;
    setState((s) => ({ ...s, comparisonYears: [...s.comparisonYears, y].sort((a, b) => a - b) }));
    setNewYear('');
  };

  const removeYear = (y: number) =>
    setState((s) => ({ ...s, comparisonYears: s.comparisonYears.filter((yr) => yr !== y) }));

  const results = useMemo(
    () =>
      state.comparisonYears.map((year) => {
        const land = { ...state.land, purchaseYear: year };
        const data = runProjection(state, { land, deltaPct: scenarioDelta });
        const daafAtPurchase = daafBalanceAtYear(state, year);
        const downPayment = Math.min(daafAtPurchase, state.land.landPriceEstimate);
        const loanAmount = Math.max(0, state.land.landPriceEstimate - downPayment);
        const emi = calcEMI(loanAmount, state.land.loanInterestRate, state.land.loanTenureYears);
        const final = data[data.length - 1];
        return { year, data, downPayment, loanAmount, emi, final };
      }),
    [state, scenarioDelta]
  );

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Compare purchase years" subtitle="Add or remove any years to test trade-offs, side by side" />
        <div className="flex flex-wrap items-center gap-2">
          {state.comparisonYears.map((y) => (
            <span
              key={y}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-sm text-zinc-200"
            >
              {y}
              <button onClick={() => removeYear(y)} className="text-zinc-500 hover:text-rose-400" aria-label={`Remove ${y}`}>
                ✕
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Year"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addYear()}
              className="w-24 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-200 outline-none focus:border-emerald-500/60"
            />
            <button onClick={addYear} className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">
              + Add
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-zinc-500">Growth scenario</p>
          <div className="flex gap-2">
            {state.scenarioDeltas.map((sd) => (
              <button
                key={sd.label}
                onClick={() => setScenarioLabel(sd.label)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  scenarioLabel === sd.label
                    ? 'border-transparent text-zinc-950'
                    : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                }`}
                style={scenarioLabel === sd.label ? { backgroundColor: SCENARIO_COLORS[sd.label] } : undefined}
              >
                {sd.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {results.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500">Add at least one year above to see a comparison.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {results.map((r) => (
          <Card key={r.year}>
            <SectionTitle title={`Purchase in ${r.year}`} subtitle={`${scenarioLabel} growth scenario`} />
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatTile label="Down payment" value={formatINR(r.downPayment)} />
              <StatTile label="Loan amount" value={formatINR(r.loanAmount)} />
              <StatTile label="EMI" value={formatINR(r.emi)} />
            </div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Net worth — with vs. without land</p>
            <TimeSeriesChart
              data={r.data}
              height={220}
              series={[
                { key: 'netWorthWithLand', label: 'Incl. land', color: CURVE_COLORS.withLand },
                { key: 'netWorthWithoutLand', label: 'Excl. land', color: CURVE_COLORS.withoutLand },
              ]}
            />
            <p className="mb-2 mt-4 text-xs font-medium text-zinc-500">Cumulative interest paid</p>
            <TimeSeriesChart
              data={r.data}
              height={180}
              showLegend={false}
              series={[{ key: 'cumulativeInterest', label: 'Cumulative interest', color: CURVE_COLORS.interest }]}
            />
            <div className="mt-3 flex justify-between text-xs text-zinc-500">
              <span>
                Net worth at {state.projectionEndYear} (incl. land): <span className="text-zinc-300">{formatINR(r.final?.netWorthWithLand ?? 0)}</span>
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
