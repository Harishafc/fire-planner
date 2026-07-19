import type { PlannerState } from '../lib/types';
import { classifyRisk, currentNetWorth, equityTotal, formatINRFull, formatINR } from '../lib/finance';
import { Card, Pill, SectionTitle, StatTile } from './ui';
import { HOLDINGS_COLORS } from '../lib/palette';

export function Overview({ state }: { state: PlannerState }) {
  const netWorth = currentNetWorth(state);
  const risk = classifyRisk(state);
  const h = state.holdings;

  const breakdown = [
    { key: 'cash', label: 'Cash / Emergency', value: h.cash },
    { key: 'debt', label: 'Debt / Fixed income', value: h.debt },
    { key: 'equityIndianMF', label: 'Equity - Indian MF', value: h.equityIndianMF },
    { key: 'equityOverseas', label: 'Equity - Overseas', value: h.equityOverseas },
    { key: 'equityStocks', label: 'Equity - Stocks', value: h.equityStocks },
    { key: 'gold', label: 'Gold', value: h.gold },
    { key: 'nps', label: 'NPS', value: h.nps },
    { key: 'daaf', label: 'Parag Parikh DAAF', value: state.daaf.balance },
  ].filter((b) => b.value > 0);

  const total = breakdown.reduce((a, b) => a + b.value, 0) || 1;

  const riskTone = risk.profile === 'Aggressive' ? 'emerald' : risk.profile === 'Balanced' ? 'amber' : 'rose';

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <SectionTitle title="Net worth composition" subtitle={formatINRFull(netWorth)} />
        <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full border border-zinc-800">
          {breakdown.map((b) => (
            <div
              key={b.key}
              style={{ width: `${(b.value / total) * 100}%`, backgroundColor: HOLDINGS_COLORS[b.key] }}
              title={`${b.label}: ${formatINR(b.value)}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-2">
          {breakdown.map((b) => (
            <div key={b.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HOLDINGS_COLORS[b.key] }} />
                <span className="text-zinc-400">{b.label}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-zinc-100">{formatINR(b.value)}</span>
                <span className="ml-2 text-xs text-zinc-600">{((b.value / total) * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Risk profile" subtitle="Derived from equity allocation + horizon/liquidity" />
        <div className="mb-4">
          <Pill tone={riskTone as 'emerald' | 'amber' | 'rose'}>{risk.profile}</Pill>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <StatTile label="Equity allocation" value={`${risk.equityPct.toFixed(1)}%`} sub="incl. DAAF equity-equivalent" />
          <StatTile label="Investment horizon" value={`${state.risk.horizonYears} yrs`} />
          <StatTile label="Desired liquid buffer" value={`${state.risk.liquidBufferMonths} mo`} sub={formatINR(state.risk.liquidBufferMonths * state.monthlyExpense)} />
          <StatTile label="Equity value (raw)" value={formatINR(equityTotal(h))} />
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <SectionTitle title="Quick stats" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total net worth" value={formatINR(netWorth)} />
          <StatTile label="Monthly SIP (total)" value={formatINR(state.monthlySipEquity + state.monthlySipDebt)} />
          <StatTile label="Monthly savings rate" value={`${(((state.monthlySipEquity + state.monthlySipDebt + state.monthlyRd + state.daaf.monthlySip) / (state.monthlySipEquity + state.monthlySipDebt + state.monthlyRd + state.daaf.monthlySip + state.monthlyExpense)) * 100).toFixed(0)}%`} sub="of gross monthly cash flow" />
          <StatTile label="Emergency runway" value={`${(h.cash / state.monthlyExpense).toFixed(1)} mo`} />
        </div>
      </Card>
    </div>
  );
}
