import { useId } from 'react'
import {
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Sector,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import Card from '../Card'
import { BRAND_PURPLE, STATUS_STYLES, formatNumber, formatPercent, pageLabel } from './clarityMetrics'

const TOOLTIP_STYLE = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }

export const Ring = ({ value, colour, size = 104, stroke = 10, display, label }) => {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const pct = Number.isFinite(Number(value)) ? Math.min(Math.max(Number(value), 0), 100) : 0
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0">
            <title>{label}</title>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colour}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-slate-900" style={{ fontSize: size / 5.2, fontWeight: 700 }}>
                {display}
            </text>
        </svg>
    )
}

export const RingCard = ({ label, value, rating, hint, footnote }) => {
    const style = STATUS_STYLES[rating] || STATUS_STYLES.none
    const display = rating === 'none' ? '—' : formatPercent(value, Number(value) >= 10 ? 0 : 1)
    return (
        <Card className="p-5 border-slate-200 shadow-sm rounded-xl flex flex-col items-center text-center gap-3">
            <Ring value={value} colour={style.colour} display={display} label={`${label}: ${display}${style.label ? ` (${style.label})` : ''}`} />
            <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                    {style.label && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${style.pill}`}>{style.label}</span>}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
                {footnote && <p className="text-[11px] text-slate-400">{footnote}</p>}
            </div>
        </Card>
    )
}

export const Sparkline = ({ data, dataKey, colour = '#ffffff', label }) => {
    const id = useId().replace(/:/g, '')
    if (!data || data.length < 2) return null
    return (
        <div className="h-10 w-full" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colour} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={colour} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey={dataKey} stroke={colour} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

const RADIAN = Math.PI / 180
const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.08 || percent > 0.99) return null
    const radius = innerRadius + (outerRadius - innerRadius) / 2
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
            {`${Math.round(percent * 100)}%`}
        </text>
    )
}

const renderHighlightedSlice = (props) => <Sector {...props} outerRadius={props.outerRadius + 7} stroke="#fff" strokeWidth={2} />

export const DonutCard = ({ icon: Icon, title, subtitle, data, unit = 'sessions', highlightLabel }) => {
    const { slices = [], total = 0 } = data || {}
    const highlightIndex = slices.findIndex((slice) => slice.highlight)
    const summary = slices.map((slice) => `${slice.name} ${Math.round(slice.pct)}%`).join(', ')
    return (
        <Card className="p-6 border-slate-200 shadow-sm rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-[#995BD5]" />}
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                </div>
                {subtitle && <span className="text-xs font-medium text-slate-400 text-right">{subtitle}</span>}
            </div>
            {slices.length === 0 ? (
                <div className="flex items-center justify-center h-[190px] text-slate-400 text-sm">No data for this period</div>
            ) : (
                <div className="flex flex-col xl:flex-row items-center gap-5">
                    <div className="relative w-[190px] h-[190px] shrink-0" role="img" aria-label={`${title}: ${summary}`}>
                        <PieChart width={190} height={190}>
                            <Pie
                                data={slices}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={82}
                                paddingAngle={slices.length > 1 ? 2 : 0}
                                stroke="none"
                                label={renderSliceLabel}
                                labelLine={false}
                                activeIndex={highlightIndex >= 0 ? highlightIndex : undefined}
                                activeShape={renderHighlightedSlice}
                                isAnimationActive={false}
                            >
                                {slices.map((slice) => <Cell key={slice.name} fill={slice.colour} />)}
                            </Pie>
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                formatter={(value, name) => [`${formatNumber(value)} ${unit} (${formatPercent(total ? (value / total) * 100 : 0, 0)})`, name]}
                            />
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-slate-900 leading-none">{formatNumber(total)}</span>
                            <span className="text-[11px] text-slate-400 mt-1">{unit}</span>
                        </div>
                    </div>
                    <ul className="flex-1 w-full space-y-2 min-w-0">
                        {slices.map((slice) => (
                            <li key={slice.name} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${slice.highlight ? 'bg-[#995BD5]/10' : ''}`}>
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.colour }} aria-hidden="true" />
                                <span className={`flex-1 min-w-0 truncate ${slice.highlight ? 'font-bold text-[#995BD5]' : 'text-slate-700'}`} title={slice.name}>
                                    {slice.name}
                                    {slice.highlight && highlightLabel && <span className="ml-1.5 text-[10px] font-bold uppercase">{highlightLabel}</span>}
                                </span>
                                <span className="text-xs text-slate-400 tabular-nums">{formatNumber(slice.value)}</span>
                                <span className="w-11 text-right font-bold text-slate-900 tabular-nums">{formatPercent(slice.pct, 0)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    )
}

export const TrendCard = ({ title, subtitle, data, series, formatValue = formatNumber, height = 220, axisWidth = 52 }) => {
    const id = useId().replace(/:/g, '')
    const points = data || []
    return (
        <Card className="p-6 border-slate-200 shadow-sm rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                {subtitle && <span className="text-xs font-medium text-slate-400 text-right">{subtitle}</span>}
            </div>
            {points.length < 2 ? (
                <div className="flex flex-col items-center justify-center text-center gap-3" style={{ height }}>
                    {points.length === 1 ? (
                        <>
                            <div className="flex items-center gap-6">
                                {series.map((s) => (
                                    <div key={s.key} className="flex flex-col items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.colour, boxShadow: `0 0 0 6px ${s.colour}22` }} aria-hidden="true" />
                                        <span className="text-lg font-bold text-slate-900">{formatValue(points[0][s.key])}</span>
                                        <span className="text-[11px] text-slate-400">{s.name} · {points[0].label}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400">Trend appears after 2+ days of history.</p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">No history yet — one point is added each day.</p>
                    )}
                </div>
            ) : (
                <div role="img" aria-label={`${title} over ${points.length} days`}>
                    <ResponsiveContainer width="100%" height={height}>
                        <AreaChart data={points} margin={{ top: 5, right: 8, bottom: 0, left: -8 }}>
                            <defs>
                                {series.map((s) => (
                                    <linearGradient key={s.key} id={`grad-${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={s.colour} stopOpacity={s.fill === false ? 0 : 0.32} />
                                        <stop offset="100%" stopColor={s.colour} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={18} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={formatValue} width={axisWidth} allowDecimals />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [formatValue(value), name]} />
                            {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
                            {series.map((s) => (
                                <Area
                                    key={s.key}
                                    type="monotone"
                                    name={s.name}
                                    dataKey={s.key}
                                    stroke={s.colour}
                                    strokeWidth={2.5}
                                    fill={`url(#grad-${id}-${s.key})`}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    )
}

export const PageBars = ({ rows, totalSessions, limit = 10 }) => {
    const visible = (rows || []).filter((row) => row.value > 0).slice(0, limit)
    if (!visible.length) return <div className="py-10 text-center text-slate-400 text-sm">No page data</div>
    return (
        <ul className="space-y-3" aria-label="Top pages by share of sessions">
            {visible.map((row) => {
                const { path, host } = pageLabel(row.name)
                const pct = totalSessions ? Math.min((row.value / totalSessions) * 100, 100) : 0
                return (
                    <li key={row.name}>
                        <div className="flex items-center justify-between gap-3 text-sm mb-1">
                            <a href={row.name} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-medium text-slate-700 hover:text-[#995BD5]" title={row.name}>
                                {path}
                                {host && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold" title="Not the live site — local or test traffic">{host}</span>}
                            </a>
                            <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                                {formatNumber(row.value)} · <b className="text-slate-900">{formatPercent(pct, 0)}</b>
                            </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden" role="presentation">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1.5)}%`, background: `linear-gradient(90deg, ${BRAND_PURPLE}, #c4a1ec)` }} />
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
