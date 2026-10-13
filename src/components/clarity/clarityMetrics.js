export const BRAND_PURPLE = '#995BD5'
export const SLICE_COLOURS = ['#995BD5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#70864f', '#b15d24', '#9a3b83']
export const OTHER_COLOUR = '#cbd5e1'

export const STATUS_STYLES = {
    good: { colour: '#10b981', label: 'Good', pill: 'bg-emerald-50 text-emerald-700' },
    warn: { colour: '#f59e0b', label: 'Watch', pill: 'bg-amber-50 text-amber-700' },
    bad: { colour: '#ef4444', label: 'Poor', pill: 'bg-rose-50 text-rose-700' },
    info: { colour: BRAND_PURPLE, label: null, pill: '' },
    none: { colour: '#cbd5e1', label: 'No data', pill: 'bg-slate-100 text-slate-500' },
}

// Rough industry rules of thumb for e-commerce sites; tweak here if they feel too strict.
export const RING_METRICS = [
    {
        key: 'scrollDepth',
        label: 'Scroll depth',
        higherIsBetter: true,
        good: 50,
        warn: 30,
        hint: 'Average share of the page people scroll through. Under 30% = content isn’t drawing them down.',
    },
    {
        key: 'rageClicksPct',
        label: 'Rage clicks',
        good: 1,
        warn: 3,
        hint: 'Sessions with repeated angry clicking. Above 3% = something frustrating on the page.',
    },
    {
        key: 'deadClicksPct',
        label: 'Dead clicks',
        good: 5,
        warn: 10,
        hint: 'Sessions clicking things that don’t respond. Above 10% = elements look clickable but aren’t.',
    },
    {
        key: 'quickbacksPct',
        label: 'Quickbacks',
        good: 5,
        warn: 10,
        hint: 'Sessions that bounce straight back. Above 10% = pages don’t match what visitors expected.',
    },
    {
        key: 'excessiveScrollPct',
        label: 'Excessive scrolling',
        good: 3,
        warn: 8,
        hint: 'Sessions scrolling up and down hunting for something. Above 8% = content is hard to find.',
    },
    {
        key: 'scriptErrorsPct',
        label: 'Script errors',
        good: 1,
        warn: 3,
        hint: 'Sessions hitting a JavaScript error. Above 3% = a feature is probably broken.',
    },
]

export function ratingFor(metric, value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'none'
    if (metric.info) return 'info'
    const v = Number(value)
    if (metric.higherIsBetter) return v >= metric.good ? 'good' : v >= metric.warn ? 'warn' : 'bad'
    return v <= metric.good ? 'good' : v <= metric.warn ? 'warn' : 'bad'
}

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search', 'sem'])
const SEARCH_ENGINES = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia', 'baidu', 'yandex']
const SOCIAL_SOURCES = ['facebook', 'instagram', 'linkedin', 'twitter', 't.co', 'x.com', 'tiktok', 'pinterest', 'youtube', 'reddit', 'whatsapp']
const AI_SOURCES = ['chatgpt', 'openai', 'perplexity', 'copilot', 'gemini', 'claude']
const EMPTY = new Set(['', '(none)', '(not set)', '(direct)', 'direct', 'none'])

export const GOOGLE_ADS = 'Google Ads'

export function isGoogleAds(row) {
    const source = String(row.source || '').toLowerCase()
    const medium = String(row.medium || '').toLowerCase()
    return (source.includes('google') && PAID_MEDIUMS.has(medium)) || source === 'googleads' || source === 'adwords'
}

export function classifyChannel(row) {
    const source = String(row.source || '').toLowerCase().trim()
    const medium = String(row.medium || '').toLowerCase().trim()
    if (isGoogleAds(row)) return GOOGLE_ADS
    if (PAID_MEDIUMS.has(medium)) return 'Other paid'
    if (AI_SOURCES.some((name) => source.includes(name))) return 'AI assistants'
    if (medium === 'organic' || (SEARCH_ENGINES.some((name) => source.includes(name)) && EMPTY.has(medium))) return 'Organic search'
    if (medium === 'social' || SOCIAL_SOURCES.some((name) => source.includes(name))) return 'Social'
    if (medium === 'email' || medium === 'newsletter') return 'Email'
    if (EMPTY.has(source) || medium === 'direct' || /^(localhost|127\.|192\.168\.)/.test(source)) return 'Direct'
    return 'Referral'
}

/** Groups rows into donut slices (top N + "Other"), dropping zero values, with percentages. */
export function toSlices(rows, { nameOf, valueFor = (row) => row.sessions || 0, top = 5, highlight } = {}) {
    const grouped = new Map()
    for (const row of rows || []) {
        const value = Number(valueFor(row)) || 0
        if (value <= 0) continue
        const name = nameOf(row)
        grouped.set(name, (grouped.get(name) || 0) + value)
    }
    const sorted = [...grouped.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const total = sorted.reduce((sum, slice) => sum + slice.value, 0)
    const head = sorted.slice(0, top)
    const rest = sorted.slice(top).reduce((sum, slice) => sum + slice.value, 0)
    if (rest > 0) head.push({ name: 'Other', value: rest, other: true })
    // A highlighted slice always gets brand purple; the rest skip it so it stays unique.
    const palette = highlight ? SLICE_COLOURS.slice(1) : SLICE_COLOURS
    let colourIndex = 0
    return {
        total,
        slices: head.map((slice) => {
            const highlighted = Boolean(highlight && !slice.other && highlight(slice.name))
            return {
                ...slice,
                pct: total ? (slice.value / total) * 100 : 0,
                highlight: highlighted,
                colour: slice.other ? OTHER_COLOUR : highlighted ? BRAND_PURPLE : palette[colourIndex++ % palette.length],
            }
        }),
    }
}

export function pageLabel(url) {
    try {
        const parsed = new URL(url)
        const live = /(^|\.)brandeduk\.com$/i.test(parsed.hostname)
        return { path: `${parsed.pathname}${parsed.search}` || '/', host: live ? null : parsed.host }
    } catch {
        return { path: String(url || '/'), host: null }
    }
}

export const formatNumber = (value) => (value === null || value === undefined ? '—' : Number(value).toLocaleString('en-GB', { maximumFractionDigits: 0 }))
export const formatDecimal = (value, digits = 2) => (value === null || value === undefined ? '—' : Number(value).toFixed(digits))
export const formatPercent = (value, digits = 1) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : `${Number(value).toFixed(digits)}%`)
export const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '—'
    const total = Math.round(Number(seconds))
    const minutes = Math.floor(total / 60)
    return minutes ? `${minutes}m ${total % 60}s` : `${total}s`
}
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
export const shortDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })

export const pctChange = (current, previous) => {
    if (current === null || current === undefined || !previous) return null
    return Math.round(((current - previous) / previous) * 100)
}
