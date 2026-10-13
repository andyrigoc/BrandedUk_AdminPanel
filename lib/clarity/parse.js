import { MAX_BREAKDOWN_ROWS } from './config.js'

const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const METRIC_ALIASES = {
    traffic: 'traffic',
    scrolldepth: 'scrollDepth',
    engagementtime: 'engagementTime',
    deadclickcount: 'deadClicks',
    rageclickcount: 'rageClicks',
    quickbackclick: 'quickbacks',
    excessivescroll: 'excessiveScroll',
    scripterrorcount: 'scriptErrors',
    errorclickcount: 'errorClicks',
    popularpages: 'popularPages',
    referrerurl: 'referrers',
    referrer: 'referrers',
    device: 'devices',
    os: 'os',
    browser: 'browsers',
    countryregion: 'countries',
    country: 'countries',
    pagetitle: 'pageTitles',
}

const BEHAVIOUR_METRICS = new Set(['deadClicks', 'rageClicks', 'quickbacks', 'excessiveScroll', 'scriptErrors', 'errorClicks'])
const LIST_METRICS = new Set(['popularPages', 'referrers', 'devices', 'os', 'browsers', 'countries', 'pageTitles'])
const ADDITIVE_FIELDS = new Set([
    'sessions', 'botSessions', 'users',
    ...[...BEHAVIOUR_METRICS].flatMap((metric) => [metric, `${metric}Sessions`]),
])

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(String(value).replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
}

function indexRow(row) {
    const index = new Map()
    if (row && typeof row === 'object') {
        for (const [key, value] of Object.entries(row)) index.set(normalize(key), value)
    }
    return index
}

const pick = (index, ...candidates) => {
    for (const candidate of candidates) {
        if (index.has(candidate)) return index.get(candidate)
    }
    return undefined
}

function metricValues(metric, index) {
    if (metric === 'traffic') {
        return {
            sessions: toNumber(pick(index, 'totalsessioncount', 'sessionscount', 'sessions')),
            botSessions: toNumber(pick(index, 'totalbotsessioncount', 'botsessions')),
            users: toNumber(pick(index, 'distantusercount', 'distinctusercount', 'usercount', 'users')),
            pagesPerSession: toNumber(pick(index, 'pagespersessionpercentage', 'pagespersession')),
        }
    }
    if (metric === 'scrollDepth') {
        return { scrollDepth: toNumber(pick(index, 'averagescrolldepth', 'scrolldepth')) }
    }
    if (metric === 'engagementTime') {
        return {
            engagementTotal: toNumber(pick(index, 'totaltime')),
            engagementActive: toNumber(pick(index, 'activetime')),
        }
    }
    if (BEHAVIOUR_METRICS.has(metric)) {
        return {
            [metric]: toNumber(pick(index, 'subtotal', 'count')),
            [`${metric}Sessions`]: toNumber(pick(index, 'sessionscount')),
            [`${metric}Pct`]: toNumber(pick(index, 'sessionswithmetricpercentage')),
        }
    }
    return {}
}

function listEntry(index) {
    const name = pick(index, 'url', 'name', 'title', 'pagetitle', 'referrer', 'referrerurl')
    const value = toNumber(pick(index, 'visitscount', 'sessionscount', 'count', 'totalsessioncount'))
    if (name === undefined || name === null || name === '') return null
    return { name: String(name), value: value ?? 0 }
}

function groupByMetric(results) {
    const grouped = {}
    for (const entry of Array.isArray(results) ? results : []) {
        const metric = METRIC_ALIASES[normalize(entry?.metricName)]
        if (!metric) continue
        grouped[metric] = Array.isArray(entry.information) ? entry.information : []
    }
    return grouped
}

const sortRows = (rows) => rows
    .sort((a, b) => (b.sessions ?? b.value ?? 0) - (a.sessions ?? a.value ?? 0))
    .slice(0, MAX_BREAKDOWN_ROWS)

export function parseOverall(results) {
    const grouped = groupByMetric(results)
    const totals = {}
    const lists = {}

    for (const [metric, rows] of Object.entries(grouped)) {
        if (LIST_METRICS.has(metric)) {
            lists[metric] = sortRows(rows.map((row) => listEntry(indexRow(row))).filter(Boolean))
        } else if (rows.length) {
            Object.assign(totals, metricValues(metric, indexRow(rows[0])))
        }
    }
    return { totals, lists }
}

export function parseBreakdown(results, dimensions) {
    const grouped = groupByMetric(results)
    const dimensionKeys = dimensions.map((dimension) => ({ field: dimension.toLowerCase(), key: normalize(dimension) }))
    const merged = new Map()

    for (const [metric, rows] of Object.entries(grouped)) {
        if (LIST_METRICS.has(metric)) continue
        for (const row of rows) {
            const index = indexRow(row)
            const dims = {}
            for (const { field, key } of dimensionKeys) {
                const value = index.get(key)
                dims[field] = value === undefined || value === null || value === '' ? '(none)' : String(value)
            }
            const rowKey = dimensionKeys.map(({ field }) => dims[field]).join('\u0001')
            const current = merged.get(rowKey) || { ...dims }
            for (const [field, value] of Object.entries(metricValues(metric, index))) {
                if (value === null) continue
                current[field] = ADDITIVE_FIELDS.has(field) && current[field] !== undefined ? current[field] + value : value
            }
            merged.set(rowKey, current)
        }
    }
    return sortRows([...merged.values()])
}

function estimateTotalsFromRows(rows) {
    if (!rows?.length) return null
    let sessions = 0
    let botSessions = 0
    let users = 0
    let weightedPages = 0
    for (const row of rows) {
        sessions += row.sessions || 0
        botSessions += row.botSessions || 0
        users += row.users || 0
        weightedPages += (row.pagesPerSession || 0) * (row.sessions || 0)
    }
    return {
        sessions,
        botSessions,
        users,
        pagesPerSession: sessions ? Number((weightedPages / sessions).toFixed(4)) : null,
    }
}

export function snapshotDateFor(capturedAt) {
    // numOfDays=1 covers the 24h before the call; label it by the window midpoint (UTC).
    return new Date(new Date(capturedAt).getTime() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function buildSnapshot({ projectId, capturedAt, source, numOfDays = 1, queryResults }) {
    const byKey = Object.fromEntries(queryResults.map((result) => [result.key, result]))
    const overall = byKey.overall?.data ? parseOverall(byKey.overall.data) : { totals: {}, lists: {} }

    const acquisition = byKey.acquisition?.data ? parseBreakdown(byKey.acquisition.data, byKey.acquisition.dimensions) : []
    const byDevice = byKey.device?.data ? parseBreakdown(byKey.device.data, byKey.device.dimensions) : []
    const byUrl = byKey.pages?.data ? parseBreakdown(byKey.pages.data, byKey.pages.dimensions) : []

    let totals = overall.totals
    let totalsEstimated = false
    if (totals.sessions === undefined || totals.sessions === null) {
        const estimate = estimateTotalsFromRows(byDevice) || estimateTotalsFromRows(acquisition)
        if (estimate) {
            totals = { ...totals, ...estimate }
            totalsEstimated = true
        }
    }

    return {
        version: 1,
        projectId,
        source,
        numOfDays,
        capturedAt,
        date: snapshotDateFor(capturedAt),
        totals,
        totalsEstimated,
        popularPages: overall.lists.popularPages || [],
        referrers: overall.lists.referrers || [],
        devices: overall.lists.devices || [],
        os: overall.lists.os || [],
        browsers: overall.lists.browsers || [],
        countries: overall.lists.countries || [],
        acquisition,
        byDevice,
        byUrl,
        queries: queryResults.map(({ key, dimensions, ok, status, error }) => ({ key, dimensions, ok, status: status ?? null, error: error ?? null })),
    }
}
