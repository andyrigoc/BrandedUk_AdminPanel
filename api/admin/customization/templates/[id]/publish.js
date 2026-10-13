import { allowMethods, sendJson } from '../../../../_lib/http.js'
import { publishTemplate } from '../../../../../lib/customizationStore.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return allowMethods(res, ['POST'])
    }

    const template = await publishTemplate(req.query.id)
    return template
        ? sendJson(res, 200, { template })
        : sendJson(res, 404, { error: 'Template not found' })
}

