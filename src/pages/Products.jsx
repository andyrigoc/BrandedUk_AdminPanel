import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '../config'
import Card from '../components/Card'
import {
    Search, ChevronLeft, ChevronRight, ChevronDown, Eye, ChevronUp, Pin, AlertTriangle,
    X, Check, Download, Trash2, Power, PowerOff, Upload, Plus, Star, ExternalLink,
    Percent, Package, Loader2, CheckCircle2, RefreshCw, Sparkles as SparklesIcon, Crown, Tag
} from 'lucide-react'

const Products = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Supplier: persisted in URL (?supplier=slug), slug used for API
    const selectedSupplierSlug = searchParams.get('supplier') || ''
    const setSupplier = (slug) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            if (slug) next.set('supplier', slug)
            else next.delete('supplier')
            return next
        })
        setCurrentPage(1)
        setSelectedBrand(null)
        setBrandSearch('')
    }

    // Suppliers list for toggle (from GET /api/admin/suppliers)
    const [suppliers, setSuppliers] = useState([])
    const [loadingSuppliers, setLoadingSuppliers] = useState(true)

    // Brand filter state
    const [brands, setBrands] = useState([])
    const [selectedBrand, setSelectedBrand] = useState(null)
    const [brandSearch, setBrandSearch] = useState('')
    const [showBrandDropdown, setShowBrandDropdown] = useState(false)
    const brandDropdownRef = useRef(null)

    // Product types state
    const [productTypes, setProductTypes] = useState([])
    const [selectedType, setSelectedType] = useState(null)
    const [loadingTypes, setLoadingTypes] = useState(true)

    // Products state
    const [products, setProducts] = useState([])
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [itemsPerPage, setItemsPerPage] = useState(24)

    // Global selection state-persists across pages/search/filters
    const [selectedProducts, setSelectedProducts] = useState(new Map())
    const [pinnedPositions, setPinnedPositions] = useState(new Map())

    // Bulk action state
    const [selectedAction, setSelectedAction] = useState('')
    const [showActionDropdown, setShowActionDropdown] = useState(false)

    // Conflict modal state
    const [conflictModal, setConflictModal] = useState(null)

    // Delete confirmation modal
    const [deleteModal, setDeleteModal] = useState(false)

    // Saving/processing state
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [validationErrors, setValidationErrors] = useState(new Map()) // code -> error message
    const [viewType, setViewType] = useState('standard') // 'standard' | 'deactivated'

    // Markup Modal State
    const [markupModal, setMarkupModal] = useState(false)
    const [markupRules, setMarkupRules] = useState([])
    const [selectedMarkupTier, setSelectedMarkupTier] = useState(null)
    const [baseMarkup, setBaseMarkup] = useState('')
    const [customMarkups, setCustomMarkups] = useState(new Map()) // code -> percentage

    const dropdownRef = useRef(null)
    const abortControllerRef = useRef(null)
    const fetchIdRef = useRef(0)

    const bulkActions = viewType === 'deactivated' ? [
        { label: 'Activate Products', value: 'bulk-activate', icon: Power },
        { label: 'Export to CSV', value: 'export', icon: Download },
    ] : [
        { label: 'Save Display Order', value: 'save-order', icon: Check },
        { label: 'Rebalance Sequence', value: 'rebalance', icon: Pin },
        { label: 'Set as Best Seller', value: 'bulk-set-best-seller', icon: Star },
        { label: 'Set as Recommended', value: 'bulk-set-recommended', icon: SparklesIcon },
        { label: 'Set as Featured', value: 'bulk-set-featured', icon: Crown },
        { label: 'Set Markup Tier', value: 'bulk-markup', icon: Percent },
        { label: 'Set Deactivated', value: 'bulk-discontinue', icon: PowerOff },
        { label: 'Export to CSV', value: 'export', icon: Download },
        { label: 'Remove Featured', value: 'bulk-remove-featured-only', icon: Crown, danger: true },
        { label: 'Remove Promotion Tags', value: 'bulk-remove-featured', icon: X, danger: true },
    ]

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowActionDropdown(false)
            }
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
                setShowBrandDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Computed: has unsaved changes
    const hasUnsavedChanges = selectedProducts.size > 0 &&
        Array.from(selectedProducts.entries()).some(([code, data]) => {
            const product = products.find(p => (p.code || p.style_code) === code)
            return data.display_order !== (product?.display_order ?? null)
        })

    // Check if a position is occupied (for inline warning)
    const isPositionOccupied = (code, position) => {
        if (position == null) return false
        // Check in selectedProducts first
        for (const [productCode, data] of selectedProducts.entries()) {
            if (productCode !== code && data.display_order === position) {
                return true
            }
        }
        // Check in pinnedPositions (backend data)
        const existingCode = pinnedPositions.get(position)
        return existingCode && existingCode !== code && !selectedProducts.has(existingCode)
    }

    // Validate all orders before save
    const validateOrders = () => {
        const errors = new Map()
        const positions = new Map() // position -> code (to detect duplicates)

        for (const [code, data] of selectedProducts.entries()) {
            const order = data.display_order

            // Allow null (unpinning)
            if (order === null) continue

            // Must be positive integer
            if (!Number.isInteger(order) || order < 1) {
                errors.set(code, 'Position must be a positive integer')
                continue
            }

            // Check for duplicates within selection
            if (positions.has(order)) {
                errors.set(code, `Duplicate position ${order} `)
                errors.set(positions.get(order), `Duplicate position ${order} `)
            } else {
                positions.set(order, code)
            }
        }

        setValidationErrors(errors)
        return errors.size === 0
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only if we have selections
            if (selectedProducts.size === 0) return

            // Enter = Save
            if (e.key === 'Enter' && !e.shiftKey && selectedAction === 'save-order') {
                e.preventDefault()
                if (validateOrders()) {
                    handleSaveDisplayOrder()
                }
            }

            // Escape = Clear selection
            if (e.key === 'Escape') {
                e.preventDefault()
                clearAllSelections()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selectedProducts, selectedAction])

    // Search Debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm])

    const [productStyles, setProductStyles] = useState([])
    const [selectedStyle, setSelectedStyle] = useState(null)

    // Fetch suppliers for toggle (GET /api/admin/suppliers)
    useEffect(() => {
        const load = async () => {
            try {
                setLoadingSuppliers(true)
                const res = await fetch(`${API_BASE}/api/admin/suppliers?limit=100`)
                if (!res.ok) return
                const data = await res.json()
                setSuppliers(data.items || [])
            } catch (err) {
                console.error('Error fetching suppliers:', err)
            } finally {
                setLoadingSuppliers(false)
            }
        }
        load()
    }, [])

    // Fetch brands
    useEffect(() => {
        const loadBrands = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/filters/brands?limit=200`)
                if (!res.ok) return
                const data = await res.json()
                const sorted = (data.brands || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                setBrands(sorted)
            } catch (err) {
                console.error('Error fetching brands:', err)
            }
        }
        loadBrands()
    }, [])

    // Fetch product types (scoped by supplier when selected)
    // GET /api/filters/product-types — no supplier = all types; ?supplier=slug = types for that supplier only
    useEffect(() => {
        const fetchProductTypes = async () => {
            try {
                setLoadingTypes(true)
                const params = new URLSearchParams({ _t: Date.now().toString() })
                if (selectedSupplierSlug) params.set('supplier', selectedSupplierSlug)
                const response = await fetch(`${API_BASE}/api/filters/product-types?${params}`)
                if (!response.ok) throw new Error('Failed to fetch product types')
                const data = await response.json()
                const types = data.product_types || data.productTypes || data || []
                const sortedTypes = [...types].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                setProductTypes(sortedTypes)

                setSelectedType((prev) => {
                    if (types.length === 0) return null
                    const stillInList = prev && types.some((t) => (t.id !== undefined && t.id === prev.id) || t.slug === prev.slug)
                    if (stillInList) return prev
                    const first = types[0]
                    fetchStyles(first.slug)
                    return first
                })
            } catch (err) {
                console.error('Error fetching product types:', err)
            } finally {
                setLoadingTypes(false)
            }
        }
        fetchProductTypes()
    }, [selectedSupplierSlug])

    const fetchStyles = async (typeSlug) => {
        try {
            const params = new URLSearchParams({ productType: typeSlug })
            if (selectedSupplierSlug) params.set('supplier', selectedSupplierSlug)
            const response = await fetch(`${API_BASE}/api/products/filters?${params}`)
            if (!response.ok) return
            const data = await response.json()
            setProductStyles(data.filters?.style || [])
        } catch (err) {
            console.error('Error fetching styles:', err)
        }
    }

    // Fetch ALL pinned products for conflict detection across pages
    // Markup Rules fetch
    const fetchMarkupRules = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/pricing/rules`)
            if (!response.ok) throw new Error('Failed to fetch pricing rules')
            const data = await response.json()
            setMarkupRules(data.items || [])
        } catch (err) {
            console.error('Error fetching markup rules:', err)
        }
    }, [])

    const fetchAllPinnedProducts = useCallback(async () => {
        if (!selectedType) return

        try {
            // Use dedicated display-order endpoint to get all pinned products
            const url = `${API_BASE}/api/display-order?product_type_id=${selectedType.id}&limit=100&_t=${Date.now()}`

            const response = await fetch(url, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            })
            if (!response.ok) {
                return
            }
            const data = await response.json()

            // Build complete pinned positions map
            const pinned = new Map()
                ; (data.items || []).forEach(p => {
                    if (p.display_order != null) {
                        pinned.set(p.display_order, p.style_code)
                    }
                })

            setPinnedPositions(pinned)
        } catch (err) {
            console.error('Error fetching pinned products:', err)
        }
    }, [selectedType])

    // Fetch pinned products when type changes
    useEffect(() => {
        fetchAllPinnedProducts()
    }, [fetchAllPinnedProducts])

    // Refetch styles when supplier or type changes (facets scoped by supplier)
    useEffect(() => {
        if (selectedType?.slug) fetchStyles(selectedType.slug)
    }, [selectedSupplierSlug, selectedType?.slug])

    // Fetch products — with AbortController to prevent race conditions
    const fetchProducts = useCallback(async () => {
        if (!selectedType) return

        // Cancel any in-flight request before starting a new one
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const controller = new AbortController()
        abortControllerRef.current = controller

        // Track this specific fetch so stale responses are ignored
        const thisFetchId = ++fetchIdRef.current

        try {
            setLoadingProducts(true)
            // Clear old products immediately to prevent showing stale data
            setProducts([])

            const params = new URLSearchParams()

            // When searching, omit productType so the search spans all types within the supplier
            if (debouncedSearchTerm) {
                params.append('q', debouncedSearchTerm)
                params.append('sort', 'newest')
            } else if (selectedType?.slug) {
                // Only scope by productType when NOT searching and a type is selected
                params.append('productType', selectedType.slug)
            }
            // If selectedType is null (All Products) or brand filter is active → no productType param → returns all

            if (selectedSupplierSlug) {
                params.set('supplier', selectedSupplierSlug)
            }

            if (selectedBrand) {
                params.set('brand', selectedBrand.slug)
            }

            params.append('page', currentPage.toString())
            params.append('limit', itemsPerPage.toString())
            params.append('_t', Date.now().toString())

            const endpoint = viewType === 'deactivated' ? '/api/products/discontinued' : '/api/products'
            const response = await fetch(`${API_BASE}${endpoint}?${params}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' },
                signal: controller.signal
            })

            // If a newer fetch was started while we were waiting, discard this result
            if (thisFetchId !== fetchIdRef.current) return

            if (!response.ok) throw new Error('Failed to fetch products')
            const data = await response.json()

            // Double-check we're still the latest fetch before applying state
            if (thisFetchId !== fetchIdRef.current) return

            setProducts(data.items || [])
            // Handle flat response structure (from user provided JSON) vs potential nested pagination
            const totalItems = data.total !== undefined ? data.total : (data.pagination?.totalItems || 0)
            setTotalPages(data.totalPages || (data.pagination?.totalPages) || Math.ceil(totalItems / itemsPerPage) || 1)
            setTotalCount(totalItems)

            // NOTE: pinnedPositions is now managed by fetchAllPinnedProducts() 
            // to maintain a complete map across all pages

        } catch (err) {
            // Ignore abort errors — they are expected when we cancel stale requests
            if (err.name === 'AbortError') return
            // Only apply error state if this is still the active fetch
            if (thisFetchId !== fetchIdRef.current) return
            console.error('Error fetching products:', err)
            setError('Failed to load products')
        } finally {
            // Only clear loading if this is still the active fetch
            if (thisFetchId === fetchIdRef.current) {
                setLoadingProducts(false)
            }
        }
    }, [selectedType, selectedSupplierSlug, debouncedSearchTerm, currentPage, itemsPerPage, viewType, selectedBrand])

    useEffect(() => {
        fetchProducts()
        // Cleanup: abort in-flight request when dependencies change or component unmounts
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [fetchProducts])

    // Handle type change — cancel in-flight requests and reset all filters immediately
    const handleTypeChange = (type) => {
        if (selectedProducts.size > 0) {
            if (!confirm('You have unsaved selections. Switching will clear them. Continue?')) {
                return
            }
            setSelectedProducts(new Map())
            setPinnedPositions(new Map())
        }

        // Cancel any in-flight request immediately to prevent stale data
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Reset BOTH searchTerm AND debouncedSearchTerm synchronously
        // to prevent the 500ms debounce window from causing an unfiltered fetch
        setSearchTerm('')
        setDebouncedSearchTerm('')

        setSelectedStyle(null)
        setSelectedType(type)
        setCurrentPage(1)
        setError(null)

        // Fetch styles for the new type
        fetchStyles(type.slug)
    }

    // Selection helpers
    const isSelected = (code) => selectedProducts.has(code)

    const getDisplayOrder = (product) => {
        const code = product.code || product.style_code
        if (selectedProducts.has(code)) {
            return selectedProducts.get(code).display_order
        }
        return product.display_order
    }

    const toggleSelection = (product) => {
        const code = product.code || product.style_code
        setSelectedProducts(prev => {
            const updated = new Map(prev)
            if (updated.has(code)) {
                updated.delete(code)
            } else {
                updated.set(code, {
                    ...product, // Store full product data for cross-page persistence
                    display_order: product.display_order,
                    originalOrder: product.display_order,
                    name: product.name,
                    is_active: product.is_active
                })
            }
            return updated
        })
    }

    const selectAllOnPage = () => {
        setSelectedProducts(prev => {
            const updated = new Map(prev)
            products.forEach(p => {
                const code = p.code || p.style_code
                if (!updated.has(code)) {
                    updated.set(code, {
                        ...p, // Store full product data for cross-page persistence
                        display_order: p.display_order,
                        originalOrder: p.display_order,
                        name: p.name,
                        is_active: p.is_active
                    })
                }
            })
            return updated
        })
    }

    const clearAllSelections = () => {
        setSelectedProducts(new Map())
        setSelectedAction('')
    }

    // Display order logic
    const checkConflict = (code, newPosition) => {
        if (newPosition == null) return null

        for (const [productCode, data] of selectedProducts.entries()) {
            if (productCode !== code && data.display_order === newPosition) {
                return productCode
            }
        }

        const existingCode = pinnedPositions.get(newPosition)
        if (existingCode && existingCode !== code && !selectedProducts.has(existingCode)) {
            return existingCode
        }

        return null
    }

    const handleOrderChange = (product, newValue) => {
        const code = product.code || product.style_code
        const newOrder = newValue === '' ? null : parseInt(newValue, 10)

        if (newOrder != null && isNaN(newOrder)) return

        // If cleared manually, it's an unpin action
        if (newOrder === null) {
            unpinProduct(product)
            return
        }

        // We allow the change even if there's a conflict to avoid interrupting typing (e.g. typing "11")
        // The "Soft Warning" (amber icon) is handled by isPositionOccupied in the UI.
        // The "Hard" conflict modal is now triggered via triggerConflictModal on Blur/Enter.
        setSelectedProducts(prev => {
            const updated = new Map(prev)
            const current = updated.get(code) || { originalOrder: product.display_order, name: product.name, is_active: product.is_active }
            updated.set(code, { ...current, display_order: newOrder })
            return updated
        })
    }

    const triggerConflictModal = (product) => {
        const code = product.code || product.style_code
        const currentData = selectedProducts.get(code)
        if (!currentData || currentData.display_order == null) return

        const conflictCode = checkConflict(code, currentData.display_order)
        if (conflictCode) {
            const existingProduct = products.find(p => (p.code || p.style_code) === conflictCode)
            const existingName = existingProduct?.name ||
                selectedProducts.get(conflictCode)?.name ||
                conflictCode

            setConflictModal({
                newProduct: code,
                newProductName: product.name,
                existingProduct: conflictCode,
                existingProductName: existingName,
                existingProductCode: conflictCode,
                position: currentData.display_order
            })
        }
    }
    const unpinProduct = (product) => {
        const code = product.code || product.style_code
        setSelectedProducts(prev => {
            const updated = new Map(prev)
            const current = updated.get(code) || {
                originalOrder: product.display_order,
                name: product.name,
                is_active: product.is_active
            }
            // Explicitly set to null to track for backend removal
            updated.set(code, { ...current, display_order: null })
            return updated
        })
    }

    const rebalanceSequence = () => {
        // 1. Collect all pinned products from both global state and current selection
        const allItems = new Map()

        // Existing pinned positions
        pinnedPositions.forEach((code, order) => {
            allItems.set(code, order)
        })

        // Overlay current selections (might have unpinned some or moved some)
        selectedProducts.forEach((data, code) => {
            if (data.display_order === null) {
                allItems.delete(code)
            } else if (data.display_order !== undefined) {
                allItems.set(code, data.display_order)
            }
        })

        // 2. Sort by current position
        const sorted = Array.from(allItems.entries())
            .sort((a, b) => (a[1] || 999999) - (b[1] || 999999))

        // 3. Re-assign positions 1, 2, 3...
        setSelectedProducts(prev => {
            const updated = new Map(prev)
            sorted.forEach(([code, _], index) => {
                const newPos = index + 1
                const current = updated.get(code) || {
                    name: code, // Fallback name if not on current page
                    originalOrder: pinnedPositions.get(code)
                }
                updated.set(code, { ...current, display_order: newPos })
            })
            return updated
        })

        setSuccessMessage('Sequence rebalanced (1, 2, 3...). Don\'t forget to save changes.')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const handleReplaceExisting = () => {
        if (!conflictModal) return

        setSelectedProducts(prev => {
            const updated = new Map(prev)

            const newCurrent = updated.get(conflictModal.newProduct) || { originalOrder: null, name: conflictModal.newProductName }
            updated.set(conflictModal.newProduct, { ...newCurrent, display_order: conflictModal.position })

            const existingCurrent = updated.get(conflictModal.existingProduct)
            if (existingCurrent) {
                updated.set(conflictModal.existingProduct, { ...existingCurrent, display_order: null })
            } else {
                updated.set(conflictModal.existingProduct, {
                    display_order: null,
                    originalOrder: conflictModal.position,
                    name: conflictModal.existingProductName
                })
            }

            return updated
        })

        setConflictModal(null)
    }

    const moveUp = (product) => {
        const code = product.code || product.style_code
        const currentOrder = getDisplayOrder(product)

        if (currentOrder == null || currentOrder <= 1) return

        const targetOrder = currentOrder - 1
        const conflictCode = checkConflict(code, targetOrder)

        setSelectedProducts(prev => {
            const updated = new Map(prev)

            // Handle conflict product (swap positions)
            if (conflictCode) {
                if (!updated.has(conflictCode)) {
                    const conflictProduct = products.find(p => (p.code || p.style_code) === conflictCode)
                    updated.set(conflictCode, {
                        display_order: currentOrder,
                        originalOrder: conflictProduct?.display_order ?? targetOrder,
                        name: conflictProduct?.name || conflictCode,
                        is_active: conflictProduct?.is_active ?? true
                    })
                } else {
                    const conflictData = updated.get(conflictCode)
                    updated.set(conflictCode, { ...conflictData, display_order: currentOrder })
                }
            }

            // Handle the product being moved
            if (!updated.has(code)) {
                // Product not in selection-add it with proper tracking
                updated.set(code, {
                    display_order: targetOrder,
                    originalOrder: product.display_order ?? currentOrder,
                    name: product.name,
                    is_active: product.is_active ?? true
                })
            } else {
                const current = updated.get(code)
                updated.set(code, { ...current, display_order: targetOrder })
            }

            return updated
        })
    }

    const moveDown = (product) => {
        const code = product.code || product.style_code
        const currentOrder = getDisplayOrder(product)

        if (currentOrder == null) return

        const targetOrder = currentOrder + 1
        const conflictCode = checkConflict(code, targetOrder)

        setSelectedProducts(prev => {
            const updated = new Map(prev)

            // Handle conflict product (swap positions)
            if (conflictCode) {
                if (!updated.has(conflictCode)) {
                    const conflictProduct = products.find(p => (p.code || p.style_code) === conflictCode)
                    updated.set(conflictCode, {
                        display_order: currentOrder,
                        originalOrder: conflictProduct?.display_order ?? targetOrder,
                        name: conflictProduct?.name || conflictCode,
                        is_active: conflictProduct?.is_active ?? true
                    })
                } else {
                    const conflictData = updated.get(conflictCode)
                    updated.set(conflictCode, { ...conflictData, display_order: currentOrder })
                }
            }

            // Handle the product being moved
            if (!updated.has(code)) {
                // Product not in selection-add it with proper tracking
                updated.set(code, {
                    display_order: targetOrder,
                    originalOrder: product.display_order ?? currentOrder,
                    name: product.name,
                    is_active: product.is_active ?? true
                })
            } else {
                const current = updated.get(code)
                updated.set(code, { ...current, display_order: targetOrder })
            }

            return updated
        })
    }

    // Bulk actions
    const handleApplyAction = async () => {
        if (!selectedAction || selectedProducts.size === 0) return

        switch (selectedAction) {
            case 'save-order':
                await handleSaveDisplayOrder()
                break
            case 'activate':
            case 'bulk-activate':
                await handleBulkActivate()
                break
            case 'deactivate':
            case 'bulk-discontinue':
                await handleBulkDiscontinue()
                break
            case 'export':
                handleExportCSV()
                break
            case 'delete':
                setDeleteModal(true)
                break
            case 'rebalance':
                rebalanceSequence()
                break
            case 'bulk-markup':
                await fetchMarkupRules()
                setBaseMarkup('') // Reset for new bulk action
                setCustomMarkups(new Map()) // Reset overrides
                setMarkupModal(true)
                break
            case 'bulk-set-best-seller':
                await handleBulkFeatured(true, null, null)
                break
            case 'bulk-set-recommended':
                await handleBulkFeatured(null, true, null)
                break
            case 'bulk-set-featured':
                await handleBulkFeatured(null, null, true)
                break
            case 'bulk-remove-featured-only':
                await handleBulkFeatured(null, null, false)
                break
            case 'bulk-remove-featured':
                await handleBulkFeatured(false, false, false)
                break
            default:
                break
        }
    }

    const handleSaveDisplayOrder = async () => {
        // 1. UI Validation: Check for duplicates or invalid numbers
        if (!validateOrders()) {
            setError('Please fix validation errors before saving')
            return
        }

        // 2. SANITY CHECK (The "Bouncer"): Ensure only products belonging to THIS category are sent
        const updates = Array.from(selectedProducts.entries())
            .filter(([code, data]) => {
                // Get the ID from any possible field name
                const pId = data.product_type_id || data.productTypeId || data.type_id || data.typeId;
                const sId = selectedType.id;

                // If the product doesn't have a type ID at all, we'll allow it 
                // because it was selected while this category was active.
                if (!pId) return true;

                // Compare as strings to avoid Type Mismatch (e.g., 21 vs "21")
                return String(pId) === String(sId);
            })
            .map(([code, data]) => ({
                style_code: code,
                display_order: data.display_order
            }))

        if (updates.length === 0) {
            setError('No valid products for this category found in your selection')
            return
        }

        try {
            setProcessing(true)
            setError(null)

            // 3. ATOMIC PAYLOAD: Lock the save to the specific Category Context
            const payload = {
                product_type_id: selectedType.id,
                orders: updates
            }

            const response = await fetch(`${API_BASE}/api/display-order/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const result = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(result.message || 'Failed to save display orders')
            }

            // 4. CROSS-CATEGORY WARNING: Detect if the backend skipped dirty data
            const sentCount = updates.length
            const savedCount = result.updatedCount ?? result.count ?? sentCount

            if (savedCount < sentCount) {
                setSuccessMessage(`Saved partially! ${savedCount} items updated, but ${sentCount - savedCount} products were skipped because they belong to other categories.`)
            } else {
                setSuccessMessage('Display orders saved successfully and written to Audit Log.')
            }

            // 5. CLEANUP: Clear selection after successful atomic save
            setSelectedProducts(new Map())
            setValidationErrors(new Map())
            setSelectedAction('')

            // Refresh data to reflect the new "Written in Stone" order
            await new Promise(resolve => setTimeout(resolve, 800))
            await fetchAllPinnedProducts()
            await fetchProducts()

            setTimeout(() => setSuccessMessage(null), 5000)

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleExportCSV = () => {
        const headers = ['Code', 'Name', 'Brand', 'Carton Price', 'Sell Price', 'Display Order', 'Status']
        const rows = []

        for (const [code, data] of selectedProducts.entries()) {
            const product = products.find(p => (p.code || p.style_code) === code)
            if (product) {
                rows.push([
                    code,
                    product.name,
                    product.brand,
                    product.carton_price || product.cartonPrice,
                    product.sell_price || product.price,
                    data.display_order || '',
                    data.is_active ? 'Active' : 'Inactive'
                ])
            }
        }

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `products-${selectedType.slug}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        setSuccessMessage('Products exported successfully')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const handleBulkDelete = async () => {
        const codes = Array.from(selectedProducts.keys())

        try {
            setProcessing(true)
            setError(null)
            setDeleteModal(false)

            const response = await fetch(`${API_BASE}/api/products/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_codes: codes })
            })

            if (!response.ok) {
                throw new Error('Failed to delete products')
            }

            setSuccessMessage(`${codes.length} product(s) deleted successfully`)
            setSelectedProducts(new Map())
            setSelectedAction('')
            await fetchProducts()

            setTimeout(() => setSuccessMessage(null), 3000)

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleBulkDiscontinue = async () => {
        const codes = Array.from(selectedProducts.keys())

        try {
            setProcessing(true)
            setError(null)

            const response = await fetch(`${API_BASE}/api/admin/products/bulk-discontinue`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    style_codes: codes
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Failed to discontinue products')
            }

            setSuccessMessage(`${codes.length} product(s) moved to discontinued successfully`)
            setSelectedProducts(new Map())
            setSelectedAction('')
            await fetchProducts()

            setTimeout(() => setSuccessMessage(null), 3000)

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const calculateSellPrice = (cartonPrice, markup) => {
        const cp = parseFloat(cartonPrice) || 0
        const m = parseFloat(markup) || 0
        return cp * (1 + m / 100)
    }

    const handleBulkMarkupSave = async () => {
        try {
            setProcessing(true)
            setError(null)

            const updates = Array.from(selectedProducts.keys()).map(code => {
                const actualProduct = products.find(p => (p.code || p.style_code) === code)
                const markup = customMarkups.get(code) ?? (baseMarkup !== '' ? parseFloat(baseMarkup) : actualProduct?.markupPercent)
                return {
                    style_code: code,
                    markup_percent: markup
                }
            })

            const response = await fetch(`${API_BASE}/api/admin/products/bulk-markup-override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides: updates })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update markups')
            }

            setSuccessMessage(`Changes published! Markup updated for ${updates.length} products.`)
            setMarkupModal(false)
            setCustomMarkups(new Map())
            setSelectedMarkupTier(null)
            setSelectedProducts(new Map())
            setBaseMarkup('')

            await fetchProducts()

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleBulkFeatured = async (isBestSeller, isRecommended, isFeatured, singleCode) => {
        // If no products are selected explicitly, but we're calling from a single row toggle
        // we might want to handle that. But the current implementation uses selectedProducts.
        // Let's modify it to accept an optional single code.
        const codes = Array.from(selectedProducts.keys())
        
        // If someone called handleBulkFeatured(null, null, true, 'GD001')
        const targetCodes = singleCode ? [singleCode] : codes;

        if (targetCodes.length === 0) return;

        try {
            setProcessing(true)
            setError(null)

            const response = await fetch(`${API_BASE}/api/admin/products/bulk-featured`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    style_codes: targetCodes,
                    is_best_seller: isBestSeller,
                    is_recommended: isRecommended,
                    is_featured: isFeatured
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Failed to update featured flags')
            }

            setSuccessMessage(`Featured status updated for ${targetCodes.length} product(s)`)
            if (!singleCode) setSelectedProducts(new Map())
            if (!singleCode) setSelectedAction('')
            await fetchProducts()

            setTimeout(() => setSuccessMessage(null), 3000)

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleBulkActivate = async () => {
        const codes = Array.from(selectedProducts.keys())

        try {
            setProcessing(true)
            setError(null)

            const response = await fetch(`${API_BASE}/api/admin/products/bulk-activate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    style_codes: codes
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Failed to activate products')
            }

            setSuccessMessage(`${codes.length} product(s) activated successfully`)
            setSelectedProducts(new Map())
            setSelectedAction('')
            await fetchProducts()

            setTimeout(() => setSuccessMessage(null), 3000)

        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    // Pagination
    const selectedOnPage = products.filter(p => isSelected(p.code || p.style_code)).length
    const allOnPageSelected = products.length > 0 && selectedOnPage === products.length



    return (
        <div className="flex-1 min-w-0 p-6 pt-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 mb-2 tracking-wide">
                <span className="hover:text-primary cursor-pointer transition-colors">DASHBOARD</span>
                <span className="text-gray-300 font-normal">/</span>
                <span className="text-gray-500">PRODUCTS</span>
            </div>

            {/* Title & Actions Row */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Products
                    </h1>
                    <div className="px-3 py-1 bg-primary text-[11px] font-bold text-white rounded-full uppercase tracking-wider shadow-sm">
                        {selectedType?.product_count || totalCount.toLocaleString()} products
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchProducts()}
                        className="h-9 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                    <div className="relative group">
                        <button className="h-9 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Download className="w-3.5 h-3.5" />
                            Import
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <button className="h-9 px-4 text-xs font-bold text-white bg-[#1e293b] rounded hover:bg-slate-800 transition-all flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" />
                        Add Product
                    </button>
                </div>
            </div>


            {/* Two Column Layout */}
            <div className="flex gap-8">
                <aside className="w-64 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Product Types</h3>
                        <button onClick={() => fetchProductTypes()} className="text-indigo-500 hover:text-primary transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* All Products */}
                        <button
                            onClick={() => { setSelectedType(null); setCurrentPage(1) }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-[13px] rounded transition-all ${!selectedType
                                ? 'bg-primary text-white font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${!selectedType ? 'bg-white' : 'bg-slate-300'}`} />
                                <span>All Products</span>
                            </div>
                            <span className={!selectedType ? 'text-white/80' : 'text-slate-400'}>
                                ({totalCount.toLocaleString()})
                            </span>
                        </button>
                        {productTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleTypeChange(type)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-[13px] rounded transition-all ${selectedType?.id === type.id
                                    ? 'bg-primary text-white font-bold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedType?.id === type.id ? 'bg-white' : 'bg-slate-300'}`} />
                                    <span>{type.name}</span>
                                </div>
                                <span className={selectedType?.id === type.id ? 'text-white/80' : 'text-slate-400'}>
                                    ({type.product_count || 0})
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {/* One row: supplier toggles (left), Live/Deactivated (right) — no "Supplier" label */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200 shadow-sm">
                            <button
                                onClick={() => setSupplier('')}
                                disabled={loadingSuppliers}
                                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${!selectedSupplierSlug
                                    ? 'bg-white text-primary shadow-md'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    } disabled:opacity-60`}
                            >
                                All suppliers
                            </button>
                            {suppliers.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSupplier(s.slug)}
                                    disabled={loadingSuppliers}
                                    className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${selectedSupplierSlug === s.slug
                                        ? 'bg-white text-primary shadow-md'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                        } disabled:opacity-60`}
                                >
                                    {s.name}
                                </button>
                            ))}
                            {loadingSuppliers && (
                                <span className="px-3 py-2 flex items-center text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 p-1.5 bg-slate-100/50 rounded-xl border border-slate-200 shadow-inner">
                            <button
                                onClick={() => setViewType('standard')}
                                className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${viewType === 'standard'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Live Catalog
                            </button>
                            <button
                                onClick={() => setViewType('deactivated')}
                                className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${viewType === 'deactivated'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Deactivated
                            </button>
                        </div>
                    </div>

                    {/* Search Bar & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code or description..."
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                        </div>

                        {/* Brand Filter Dropdown */}
                        <div className="relative" ref={brandDropdownRef}>
                            <button
                                onClick={() => { setShowBrandDropdown(!showBrandDropdown); setBrandSearch('') }}
                                className={`h-[42px] flex items-center gap-2 px-4 rounded-xl border text-[13px] font-bold transition-all whitespace-nowrap
                                    ${selectedBrand
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
                                    }`}
                            >
                                <Tag className="w-4 h-4" />
                                <span>{selectedBrand ? selectedBrand.name : 'All Brands'}</span>
                                {selectedBrand
                                    ? <X className="w-3.5 h-3.5 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedBrand(null); setBrandSearch('') }} />
                                    : <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showBrandDropdown ? 'rotate-180' : ''}`} />
                                }
                            </button>

                            {showBrandDropdown && (
                                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                    <div className="p-2 border-b border-slate-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search brands..."
                                                value={brandSearch}
                                                onChange={e => setBrandSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-[12px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto py-1">
                                        <button
                                            onClick={() => { setSelectedBrand(null); setShowBrandDropdown(false); setBrandSearch('') }}
                                            className={`w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors ${!selectedBrand ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            All Brands <span className="text-slate-400 font-normal">({brands.length})</span>
                                        </button>
                                        {brands
                                            .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                                            .map(b => (
                                                <button
                                                    key={b.id}
                                                    onClick={() => { setSelectedBrand(b); setShowBrandDropdown(false); setBrandSearch(''); setCurrentPage(1); setSelectedType(null) }}
                                                    className={`w-full text-left px-4 py-2 text-[12px] font-medium transition-colors flex items-center justify-between
                                                        ${selectedBrand?.id === b.id ? 'text-primary bg-primary/5 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    <span>{b.name}</span>
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setDebouncedSearchTerm(searchTerm); fetchProducts() }}
                                className="h-[42px] px-6 bg-slate-900 text-white text-[11px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all tracking-widest shadow-lg shadow-slate-200 active:scale-95">
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Compact Redesigned Bulk Actions Bar */}
                    {selectedProducts.size > 0 && (
                        <div className={`p-2.5 mb-4 rounded-lg border flex items-center justify-between gap-4 transition-all shadow-sm sticky top-0 z-30 ${hasUnsavedChanges
                            ? 'bg-amber-50/95 backdrop-blur-sm border-amber-200 ring-1 ring-amber-500/10'
                            : 'bg-white/95 backdrop-blur-sm border-slate-200'
                            } `}>
                            <div className="flex items-center gap-4 pl-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] font-black text-slate-900 tracking-tight">
                                        {selectedProducts.size} Selected
                                    </span>
                                    <div className="h-4 w-[1px] bg-slate-200" />
                                    <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider">
                                        <button
                                            onClick={selectAllOnPage}
                                            className="text-primary hover:text-indigo-700 transition-colors"
                                        >
                                            Select Page
                                        </button>
                                        <button
                                            onClick={clearAllSelections}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Custom Compact Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setShowActionDropdown(!showActionDropdown)}
                                        className={`h-8 px-4 flex items-center gap-2 rounded-md text-[11px] font-bold transition-all border ${selectedAction
                                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {selectedAction ? (
                                            <>
                                                {(() => {
                                                    const action = bulkActions.find(a => a.value === selectedAction);
                                                    const Icon = action?.icon || Check;
                                                    return <Icon className="w-3.5 h-3.5" />;
                                                })()}
                                                <span>{bulkActions.find(a => a.value === selectedAction)?.label}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-3.5 h-3.5" />
                                                <span>Actions</span>
                                            </>
                                        )}
                                        <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${showActionDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showActionDropdown && (
                                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {bulkActions.map((action) => {
                                                const Icon = action.icon;
                                                return (
                                                    <button
                                                        key={action.value}
                                                        onClick={() => {
                                                            setSelectedAction(action.value);
                                                            setShowActionDropdown(false);
                                                        }}
                                                        className={`w-full px-3 py-2 flex items-center gap-2.5 text-[12px] font-medium transition-colors ${selectedAction === action.value
                                                            ? 'bg-primary/5 text-primary'
                                                            : action.danger
                                                                ? 'text-red-600 hover:bg-red-50'
                                                                : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <Icon className={`w-3.5 h-3.5 ${selectedAction === action.value ? 'text-primary' : action.danger ? 'text-red-500' : 'text-slate-400'}`} />
                                                        <span className="font-bold">{action.label}</span>
                                                        {selectedAction === action.value && <Check className="w-3 h-3 ml-auto" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleApplyAction}
                                    disabled={!selectedAction || processing || (selectedAction === 'save-order' && validationErrors.size > 0)}
                                    className="h-8 px-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-slate-800 disabled:opacity-30 transition-all shadow-sm active:scale-95"
                                >
                                    {processing ? '...' : 'Apply'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {successMessage}
                            <button onClick={() => setSuccessMessage(null)} className="ml-auto">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <Card className="p-0 overflow-hidden mb-8">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="py-4 px-6 text-left w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                onChange={(e) => {
                                                    const newSelected = new Map()
                                                    if (e.target.checked) {
                                                        products.forEach(p => newSelected.set(p.code, p))
                                                    }
                                                    setSelectedProducts(newSelected)
                                                }}
                                                checked={selectedProducts.size === products.length && products.length > 0}
                                            />
                                        </th>
                                        <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Order</th>
                                        <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Image</th>
                                        <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                                        <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
                                        <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Brand</th>
                                        <th className="py-3 px-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                                        <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Carton Price</th>
                                        <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sell Price</th>
                                        <th className="py-3 px-4 text-right text-[11px] font-bold text-orange-400 uppercase tracking-wider">Profit/pc</th>
                                        <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Margin</th>
                                        <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingProducts ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                                                <p className="text-[#839ab1] mt-3 text-sm font-medium">Loading catalog...</p>
                                            </td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center">
                                                <p className="text-lg font-bold text-gray-900">No products found</p>
                                                <p className="text-[#839ab1] text-sm">Try adjusting your filters or search terms.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product) => {
                                            const code = product.code || product.style_code
                                            const selected = isSelected(code)
                                            const displayOrder = getDisplayOrder(product)
                                            const isPinned = displayOrder != null

                                            return (
                                                <tr
                                                    key={code}
                                                    onClick={(e) => {
                                                        if (e.target.type === 'checkbox' || e.target.closest('button') || e.target.tagName === 'INPUT') return;
                                                        navigate(`/products/${code}`);
                                                    }}
                                                    className={`border-b border-gray-50 transition-colors cursor-pointer
                                                    ${selected ? 'bg-primary/5' : isPinned ? 'bg-slate-50' : 'hover:bg-gray-50'}`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="py-4 px-6">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleSelection(product)}
                                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>

                                                    {/* Order */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center justify-center gap-1.5 min-w-[100px]">
                                                            {/* Up/Down Controls-Visible if Pinned or Selected */}
                                                            {(selected || isPinned) && (
                                                                <div className="flex flex-col gap-1">
                                                                    <button
                                                                        onClick={() => moveUp(product)}
                                                                        disabled={displayOrder <= 1}
                                                                        className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 disabled:opacity-0 transition-all"
                                                                        title="Move Up"
                                                                    >
                                                                        <ChevronUp className="w-4 h-4 stroke-[3]" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => moveDown(product)}
                                                                        className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                                        title="Move Down"
                                                                    >
                                                                        <ChevronDown className="w-4 h-4 stroke-[3]" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-1">
                                                                {selected ? (
                                                                    /* Editable Badge when row is selected */
                                                                    <div className="relative group/badge">
                                                                        <div className={`px-2 py-1 rounded-[6px] text-[12px] font-bold flex items-center gap-1 min-w-[50px] justify-center transition-all ${isPinned ? 'bg-[#F59E0B] text-white shadow-lg shadow-amber-200/50' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                                            <span className="text-[10px] opacity-70">★</span>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                value={displayOrder ?? ''}
                                                                                onChange={(e) => handleOrderChange(product, e.target.value)}
                                                                                onBlur={() => triggerConflictModal(product)}
                                                                                className="w-8 bg-transparent text-center focus:outline-none border-none p-0 text-[12px] font-bold placeholder:text-current/30"
                                                                                placeholder="—"
                                                                            />
                                                                        </div>
                                                                        {isPinned && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    unpinProduct(product);
                                                                                }}
                                                                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-sm"
                                                                                title="Remove Pin"
                                                                            >
                                                                                <X className="w-3 h-3 stroke-[3]" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : isPinned ? (
                                                                    /* Static Badge for Pinned */
                                                                    <div className="bg-[#F59E0B] text-white px-2.5 py-1 rounded-[6px] text-[12px] font-bold flex items-center gap-1 min-w-[45px] justify-center shadow-md shadow-amber-200/20">
                                                                        <span className="text-[10px]">★</span>
                                                                        <span>{displayOrder}</span>
                                                                    </div>
                                                                ) : (
                                                                    /* Not pinned: show empty dash */
                                                                    <span className="text-slate-300 text-sm font-medium">—</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Image */}
                                                    <td className="py-3 px-4">
                                                        <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                                                            <img
                                                                src={(() => {
                                                                    const originalSrc = (product.image && product.image !== 'Not available') ? product.image : (product.colors?.[0]?.thumb || product.colors?.[0]?.main);
                                                                    if (originalSrc && originalSrc.includes('absoluteapparel.co.uk')) {
                                                                        return `https://images.weserv.nl/?url=${encodeURIComponent(originalSrc.replace('http://', 'https://'))}`;
                                                                    }
                                                                    return originalSrc;
                                                                })()}
                                                                alt={product.name}
                                                                className="w-full h-full object-contain"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => {
                                                                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="%23f3f4f6"><rect width="40" height="40"/></svg>'
                                                                }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Code */}
                                                    <td className="py-3 px-4">
                                                        <span className="text-sm text-gray-500">{code}</span>
                                                    </td>

                                                    {/* Product Name */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-900">{product.name}</span>
                                                                <div className="flex gap-1">
                                                                    {product.is_best_seller && (
                                                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" title="Best Seller" />
                                                                    )}
                                                                    {product.is_recommended && (
                                                                        <SparklesIcon className="w-3 h-3 text-indigo-500 fill-indigo-500" title="Recommended" />
                                                                    )}
                                                                    {product.is_featured && (
                                                                        <Crown className="w-3 h-3 text-violet-500 fill-violet-500" title="Featured" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-gray-400">{product.productType}</p>
                                                        </div>
                                                    </td>

                                                    {/* Brand */}
                                                    <td className="py-3 px-4 text-sm font-medium text-slate-600">
                                                        {product.brand}
                                                    </td>

                                                    {/* Supplier */}
                                                    <td className="py-3 px-4 text-center">
                                                        {(() => {
                                                            const s = (product.supplier || '').toLowerCase();
                                                            if (s.includes('ralawise')) {
                                                                return (
                                                                    <div className="w-7 h-7 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600" title="Ralawise">
                                                                        R
                                                                    </div>
                                                                );
                                                            } else if (s.includes('uneek')) {
                                                                return (
                                                                    <div className="w-7 h-7 mx-auto rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[11px] font-bold text-emerald-600" title="Uneek">
                                                                        U
                                                                    </div>
                                                                );
                                                            } else if (s.includes('absolut')) {
                                                                return (
                                                                    <div className="w-7 h-7 mx-auto rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-600" title="Absolute Apparel">
                                                                        A
                                                                    </div>
                                                                );
                                                            }
                                                            return <span className="text-slate-400 text-xs">—</span>;
                                                        })()}
                                                    </td>

                                                    {/* Carton Price */}
                                                    <td className="py-3 px-4 text-right">
                                                        <span className="text-sm font-medium text-slate-500">
                                                            {product.carton_price != null ? `£${Number(product.carton_price).toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                        </span>
                                                    </td>

                                                    {/* Sell Price */}
                                                    <td className="py-3 px-4 text-right">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            £{Number(product.sell_price || product.price || 0).toFixed(2)}
                                                        </span>
                                                    </td>

                                                    {/* Profit per piece */}
                                                    <td className="py-3 px-4 text-right">
                                                        {(() => {
                                                            const sell = Number(product.sell_price || product.price || 0);
                                                            const cost = Number(product.carton_price || 0);
                                                            if (!cost || !sell) return <span className="text-slate-300 text-xs">—</span>;
                                                            return (
                                                                <span className="text-sm font-bold text-orange-500">
                                                                    £{(sell - cost).toFixed(2)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>

                                                    {/* Margin */}
                                                    <td className="py-3 px-4 text-right">
                                                        {(() => {
                                                            const sell = Number(product.sell_price || product.price || 0);
                                                            const cost = Number(product.carton_price || 0);
                                                            if (!cost || !sell) return <span className="text-slate-300 text-xs">—</span>;
                                                            const profit = sell - cost;
                                                            const margin = (profit / sell) * 100;
                                                            const color = margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-500' : 'text-red-500';
                                                            return (
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-sm font-semibold ${color}`}>£{profit.toFixed(2)}</span>
                                                                    <span className={`text-[10px] font-medium ${color}`}>{margin.toFixed(1)}%</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBulkFeatured(null, null, !product.is_featured, code);
                                                                }}
                                                                className={`p-1.5 rounded transition-all ${product.is_featured ? 'text-violet-500 bg-violet-50' : 'text-slate-300 hover:text-violet-500 hover:bg-violet-50'}`}
                                                                title={product.is_featured ? "Unfeature Product" : "Feature Product"}
                                                            >
                                                                <Crown className={`w-4 h-4 ${product.is_featured ? 'fill-current' : ''}`} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/products/${code}`)}
                                                                className="text-gray-400 hover:text-primary transition-colors p-1.5"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Pagination */}
                    {/* Pagination Section-Modern & Clean */}
                    <div className="flex items-center justify-between mt-8">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value={15}>15</option>
                                <option value={24}>24</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-500">
                                {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum
                                    if (totalPages <= 5) {
                                        pageNum = i + 1
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i
                                    } else {
                                        pageNum = currentPage - 2 + i
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors
                                            ${currentPage === pageNum
                                                    ? 'bg-primary text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Position Conflict Resolution Modal */}
                    {conflictModal && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                            <Card className="w-full max-w-sm p-6 shadow-xl border border-slate-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Position Conflict</h3>
                                        <p className="text-xs text-slate-500">Position #{conflictModal.position} is already taken.</p>
                                    </div>
                                </div>

                                <p className="text-[13px] text-slate-600 mb-6">
                                    Product <span className="font-bold text-slate-900">{conflictModal.existingProductCode || conflictModal.existingProduct}</span> is currently at this position. Replace it?
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConflictModal(null)}
                                        className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={handleReplaceExisting}
                                        className="flex-1 py-2 text-xs font-black text-white bg-primary rounded hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
                                    >
                                        REPLACE
                                    </button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {
                        deleteModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md p-6 m-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                            <Trash2 className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Delete Products</h3>
                                            <p className="text-gray-600 mt-2">
                                                Are you sure you want to delete <span className="font-bold">{selectedProducts.size}</span> product(s)? This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => setDeleteModal(false)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleBulkDelete}
                                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                        >
                                            Delete Products
                                        </button>
                                    </div>
                                </Card>
                            </div>
                        )
                    }

                    {/* Minimalist Floating Sync Tracker */}
                    {
                        processing && (
                            <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white/95 backdrop-blur-sm border border-[#e2e8f0] rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[240px]">
                                    <div className="relative">
                                        <div className="w-10 h-10 border-4 border-slate-100 border-t-primary-600 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-3 h-3 bg-primary-600 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900">Syncing...</h3>
                                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Updating database positions</p>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {/* Redesigned Bulk Markup Modal */}
                    {markupModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                            <Card className="w-full max-w-5xl max-h-[85vh] flex flex-col p-0 border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">Bulk Pricing Management</h2>
                                    <button
                                        onClick={() => setMarkupModal(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Batch Action Bar */}
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium text-gray-700">Set Global Markup:</span>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={baseMarkup}
                                                onChange={(e) => setBaseMarkup(e.target.value)}
                                                className="w-24 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            (Applied to all listed items)
                                        </span>
                                    </div>

                                    {customMarkups.size > 0 && (
                                        <button
                                            onClick={() => setCustomMarkups(new Map())}
                                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Clear Overrides
                                        </button>
                                    )}
                                </div>

                                {/* Table Header */}
                                <div className="px-6 py-2 border-b border-gray-100 bg-gray-50/50 grid grid-cols-[1fr_100px_100px_120px_100px_120px] gap-4 items-center">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product Info</span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Carton Cost</span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Current Sell</span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Current Markup</span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Override %</span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Preview Price</span>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-2 bg-white">
                                    {Array.from(selectedProducts.keys()).map(code => {
                                        // Try getting from map first (cross-page support), then fallback to current page list
                                        const actualProduct = selectedProducts.get(code) || products.find(p => (p.code || p.style_code) === code)

                                        const cartonPrice = actualProduct?.carton_price || actualProduct?.cartonPrice || 0
                                        const originalMarkup = actualProduct?.markupPercent || actualProduct?.markup_percent || 0
                                        const originalPrice = actualProduct?.price || actualProduct?.sell_price || 0

                                        const isOverridden = customMarkups.has(code)
                                        const effectiveMarkup = isOverridden ? customMarkups.get(code) : (baseMarkup !== '' ? parseFloat(baseMarkup) : originalMarkup)
                                        const sellPrice = calculateSellPrice(cartonPrice, effectiveMarkup)

                                        const currentMarkupVal = actualProduct?.markup_tier ?? originalMarkup

                                        return (
                                            <div key={code} className="grid grid-cols-[1fr_100px_100px_120px_100px_120px] gap-4 items-center py-3 border-b border-gray-50 last:border-none">
                                                <div>
                                                    <div className="text-xs font-bold text-gray-400">{code}</div>
                                                    <div className="text-sm font-medium text-gray-900 truncate">{actualProduct?.name || code}</div>
                                                </div>

                                                <div className="text-right text-sm text-gray-600">
                                                    £{cartonPrice.toFixed(2)}
                                                </div>

                                                <div className="text-right text-sm text-gray-400">
                                                    £{originalPrice.toFixed(2)}
                                                </div>

                                                <div className="text-center">
                                                    <span className="text-sm font-bold text-gray-700">{currentMarkupVal}%</span>
                                                </div>

                                                <div className="flex justify-center">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={isOverridden ? customMarkups.get(code) : ''}
                                                            placeholder={baseMarkup !== '' ? baseMarkup : originalMarkup}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                                                                setCustomMarkups(prev => {
                                                                    const next = new Map(prev)
                                                                    if (val === '') next.delete(code)
                                                                    else next.set(code, val)
                                                                    return next
                                                                })
                                                            }}
                                                            className={`w-20 px-2 py-1 text-right text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary ${isOverridden ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-500'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${effectiveMarkup !== originalMarkup ? 'text-primary' : 'text-gray-900'}`}>
                                                        £{sellPrice.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setMarkupModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkMarkupSave}
                                        className="px-6 py-2 bg-primary text-white text-sm font-bold rounded hover:bg-accent transition-colors flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div >
        </div >
    )
}

export default Products
