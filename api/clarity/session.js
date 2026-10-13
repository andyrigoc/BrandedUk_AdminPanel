import { allowMethods, readJsonBody, sendJson } from '../../lib/clarity/http.js'
import { checkAdminPassword, clientIp, isAuthConfigured, isSessionTokenRequest, issueSessionToken } from '../../lib/clarity/auth.js'
import { getStore } from '../../lib/clarity/store.js'

const MAX_ATTEMPTS = 10
const WINDOW_SECONDS = 15 * 60

// Exchanges the admin password (ADMIN_PANEL_PASSWORD) for a short-lived signed token used by /api/clarity/*.
export default async function handler(req, res) {
    if (req.method === 'GET') {
        if (!isAuthConfigured()) {
            return sendJson(res, 503, {
                code: 'auth_not_configured',
                error: 'Set ADMIN_PANEL_PASSWORD and ADMIN_SESSION_SECRET (32+ chars) to sign in.',
            })
        }
        if (!isSessionTokenRequest(req)) return sendJson(res, 401, { error: 'Admin session is invalid or expired.' })
        return sendJson(res, 200, { valid: true })
    }

    if (req.method !== 'POST') return allowMethods(res, ['GET', 'POST'])

    if (!isAuthConfigured()) {
        return sendJson(res, 503, {
            code: 'auth_not_configured',
            error: 'Set ADMIN_PANEL_PASSWORD and ADMIN_SESSION_SECRET (32+ chars) in Vercel to unlock Clarity data.',
        })
    }

    const store = getStore()
    const attemptsKey = `clarity:login:${clientIp(req)}`
    if (store) {
        const attempts = Number((await store.getJson(attemptsKey).catch(() => 0)) || 0)
        if (attempts >= MAX_ATTEMPTS) {
            return sendJson(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' })
        }
    }

    const { password } = await readJsonBody(req)
    if (!checkAdminPassword(password)) {
        if (store) await store.incrBy(attemptsKey, 1, WINDOW_SECONDS).catch(() => {})
        await new Promise((resolve) => setTimeout(resolve, 600))
        return sendJson(res, 401, { error: 'Wrong password.' })
    }

    if (store) await store.del(attemptsKey).catch(() => {})
    return sendJson(res, 200, issueSessionToken())
}
