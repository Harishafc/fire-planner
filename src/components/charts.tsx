import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '../lib/palette';
import { formatINR } from '../lib/finance';

export interface Series {
  key: string;
  label: string;
  color: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="font-medium text-zinc-100">{formatINR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function TimeSeriesChart({
  data,
  series,
  height = 260,
  showLegend = true,
}: {
  data: readonly Record<string, unknown>[];
  series: Series[];
  height?: number;
  showLegend?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.gridline} vertical={false} />
        <XAxis
          dataKey="year"
          stroke={CHART.axis}
          tick={{ fill: CHART.mutedInk, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
        />
        <YAxis
          stroke={CHART.axis}
          tick={{ fill: CHART.mutedInk, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v)}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART.axis, strokeWidth: 1 }} />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART.secondaryInk }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SipVsEmiChart({
  data,
  purchaseYear,
  sipColor,
  emiColor,
  height = 260,
}: {
  data: readonly Record<string, unknown>[];
  purchaseYear: number;
  sipColor: string;
  emiColor: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART.gridline} vertical={false} />
        <XAxis
          dataKey="year"
          stroke={CHART.axis}
          tick={{ fill: CHART.mutedInk, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART.axis }}
        />
        <YAxis
          stroke={CHART.axis}
          tick={{ fill: CHART.mutedInk, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v)}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.secondaryInk }} iconType="circle" iconSize={8} />
        <ReferenceLine
          x={purchaseYear}
          stroke={CHART.secondaryInk}
          strokeDasharray="4 4"
          label={{ value: `Purchase (${purchaseYear})`, position: 'top', fill: CHART.secondaryInk, fontSize: 11 }}
        />
        <Bar dataKey="monthlySipInvested" name="Monthly SIP invested" fill={sipColor} radius={[3, 3, 0, 0]} />
        <Bar dataKey="emi" name="Monthly EMI" fill={emiColor} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
