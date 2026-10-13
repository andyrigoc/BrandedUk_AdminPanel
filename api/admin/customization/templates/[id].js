import { allowMethods, readJsonBody, sendJson } from '../../../_lib/http.js'
import { deleteTemplate, getTemplateById, updateTemplate } from '../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    const { id } = req.query

    if (req.method === 'GET') {
        const template = await getTemplateById(id)
        return template
            ? sendJson(res, 200, { template })
            : sendJson(res, 404, { error: 'Template not found' })
    }

    if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        const template = await updateTemplate(id, body)
        return template
            ? sendJson(res, 200, { template })
            : sendJson(res, 404, { error: 'Template not found' })
    }

    if (req.method === 'DELETE') {
        const deleted = await deleteTemplate(id)
        return deleted
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 404, { error: 'Template not found' })
    }

    return allowMethods(res, ['GET', 'PUT', 'DELETE'])
}

