import { CLARITY_EXPORT_URL } from './config.js'

export class ClarityApiError extends Error {
    constructor(message, status) {
        super(message)
        this.name = 'ClarityApiError'
        this.status = status
    }
}

const STATUS_MESSAGES = {
    400: 'Clarity rejected the request parameters (400).',
    401: 'Clarity token missing, invalid or expired (401). Generate a new one in Clarity → Settings → Data Export.',
    403: 'Clarity token not authorised for this project (403).',
    429: 'Clarity daily export limit reached (429). Try again tomorrow.',
}

export async function fetchProjectInsights({ token, numOfDays = 1, dimensions = [], fetchImpl = fetch, timeoutMs = 20000 }) {
    if (!token) throw new ClarityApiError('CLARITY_API_TOKEN is not set.', 0)

    const params = new URLSearchParams({ numOfDays: String(numOfDays) })
    dimensions.slice(0, 3).forEach((dimension, index) => {
        params.set(`dimension${index + 1}`, dimension)
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let response
    try {
        response = await fetchImpl(`${CLARITY_EXPORT_URL}?${params}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        })
    } catch (error) {
        const message = error?.name === 'AbortError' ? 'Clarity request timed out.' : `Clarity request failed: ${error?.message || error}`
        throw new ClarityApiError(message, 0)
    } finally {
        clearTimeout(timer)
    }

    if (!response.ok) {
        throw new ClarityApiError(STATUS_MESSAGES[response.status] || `Clarity returned HTTP ${response.status}.`, response.status)
    }

    const payload = await response.json().catch(() => null)
    if (!Array.isArray(payload)) {
        throw new ClarityApiError('Clarity returned an unexpected response shape (expected an array of metrics).', response.status)
    }
    return payload
}
