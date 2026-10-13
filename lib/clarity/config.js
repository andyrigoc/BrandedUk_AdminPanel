export const CLARITY_EXPORT_URL = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'
export const DEFAULT_PROJECT_ID = 'ywi8r3ew9l'

// Clarity allows 10 export calls per project per day; keep headroom for manual use in Clarity itself.
export const CLARITY_DAILY_LIMIT = 10
export const DEFAULT_DAILY_BUDGET = 8

export const HISTORY_RETENTION_DAYS = 180
export const MAX_BREAKDOWN_ROWS = 50

// One sync = one call per query. Keep this list short: every entry costs 1 of the 10 daily calls.
export const SYNC_QUERIES = [
    { key: 'overall', dimensions: [] },
    { key: 'acquisition', dimensions: ['Source', 'Medium', 'Campaign'] },
    { key: 'device', dimensions: ['Device'] },
    { key: 'pages', dimensions: ['URL'] },
]

export function getProjectId() {
    return (process.env.CLARITY_PROJECT_ID || '').trim() || DEFAULT_PROJECT_ID
}

export function getApiToken() {
    return (process.env.CLARITY_API_TOKEN || '').trim()
}

export function getDailyBudget() {
    const configured = Number.parseInt(process.env.CLARITY_DAILY_CALL_BUDGET || '', 10)
    if (!Number.isFinite(configured) || configured < SYNC_QUERIES.length) return DEFAULT_DAILY_BUDGET
    return Math.min(configured, CLARITY_DAILY_LIMIT)
}

export function getClarityLinks(projectId = getProjectId()) {
    const base = `https://clarity.microsoft.com/projects/view/${encodeURIComponent(projectId)}`
    return {
        dashboard: `${base}/dashboard`,
        recordings: `${base}/impressions`,
        heatmaps: `${base}/heatmaps`,
        settings: `${base}/settings`,
    }
}
