import { allowMethods, readJsonBody, sendJson } from '../../lib/clarity/http.js'
import { isAdminRequest, isCronRequest, isLocalMode } from '../../lib/clarity/auth.js'
import { getStore } from '../../lib/clarity/store.js'
import { SyncError, isAutoSyncDue, markAutoSyncAttempt, runSync } from '../../lib/clarity/sync.js'

const ERROR_STATUS = {
    missing_token: 503,
    missing_storage: 503,
    budget_exceeded: 429,
    clarity_failed: 502,
}

// GET is used by Vercel Cron (daily history entry); POST is the admin "Sync now" button, or
// { auto: true } from the page on first open of the day when running locally (no cron there).
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return allowMethods(res, ['GET', 'POST'])

    const store = getStore()
    let source
    if (req.method === 'GET') {
        if (!isCronRequest(req)) return sendJson(res, 401, { error: 'Unauthorized' })
        source = 'cron'
    } else {
        if (!isAdminRequest(req)) return sendJson(res, 401, { code: 'unauthorized', error: 'Admin unlock required.' })
        const body = await readJsonBody(req)
        source = body?.auto ? 'auto' : 'manual'
        if (source === 'auto') {
            if (!isLocalMode() || !(await isAutoSyncDue({ store }))) {
                return sendJson(res, 409, { ok: false, code: 'not_due', error: 'Automatic sync not due.' })
            }
            await markAutoSyncAttempt(store)
        }
    }

    try {
        const { snapshot, lastSync, usedToday, budget } = await runSync({ store, source })
        return sendJson(res, 200, { ok: true, source, date: snapshot.date, lastSync, usedToday, budget })
    } catch (error) {
        if (error instanceof SyncError) {
            return sendJson(res, ERROR_STATUS[error.code] || 500, { ok: false, code: error.code, error: error.message, errors: error.errors })
        }
        console.error('[clarity] sync failed:', error?.message || error)
        return sendJson(res, 500, { ok: false, code: 'internal', error: 'Clarity sync failed.' })
    }
}
