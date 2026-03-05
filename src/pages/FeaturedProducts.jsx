import { useState, useEffect, useCallback, useMemo } from 'react'
import Card from '../components/Card'
import {
    Search, Star, Eye, Check, X, Sparkles, RefreshCw,
    Layers, Package, ExternalLink, Pin, ChevronUp, ChevronDown, AlertTriangle
} from 'lucide-react'

import { API_BASE } from '../config'

const FeaturedProducts = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('best') // 'best' | 'recommended'
    const [searchTerm, setSearchTerm] = useState('')
    const [productTypes, setProductTypes] = useState([])
    const [selectedType, setSelectedType] = useState(null)

    // Selection & Ordering State
    const [selectionsByType, setSelectionsByType] = useState({ best: new Map(), recommended: new Map() })
    const [pinnedPositions, setPinnedPositions] = useState(new Map())
    const [processing, setProcessing] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [error, setError] = useState(null)
    const [validationErrorsByType, setValidationErrorsByType] = useState({ best: new Map(), recommended: new Map() })
    const [conflictModal, setConflictModal] = useState(null)

    // Helpers to get current tab's state
    const selectedProducts = selectionsByType[filterType] || new Map()
    const validationErrors = validationErrorsByType[filterType] || new Map()

    const updateCurrentSelections = (updater) => updateSelectionsByType(filterType, updater)
    const updateCurrentValidationErrors = (updater) => updateValidationErrorsByType(filterType, updater)

    const updateSelectionsByType = (type, updater) => {
        setSelectionsByType(prev => ({
            ...prev,
            [type]: typeof updater === 'function' ? updater(prev[type]) : updater
        }))
    }

    const updateValidationErrorsByType = (type, updater) => {
        setValidationErrorsByType(prev => ({
            ...prev,
            [type]: typeof updater === 'function' ? updater(prev[type]) : updater
        }))
    }

    // Computed: has unsaved changes (Checking both categories)
    const hasUnsavedChanges = useMemo(() => {
        const types = ['best', 'recommended']
        return types.some(type => {
            const selections = selectionsByType[type]
            if (!selections || selections.size === 0) return false

            return Array.from(selections.entries()).some(([code, data]) => {
                const product = products.find(p => p.style_code === code)
                const currentOrder = type === 'best' ? product?.best_seller_order : product?.recommended_order

                // If it's in selections, we check if the new order differs from original
                // 999999 = Unfeatured, < 999999 = Featured
                return data.order !== currentOrder
            })
        })
    }, [selectionsByType, products])

    const totalSelectedCount = useMemo(() => {
        const bestSize = selectionsByType.best?.size || 0
        const recommendedSize = selectionsByType.recommended?.size || 0
        return bestSize + recommendedSize
    }, [selectionsByType])

    const fetchFeatured = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('type', filterType)
            if (selectedType) {
                params.append('product_type_id', selectedType.id)
            }
            params.append('_t', Date.now().toString())

            const response = await fetch(`${API_BASE}/api/admin/products/featured?${params}`)
            if (!response.ok) throw new Error('Failed to fetch featured products')
            const data = await response.json()

            setProducts(data.items || [])

            if (data.by_product_type) {
                setProductTypes(data.by_product_type)
                if (data.by_product_type.length > 0 && !selectedType) {
                    setSelectedType(data.by_product_type[0])
                }
            }
        } catch (err) {
            console.error('Error:', err)
            setError('Could not load featured products')
        } finally {
            setLoading(false)
        }
    }, [filterType, selectedType])

    // Fetch ALL pinned products for this category to detect conflicts
    const fetchAllPinned = useCallback(async () => {
        if (!selectedType) {
            setPinnedPositions(new Map())
            return
        }

        try {
            // Re-using the featured endpoint but without the limit if possible, 
            // or just assuming featured returns the pinned ones.
            const params = new URLSearchParams()
            params.append('type', filterType)
            params.append('product_type_id', selectedType.id)
            params.append('limit', '500') // Large limit to get all pinned items
            params.append('_t', Date.now().toString())

            const response = await fetch(`${API_BASE}/api/admin/products/featured?${params}`)
            if (!response.ok) return
            const data = await response.json()

            const pinned = new Map()
                ; (data.items || []).forEach(p => {
                    const order = filterType === 'best' ? p.best_seller_order : p.recommended_order
                    if (order != null && order !== 999999) {
                        pinned.set(order, p.style_code)
                    }
                })
            setPinnedPositions(pinned)
        } catch (err) {
            console.error('Error fetching pinned:', err)
        }
    }, [selectedType, filterType])

    useEffect(() => {
        fetchFeatured()
        fetchAllPinned()
    }, [fetchFeatured, fetchAllPinned])

    const handleToggleFeatured = (product, type) => {
        const code = product.style_code
        updateSelectionsByType(type, prev => {
            const next = new Map(prev)
            const currentSelection = next.get(code)

            const originalOrder = type === 'best' ? product.best_seller_order : product.recommended_order
            const isOriginallyFeatured = originalOrder !== 999999 && originalOrder != null

            const isOriginallyActive = type === 'best' ? !!product.is_best_seller : !!product.is_recommended
            let isCurrentlyActive = currentSelection
                ? currentSelection.order !== 999999
                : (isOriginallyActive || isOriginallyFeatured)

            let nextOrder
            if (isCurrentlyActive) {
                nextOrder = 999999
            } else {
                // If originally had a position, restore it, otherwise give it next available or unpinned
                if (isOriginallyFeatured && originalOrder < 999999) {
                    nextOrder = originalOrder
                } else {
                    // Try to find max position across pinned and selections for this type
                    const pinnedOrders = Array.from(pinnedPositions.keys()).filter(o => o < 999999)
                    const selectionOrders = Array.from(next.values()).map(s => s.order).filter(o => o != null && o < 999999)
                    const allOrders = [...pinnedOrders, ...selectionOrders]
                    const maxPos = allOrders.length > 0 ? Math.max(...allOrders) : 0
                    nextOrder = maxPos + 1
                }
            }

            next.set(code, {
                order: nextOrder,
                name: product.style_name || product.name
            })
            return next
        })
    }

    const filteredList = products.filter(p =>
        p.style_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.style_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSelectRow = (product) => {
        updateCurrentSelections(prev => {
            const next = new Map(prev)
            if (next.has(product.style_code)) {
                next.delete(product.style_code)
                updateCurrentValidationErrors(v => {
                    const updated = new Map(v)
                    updated.delete(product.style_code)
                    return updated
                })
            } else {
                let order = filterType === 'best' ? product.best_seller_order : product.recommended_order
                if (order === 999999 || order == null) order = null
                next.set(product.style_code, { order, name: product.style_name || product.name })
            }
            return next
        })
    }

    const checkConflict = (code, newPosition) => {
        if (newPosition == null || Number(newPosition) === 999999) return null

        // Conflict within selection
        for (const [productCode, data] of selectedProducts.entries()) {
            if (productCode !== code && data.order === newPosition) {
                return productCode
            }
        }

        // Conflict with backend data
        const existingCode = pinnedPositions.get(newPosition)
        if (existingCode && existingCode !== code && !selectedProducts.has(existingCode)) {
            return existingCode
        }

        return null
    }

    const isPositionOccupied = (code, position) => {
        return !!checkConflict(code, position)
    }

    const handleOrderChange = (product, value) => {
        const order = value === '' ? null : parseInt(value, 10)
        if (order != null && isNaN(order)) return

        updateCurrentSelections(prev => {
            const next = new Map(prev)
            const current = next.get(product.style_code) || { name: product.style_name || product.name }
            next.set(product.style_code, { ...current, order })
            return next
        })
    }

    const triggerConflictModal = (product) => {
        const code = product.style_code
        const currentData = selectedProducts.get(code)
        if (!currentData || currentData.order == null) return

        const conflictCode = checkConflict(code, currentData.order)
        if (conflictCode) {
            const existingName = products.find(p => p.style_code === conflictCode)?.style_name ||
                selectedProducts.get(conflictCode)?.name ||
                conflictCode

            setConflictModal({
                newProduct: code,
                newProductName: currentData.name,
                existingProduct: conflictCode,
                existingProductName: existingName,
                position: currentData.order
            })
        }
    }

    const handleReplaceExisting = () => {
        if (!conflictModal) return

        updateCurrentSelections(prev => {
            const next = new Map(prev)

            // Give position to new product
            const newCurrent = next.get(conflictModal.newProduct)
            next.set(conflictModal.newProduct, { ...newCurrent, order: conflictModal.position })

            // Unpin the old product
            const existingCurrent = next.get(conflictModal.existingProduct)
            if (existingCurrent) {
                next.set(conflictModal.existingProduct, { ...existingCurrent, order: null })
            } else {
                next.set(conflictModal.existingProduct, {
                    order: null,
                    name: conflictModal.existingProductName
                })
            }

            return next
        })

        setConflictModal(null)
    }

    const moveUp = (product) => {
        const code = product.style_code
        const data = selectedProducts.get(code) || { order: (filterType === 'best' ? product.best_seller_order : product.recommended_order) }
        let currentOrder = data.order
        if (currentOrder === 999999 || currentOrder == null) return

        const targetOrder = currentOrder - 1
        if (targetOrder < 1) return

        const conflictCode = checkConflict(code, targetOrder)

        updateCurrentSelections(prev => {
            const next = new Map(prev)

            if (conflictCode) {
                const conflictData = next.get(conflictCode) || {
                    name: products.find(p => p.style_code === conflictCode)?.style_name || conflictCode,
                    order: targetOrder
                }
                next.set(conflictCode, { ...conflictData, order: currentOrder })
            }

            const current = next.get(code) || { name: product.style_name || product.name }
            next.set(code, { ...current, order: targetOrder })
            return next
        })
    }

    const moveDown = (product) => {
        const code = product.style_code
        const data = selectedProducts.get(code) || { order: (filterType === 'best' ? product.best_seller_order : product.recommended_order) }
        let currentOrder = data.order

        if (currentOrder === 999999 || currentOrder == null) return

        const targetOrder = currentOrder + 1
        const conflictCode = checkConflict(code, targetOrder)

        updateCurrentSelections(prev => {
            const next = new Map(prev)

            if (conflictCode) {
                const conflictData = next.get(conflictCode) || {
                    name: products.find(p => p.style_code === conflictCode)?.style_name || conflictCode,
                    order: targetOrder
                }
                next.set(conflictCode, { ...conflictData, order: currentOrder })
            }

            const current = next.get(code) || { name: product.style_name || product.name }
            next.set(code, { ...current, order: targetOrder })
            return next
        })
    }

    const rebalanceSequence = () => {
        const allPinned = new Map()

        // Backend data
        pinnedPositions.forEach((code, order) => allPinned.set(code, order))

        // Current selection overrides
        selectedProducts.forEach((data, code) => {
            if (data.order === null) allPinned.delete(code)
            else if (data.order != null) allPinned.set(code, data.order)
        })

        const sorted = Array.from(allPinned.entries())
            .sort((a, b) => a[1] - b[1])

        updateCurrentSelections(prev => {
            const next = new Map(prev)
            sorted.forEach(([code, _], index) => {
                const newPos = index + 1
                const current = next.get(code) || {
                    name: products.find(p => p.style_code === code)?.style_name || code
                }
                next.set(code, { ...current, order: newPos })
            })
            return next
        })

        setSuccessMessage('Sequence rebalanced. Don\'t forget to save.')
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const validateAllOrders = () => {
        const errorsByType = { best: new Map(), recommended: new Map() }
        let hasErrors = false

        const types = ['best', 'recommended']
        types.forEach(type => {
            const selections = selectionsByType[type]
            const positions = new Map()

            selections.forEach((data, code) => {
                const order = data.order != null ? Number(data.order) : null
                if (order === null || order === 999999) return

                if (!Number.isInteger(order) || order < 1) {
                    errorsByType[type].set(code, 'Invalid position')
                    hasErrors = true
                    return
                }
                if (positions.has(order)) {
                    errorsByType[type].set(code, `Duplicate #${order}`)
                    errorsByType[type].set(positions.get(order), `Duplicate #${order}`)
                    hasErrors = true
                } else {
                    positions.set(order, code)
                }
            })
        })

        setValidationErrorsByType(errorsByType)
        return !hasErrors
    }

    const handleSaveSequence = async () => {
        if (totalSelectedCount === 0) return
        if (!validateAllOrders()) {
            setError('Please resolve numbering conflicts in all tabs before saving.')
            return
        }

        try {
            setProcessing(true)
            const allUpdates = []

            // Process both types
            const types = ['best', 'recommended']
            types.forEach(type => {
                selectionsByType[type].forEach((data, code) => {
                    const orderValue = data.order === null ? 999999 : data.order

                    // Check if this product already has a pending update in the list
                    const existingItem = allUpdates.find(u => u.style_code === code)
                    if (existingItem) {
                        if (type === 'best') existingItem.best_seller_order = orderValue
                        if (type === 'recommended') existingItem.recommended_order = orderValue
                    } else {
                        const newItem = { style_code: code }
                        if (type === 'best') newItem.best_seller_order = orderValue
                        if (type === 'recommended') newItem.recommended_order = orderValue
                        allUpdates.push(newItem)
                    }
                })
            })

            const response = await fetch(`${API_BASE}/api/admin/products/order-featured`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: allUpdates })
            })

            if (!response.ok) throw new Error('Failed to save sequence updates')

            setSuccessMessage('All sequence updates saved successfully!')
            setSelectionsByType({ best: new Map(), recommended: new Map() })
            setValidationErrorsByType({ best: new Map(), recommended: new Map() })
            await fetchFeatured()
            await fetchAllPinned()
            setTimeout(() => setSuccessMessage(null), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const items = new Map()
            filteredList.forEach(p => {
                let order = filterType === 'best' ? p.best_seller_order : p.recommended_order
                if (order === 999999 || order == null) order = null
                items.set(p.style_code, { order, name: p.style_name || p.name })
            })
            updateCurrentSelections(items)
        } else {
            updateCurrentSelections(new Map())
            updateCurrentValidationErrors(new Map())
        }
    }

    // REMOVED CLEARING EFFECT - Changes now persist when switching tabs

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                        Featured Catalog
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Manage Best Sellers and Recommended product display order.</p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedType && (
                        <button
                            onClick={rebalanceSequence}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Rebalance
                        </button>
                    )}
                    {totalSelectedCount > 0 && (
                        <button
                            onClick={handleSaveSequence}
                            disabled={processing}
                            className={`px-6 py-2.5 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2 ${hasUnsavedChanges ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200/50' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                        >
                            {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Save Sequence Updates ({totalSelectedCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                    <X className="w-4 h-4 cursor-pointer" onClick={() => setError(null)} />
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-medium flex items-center gap-3 shadow-sm">
                    <Check className="w-4 h-4" />
                    {successMessage}
                </div>
            )}

            <div className="flex gap-8">
                {/* Categories Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden lg:block">
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm sticky top-6">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Categories</h3>
                        </div>
                        <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {productTypes.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedType?.id === type.id
                                        ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold text-[13px]'
                                        }`}
                                >
                                    <span className="truncate">{type.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedType?.id === type.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 font-bold'}`}>
                                        {type.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Controls Bar */}
                    <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-2 rounded-2xl border transition-all shadow-sm ${selectedProducts.size > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search featured items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 h-11 bg-transparent text-sm font-semibold focus:outline-none text-slate-700 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex items-center gap-4 px-2">
                            {selectedProducts.size > 0 && (
                                <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                                    <span className="text-[11px] font-black text-slate-900 uppercase">{selectedProducts.size} Selected</span>
                                    <button onClick={() => { updateCurrentSelections(new Map()); updateCurrentValidationErrors(new Map()); }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase">Clear</button>
                                </div>
                            )}

                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {[
                                    { id: 'best', label: 'Best Sellers', icon: Star },
                                    { id: 'recommended', label: 'Recommended', icon: Sparkles }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setFilterType(type.id)}
                                        className={`px-4 py-2 flex items-center gap-2 rounded-lg transition-all ${filterType === type.id
                                            ? 'bg-white text-slate-900 shadow-sm text-xs font-bold'
                                            : 'text-slate-500 hover:text-slate-700 text-xs font-medium'
                                            }`}
                                    >
                                        <type.icon className={`w-3.5 h-3.5 ${filterType === type.id ? 'text-primary' : 'text-slate-400'}`} />
                                        <span>{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <Card className="p-0 overflow-hidden shadow-sm border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="py-4 px-6 w-12">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                onChange={handleSelectAll}
                                                checked={filteredList.length > 0 && selectedProducts.size === filteredList.length}
                                            />
                                        </th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36 text-center">Order</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[320px]">Status</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                                        <th className="py-4 px-6 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="py-32 text-center">
                                                <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary/20 mb-4" />
                                                <p className="text-slate-400 text-sm font-bold">Refreshing featured list...</p>
                                            </td>
                                        </tr>
                                    ) : filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-32 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                    <Package className="w-8 h-8 text-slate-200" />
                                                </div>
                                                <p className="text-slate-900 font-black text-lg">No products found</p>
                                                <p className="text-slate-500 text-sm mt-1 font-medium">Try changing your filters or category.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredList.map((product) => {
                                            const code = product.style_code
                                            const isSelected = selectedProducts.has(code)
                                            let displayOrder = isSelected
                                                ? selectedProducts.get(code).order
                                                : (filterType === 'best' ? product.best_seller_order : product.recommended_order)

                                            // Treat 999999 as null/unassigned
                                            if (displayOrder === 999999) displayOrder = null

                                            const isPinned = displayOrder != null
                                            const validationError = validationErrors.get(code)
                                            const isOccupied = isPositionOccupied(code, displayOrder)

                                            // Effective statuses for the buttons
                                            const getStatus = (type) => {
                                                const sel = selectionsByType[type].get(code)
                                                if (sel) return sel.order !== 999999

                                                const order = type === 'best' ? product.best_seller_order : product.recommended_order
                                                const isFlagged = type === 'best' ? product.is_best_seller : product.is_recommended

                                                return (order !== 999999 && order != null) || !!isFlagged
                                            }
                                            const isBestSeller = getStatus('best')
                                            const isRecommended = getStatus('recommended')

                                            return (
                                                <tr
                                                    key={code}
                                                    className={`border-b border-slate-50 last:border-none transition-all ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : isPinned ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}
                                                >
                                                    <td className="py-4 px-6">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectRow(product)}
                                                        />
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center justify-center gap-1.5 min-w-[120px]">
                                                            {/* Up/Down Controls */}
                                                            {(isSelected || isPinned) && (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <button
                                                                        onClick={() => moveUp(product)}
                                                                        disabled={displayOrder <= 1}
                                                                        className="p-1 rounded-md text-slate-300 hover:text-primary hover:bg-primary/10 disabled:opacity-0 transition-all font-black"
                                                                    >
                                                                        <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => moveDown(product)}
                                                                        className="p-1 rounded-md text-slate-300 hover:text-primary hover:bg-primary/10 transition-all font-black"
                                                                    >
                                                                        <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="relative group/badge flex items-center gap-1.5">
                                                                {isSelected ? (
                                                                    <div className={`relative px-2 py-1.5 rounded-[8px] text-[12px] font-bold flex items-center gap-1 min-w-[60px] justify-center transition-all ${validationError ? 'bg-red-500 text-white shadow-lg shadow-red-200' : isPinned ? 'bg-amber-400 text-white shadow-lg shadow-amber-200/50' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={displayOrder ?? ''}
                                                                            onChange={(e) => handleOrderChange(product, e.target.value)}
                                                                            onBlur={() => triggerConflictModal(product)}
                                                                            className="w-8 bg-transparent text-center focus:outline-none border-none p-0 text-[12px] font-bold placeholder:text-current/30"
                                                                            placeholder="-"
                                                                        />

                                                                        {/* Conflict Warning Icon */}
                                                                        {!validationError && isOccupied && (
                                                                            <AlertTriangle className="w-3 h-3 text-white absolute -top-1 -left-1 bg-amber-600 rounded-full p-0.5 shadow-sm" />
                                                                        )}

                                                                        {/* Validation Error Tooltip */}
                                                                        {validationError && (
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded uppercase tracking-widest whitespace-nowrap z-10">
                                                                                {validationError}
                                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                                                            </div>
                                                                        )}

                                                                        {isPinned && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleOrderChange(product, ''); }}
                                                                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/badge:opacity-100 transition-all hover:bg-red-500 scale-75 group-hover/badge:scale-100"
                                                                            >
                                                                                <X className="w-2.5 h-2.5 stroke-[3]" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : isPinned ? (
                                                                    <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-[8px] text-[12px] font-bold flex items-center gap-1 min-w-[50px] justify-center border border-slate-200">
                                                                        <span>{displayOrder}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-200 text-xs font-black tracking-widest">—</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl border border-slate-100 p-1 bg-white flex-shrink-0 text-center shadow-sm">
                                                                <img
                                                                    src={product.image}
                                                                    alt=""
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => { e.target.src = 'https://placehold.co/400x500/f8fafc/94a3b8?text=No+Image' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 line-clamp-1">{product.style_name || product.name}</div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.style_code}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <span className="text-xs font-bold text-slate-600 tracking-tight">{product.brand_name || 'Individual'}</span>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                onClick={() => handleToggleFeatured(product, 'best')}
                                                                className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${isBestSeller
                                                                    ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200/50'
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500'
                                                                    }`}
                                                            >
                                                                <Star className={`w-3.5 h-3.5 ${isBestSeller ? 'fill-current' : ''}`} />
                                                                Best Seller
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleFeatured(product, 'recommended')}
                                                                className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${isRecommended
                                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-primary hover:text-primary'
                                                                    }`}
                                                            >
                                                                <Sparkles className={`w-3.5 h-3.5 ${isRecommended ? 'fill-current' : ''}`} />
                                                                Recommended
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 text-right">
                                                        <span className="text-sm font-black text-slate-900 whitespace-nowrap">£{Number(product.price || 0).toFixed(2)}</span>
                                                    </td>

                                                    <td className="py-4 px-6 text-right">
                                                        <a
                                                            href={`/products/${product.style_code}`}
                                                            className="p-2 text-slate-300 hover:text-primary transition-colors bg-slate-50 rounded-lg inline-flex"
                                                            title="View Product Details"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Conflict Resolution Modal */}
            {conflictModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm p-6 shadow-2xl border border-slate-200 rounded-3xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Position Conflict</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Slot #{conflictModal.position} is taken</p>
                            </div>
                        </div>

                        <p className="text-[13px] text-slate-600 mb-6 leading-relaxed">
                            Product <span className="font-black text-slate-900">{conflictModal.existingProductName}</span> is currently at this position. Replace it with <span className="font-black text-primary">{conflictModal.newProductName}</span>?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConflictModal(null)}
                                className="flex-1 py-3 text-xs font-black text-slate-400 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReplaceExisting}
                                className="flex-1 py-3 text-xs font-black text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
                            >
                                Replace
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default FeaturedProducts
