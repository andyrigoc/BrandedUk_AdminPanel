import { fetchProjectInsights } from './clarityApi.js'
import { buildSnapshot } from './parse.js'
import { HISTORY_RETENTION_DAYS, SYNC_QUERIES, getApiToken, getDailyBudget, getProjectId } from './config.js'

const KEYS = {
    index: 'clarity:index',
    latest: 'clarity:latest',
    lastSync: 'clarity:lastSync',
    snapshot: (date) => `clarity:snapshot:${date}`,
    calls: (day) => `clarity:calls:${day}`,
    autoSync: (day) => `clarity:autosync:${day}`,
}

const TWO_DAYS = 2 * 24 * 60 * 60
const RETENTION_SECONDS = HISTORY_RETENTION_DAYS * 24 * 60 * 60

const utcDay = (date) => new Date(date).toISOString().slice(0, 10)

export class SyncError extends Error {
    constructor(code, message, extra = {}) {
        super(message)
        this.code = code
        Object.assign(this, extra)
    }
}

export async function getCallsUsedToday(store, now = new Date()) {
    return Number((await store.getJson(KEYS.calls(utcDay(now)))) || 0)
}

/**
 * Pulls the last 24h from Clarity (one call per SYNC_QUERIES entry) and stores a snapshot.
 * - cron (Vercel, 00:30 UTC): history entry labelled with the day the window mostly covers.
 * - auto (local, first open of the day): history entry labelled with the capture day.
 * - manual ("Sync now"): refreshes "latest"; only fills history if that day has no entry yet.
 */
export async function runSync({
    store,
    source = 'cron',
    token = getApiToken(),
    projectId = getProjectId(),
    budget = getDailyBudget(),
    fetchImpl = fetch,
    now = new Date(),
}) {
    if (!token) throw new SyncError('missing_token', 'CLARITY_API_TOKEN is not configured.')
    if (!store) throw new SyncError('missing_storage', 'No storage configured (connect Upstash Redis to the Vercel project).')

    const callsKey = KEYS.calls(utcDay(now))
    const cost = SYNC_QUERIES.length
    const used = await store.incrBy(callsKey, cost, TWO_DAYS)
    if (used > budget) {
        await store.incrBy(callsKey, -cost, TWO_DAYS)
        throw new SyncError('budget_exceeded', `Daily Clarity call budget reached (${used - cost}/${budget} used today, a sync needs ${cost}).`, { usedToday: used - cost, budget })
    }

    const queryResults = await Promise.all(SYNC_QUERIES.map(async ({ key, dimensions }) => {
        try {
            const data = await fetchProjectInsights({ token, numOfDays: 1, dimensions, fetchImpl })
            return { key, dimensions, ok: true, status: 200, data }
        } catch (error) {
            return { key, dimensions, ok: false, status: error.status ?? null, error: error.message }
        }
    }))

    if (queryResults.some((result) => result.status === 429)) {
        await store.setJson(callsKey, Math.max(budget, used), TWO_DAYS)
    }

    const capturedAt = now.toISOString()
    const succeeded = queryResults.filter((result) => result.ok)
    const errors = queryResults.filter((result) => !result.ok).map(({ key, status, error }) => ({ key, status, error }))
    const lastSync = { at: capturedAt, source, ok: succeeded.length > 0, partial: errors.length > 0, callsUsed: cost, errors }

    if (!succeeded.length) {
        await store.setJson(KEYS.lastSync, lastSync)
        throw new SyncError('clarity_failed', errors[0]?.error || 'All Clarity requests failed.', { errors })
    }

    const snapshot = buildSnapshot({ projectId, capturedAt, source, numOfDays: 1, queryResults })
    if (source !== 'cron') snapshot.date = utcDay(now)
    await store.setJson(KEYS.latest, snapshot, RETENTION_SECONDS)

    const index = new Set((await store.getJson(KEYS.index)) || [])
    if (source !== 'manual' || !index.has(snapshot.date)) {
        await store.setJson(KEYS.snapshot(snapshot.date), snapshot, RETENTION_SECONDS)
        index.add(snapshot.date)
        const sorted = [...index].sort()
        const dropped = sorted.slice(0, Math.max(0, sorted.length - HISTORY_RETENTION_DAYS))
        await store.setJson(KEYS.index, sorted.slice(dropped.length))
        if (dropped.length) await store.del(...dropped.map(KEYS.snapshot))
    }

    await store.setJson(KEYS.lastSync, lastSync)
    return { snapshot, lastSync, usedToday: used, budget }
}

// Local mode has no cron: the first page open of the (UTC) day triggers one sync, attempted at most once.
export async function isAutoSyncDue({ store, now = new Date(), budget = getDailyBudget() }) {
    if (!store || !getApiToken()) return false
    const day = utcDay(now)
    const [index, attempted, used] = await Promise.all([
        store.getJson(KEYS.index),
        store.getJson(KEYS.autoSync(day)),
        getCallsUsedToday(store, now),
    ])
    return !(index || []).includes(day) && !attempted && used + SYNC_QUERIES.length <= budget
}

export async function markAutoSyncAttempt(store, now = new Date()) {
    await store.setJson(KEYS.autoSync(utcDay(now)), true, TWO_DAYS)
}

export async function readHistory({ store, days = 30, now = new Date() }) {
    const index = ((await store.getJson(KEYS.index)) || []).slice(-days)
    const [snapshots, latest, lastSync, usedToday] = await Promise.all([
        store.mgetJson(index.map(KEYS.snapshot)),
        store.getJson(KEYS.latest),
        store.getJson(KEYS.lastSync),
        getCallsUsedToday(store, now),
    ])
    return {
        history: snapshots.filter(Boolean),
        latest,
        lastSync,
        usedToday,
    }
}
