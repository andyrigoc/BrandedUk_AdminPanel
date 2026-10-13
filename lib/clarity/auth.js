import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_TTL_SECONDS = 12 * 60 * 60
const MIN_SECRET_LENGTH = 32

const bearerToken = (req) => {
    const header = req.headers?.authorization || req.headers?.Authorization || ''
    const match = /^Bearer\s+(.+)$/i.exec(String(header).trim())
    return match ? match[1].trim() : ''
}

const safeEqual = (a, b) => {
    const left = Buffer.from(String(a))
    const right = Buffer.from(String(b))
    return left.length === right.length && timingSafeEqual(left, right)
}

const sessionSecret = () => {
    const secret = (process.env.ADMIN_SESSION_SECRET || '').trim()
    return secret.length >= MIN_SECRET_LENGTH ? secret : ''
}

const adminPassword = () => process.env.ADMIN_PANEL_PASSWORD || ''

const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url')

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

// Set by the Vite dev plugin; never true on Vercel.
export function isLocalMode() {
    return process.env.CLARITY_LOCAL_MODE === '1' && !process.env.VERCEL
}

export function isLoopbackRequest(req) {
    return LOOPBACK_ADDRESSES.has(req.socket?.remoteAddress || '')
}

export function isAuthConfigured() {
    return Boolean(sessionSecret() && adminPassword())
}

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set on the project.
export function isCronRequest(req) {
    const secret = (process.env.CRON_SECRET || '').trim()
    const token = bearerToken(req)
    return Boolean(secret && token && safeEqual(token, secret))
}

export function checkAdminPassword(candidate) {
    const expected = adminPassword()
    if (!expected || typeof candidate !== 'string' || !candidate) return false
    // Compare fixed-length digests so the check doesn't leak the password length.
    const digest = (value) => createHmac('sha256', 'clarity-admin-password').update(value).digest()
    return timingSafeEqual(digest(candidate), digest(expected))
}

export function issueSessionToken(now = Date.now()) {
    const secret = sessionSecret()
    if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.')
    const expiresAt = now + SESSION_TTL_SECONDS * 1000
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: expiresAt })).toString('base64url')
    return { token: `${payload}.${sign(payload, secret)}`, expiresAt: new Date(expiresAt).toISOString() }
}

export function verifySessionToken(token, now = Date.now()) {
    const secret = sessionSecret()
    if (!secret || !token) return false
    const [payload, signature] = String(token).split('.')
    if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false
    try {
        const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
        return sub === 'admin' && Number(exp) > now
    } catch {
        return false
    }
}

export function isAdminRequest(req) {
    if (isLocalMode()) return isLoopbackRequest(req)
    return verifySessionToken(bearerToken(req))
}

export function isSessionTokenRequest(req) {
    return verifySessionToken(bearerToken(req))
}

export function clientIp(req) {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
    return forwarded || req.socket?.remoteAddress || 'unknown'
}
