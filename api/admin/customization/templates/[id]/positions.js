import { allowMethods, readJsonBody, sendJson } from '../../../../_lib/http.js'
import { createPosition } from '../../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return allowMethods(res, ['POST'])
    }

    const body = await readJsonBody(req)
    if (!body.label) {
        return sendJson(res, 400, { error: 'label is required' })
    }

    const position = await createPosition(req.query.id, body)
    return position
        ? sendJson(res, 201, { position })
        : sendJson(res, 404, { error: 'Template not found' })
}

