import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'customization-data.json')
const PUBLIC_DIR = path.join(path.dirname(__dirname), 'public')
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads', 'customization')
const REMOTE_API_BASE = 'https://api.brandeduk.com'

const nowIso = () => new Date().toISOString()

const seedData = () => {
    const now = nowIso()

    return {
        templates: [
            {
                id: 1,
                name: 'T-shirt standard',
                product_type: 't-shirts',
                status: 'published',
                version: 1,
                created_at: now,
                updated_at: now,
                published_at: now
            }
        ],
        positions: [
            {
                id: 1,
                template_id: 1,
                code: 'left-chest',
                label: 'Left Chest',
                preview_image_url: '/uploads/customization/tshirts/left-chest.png',
                colour_preview_images: {},
                sort_order: 1,
                max_width_cm: 10,
                max_height_cm: 6,
                embroidery_enabled: true,
                embroidery_price: 5,
                embroidery_poa: false,
                print_enabled: true,
                print_price: 3.5,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: 2,
                template_id: 1,
                code: 'right-chest',
                label: 'Right Chest',
                preview_image_url: '/uploads/customization/tshirts/right-chest.png',
                colour_preview_images: {},
                sort_order: 2,
                max_width_cm: 10,
                max_height_cm: 6,
                embroidery_enabled: true,
                embroidery_price: 5,
                embroidery_poa: false,
                print_enabled: true,
                print_price: 3.5,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: 3,
                template_id: 1,
                code: 'left-sleeve',
                label: 'Left Sleeve',
                preview_image_url: '/uploads/customization/tshirts/left-sleeve.png',
                colour_preview_images: {},
                sort_order: 3,
                max_width_cm: 8,
                max_height_cm: 8,
                embroidery_enabled: true,
                embroidery_price: 4.5,
                embroidery_poa: false,
                print_enabled: true,
                print_price: 3.25,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: 4,
                template_id: 1,
                code: 'right-sleeve',
                label: 'Right Sleeve',
                preview_image_url: '/uploads/customization/tshirts/right-sleeve.png',
                colour_preview_images: {},
                sort_order: 4,
                max_width_cm: 8,
                max_height_cm: 8,
                embroidery_enabled: true,
                embroidery_price: 4.5,
                embroidery_poa: false,
                print_enabled: true,
                print_price: 3.25,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: 5,
                template_id: 1,
                code: 'large-front',
                label: 'Large Front',
                preview_image_url: '/uploads/customization/tshirts/large-front.png',
                colour_preview_images: {},
                sort_order: 5,
                max_width_cm: 28,
                max_height_cm: 35,
                embroidery_enabled: true,
                embroidery_price: null,
                embroidery_poa: true,
                print_enabled: true,
                print_price: 5,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: 6,
                template_id: 1,
                code: 'large-back',
                label: 'Large Back',
                preview_image_url: '/uploads/customization/tshirts/large-back.png',
                colour_preview_images: {},
                sort_order: 6,
                max_width_cm: 28,
                max_height_cm: 35,
                embroidery_enabled: true,
                embroidery_price: null,
                embroidery_poa: true,
                print_enabled: true,
                print_price: 5,
                print_poa: false,
                active: true,
                created_at: now,
                updated_at: now
            }
        ],
        overrides: [],
        order_customization_snapshots: []
    }
}

const normalizeSlug = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function ensureDataFile() {
    await fs.mkdir(DATA_DIR, { recursive: true })

    try {
        await fs.access(DATA_FILE)
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify(seedData(), null, 2), 'utf8')
    }
}

export async function readCustomizationData() {
    await ensureDataFile()
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
}

export async function writeCustomizationData(data) {
    await ensureDataFile()
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    return data
}

export async function listTemplates() {
    const data = await readCustomizationData()
    return data.templates
        .map(template => ({
            ...template,
            positions: data.positions
                .filter(position => position.template_id === template.id)
                .sort((a, b) => a.sort_order - b.sort_order)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTemplateById(id) {
    const data = await readCustomizationData()
    const template = data.templates.find(item => item.id === Number(id))
    if (!template) return null

    return {
        ...template,
        positions: data.positions
            .filter(position => position.template_id === template.id)
            .sort((a, b) => a.sort_order - b.sort_order)
    }
}

function nextId(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

export async function createTemplate(payload) {
    const data = await readCustomizationData()
    const now = nowIso()
    const template = {
        id: nextId(data.templates),
        name: payload.name,
        product_type: normalizeSlug(payload.product_type || payload.productType),
        status: payload.status === 'published' ? 'published' : 'draft',
        version: Number(payload.version) > 0 ? Number(payload.version) : 1,
        created_at: now,
        updated_at: now,
        published_at: payload.status === 'published' ? now : null
    }

    data.templates.push(template)
    await writeCustomizationData(data)
    return { ...template, positions: [] }
}

export async function updateTemplate(id, payload) {
    const data = await readCustomizationData()
    const template = data.templates.find(item => item.id === Number(id))
    if (!template) return null

    template.name = payload.name ?? template.name
    template.product_type = normalizeSlug(payload.product_type || payload.productType || template.product_type)
    template.status = payload.status ?? template.status
    template.version = Number(payload.version) > 0 ? Number(payload.version) : template.version
    template.updated_at = nowIso()
    if (template.status === 'published' && !template.published_at) {
        template.published_at = template.updated_at
    }

    await writeCustomizationData(data)
    return getTemplateById(id)
}

export async function deleteTemplate(id) {
    const data = await readCustomizationData()
    const templateId = Number(id)
    const nextTemplates = data.templates.filter(item => item.id !== templateId)
    if (nextTemplates.length === data.templates.length) return false

    data.templates = nextTemplates
    data.positions = data.positions.filter(position => position.template_id !== templateId)
    data.overrides = data.overrides.filter(override => override.template_id !== templateId)
    await writeCustomizationData(data)
    return true
}

function normalizeNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

export async function createPosition(templateId, payload) {
    const data = await readCustomizationData()
    const template = data.templates.find(item => item.id === Number(templateId))
    if (!template) return null

    const now = nowIso()
    const position = {
        id: nextId(data.positions),
        template_id: template.id,
        code: normalizeSlug(payload.code || payload.label),
        label: payload.label,
        preview_image_url: payload.preview_image_url ?? payload.previewImageUrl ?? null,
        colour_preview_images: payload.colour_preview_images || {},
        sort_order: Number(payload.sort_order ?? payload.sortOrder ?? (data.positions.filter(p => p.template_id === template.id).length + 1)),
        max_width_cm: normalizeNullableNumber(payload.max_width_cm ?? payload.maxWidthCm),
        max_height_cm: normalizeNullableNumber(payload.max_height_cm ?? payload.maxHeightCm),
        embroidery_enabled: Boolean(payload.embroidery_enabled ?? payload.embroideryEnabled),
        embroidery_price: normalizeNullableNumber(payload.embroidery_price ?? payload.embroideryPrice),
        embroidery_poa: Boolean(payload.embroidery_poa ?? payload.embroideryPoa),
        print_enabled: Boolean(payload.print_enabled ?? payload.printEnabled),
        print_price: normalizeNullableNumber(payload.print_price ?? payload.printPrice),
        print_poa: Boolean(payload.print_poa ?? payload.printPoa),
        active: payload.active !== undefined ? Boolean(payload.active) : true,
        created_at: now,
        updated_at: now
    }

    data.positions.push(position)
    await writeCustomizationData(data)
    return position
}

export async function updatePosition(id, payload) {
    const data = await readCustomizationData()
    const position = data.positions.find(item => item.id === Number(id))
    if (!position) return null

    if (payload.code !== undefined) position.code = normalizeSlug(payload.code)
    if (payload.label !== undefined) position.label = payload.label
    if (payload.preview_image_url !== undefined || payload.previewImageUrl !== undefined) {
        position.preview_image_url = payload.preview_image_url ?? payload.previewImageUrl
    }
    if (payload.colour_preview_images !== undefined) position.colour_preview_images = payload.colour_preview_images || {}
    if (payload.sort_order !== undefined || payload.sortOrder !== undefined) {
        position.sort_order = Number(payload.sort_order ?? payload.sortOrder)
    }
    if (payload.max_width_cm !== undefined || payload.maxWidthCm !== undefined) {
        position.max_width_cm = normalizeNullableNumber(payload.max_width_cm ?? payload.maxWidthCm)
    }
    if (payload.max_height_cm !== undefined || payload.maxHeightCm !== undefined) {
        position.max_height_cm = normalizeNullableNumber(payload.max_height_cm ?? payload.maxHeightCm)
    }
    if (payload.embroidery_enabled !== undefined || payload.embroideryEnabled !== undefined) {
        position.embroidery_enabled = Boolean(payload.embroidery_enabled ?? payload.embroideryEnabled)
    }
    if (payload.embroidery_price !== undefined || payload.embroideryPrice !== undefined) {
        position.embroidery_price = normalizeNullableNumber(payload.embroidery_price ?? payload.embroideryPrice)
    }
    if (payload.embroidery_poa !== undefined || payload.embroideryPoa !== undefined) {
        position.embroidery_poa = Boolean(payload.embroidery_poa ?? payload.embroideryPoa)
    }
    if (payload.print_enabled !== undefined || payload.printEnabled !== undefined) {
        position.print_enabled = Boolean(payload.print_enabled ?? payload.printEnabled)
    }
    if (payload.print_price !== undefined || payload.printPrice !== undefined) {
        position.print_price = normalizeNullableNumber(payload.print_price ?? payload.printPrice)
    }
    if (payload.print_poa !== undefined || payload.printPoa !== undefined) {
        position.print_poa = Boolean(payload.print_poa ?? payload.printPoa)
    }
    if (payload.active !== undefined) position.active = Boolean(payload.active)
    position.updated_at = nowIso()

    await writeCustomizationData(data)
    return position
}

export async function deletePosition(id) {
    const data = await readCustomizationData()
    const positionId = Number(id)
    const nextPositions = data.positions.filter(item => item.id !== positionId)
    if (nextPositions.length === data.positions.length) return false

    data.positions = nextPositions
    data.overrides = data.overrides.filter(override => Number(override.position_id) !== positionId)
    await writeCustomizationData(data)
    return true
}

export async function publishTemplate(id) {
    const data = await readCustomizationData()
    const template = data.templates.find(item => item.id === Number(id))
    if (!template) return null

    template.status = 'published'
    template.version = Number(template.version || 0) + 1
    template.updated_at = nowIso()
    template.published_at = template.updated_at
    await writeCustomizationData(data)
    return getTemplateById(id)
}

export async function savePositionImage(positionId, payload) {
    const data = await readCustomizationData()
    const position = data.positions.find(item => item.id === Number(positionId))
    if (!position) return null

    if (payload.previewImageUrl || payload.preview_image_url) {
        position.preview_image_url = payload.previewImageUrl ?? payload.preview_image_url
        position.updated_at = nowIso()
        await writeCustomizationData(data)
        return { previewImageUrl: position.preview_image_url }
    }

    const dataUrl = payload.imageBase64 || payload.dataUrl
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        throw new Error('Expected previewImageUrl or imageBase64 data URL')
    }

    const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!matches) {
        throw new Error('Invalid imageBase64 data URL')
    }

    const mimeType = matches[1]
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    const colour = normalizeSlug(payload.colour)
    const template = data.templates.find(item => item.id === position.template_id)
    const productType = normalizeSlug(template?.product_type || 'general')
    const filename = colour
        ? `${position.code}-${colour}.${extension}`
        : `${position.code}.${extension}`
    const folder = path.join(UPLOADS_DIR, productType)
    const absoluteFilePath = path.join(folder, filename)
    const publicUrl = `/uploads/customization/${productType}/${filename}`

    await fs.mkdir(folder, { recursive: true })
    await fs.writeFile(absoluteFilePath, Buffer.from(matches[2], 'base64'))

    if (colour) {
        position.colour_preview_images = {
            ...(position.colour_preview_images || {}),
            [colour]: publicUrl
        }
    } else {
        position.preview_image_url = publicUrl
    }

    position.updated_at = nowIso()
    await writeCustomizationData(data)
    return { previewImageUrl: publicUrl }
}

function resolveProductTypeSlug(product) {
    const candidates = [
        product?.product_type_slug,
        product?.productTypeSlug,
        product?.product_type,
        product?.productType,
        product?.product_type_name,
        product?.typeSlug,
        product?.type_name
    ]

    for (const candidate of candidates) {
        const normalized = normalizeSlug(candidate)
        if (normalized) return normalized
    }

    return null
}

async function fetchRemoteProduct(productCode) {
    const response = await fetch(`${REMOTE_API_BASE}/api/products/${encodeURIComponent(productCode)}`)
    if (!response.ok) return null
    return response.json()
}

export async function buildCustomizationConfig(productCode, colour) {
    const product = await fetchRemoteProduct(productCode)
    if (!product) return null

    const productType = resolveProductTypeSlug(product)
    if (!productType) {
        return {
            productCode,
            productType: null,
            template: null,
            positions: []
        }
    }

    const data = await readCustomizationData()
    const template = data.templates.find(item => item.product_type === productType && item.status === 'published')
    if (!template) {
        return {
            productCode,
            productType,
            template: null,
            positions: []
        }
    }

    const normalizedColour = normalizeSlug(colour)
    const basePositions = data.positions
        .filter(position => position.template_id === template.id)
        .sort((a, b) => a.sort_order - b.sort_order)

    const productIdentifier = String(product?.id || product?.code || product?.style_code || productCode)
    const overrides = data.overrides.filter(override =>
        String(override.product_id || override.product_code || '') === productIdentifier ||
        String(override.product_id || override.product_code || '') === String(productCode)
    )

    const positions = basePositions
        .map((position) => {
            const override = overrides.find(item =>
                item.position_code === position.code || Number(item.position_id) === position.id
            )
            const active = override?.enabled !== undefined ? Boolean(override.enabled) : Boolean(position.active)
            if (!active) return null

            const previewImageUrl = normalizedColour && override?.colour_preview_images?.[normalizedColour]
                ? override.colour_preview_images[normalizedColour]
                : normalizedColour && position.colour_preview_images?.[normalizedColour]
                    ? position.colour_preview_images[normalizedColour]
                    : override?.preview_image_url || position.preview_image_url

            return {
                code: position.code,
                label: override?.label || position.label,
                previewImageUrl,
                sortOrder: override?.sort_order ?? position.sort_order,
                maxWidthCm: override?.max_width_cm ?? position.max_width_cm,
                maxHeightCm: override?.max_height_cm ?? position.max_height_cm,
                methods: [
                    {
                        type: 'embroidery',
                        enabled: override?.embroidery_enabled ?? position.embroidery_enabled,
                        price: override?.embroidery_price ?? position.embroidery_price,
                        poa: override?.embroidery_poa ?? position.embroidery_poa
                    },
                    {
                        type: 'print',
                        enabled: override?.print_enabled ?? position.print_enabled,
                        price: override?.print_price ?? position.print_price,
                        poa: override?.print_poa ?? position.print_poa
                    }
                ]
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)

    return {
        productCode,
        productType,
        template: {
            id: template.id,
            name: template.name,
            version: template.version
        },
        positions
    }
}

export async function createOrderCustomizationSnapshot(orderId, payload) {
    const data = await readCustomizationData()
    const snapshot = {
        id: nextId(data.order_customization_snapshots),
        order_id: orderId,
        ...payload,
        created_at: nowIso()
    }

    data.order_customization_snapshots.push(snapshot)
    await writeCustomizationData(data)
    return snapshot
}
