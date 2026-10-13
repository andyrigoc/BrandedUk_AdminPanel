import { allowMethods, readJsonBody, sendJson } from '../../../_lib/http.js'
import { createTemplate, listTemplates } from '../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const templates = await listTemplates()
        return sendJson(res, 200, { templates })
    }

    if (req.method === 'POST') {
        const body = await readJsonBody(req)
        if (!body.name || !(body.product_type || body.productType)) {
            return sendJson(res, 400, { error: 'name and product_type are required' })
        }

        const template = await createTemplate(body)
        return sendJson(res, 201, { template })
    }

    return allowMethods(res, ['GET', 'POST'])
}

