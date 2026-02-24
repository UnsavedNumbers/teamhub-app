import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '../../../utils/cn'

interface DataPoint {
  label: string
  value: number
}

interface DataSnapshotChartProps {
  title: string
  data: DataPoint[]
  valueLabel?: string
  className?: string
}

/**
 * Small, clean area chart for dashboard snapshot (minimal axes, subtle animation).
 */
const gradientId = (title: string) => `snapshot-gradient-${title.replace(/\s+/g, '-')}`

export function DataSnapshotChart({
  title,
  data,
  valueLabel = 'Count',
  className,
}: DataSnapshotChartProps) {
  const color = 'var(--org-btn-primary-bg)'
  const id = gradientId(title)
  return (
    <section className={cn('rounded-xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900', className)}>
      <h3 className="mb-4 text-base font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--tw-slate-200)',
              }}
              formatter={(value) => [value ?? 0, valueLabel]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
