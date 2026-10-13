import { sendJson } from '../../_lib/http.js'
import { buildCustomizationConfig } from '../../../lib/customizationStore.js'

export default async function handler(req, res) {
    try {
        const { productCode, colour } = req.query
        const config = await buildCustomizationConfig(productCode, colour)

        if (!config) {
            return sendJson(res, 404, { error: 'Product not found' })
        }

        return sendJson(res, 200, config)
    } catch (error) {
        return sendJson(res, 500, { error: error.message || 'Failed to build customization config' })
    }
}

