import { useEffect, useMemo, useRef, useState } from 'react'
import Card from '../components/Card'
import {
    AlertCircle,
    CheckCircle2,
    GripVertical,
    Image as ImageIcon,
    Plus,
    Search,
    Trash2,
    Upload,
    X
} from 'lucide-react'
import { API_BASE } from '../config'

const TEMPLATE_API = `${API_BASE}/api/admin/customization/templates`
const PRODUCT_TYPES_API = TEMPLATE_API
const PRICE_SCHEMA_API = `${API_BASE}/api/customization-price-schema`

const templateRequestUrl = (slug, subtypeKey = '') => {
    const path = `${TEMPLATE_API}/${encodeURIComponent(slug)}`
    if (!subtypeKey) return path
    return `${path}?${new URLSearchParams({ subtype: subtypeKey }).toString()}`
}
const IMAGE_UPLOAD_API = `${API_BASE}/api/admin/customization-config/upload-image`

const GENERIC_SUBTYPE = { key: '', label: 'Generic fallback' }
const CUSTOMIZATION_SUBTYPES = {
    aprons: [{ key: 'bib', label: 'Bib apron' }, { key: 'waist', label: 'Waist apron' }],
    bags: [
        { key: 'tote', label: 'Tote / shopper' },
        { key: 'drawstring-gymsac', label: 'Drawstring / gymsac' },
        { key: 'book-bag', label: 'Book bag' },
        { key: 'backpack', label: 'Backpack / rucksack' },
        { key: 'messenger', label: 'Messenger bag' },
        { key: 'holdall', label: 'Holdall / duffel' },
        { key: 'boot-bag', label: 'Boot bag' },
        { key: 'laptop-document', label: 'Laptop / document bag' }
    ],
    beanies: [{ key: 'cuffed', label: 'Cuffed beanie' }, { key: 'bobble', label: 'Bobble beanie' }],
    bibs: [{ key: 'baby-bib', label: 'Baby bib' }],
    blankets: [{ key: 'blanket', label: 'Blanket' }],
    blouses: [{ key: 'blouse', label: 'Blouse' }],
    bodysuits: [{ key: 'baby-bodysuit', label: 'Baby bodysuit' }],
    caps: [{ key: 'baseball', label: 'Baseball cap' }, { key: 'trucker', label: 'Trucker cap' }],
    'chef-jackets': [{ key: 'chef-jacket', label: 'Chef jacket' }],
    coveralls: [{ key: 'coverall-overall', label: 'Coverall / overall' }],
    'dog-hoodies': [{ key: 'dog-hoodie', label: 'Dog hoodie' }],
    'dog-jackets': [{ key: 'dog-jacket', label: 'Dog jacket' }],
    'dog-t-shirts': [{ key: 'dog-tshirt', label: 'Dog T-shirt' }],
    dungarees: [{ key: 'bib-brace', label: 'Bib and brace' }],
    fleece: [{ key: 'full-zip', label: 'Full zip fleece' }, { key: 'quarter-zip', label: 'Quarter zip fleece' }],
    'gilets-body-warmers': [{ key: 'standard', label: 'Standard gilet' }, { key: 'padded', label: 'Padded gilet' }, { key: 'hi-vis-bodywarmer', label: 'Hi-vis bodywarmer' }],
    hats: [{ key: 'bucket', label: 'Bucket hat' }],
    'laptop-cases': [{ key: 'laptop-sleeve', label: 'Laptop sleeve' }],
    'safety-vests': [{ key: 'waistcoat', label: 'Hi-vis waistcoat' }],
    hoodies: [{ key: 'pullover', label: 'Pullover hoodie' }, { key: 'full-zip', label: 'Full zip hoodie' }, { key: 'hi-vis-hoodie', label: 'Hi-vis hoodie' }],
    jackets: [
        { key: 'workwear', label: 'Workwear jacket' },
        { key: 'bomber', label: 'Bomber jacket' },
        { key: 'padded-puffer', label: 'Padded / puffer jacket' },
        { key: 'waterproof-parka', label: 'Waterproof / parka' },
        { key: 'hi-vis-jacket', label: 'Hi-vis jacket' }
    ],
    polos: [{ key: 'short-sleeve', label: 'Short-sleeve polo' }, { key: 'long-sleeve', label: 'Long-sleeve polo' }, { key: 'hi-vis-polo', label: 'Hi-vis polo' }],
    'rugby-shirts': [{ key: 'rugby-shirt', label: 'Rugby shirt' }],
    shirts: [{ key: 'short-sleeve', label: 'Short-sleeve shirt' }, { key: 'long-sleeve', label: 'Long-sleeve shirt' }],
    shorts: [{ key: 'shorts', label: 'Shorts' }],
    softshells: [{ key: 'softshell-jacket', label: 'Softshell jacket' }],
    'sports-overtops': [{ key: 'sports-jersey', label: 'Sports jersey' }],
    sweatpants: [{ key: 'joggers', label: 'Joggers' }],
    sweatshirts: [{ key: 'crewneck', label: 'Crewneck sweatshirt' }, { key: 'quarter-zip', label: 'Quarter zip sweatshirt' }, { key: 'hi-vis-sweatshirt', label: 'Hi-vis sweatshirt' }],
    tabards: [{ key: 'tabard', label: 'Tabard' }],
    towels: [{ key: 'towel', label: 'Towel' }],
    trousers: [{ key: 'work-trousers', label: 'Work trousers' }],
    tshirts: [{ key: 'short-sleeve', label: 'Short-sleeve T-shirt' }, { key: 'long-sleeve', label: 'Long-sleeve T-shirt' }, { key: 'hi-vis-tshirt', label: 'Hi-vis T-shirt' }, { key: 'baby-toddler', label: 'Baby / toddler T-shirt' }],
    tunics: [{ key: 'tunic-scrub-top', label: 'Tunic / scrub top' }],
    umbrellas: [{ key: 'umbrella', label: 'Umbrella' }],
    'vests-t-shirt': [{ key: 'sports-vest', label: 'Sports vest / tank top' }]
}

const methodPriceValue = (value) => value === null || value === undefined ? '' : String(value)

const FALLBACK_DECORATION_SCHEMA = {
    print: [
        { min: 1, max: 8, price: 7.5 },
        { min: 9, max: 24, price: 5.25 },
        { min: 25, max: 99, price: 4 },
        { min: 100, max: 249, price: 3 },
        { min: 250, max: 499, price: 2.5 },
        { min: 500, max: 749, price: 2.25 },
        { min: 750, max: 999, price: 2 },
        { min: 1000, max: null, price: 1.75 }
    ],
    embroidery: [
        { min: 1, max: 8, price: 8 },
        { min: 9, max: 24, price: 6 },
        { min: 25, max: 99, price: 4.75 },
        { min: 100, max: 249, price: 3.75 },
        { min: 250, max: 499, price: 2.5 },
        { min: 500, max: 749, price: 2.25 },
        { min: 750, max: 999, price: 2 },
        { min: 1000, max: null, price: 1.75 }
    ],
    digitisingFee: 25,
    largePrintFlat: 7.7,
    version: '',
    source: 'storefront'
}

const normalizeLoadedSchema = (payload) => {
    const root = payload?.data || payload || {}
    const print = root.print || root.methods?.print || []
    const embroidery = root.embroidery || root.methods?.embroidery || []
    const fee = root.digitisingFee
    return {
        print: print.map(tier => ({ min: tier.min, max: tier.max ?? null, price: tier.price })),
        embroidery: embroidery.map(tier => ({ min: tier.min, max: tier.max ?? null, price: tier.price })),
        digitisingFee: typeof fee === 'object' && fee !== null ? fee.embroidery : fee,
        largePrintFlat: root.largePrintFlat ?? FALLBACK_DECORATION_SCHEMA.largePrintFlat,
        version: root.version || root.pricingVersion || '',
        source: 'api'
    }
}

const loadDecorationPriceSchema = async () => {
    const response = await fetch(PRICE_SCHEMA_API)
    if (!response.ok) throw new Error(`Failed to load the price schema (${response.status})`)
    return normalizeLoadedSchema(await response.json())
}

const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resolveImageUrl = (value) => {
    if (!value) return null
    if (String(value).startsWith('blob:')) return value
    if (String(value).startsWith('http')) return value
    if (String(value).startsWith('/')) return `${API_BASE}${value}`
    return `${API_BASE}/${String(value).replace(/^\/+/, '')}`
}

const normalizeProductTypes = (data) => {
    const list = data?.data?.items || data?.product_types || data?.productTypes || data?.items || data || []
    if (!Array.isArray(list)) return []

    return list.map((item, index) => ({
        id: item.id ?? item.slug ?? item.code ?? index,
        name: item.name || item.label || item.product_type || item.slug || `Type ${index + 1}`,
        slug: String(item.slug || item.code || slugify(item.name || item.label || item.product_type)),
        subtypes: Array.isArray(item.subtypes)
            ? item.subtypes.map(subtype => ({
                key: String(subtype.key || ''),
                label: String(subtype.label || subtype.key || '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, letter => letter.toUpperCase())
            })).filter(subtype => subtype.key)
            : []
    })).filter(item => item.slug)
}

const getMethodConfig = (methods, type) => {
    const list = Array.isArray(methods) ? methods : []
    return list.find((method) => {
        const methodType = String(method?.type || method?.method || method?.name || '').toLowerCase()
        return methodType === type
    }) || null
}

const normalizeTemplateResponse = (data, fallbackType) => {
    const root = data?.data || data?.template || data || {}
    const positions = root.positions || data?.positions || []
    const productType = root.productType?.slug || root.product_type || root.productType || root.slug || fallbackType?.slug || ''

    return {
        id: root.id ?? null,
        name: root.name || root.productType?.name || `${fallbackType?.name || productType} standard`,
        product_type: String(productType),
        version: root.version || 1,
        status: root.status || 'draft',
        positions: Array.isArray(positions)
            ? positions.map((position, index) => ({
                id: position.id ?? `${slugify(position.slug || position.code || position.label)}-${index}`,
                code: position.slug || position.code || slugify(position.label || `position-${index + 1}`),
                label: position.label || position.name || `Position ${index + 1}`,
                preview_image_url: resolveImageUrl(position.imageUrl || position.preview_image_url || position.previewImageUrl || position.image),
                saved_image_url: resolveImageUrl(position.imageUrl || position.preview_image_url || position.previewImageUrl || position.image),
                product_image_type: position.productImageType || position.product_image_type || null,
                sort_order: position.sortOrder ?? position.sort_order ?? index,
                embroidery_enabled: position.embroidery_enabled ?? getMethodConfig(position.methods, 'embroidery')?.enabled ?? getMethodConfig(position.methods, 'embroidery')?.isEnabled ?? !!getMethodConfig(position.methods, 'embroidery'),
                embroidery_price: position.embroidery_price ?? getMethodConfig(position.methods, 'embroidery')?.price ?? null,
                print_enabled: position.print_enabled ?? getMethodConfig(position.methods, 'print')?.enabled ?? getMethodConfig(position.methods, 'print')?.isEnabled ?? !!getMethodConfig(position.methods, 'print'),
                print_price: position.print_price ?? getMethodConfig(position.methods, 'print')?.price ?? null
            })).sort((first, second) => Number(first.sort_order) - Number(second.sort_order))
            : []
    }
}

const createBlankTemplate = (fallbackType) => ({
    id: null,
    name: `${fallbackType?.name || fallbackType?.slug || 'Product'} standard`,
    product_type: fallbackType?.slug || '',
    version: 1,
    status: 'draft',
    positions: []
})

const normalizePriceForSave = (value) => {
    if (value === '' || value === null || value === undefined) return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

const normalizeImageForSave = (value) => {
    if (!value) return null
    if (String(value).startsWith('blob:')) return null
    return value
}

const normalizePositionsForSave = (positions) => (positions || []).map((position, index) => ({
    id: position.id,
    slug: position.code,
    code: position.code,
    label: position.label,
    imageUrl: normalizeImageForSave(position.saved_image_url || position.preview_image_url),
    previewImageUrl: normalizeImageForSave(position.saved_image_url || position.preview_image_url),
    preview_image_url: normalizeImageForSave(position.saved_image_url || position.preview_image_url),
    productImageType: position.product_image_type || null,
    product_image_type: position.product_image_type || null,
    sortOrder: index,
    sort_order: index,
    isActive: true,
    active: true,
    methods: [
        ...(position.embroidery_enabled ? [{
            method: 'embroidery',
            type: 'embroidery',
            enabled: true,
            isEnabled: true,
            priceType: 'fixed',
            price: normalizePriceForSave(position.embroidery_price)
        }] : []),
        ...(position.print_enabled ? [{
            method: 'print',
            type: 'print',
            enabled: true,
            isEnabled: true,
            priceType: 'fixed',
            price: normalizePriceForSave(position.print_price)
        }] : [])
    ]
}))

const snapshotTemplate = (template) => JSON.stringify({
    name: template?.name || '',
    product_type: template?.product_type || '',
    positions: (template?.positions || []).map((position, index) => ({
        label: position.label,
        code: position.code,
        saved_image_url: position.saved_image_url || null,
        embroidery_enabled: Boolean(position.embroidery_enabled),
        embroidery_price: normalizePriceForSave(position.embroidery_price),
        print_enabled: Boolean(position.print_enabled),
        print_price: normalizePriceForSave(position.print_price),
        sort_order: index
    }))
})

const CustomizationConfig = () => {
    const [productTypes, setProductTypes] = useState([])
    const [selectedTypeSlug, setSelectedTypeSlug] = useState(null)
    const [selectedSubtypeKey, setSelectedSubtypeKey] = useState('')
    const [template, setTemplate] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingTemplate, setLoadingTemplate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const [typeSearch, setTypeSearch] = useState('')
    const [baselineSnapshot, setBaselineSnapshot] = useState('')
    const [priceSchema, setPriceSchema] = useState(null)
    const [priceSchemaLoading, setPriceSchemaLoading] = useState(true)
    const [priceSchemaSaving, setPriceSchemaSaving] = useState(false)
    const [priceSchemaNote, setPriceSchemaNote] = useState('')
    const [draggingPositionId, setDraggingPositionId] = useState(null)
    const [dropTargetId, setDropTargetId] = useState(null)
    const draggedPositionId = useRef(null)

    useEffect(() => {
        fetchProductTypes()
    }, [])

    useEffect(() => {
        let active = true
        const loadSchema = async () => {
            try {
                setPriceSchemaLoading(true)
                const schema = await loadDecorationPriceSchema()
                if (!active) return
                setPriceSchema(schema)
                setPriceSchemaNote('')
            } catch (error) {
                console.error(error)
                if (!active) return
                setPriceSchema(FALLBACK_DECORATION_SCHEMA)
                setPriceSchemaNote('Live pricing is unavailable, so these are the standard storefront tiers.')
            } finally {
                if (active) setPriceSchemaLoading(false)
            }
        }
        loadSchema()
        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!statusMessage) return undefined
        const timer = window.setTimeout(() => setStatusMessage(null), statusMessage.type === 'error' ? 5000 : 3200)
        return () => window.clearTimeout(timer)
    }, [statusMessage])

    const selectedType = useMemo(
        () => productTypes.find(type => type.slug === selectedTypeSlug) || null,
        [productTypes, selectedTypeSlug]
    )
    const selectedSubtypeOptions = useMemo(
        () => selectedType?.subtypes?.length
            ? selectedType.subtypes
            : (CUSTOMIZATION_SUBTYPES[selectedTypeSlug] || []),
        [selectedType, selectedTypeSlug]
    )
    const activeSubtypeKey = selectedSubtypeOptions.length > 0 ? selectedSubtypeKey : ''

    const hasUnsavedChanges = useMemo(() => {
        if (!template) return false
        return snapshotTemplate(template) !== baselineSnapshot
    }, [template, baselineSnapshot])

    const productTypesWithTote = useMemo(() => {
        const hasTote = productTypes.some(type => {
            const name = String(type.name || '').toLowerCase()
            const slug = String(type.slug || '').toLowerCase()
            return name === 'tote' || slug === 'tote' || slug === 'tote-bags'
        })
        if (hasTote) return productTypes
        const next = [...productTypes, { id: 'tote-shortcut', name: 'Tote', slug: 'bags', pinnedSubtype: 'tote' }]
        next.sort((a, b) => a.name.localeCompare(b.name))
        return next
    }, [productTypes])

    const filteredProductTypes = useMemo(() => {
        const query = typeSearch.trim().toLowerCase()
        if (!query) return productTypesWithTote
        return productTypesWithTote.filter(type =>
            String(type.name || '').toLowerCase().includes(query) ||
            String(type.slug || '').toLowerCase().includes(query)
        )
    }, [productTypesWithTote, typeSearch])

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
            if (!hasUnsavedChanges || saving) return
            event.preventDefault()
            handleSaveTemplate()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [saving, hasUnsavedChanges, selectedTypeSlug, selectedSubtypeKey])

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    useEffect(() => {
        if (selectedTypeSlug && productTypes.length > 0) {
            fetchTemplate(
                selectedTypeSlug,
                activeSubtypeKey
            )
        }
    }, [selectedTypeSlug, activeSubtypeKey, productTypes])

    const fetchProductTypes = async () => {
        try {
            setLoading(true)
            setStatusMessage(null)
            const response = await fetch(PRODUCT_TYPES_API)
            if (!response.ok) throw new Error(`Failed to fetch product types (${response.status})`)
            const data = await response.json()
            const types = normalizeProductTypes(data).sort((a, b) => a.name.localeCompare(b.name))
            setProductTypes(types)
            if (types.length > 0) {
                setSelectedTypeSlug(current => current ?? types[0].slug)
            }
        } catch (error) {
            console.error(error)
            setStatusMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    const fetchTemplate = async (slug, subtypeKey = '') => {
        const fallbackType = productTypes.find(type => type.slug === slug)
        try {
            setLoadingTemplate(true)
            setStatusMessage(null)
            const response = await fetch(templateRequestUrl(slug, subtypeKey))
            if (response.status === 404) {
                const blankTemplate = createBlankTemplate(fallbackType)
                setTemplate(blankTemplate)
                setBaselineSnapshot(snapshotTemplate(blankTemplate))
                return
            }
            if (!response.ok) throw new Error(`Failed to fetch config (${response.status})`)
            const data = await response.json()
            const nextTemplate = normalizeTemplateResponse(data, fallbackType)
            setTemplate(nextTemplate)
            setBaselineSnapshot(snapshotTemplate(nextTemplate))
        } catch (error) {
            console.error(error)
            const blankTemplate = createBlankTemplate(fallbackType)
            setTemplate(blankTemplate)
            setBaselineSnapshot(snapshotTemplate(blankTemplate))
            setStatusMessage({ type: 'error', text: error.message })
        } finally {
            setLoadingTemplate(false)
        }
    }

    const updateTemplate = (updater) => {
        setTemplate(prev => (typeof updater === 'function' ? updater(prev) : updater))
    }

    const requestDiscardOrSave = async () => {
        if (!hasUnsavedChanges) return true

        const shouldSave = window.confirm('You have unsaved changes. Press OK to save them, or Cancel to choose discard.')
        if (shouldSave) {
            return await handleSaveTemplate()
        }

        return window.confirm('Discard your unsaved changes?')
    }

    const handleAddPosition = () => {
        updateTemplate(prev => {
            const nextOrder = (prev?.positions?.length || 0) + 1
            const label = `New Position ${nextOrder}`
            return {
                ...prev,
                positions: [
                    ...(prev?.positions || []),
                    {
                        id: `new-${Date.now()}-${nextOrder}`,
                        code: slugify(label),
                        label,
                        preview_image_url: null,
                        saved_image_url: null,
                        product_image_type: null,
                        sort_order: nextOrder,
                        embroidery_enabled: true,
                        embroidery_price: null,
                        print_enabled: true,
                        print_price: null
                    }
                ]
            }
        })
    }

    const handlePositionChange = (positionId, field, value) => {
        updateTemplate(prev => ({
            ...prev,
            positions: (prev?.positions || []).map(position =>
                position.id === positionId
                    ? {
                        ...position,
                        [field]: value,
                        ...(field === 'label' ? { code: slugify(value) } : {})
                    }
                    : position
            )
        }))
    }

    const handleDeletePosition = (positionId) => {
        updateTemplate(prev => ({
            ...prev,
            positions: (prev?.positions || []).filter(position => position.id !== positionId)
        }))
    }

    const moveDraggedPosition = (targetId) => {
        const sourceId = draggedPositionId.current
        if (!sourceId || sourceId === targetId) return
        updateTemplate(prev => {
            const positions = [...(prev?.positions || [])]
            const fromIndex = positions.findIndex(position => position.id === sourceId)
            const toIndex = positions.findIndex(position => position.id === targetId)
            if (fromIndex < 0 || toIndex < 0) return prev
            const [moved] = positions.splice(fromIndex, 1)
            positions.splice(toIndex, 0, moved)
            return { ...prev, positions }
        })
    }

    const clearPositionDrag = () => {
        draggedPositionId.current = null
        setDraggingPositionId(null)
        setDropTargetId(null)
    }

    const handleRemoveImage = (positionId) => {
        handlePositionChange(positionId, 'preview_image_url', null)
        handlePositionChange(positionId, 'saved_image_url', null)
    }

    const handleSaveTemplate = async () => {
        if (!selectedTypeSlug || !template) return false
        try {
            setSaving(true)
            setStatusMessage(null)
            const subtypeKey = activeSubtypeKey
            const response = await fetch(templateRequestUrl(selectedTypeSlug, subtypeKey), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: template.name,
                    product_type: selectedTypeSlug,
                    subtypeKey,
                    status: template.status,
                    version: template.version,
                    positions: normalizePositionsForSave(template.positions)
                })
            })
            if (!response.ok) throw new Error(`Failed to save config (${response.status})`)
            const data = await response.json()
            const nextTemplate = normalizeTemplateResponse(data, selectedType)
            setTemplate(nextTemplate)
            setBaselineSnapshot(snapshotTemplate(nextTemplate))
            setStatusMessage({ type: 'success', text: 'Configuration saved' })
            return true
        } catch (error) {
            console.error(error)
            setStatusMessage({ type: 'error', text: error.message })
            return false
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteTemplate = async () => {
        const subtypeKey = activeSubtypeKey
        const subtypeLabel = selectedSubtypeOptions.find(variant => variant.key === subtypeKey)?.label
        const configLabel = subtypeKey
            ? `${selectedType?.name || selectedTypeSlug} — ${subtypeLabel || subtypeKey}`
            : selectedType?.name || selectedTypeSlug
        if (!selectedTypeSlug || !window.confirm(`Delete customization config for ${configLabel}?`)) return
        try {
            setSaving(true)
            setStatusMessage(null)
            const response = await fetch(templateRequestUrl(selectedTypeSlug, subtypeKey), {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error(`Failed to delete config (${response.status})`)
            const blankTemplate = createBlankTemplate(selectedType)
            setTemplate(blankTemplate)
            setBaselineSnapshot(snapshotTemplate(blankTemplate))
            setStatusMessage({ type: 'success', text: 'Configuration deleted' })
        } catch (error) {
            console.error(error)
            setStatusMessage({ type: 'error', text: error.message })
        } finally {
            setSaving(false)
        }
    }

    const handleUploadImage = async (position, file) => {
        if (!file) return

        const localPreviewUrl = URL.createObjectURL(file)
        handlePositionChange(position.id, 'preview_image_url', localPreviewUrl)

        try {
            setSaving(true)
            setStatusMessage(null)
            const formData = new FormData()
            formData.append('image', file)
            formData.append('product_type', selectedTypeSlug || '')
            formData.append('productType', selectedTypeSlug || '')
            formData.append('subtypeKey', activeSubtypeKey)
            formData.append('position_code', position.code || '')
            formData.append('positionCode', position.code || '')
            formData.append('code', position.code || '')

            const response = await fetch(IMAGE_UPLOAD_API, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error(`Failed to upload image (${response.status})`)

            const data = await response.json()
            const uploadData = data?.data || data || {}
            const imageUrl = resolveImageUrl(
                uploadData.imageUrl ||
                uploadData.url ||
                uploadData.preview_image_url ||
                uploadData.previewImageUrl ||
                uploadData.path ||
                uploadData.file?.url ||
                uploadData.file?.path ||
                data.imageUrl ||
                data.url ||
                data.preview_image_url ||
                data.previewImageUrl ||
                data.path ||
                data.file?.url ||
                data.file?.path
            ) || localPreviewUrl

            const productImageType =
                uploadData.productImageType ||
                uploadData.product_image_type ||
                data.productImageType ||
                data.product_image_type ||
                null

            handlePositionChange(position.id, 'preview_image_url', imageUrl)
            handlePositionChange(position.id, 'saved_image_url', imageUrl)
            handlePositionChange(position.id, 'product_image_type', productImageType)
            setStatusMessage({ type: 'success', text: 'Reference image uploaded' })
        } catch (error) {
            console.error(error)
            setStatusMessage({ type: 'error', text: 'Image upload failed. Please try again with a smaller JPG or PNG image.' })
        } finally {
            setSaving(false)
        }
    }

    const schemaRowCount = Math.max(priceSchema?.print?.length || 0, priceSchema?.embroidery?.length || 0)

    const updateSchemaBand = (index, field, rawValue) => {
        setPriceSchema(prev => {
            if (!prev) return prev
            const print = [...prev.print]
            const embroidery = [...prev.embroidery]
            while (print.length <= index) print.push({ min: '', max: '', price: '' })
            while (embroidery.length <= index) embroidery.push({ min: '', max: '', price: '' })
            const numeric = rawValue === '' ? '' : Number(rawValue)
            if (field === 'min' || field === 'max') {
                print[index] = { ...print[index], [field]: numeric }
                embroidery[index] = { ...embroidery[index], [field]: numeric }
            } else if (field === 'print') {
                print[index] = { ...print[index], price: numeric }
            } else {
                embroidery[index] = { ...embroidery[index], price: numeric }
            }
            return { ...prev, print, embroidery }
        })
    }

    const addSchemaBand = () => {
        setPriceSchema(prev => {
            if (!prev) return prev
            const last = prev.print[prev.print.length - 1]
            const min = last?.max ? Number(last.max) + 1 : ''
            return {
                ...prev,
                print: [...prev.print, { min, max: '', price: '' }],
                embroidery: [...prev.embroidery, { min, max: '', price: '' }]
            }
        })
    }

    const removeSchemaBand = (index) => {
        setPriceSchema(prev => {
            if (!prev || prev.print.length <= 1) return prev
            return {
                ...prev,
                print: prev.print.filter((_, rowIndex) => rowIndex !== index),
                embroidery: prev.embroidery.filter((_, rowIndex) => rowIndex !== index)
            }
        })
    }

    const handleSavePriceSchema = async () => {
        if (!priceSchema) return
        const toBand = (tier) => ({
            min: Number(tier.min),
            max: tier.max === '' || tier.max === null || tier.max === undefined ? null : Number(tier.max),
            price: Number(tier.price)
        })
        try {
            setPriceSchemaSaving(true)
            setPriceSchemaNote('')
            const response = await fetch(PRICE_SCHEMA_API, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    digitisingFee: Number(priceSchema.digitisingFee),
                    largePrintFlat: Number(priceSchema.largePrintFlat),
                    print: priceSchema.print.map(toBand),
                    embroidery: priceSchema.embroidery.map(toBand)
                })
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(body.message || `Failed to save the price schema (${response.status})`)
            setPriceSchema(normalizeLoadedSchema(body))
            setStatusMessage({ type: 'success', text: 'Price schema saved in the backend' })
        } catch (error) {
            console.error(error)
            setStatusMessage({ type: 'error', text: error.message })
        } finally {
            setPriceSchemaSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading customization settings...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Customization Configuration</h1>
                <p className="text-gray-500 mt-2">Decoration prices follow the quantity schema used on the storefront. Positions and reference images stay below, by product type.</p>
            </div>

            <Card className="p-6 mb-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Decoration price schema</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Unit price per logo, excluding VAT. The same bands apply to every product type.
                        </p>
                    </div>
                    {priceSchema?.version && (
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                            Pricing {priceSchema.version}
                        </div>
                    )}
                </div>

                {priceSchemaLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500">Loading the backend price schema...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                        <th className="py-3 pr-4">From qty</th>
                                        <th className="py-3 pr-4">To qty</th>
                                        <th className="py-3 pr-4">Print</th>
                                        <th className="py-3 pr-4">Embroidery</th>
                                        <th className="py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: schemaRowCount }, (_, index) => {
                                        const printTier = priceSchema?.print?.[index] || {}
                                        const embroideryTier = priceSchema?.embroidery?.[index] || {}
                                        return (
                                            <tr key={`band-${index}`} className="border-b border-slate-100 last:border-0">
                                                <td className="py-3 pr-4">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={printTier.min ?? ''}
                                                        onChange={(event) => updateSchemaBand(index, 'min', event.target.value)}
                                                        className="w-24 px-3 py-2 border border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="No max"
                                                        value={printTier.max ?? ''}
                                                        onChange={(event) => updateSchemaBand(index, 'max', event.target.value)}
                                                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={printTier.price ?? ''}
                                                        onChange={(event) => updateSchemaBand(index, 'print', event.target.value)}
                                                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={embroideryTier.price ?? ''}
                                                        onChange={(event) => updateSchemaBand(index, 'embroidery', event.target.value)}
                                                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSchemaBand(index)}
                                                        className="text-sm text-rose-600 hover:text-rose-700"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                            <label className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Embroidery digitising fee</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={priceSchema?.digitisingFee ?? ''}
                                    onChange={(event) => setPriceSchema(prev => ({ ...prev, digitisingFee: event.target.value === '' ? '' : Number(event.target.value) }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </label>
                            <label className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Large front / large back print</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={priceSchema?.largePrintFlat ?? ''}
                                    onChange={(event) => setPriceSchema(prev => ({ ...prev, largePrintFlat: event.target.value === '' ? '' : Number(event.target.value) }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={addSchemaBand}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Add band
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePriceSchema}
                                disabled={priceSchemaSaving}
                                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-accent disabled:opacity-50"
                            >
                                {priceSchemaSaving ? 'Saving schema...' : 'Save price schema'}
                            </button>
                            <p className="text-sm text-slate-500">Leave the last “to qty” empty. Prices exclude VAT.</p>
                        </div>
                        {priceSchemaNote && (
                            <p className="mt-3 text-sm text-amber-700">{priceSchemaNote}</p>
                        )}
                    </>
                )}
            </Card>

            <div className="flex gap-8">
                <aside className="w-64 flex-shrink-0">
                    <div className="mb-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Product Types</h3>
                    </div>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={typeSearch}
                            onChange={(e) => setTypeSearch(e.target.value)}
                            placeholder="Search product types..."
                            className="w-full pl-9 pr-3 py-2 text-[12px] font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredProductTypes.map(type => {
                            const isSelected = type.pinnedSubtype
                                ? selectedTypeSlug === type.slug && selectedSubtypeKey === type.pinnedSubtype
                                : selectedTypeSlug === type.slug && !(type.slug === 'bags' && selectedSubtypeKey === 'tote')

                            return (
                                <button
                                    key={type.id}
                                    onClick={async () => {
                                        const nextSubtype = type.pinnedSubtype || ''
                                        if (type.slug === selectedTypeSlug && nextSubtype === selectedSubtypeKey) return
                                        const proceed = await requestDiscardOrSave()
                                        if (proceed) {
                                            setSelectedSubtypeKey(nextSubtype)
                                            setSelectedTypeSlug(type.slug)
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-[13px] rounded transition-all ${isSelected
                                        ? 'bg-primary text-white font-bold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                                        <span className="truncate">{type.name}</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </aside>

                <div className="flex-1 min-w-0">
                    {loadingTemplate ? (
                        <Card className="p-8 text-center text-gray-500">Loading selected configuration...</Card>
                    ) : !template ? (
                        <Card className="p-8 text-center text-gray-500">Select a product type to begin.</Card>
                    ) : (
                        <>
                            <Card className="p-6 mb-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">{selectedTypeSlug === 'bags' && selectedSubtypeKey === 'tote' ? 'Tote' : (selectedType?.name || template.name)}</h2>
                                        {selectedSubtypeOptions.length > 0 && (
                                            <label className="block mt-4 mb-3">
                                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                    Template subtype
                                                </span>
                                                <select
                                                    value={selectedSubtypeKey}
                                                    onChange={async (event) => {
                                                        const nextSubtypeKey = event.target.value
                                                        if (nextSubtypeKey === selectedSubtypeKey) return
                                                        const proceed = await requestDiscardOrSave()
                                                        if (proceed) setSelectedSubtypeKey(nextSubtypeKey)
                                                    }}
                                                    className="min-w-64 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                                                >
                                                    {[GENERIC_SUBTYPE, ...selectedSubtypeOptions].map(variant => (
                                                        <option key={variant.key || 'generic'} value={variant.key}>
                                                            {variant.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}
                                        <p className="text-sm text-gray-500 mt-1">
                                            Slug: {selectedTypeSlug} · Version: {template.version} · {template.positions?.length || 0} positions
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveTemplate}
                                            disabled={saving}
                                            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-accent disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Config'}
                                        </button>
                                    </div>
                                </div>
                            </Card>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Positions</h3>
                                    <p className="text-sm text-gray-500">Drag a position by the handle. The one at the top is shown first. Press Save Config when you are done.</p>
                                </div>
                                <button
                                    onClick={handleAddPosition}
                                    className="inline-flex items-center px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-accent shadow-sm transition-colors"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Position
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                {(template.positions || []).map((position) => (
                                    <div
                                        key={position.id}
                                        onDragOver={(event) => {
                                            event.preventDefault()
                                            if (dropTargetId !== position.id) setDropTargetId(position.id)
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            moveDraggedPosition(position.id)
                                            clearPositionDrag()
                                        }}
                                        className={dropTargetId === position.id && draggingPositionId && draggingPositionId !== position.id ? 'rounded-xl ring-2 ring-primary' : ''}
                                    >
                                    <div className={`flex h-36 items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 ${draggingPositionId === position.id ? 'opacity-60' : ''}`}>
                                            <div
                                                draggable
                                                onDragStart={(event) => {
                                                    draggedPositionId.current = position.id
                                                    event.dataTransfer.effectAllowed = 'move'
                                                    event.dataTransfer.setData('text/plain', String(position.id))
                                                    setDraggingPositionId(position.id)
                                                }}
                                                onDragEnd={clearPositionDrag}
                                                className="flex h-10 w-8 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                                                title="Drag to move"
                                            >
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <label className="relative h-32 w-32 shrink-0 cursor-pointer overflow-hidden rounded border border-dashed border-slate-300 bg-slate-50" title="Change image">
                                                {position.preview_image_url ? (
                                                    <img src={position.preview_image_url} alt="" draggable={false} className="h-full w-full object-contain bg-white" />
                                                ) : (
                                                    <span className="flex h-full w-full items-center justify-center text-slate-400">
                                                        <ImageIcon className="h-8 w-8" />
                                                    </span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        handleUploadImage(position, file)
                                                        e.target.value = ''
                                                    }}
                                                />
                                            </label>
                                            <input
                                                value={position.label}
                                                onChange={(e) => handlePositionChange(position.id, 'label', e.target.value)}
                                                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 border-b border-transparent focus:border-primary focus:outline-none"
                                            />
                                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={Boolean(position.embroidery_enabled)}
                                                    onChange={(e) => handlePositionChange(position.id, 'embroidery_enabled', e.target.checked)}
                                                />
                                                Emb
                                                <span className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">£</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={methodPriceValue(position.embroidery_price)}
                                                        onChange={(e) => handlePositionChange(position.id, 'embroidery_price', e.target.value === '' ? null : e.target.value)}
                                                        disabled={!position.embroidery_enabled}
                                                        className="h-8 w-20 rounded border border-slate-200 bg-white py-0 pl-5 pr-1 text-sm disabled:bg-slate-50"
                                                    />
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={Boolean(position.print_enabled)}
                                                    onChange={(e) => handlePositionChange(position.id, 'print_enabled', e.target.checked)}
                                                />
                                                Print
                                                <span className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">£</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={methodPriceValue(position.print_price)}
                                                        onChange={(e) => handlePositionChange(position.id, 'print_price', e.target.value === '' ? null : e.target.value)}
                                                        disabled={!position.print_enabled}
                                                        className="h-8 w-20 rounded border border-slate-200 bg-white py-0 pl-5 pr-1 text-sm disabled:bg-slate-50"
                                                    />
                                                </span>
                                            </label>
                                            {position.preview_image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(position.id)}
                                                    className="p-1 text-slate-400 hover:text-red-600"
                                                    title="Remove image"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePosition(position.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete position"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                    </div>
                                    </div>
                                ))}
                            </div>

                            {(template.positions || []).length === 0 && (
                                <Card className="p-8 mt-4 text-center text-gray-500">
                                    No positions configured yet for this product type.
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            {statusMessage && (
                <div className="fixed right-6 bottom-6 z-50 max-w-sm">
                    <div className={`rounded-2xl border shadow-2xl backdrop-blur-md px-4 py-4 transition-all ${statusMessage.type === 'error'
                        ? 'bg-white/95 border-rose-200 text-rose-700 shadow-rose-100'
                        : 'bg-white/95 border-emerald-200 text-emerald-700 shadow-emerald-100'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${statusMessage.type === 'error' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                {statusMessage.type === 'error'
                                    ? <AlertCircle className="w-4 h-4" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold">
                                    {statusMessage.type === 'error' ? 'Something needs attention' : 'Saved successfully'}
                                </div>
                                <div className="mt-1 text-sm leading-5">
                                    {statusMessage.text}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStatusMessage(null)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomizationConfig
