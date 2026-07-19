import type { PlannerState } from '../lib/types';
import {
  cashFlowCheck,
  classifyRisk,
  currentAllocation,
  currentNetWorth,
  equityTotal,
  formatINRFull,
  formatINR,
  targetAllocationForAge,
} from '../lib/finance';
import { Card, Pill, SectionTitle, StatTile } from './ui';
import { CATEGORICAL, HOLDINGS_COLORS } from '../lib/palette';

export function Overview({ state }: { state: PlannerState }) {
  const netWorth = currentNetWorth(state);
  const risk = classifyRisk(state);
  const h = state.holdings;
  const target = targetAllocationForAge(state.currentAge);
  const actual = currentAllocation(state);
  const allocationGap = actual.riskyPct - target.riskyPct;
  const cashFlow = cashFlowCheck(state);

  const breakdown = [
    { key: 'cash', label: 'Cash / Emergency', value: h.cash, safe: true },
    { key: 'debtFund', label: 'Debt fund', value: h.debtFund + state.daaf.balance, safe: true },
    { key: 'debt', label: 'FD / RD', value: h.debt + h.travelFund, safe: true },
    { key: 'equityIndianMF', label: 'Equity - Indian MF', value: h.equityIndianMF, safe: false },
    { key: 'equityOverseas', label: 'Equity - Overseas', value: h.equityOverseas, safe: false },
    { key: 'equityStocks', label: 'Equity - Stocks', value: h.equityStocks, safe: false },
    { key: 'gold', label: 'Gold', value: h.gold, safe: true },
    { key: 'nps', label: 'NPS', value: h.nps, safe: true },
    { key: 'epf', label: 'EPF (incl. VPF)', value: h.epf, safe: true },
  ].filter((b) => b.value > 0);

  const total = breakdown.reduce((a, b) => a + b.value, 0) || 1;

  const riskTone = risk.profile === 'Aggressive' ? 'emerald' : risk.profile === 'Balanced' ? 'amber' : 'rose';

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <SectionTitle title="Net worth composition" subtitle={`${formatINRFull(netWorth)} · Debt fund includes your DAAF balance, FD/RD includes Travel fund`} />
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
        <p className="mt-4 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Safe:</span> Cash, Debt fund, FD/RD, Gold, NPS, EPF ·{' '}
          <span className="font-medium text-zinc-400">Risky:</span> Equity (Indian MF, Overseas, Stocks)
        </p>
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
        <SectionTitle
          title="Asset allocation — target vs. actual"
          subtitle={`Age-based rule: Safe/Debt % = your age (capped at 50), Risky/Equity % = the rest. You're ${state.currentAge} today.`}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Target (age-based)</p>
            <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full border border-zinc-800">
              <div style={{ width: `${target.riskyPct}%`, backgroundColor: CATEGORICAL.aqua }} />
              <div style={{ width: `${target.safePct}%`, backgroundColor: CATEGORICAL.blue }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Risky (equity): {target.riskyPct.toFixed(0)}%</span>
              <span>Safe (debt/cash/gold/NPS/EPF/Travel): {target.safePct.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Actual (your current portfolio)</p>
            <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full border border-zinc-800">
              <div style={{ width: `${actual.riskyPct}%`, backgroundColor: CATEGORICAL.aqua }} />
              <div style={{ width: `${actual.safePct}%`, backgroundColor: CATEGORICAL.blue }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Risky (equity): {actual.riskyPct.toFixed(0)}%</span>
              <span>Safe: {actual.safePct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        {Math.abs(allocationGap) >= 3 && (
          <p className="mt-4 text-xs text-amber-400">
            You're currently {Math.abs(allocationGap).toFixed(0)} points {allocationGap > 0 ? 'overweight equity' : 'overweight safe/debt'}{' '}
            vs. your age-based target. New SIP money is automatically split toward the target going forward, but your
            existing holdings aren't rebalanced automatically.
          </p>
        )}
      </Card>

      <Card className="lg:col-span-3">
        <SectionTitle
          title="Monthly cash-flow check"
          subtitle="Combined in-hand salary minus what you actively pay out of it — EPF & NPS are already deducted before it reaches you"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="In-hand salary" value={formatINR(cashFlow.inHandSalary)} sub="You + spouse, combined" />
          <StatTile label="RD" value={`− ${formatINR(cashFlow.rdOutflow)}`} />
          <StatTile label="SIP" value={`− ${formatINR(cashFlow.sipOutflow)}`} />
          <StatTile label="Travel fund" value={`− ${formatINR(cashFlow.travelOutflow)}`} />
          <StatTile label="Expenses" value={`− ${formatINR(cashFlow.expenseOutflow)}`} />
          <StatTile label={cashFlow.surplus >= 0 ? 'Surplus' : 'Deficit'} value={formatINR(cashFlow.surplus)} />
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Already deducted before in-hand pay, for reference only: EPF ≈ {formatINR(cashFlow.epfInfo)}/mo, NPS ={' '}
          {formatINR(cashFlow.npsInfo)}/mo.
        </p>
        {cashFlow.surplus < 0 && (
          <p className="mt-2 text-xs text-rose-400">
            You're committing {formatINR(Math.abs(cashFlow.surplus))} more per month than your in-hand salary covers.
            Consider trimming SIP, RD, Travel, or expenses — or double check your salary figure.
          </p>
        )}
      </Card>

      <Card className="lg:col-span-3">
        <SectionTitle title="Quick stats" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total net worth" value={formatINR(netWorth)} />
          <StatTile label="Monthly SIP (total)" value={formatINR(state.monthlySipTotal)} sub="Auto-split by target allocation" />
          <StatTile
            label="Monthly savings rate"
            value={`${(((state.monthlySipTotal + state.monthlyRd) / (state.monthlySipTotal + state.monthlyRd + state.monthlyExpense)) * 100).toFixed(0)}%`}
            sub="of gross monthly cash flow"
          />
          <StatTile label="Emergency runway" value={`${(h.cash / state.monthlyExpense).toFixed(1)} mo`} />
        </div>
      </Card>
    </div>
  );
}
