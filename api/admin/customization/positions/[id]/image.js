import { allowMethods, readJsonBody, sendJson } from '../../../../_lib/http.js'
import { savePositionImage } from '../../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return allowMethods(res, ['POST'])
    }

    try {
        const body = await readJsonBody(req)
        const result = await savePositionImage(req.query.id, body)
        return result
            ? sendJson(res, 200, result)
            : sendJson(res, 404, { error: 'Position not found' })
    } catch (error) {
        return sendJson(res, 400, { error: error.message })
    }
}

