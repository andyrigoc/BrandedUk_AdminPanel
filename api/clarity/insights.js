import { allowMethods, sendJson } from '../../lib/clarity/http.js'
import { isAdminRequest, isAuthConfigured, isLocalMode } from '../../lib/clarity/auth.js'
import { getStore } from '../../lib/clarity/store.js'
import { isAutoSyncDue, readHistory } from '../../lib/clarity/sync.js'
import { CLARITY_DAILY_LIMIT, SYNC_QUERIES, getApiToken, getClarityLinks, getDailyBudget, getProjectId } from '../../lib/clarity/config.js'

const SUMMED_FIELDS = ['sessions', 'botSessions', 'users', 'rageClicks', 'deadClicks', 'quickbacks', 'scriptErrors', 'errorClicks', 'excessiveScroll']

function aggregateRows(snapshots, field, dimensionFields) {
    const merged = new Map()
    for (const snapshot of snapshots) {
        for (const row of snapshot[field] || []) {
            const key = dimensionFields.map((dimension) => row[dimension]).join('\u0001')
            const current = merged.get(key) || Object.fromEntries(dimensionFields.map((dimension) => [dimension, row[dimension]]))
            for (const metric of SUMMED_FIELDS) {
                if (typeof row[metric] === 'number') current[metric] = (current[metric] || 0) + row[metric]
            }
            merged.set(key, current)
        }
    }
    return [...merged.values()].sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 50)
}

function aggregateList(snapshots, field) {
    const merged = new Map()
    for (const snapshot of snapshots) {
        for (const { name, value } of snapshot[field] || []) merged.set(name, (merged.get(name) || 0) + (value || 0))
    }
    return [...merged.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 50)
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return allowMethods(res, ['GET'])

    if (!isAuthConfigured()) {
        return sendJson(res, 503, {
            code: 'auth_not_configured',
            error: 'Set ADMIN_PANEL_PASSWORD and ADMIN_SESSION_SECRET (32+ chars) in Vercel to unlock Clarity data.',
        })
    }
    if (!isAdminRequest(req)) return sendJson(res, 401, { code: 'unauthorized', error: 'Admin unlock required.' })

    const url = new URL(req.url || '/', 'http://localhost')
    const days = Math.min(Math.max(Number.parseInt(url.searchParams.get('days'), 10) || 30, 1), 180)
    const projectId = getProjectId()
    const store = getStore()

    const localMode = isLocalMode()
    const base = {
        mode: localMode ? 'local' : 'hosted',
        autoSyncDue: false,
        projectId,
        links: getClarityLinks(projectId),
        configured: {
            token: Boolean(getApiToken()),
            storage: store?.kind || null,
            cronSecret: Boolean((process.env.CRON_SECRET || '').trim()),
        },
        budget: { limit: getDailyBudget(), clarityLimit: CLARITY_DAILY_LIMIT, callsPerSync: SYNC_QUERIES.length, usedToday: 0 },
        days,
        latest: null,
        lastSync: null,
        history: [],
        range: { acquisition: [], byDevice: [], byUrl: [], browsers: [], os: [], countries: [] },
    }

    if (!store) return sendJson(res, 200, base)

    try {
        const [{ history, latest, lastSync, usedToday }, autoSyncDue] = await Promise.all([
            readHistory({ store, days }),
            localMode ? isAutoSyncDue({ store }) : false,
        ])
        return sendJson(res, 200, {
            ...base,
            autoSyncDue,
            budget: { ...base.budget, usedToday },
            latest,
            lastSync,
            history: history.map(({ date, capturedAt, totals, totalsEstimated }) => ({ date, capturedAt, totals, totalsEstimated })),
            range: {
                acquisition: aggregateRows(history, 'acquisition', ['source', 'medium', 'campaign']),
                byDevice: aggregateRows(history, 'byDevice', ['device']),
                byUrl: aggregateRows(history, 'byUrl', ['url']),
                browsers: aggregateList(history, 'browsers'),
                os: aggregateList(history, 'os'),
                countries: aggregateList(history, 'countries'),
            },
        })
    } catch (error) {
        console.error('[clarity] read failed:', error)
        return sendJson(res, 500, { ...base, error: 'Could not read Clarity history from storage.' })
    }
}
