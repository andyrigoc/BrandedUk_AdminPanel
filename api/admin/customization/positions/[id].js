import { allowMethods, readJsonBody, sendJson } from '../../../_lib/http.js'
import { deletePosition, updatePosition } from '../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    const { id } = req.query

    if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const position = await updatePosition(id, body)
        return position
            ? sendJson(res, 200, { position })
            : sendJson(res, 404, { error: 'Position not found' })
    }

    if (req.method === 'DELETE') {
        const deleted = await deletePosition(id)
        return deleted
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 404, { error: 'Position not found' })
    }

    return allowMethods(res, ['PUT', 'DELETE'])
}

