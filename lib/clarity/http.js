export function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
}

export function allowMethods(res, methods) {
    res.setHeader('Allow', methods.join(', '))
    return sendJson(res, 405, { error: `Method not allowed. Use: ${methods.join(', ')}` })
}

export async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body) } catch { return {} }
    }
    if (typeof req[Symbol.asyncIterator] !== 'function') return {}
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}
