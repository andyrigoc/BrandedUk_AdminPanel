// Local check of the Clarity integration with a mocked Clarity API (no real token needed).
//   node scripts/clarity-selftest.mjs           -> runs assertions against the real handlers
//   node scripts/clarity-selftest.mjs --serve   -> starts the real dev server (vite.config.js) on :3010 with Clarity mocked
//       --empty  no token (empty state)     --seed  pre-fill 28 days of history
// Mock runs use a temp history file, never data/clarity-history.json.
import assert from 'assert/strict'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'

const SERVE = process.argv.includes('--serve')
const STORE_FILE = path.join(os.tmpdir(), `clarity-selftest-${SERVE ? 'serve' : Date.now()}.json`)

Object.assign(process.env, {
    CLARITY_STORE_FILE: STORE_FILE,
    CLARITY_API_TOKEN: 'mock-token',
    ADMIN_PANEL_PASSWORD: 'local-test-password',
    ADMIN_SESSION_SECRET: 'local-test-secret-local-test-secret-123456',
    CRON_SECRET: 'local-cron-secret',
})
delete process.env.KV_REST_API_URL
delete process.env.UPSTASH_REDIS_REST_URL

const realFetch = globalThis.fetch
let clarityCalls = 0
let dayFactor = 1

const n = (value) => String(Math.round(value * dayFactor))
// Non-count metrics drift with the day too, but equal `base` when dayFactor is 1 (the assertions rely on that).
const v = (base, swing, digits = 1) => Number((base * (1 + (dayFactor - 1) * swing)).toFixed(digits))
const behaviour = (metricName, subTotal, pct, dims = {}) => ({
    metricName,
    information: [{ sessionsCount: n(412), sessionsWithMetricPercentage: v(pct, -1.2), sessionsWithoutMetricPercentage: 100 - v(pct, -1.2), pagesViews: n(990), subTotal: n(subTotal), ...dims }],
})
const list = (metricName, rows) => ({ metricName, information: rows.map(([name, count]) => ({ name, sessionsCount: n(count) })) })

function mockClarity(url) {
    const params = new URL(url).searchParams
    const dims = ['dimension1', 'dimension2', 'dimension3'].map((key) => params.get(key)).filter(Boolean)
    const key = dims.join('+')

    if (!dims.length) {
        return [
            { metricName: 'Traffic', information: [{ totalSessionCount: n(412), totalBotSessionCount: n(37), distantUserCount: n(298), PagesPerSessionPercentage: v(2.41, 0.8, 2) }] },
            { metricName: 'ScrollDepth', information: [{ averageScrollDepth: v(54.3, 0.5) }] },
            { metricName: 'EngagementTime', information: [{ totalTime: String(v(187, 0.6, 0)), activeTime: String(v(71, 0.9, 0)) }] },
            behaviour('DeadClickCount', 41, 6.1),
            behaviour('RageClickCount', 12, 2.4),
            behaviour('QuickbackClick', 33, 7.8),
            behaviour('ExcessiveScroll', 9, 1.9),
            behaviour('ScriptErrorCount', 5, 1.2),
            behaviour('ErrorClickCount', 3, 0.7),
            { metricName: 'PopularPages', information: [
                { url: 'https://www.brandeduk.com/', visitsCount: n(210) },
                { url: 'https://www.brandeduk.com/hoodies', visitsCount: n(96) },
                { url: 'https://www.brandeduk.com/product/GD057', visitsCount: n(51) },
            ] },
            { metricName: 'ReferrerUrl', information: [{ name: 'www.google.com', sessionsCount: n(180) }, { name: 'www.bing.com', sessionsCount: n(22) }] },
            { metricName: 'Device', information: [{ name: 'Mobile', sessionsCount: n(260) }, { name: 'PC', sessionsCount: n(140) }] },
            list('Country', [['United Kingdom', 371], ['Ireland', 12], ['United States', 9], ['Germany', 7], ['France', 5], ['Netherlands', 4], ['Spain', 3]]),
            list('Browser', [['Chrome', 214], ['Safari', 118], ['Edge', 41], ['Samsung Internet', 19], ['Firefox', 12], ['Opera', 4]]),
            list('OS', [['Android', 162], ['iOS', 104], ['Windows', 98], ['MacOS', 36], ['Linux', 8]]),
        ]
    }
    if (key === 'Source+Medium+Campaign') {
        const rows = [
            { Source: 'google', Medium: 'cpc', Campaign: 'Workwear UK - Search', s: 168, u: 140, p: 2.9 },
            { Source: 'google', Medium: 'organic', Campaign: '', s: 121, u: 96, p: 2.2 },
            { Source: '', Medium: '', Campaign: '', s: 84, u: 50, p: 1.8 },
            { Source: 'bing', Medium: 'organic', Campaign: '', s: 22, u: 19, p: 2.0 },
            { Source: 'facebook', Medium: 'social', Campaign: 'autumn', s: 17, u: 15, p: 1.4 },
            { Source: 'chatgpt.com', Medium: 'referral', Campaign: '', s: 11, u: 10, p: 3.1 },
            { Source: 'newsletter', Medium: 'email', Campaign: 'october-offers', s: 9, u: 9, p: 2.6 },
            { Source: 'printingforum.co.uk', Medium: 'referral', Campaign: '', s: 6, u: 6, p: 1.7 },
        ]
        return [
            { metricName: 'Traffic', information: rows.map(({ s, u, p, ...d }) => ({ totalSessionCount: n(s), totalBotSessionCount: '0', distantUserCount: n(u), PagesPerSessionPercentage: p, ...d })) },
            { metricName: 'RageClickCount', information: [{ subTotal: n(7), sessionsCount: n(168), sessionsWithMetricPercentage: 3.1, Source: 'google', Medium: 'cpc', Campaign: 'Workwear UK - Search' }] },
        ]
    }
    if (key === 'Device') {
        return [
            { metricName: 'Traffic', information: [
                { totalSessionCount: n(260), totalBotSessionCount: n(20), distantUserCount: n(190), PagesPerSessionPercentage: 2.1, Device: 'Mobile' },
                { totalSessionCount: n(140), totalBotSessionCount: n(15), distantUserCount: n(100), PagesPerSessionPercentage: 3.0, Device: 'PC' },
                { totalSessionCount: n(12), totalBotSessionCount: n(2), distantUserCount: n(8), PagesPerSessionPercentage: 2.5, Device: 'Tablet' },
            ] },
            behaviour('RageClickCount', 9, 3.4, { Device: 'Mobile' }),
        ]
    }
    if (key === 'URL') {
        return [{ metricName: 'Traffic', information: [
            { totalSessionCount: n(205), distantUserCount: n(170), PagesPerSessionPercentage: 2.4, URL: 'https://www.brandeduk.com/' },
            { totalSessionCount: n(93), distantUserCount: n(80), PagesPerSessionPercentage: 2.9, URL: 'https://www.brandeduk.com/hoodies' },
            { totalSessionCount: n(49), distantUserCount: n(44), PagesPerSessionPercentage: 3.3, URL: 'https://www.brandeduk.com/product/GD057' },
            { totalSessionCount: n(31), distantUserCount: n(29), PagesPerSessionPercentage: 1.9, URL: 'https://www.brandeduk.com/checkout' },
        ] }]
    }
    return []
}

globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.startsWith('https://www.clarity.ms/export-data/')) {
        clarityCalls++
        assert.equal(init?.headers?.Authorization, 'Bearer mock-token')
        return new Response(JSON.stringify(mockClarity(url)), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return realFetch(input, init)
}

const { runSync, SyncError } = await import('../lib/clarity/sync.js')
const { getStore } = await import('../lib/clarity/store.js')
const sessionHandler = (await import('../api/clarity/session.js')).default
const insightsHandler = (await import('../api/clarity/insights.js')).default
const syncHandler = (await import('../api/clarity/sync.js')).default

async function call(handler, { method = 'GET', url = '/', headers = {}, body, remoteAddress } = {}) {
    return new Promise((resolve, reject) => {
        const res = {
            statusCode: 200,
            headers: {},
            setHeader(name, value) { this.headers[name.toLowerCase()] = value },
            end(payload) { resolve({ status: this.statusCode, body: payload ? JSON.parse(payload) : null }) },
        }
        const req = { method, url, headers, body, socket: { remoteAddress: remoteAddress || '127.0.0.1' } }
        Promise.resolve(handler(req, res)).catch(reject)
    })
}

async function seedHistory(days = 14) {
    const store = getStore()
    const start = Date.UTC(2026, 9, 12, 0, 30) - days * 86400000
    for (let i = 0; i < days; i++) {
        dayFactor = 0.7 + ((i * 37) % 11) / 20 + i * 0.02
        await runSync({ store, source: 'cron', now: new Date(start + i * 86400000) })
    }
    dayFactor = 1
}

if (SERVE) {
    await fs.rm(STORE_FILE, { force: true })
    if (process.argv.includes('--empty')) process.env.CLARITY_API_TOKEN = ''
    else if (process.argv.includes('--seed')) await seedHistory(28)
    // Point the dev server at a throwaway env file so the real .env.local (and its token) is never read.
    process.env.CLARITY_ENV_FILE = path.join(os.tmpdir(), 'clarity-selftest-serve.env')
    await fs.writeFile(process.env.CLARITY_ENV_FILE, `CLARITY_API_TOKEN=${process.env.CLARITY_API_TOKEN}\n`)

    const { createServer } = await import('vite')
    const vite = await createServer({
        configFile: path.resolve('vite.config.js'),
        server: { port: 3010, strictPort: true },
    })
    await vite.listen()
    console.log('Admin panel dev server (Clarity mocked): http://localhost:3010/clarity')
    console.log(`Mock history file: ${STORE_FILE}`)
} else {
    const store = getStore()
    assert.equal(store.kind, 'file')

    // Auth
    assert.equal((await call(insightsHandler)).status, 401)
    assert.equal((await call(sessionHandler, { method: 'POST', body: { password: 'nope' } })).status, 401)
    const login = await call(sessionHandler, { method: 'POST', body: { password: process.env.ADMIN_PANEL_PASSWORD } })
    assert.equal(login.status, 200)
    const auth = { authorization: `Bearer ${login.body.token}` }
    assert.equal((await call(insightsHandler, { headers: { authorization: `Bearer ${login.body.token}x` } })).status, 401)
    assert.equal((await call(syncHandler, { headers: auth })).status, 401, 'GET sync must require CRON_SECRET, not an admin session')

    // Empty state
    const empty = await call(insightsHandler, { headers: auth })
    assert.equal(empty.status, 200)
    assert.equal(empty.body.latest, null)
    assert.equal(empty.body.configured.token, true)

    // Cron sync -> history
    const cron = await call(syncHandler, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
    assert.equal(cron.status, 200, JSON.stringify(cron.body))
    assert.equal(clarityCalls, 4)

    const after = await call(insightsHandler, { url: '/api/clarity/insights?days=7', headers: auth })
    const latest = after.body.latest
    assert.equal(after.body.history.length, 1)
    assert.equal(latest.totals.sessions, 412)
    assert.equal(latest.totals.users, 298)
    assert.equal(latest.totals.pagesPerSession, 2.41)
    assert.equal(latest.totals.scrollDepth, 54.3)
    assert.equal(latest.totals.engagementActive, 71)
    assert.equal(latest.totals.rageClicks, 12)
    assert.equal(latest.totals.rageClicksPct, 2.4)
    assert.equal(latest.totals.quickbacks, 33)
    assert.equal(latest.totals.scriptErrors, 5)
    assert.equal(latest.acquisition[0].source, 'google')
    assert.equal(latest.acquisition[0].medium, 'cpc')
    assert.equal(latest.acquisition[0].rageClicks, 7)
    assert.ok(latest.acquisition.some((row) => row.source === '(none)'))
    assert.deepEqual(latest.byDevice.map((row) => row.device), ['Mobile', 'PC', 'Tablet'])
    assert.equal(latest.byDevice[0].rageClicks, 9)
    assert.equal(latest.byUrl[0].url, 'https://www.brandeduk.com/')
    assert.equal(latest.popularPages[0].value, 210)
    assert.equal(latest.countries[0].name, 'United Kingdom')
    assert.equal(after.body.budget.usedToday, 4)

    // Manual sync fills today's history only if missing; third sync of the day exceeds the 8-call budget
    const historyBefore = (await call(insightsHandler, { headers: auth })).body.history.map((h) => h.date)
    const manual = await call(syncHandler, { method: 'POST', headers: auth })
    assert.equal(manual.status, 200)
    const historyAfter = (await call(insightsHandler, { headers: auth })).body.history.map((h) => h.date)
    assert.equal(historyAfter.length, historyBefore.includes(manual.body.date) ? historyBefore.length : historyBefore.length + 1)
    const blocked = await call(syncHandler, { method: 'POST', headers: auth })
    assert.equal(blocked.status, 429)
    assert.equal(blocked.body.code, 'budget_exceeded')
    assert.equal(clarityCalls, 8, 'budget guard must stop before calling Clarity')

    // Missing token -> clear error, no calls
    await assert.rejects(runSync({ store, token: '' }), (error) => error instanceof SyncError && error.code === 'missing_token')

    // Multi-day history + range aggregation
    await seedHistory(10)
    const ranged = await call(insightsHandler, { url: '/api/clarity/insights?days=30', headers: auth })
    assert.ok(ranged.body.history.length >= 10)
    assert.ok(ranged.body.range.acquisition[0].sessions > 168)
    assert.deepEqual([...ranged.body.history.map((h) => h.date)], [...ranged.body.history.map((h) => h.date)].sort())

    await fs.rm(STORE_FILE, { force: true })

    // Local mode (npm run dev): no password, loopback only, auto-sync once per day
    const localFile = path.join(os.tmpdir(), `clarity-selftest-local-${Date.now()}.json`)
    Object.assign(process.env, { CLARITY_LOCAL_MODE: '1', CLARITY_STORE_FILE: localFile })
    const callsBefore = clarityCalls

    const first = await call(insightsHandler)
    assert.equal(first.status, 200)
    assert.equal(first.body.mode, 'local')
    assert.equal(first.body.autoSyncDue, true)
    assert.equal((await call(insightsHandler, { remoteAddress: '192.168.1.20' })).status, 401)

    const auto = await call(syncHandler, { method: 'POST', body: { auto: true } })
    assert.equal(auto.status, 200, JSON.stringify(auto.body))
    assert.equal(auto.body.date, new Date().toISOString().slice(0, 10))
    assert.equal(clarityCalls - callsBefore, 4)

    const second = await call(insightsHandler)
    assert.equal(second.body.autoSyncDue, false)
    assert.equal(second.body.history.length, 1)
    assert.equal(second.body.latest.totals.sessions, 412)
    assert.equal((await call(syncHandler, { method: 'POST', body: { auto: true } })).status, 409)
    assert.equal(clarityCalls - callsBefore, 4, 'second auto-sync must not call Clarity')

    const written = await fs.readFile(localFile, 'utf8')
    assert.ok(written.includes(`clarity:snapshot:${auto.body.date}`))
    assert.ok(!written.includes('mock-token'), 'token must never be stored')

    process.env.CLARITY_API_TOKEN = ''
    const noToken = await call(insightsHandler)
    assert.equal(noToken.body.configured.token, false)
    assert.equal(noToken.body.autoSyncDue, false)

    delete process.env.CLARITY_LOCAL_MODE
    await fs.rm(localFile, { force: true })
    console.log(`Clarity self-test passed (${clarityCalls} mocked Clarity calls).`)
}
