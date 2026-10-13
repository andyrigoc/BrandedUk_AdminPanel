export function sendJson(res, statusCode, payload) {
    res.status(statusCode).setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(payload))
}

export function allowMethods(res, methods) {
    res.setHeader('Allow', methods.join(', '))
    return sendJson(res, 405, { error: `Method not allowed. Use: ${methods.join(', ')}` })
}

export async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body
    if (!req.body || typeof req.body !== 'string') return {}

    try {
        return JSON.parse(req.body)
    } catch {
        return {}
    }
}

