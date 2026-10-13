import fs from 'fs'
import path from 'path'
import insightsHandler from '../../api/clarity/insights.js'
import sessionHandler from '../../api/clarity/session.js'
import syncHandler from '../../api/clarity/sync.js'
import { isLoopbackRequest } from './auth.js'

export const LOCAL_ENV_FILE = '.env.local'
const LOCAL_ENV_KEYS = [
    'CLARITY_API_TOKEN',
    'CLARITY_PROJECT_ID',
    'CLARITY_DAILY_CALL_BUDGET',
    'ADMIN_PANEL_PASSWORD',
    'ADMIN_SESSION_SECRET',
]

const ROUTES = {
    '/api/clarity/insights': insightsHandler,
    '/api/clarity/session': sessionHandler,
    '/api/clarity/sync': syncHandler,
}

function readLocalEnv(root) {
    const values = {}
    let content = ''
    try {
        content = fs.readFileSync(process.env.CLARITY_ENV_FILE || path.join(root, LOCAL_ENV_FILE), 'utf8')
    } catch {
        return values
    }
    for (const line of content.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
        if (!match || !LOCAL_ENV_KEYS.includes(match[1])) continue
        values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
    return values
}

// Serves /api/clarity/* from the Vite dev server (npm run dev) so the panel works locally without Vercel.
// .env.local is re-read on every request, so pasting the token takes effect without a restart.
export default function clarityLocalApi() {
    let root = process.cwd()
    const startupEnv = Object.fromEntries(LOCAL_ENV_KEYS.map((key) => [key, process.env[key] || '']))

    return {
        name: 'clarity-local-api',
        apply: 'serve',
        configResolved(config) {
            root = config.root
        },
        configureServer(server) {
            process.env.CLARITY_LOCAL_MODE = '1'
            process.env.CLARITY_STORE_FILE = process.env.CLARITY_STORE_FILE || path.join(root, 'data', 'clarity-history.json')

            server.middlewares.use(async (req, res, next) => {
                const handler = ROUTES[(req.url || '').split('?')[0]]
                if (!handler) return next()

                if (!isLoopbackRequest(req)) {
                    res.statusCode = 403
                    res.setHeader('Content-Type', 'application/json')
                    return res.end(JSON.stringify({ error: 'Clarity API is only available from this computer.' }))
                }

                const localEnv = readLocalEnv(root)
                for (const key of LOCAL_ENV_KEYS) process.env[key] = localEnv[key] || startupEnv[key]

                try {
                    await handler(req, res)
                } catch (error) {
                    console.error('[clarity] request failed:', error?.message || error)
                    if (res.writableEnded) return
                    if (!res.headersSent) {
                        res.statusCode = 500
                        res.setHeader('Content-Type', 'application/json')
                    }
                    res.end(JSON.stringify({ error: 'Clarity request failed.' }))
                }
            })
        },
    }
}
