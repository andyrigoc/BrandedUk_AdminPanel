import fs from 'fs/promises'
import os from 'os'
import path from 'path'

// Upstash Redis REST API (Vercel Marketplace → "Upstash for Redis" injects KV_REST_API_URL / KV_REST_API_TOKEN).
function redisConfig() {
    const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim()
    const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()
    return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

function createRedisStore({ url, token }) {
    const command = async (...args) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload.error) {
            throw new Error(`Redis ${args[0]} failed: ${payload.error || `HTTP ${response.status}`}`)
        }
        return payload.result
    }

    const parse = (raw) => {
        if (raw === null || raw === undefined) return null
        try { return JSON.parse(raw) } catch { return null }
    }

    return {
        kind: 'redis',
        async getJson(key) { return parse(await command('GET', key)) },
        async setJson(key, value, ttlSeconds) {
            const args = ['SET', key, JSON.stringify(value)]
            if (ttlSeconds) args.push('EX', String(ttlSeconds))
            await command(...args)
        },
        async mgetJson(keys) {
            if (!keys.length) return []
            const raw = await command('MGET', ...keys)
            return (raw || []).map(parse)
        },
        async incrBy(key, amount, ttlSeconds) {
            const value = await command('INCRBY', key, String(amount))
            if (ttlSeconds) await command('EXPIRE', key, String(ttlSeconds))
            return Number(value)
        },
        async del(...keys) { if (keys.length) await command('DEL', ...keys) },
    }
}

// Local-development fallback only; Vercel's filesystem is ephemeral so this is never used there.
function createFileStore(filePath) {
    const load = async () => {
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'))
            const now = Date.now()
            for (const [key, entry] of Object.entries(data)) {
                if (entry?.expiresAt && entry.expiresAt < now) delete data[key]
            }
            return data
        } catch {
            return {}
        }
    }
    const save = async (data) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
    }
    const expiry = (ttlSeconds) => (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null)

    return {
        kind: 'file',
        filePath,
        async getJson(key) { return (await load())[key]?.value ?? null },
        async setJson(key, value, ttlSeconds) {
            const data = await load()
            data[key] = { value, expiresAt: expiry(ttlSeconds) }
            await save(data)
        },
        async mgetJson(keys) {
            const data = await load()
            return keys.map((key) => data[key]?.value ?? null)
        },
        async incrBy(key, amount, ttlSeconds) {
            const data = await load()
            const next = Number(data[key]?.value || 0) + amount
            data[key] = { value: next, expiresAt: expiry(ttlSeconds) }
            await save(data)
            return next
        },
        async del(...keys) {
            const data = await load()
            keys.forEach((key) => delete data[key])
            await save(data)
        },
    }
}

export function getStore() {
    const redis = redisConfig()
    if (redis) return createRedisStore(redis)
    if (process.env.CLARITY_STORE_FILE || !process.env.VERCEL) {
        return createFileStore(process.env.CLARITY_STORE_FILE || path.join(os.tmpdir(), 'brandeduk-clarity-store.json'))
    }
    return null
}
