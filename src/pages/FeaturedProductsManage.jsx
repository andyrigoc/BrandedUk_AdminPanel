import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import {
    Search, Check, X, RefreshCw, Package, ExternalLink,
    ChevronUp, ChevronDown, AlertTriangle, Crown,
    ArrowUpDown, Hash, Trash2
} from 'lucide-react'

import { API_BASE } from '../config'

const FeaturedProductsManage = () => {
    const navigate = useNavigate()
    // ── Core State ──
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // ── Selection & Ordering ──
    const [selectedProducts, setSelectedProducts] = useState(new Map()) // code → { order, name }
    const [pinnedPositions, setPinnedPositions] = useState(new Map())   // order → code
    const [processing, setProcessing] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [error, setError] = useState(null)
    const [validationErrors, setValidationErrors] = useState(new Map())
    const [conflictModal, setConflictModal] = useState(null)

    // ── Stats ──
    const featuredCount = useMemo(() => products.length, [products])

    // ── Unsaved changes detection ──
    const hasUnsavedChanges = useMemo(() => {
        if (selectedProducts.size === 0) return false
        return Array.from(selectedProducts.entries()).some(([code, data]) => {
            const product = products.find(p => p.style_code === code)
            return data.order !== product?.featured_order
        })
    }, [selectedProducts, products])

    // ═══════════════════════════════════════════
    //  DATA FETCHING
    // ═══════════════════════════════════════════

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('type', 'featured')
            params.append('limit', '500') // Fetch all featured at once
            params.append('_t', Date.now().toString())

            const response = await fetch(`${API_BASE}/api/admin/products/featured?${params}`)
            if (!response.ok) throw new Error('Failed to fetch featured products')
            const data = await response.json()

            // Filter to ensure we only show items marked as featured
            const featuredItems = (data.items || []).filter(item => item.is_featured === true)
            setProducts(featuredItems)

            // Update pinned positions for conflict detection
            const pinned = new Map()
            featuredItems.forEach(p => {
                if (p.featured_order != null && p.featured_order !== 999999) {
                    pinned.set(p.featured_order, p.style_code)
                }
            })
            setPinnedPositions(pinned)
        } catch (err) {
            console.error('Error:', err)
            setError('Could not load featured products')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // ═══════════════════════════════════════════
    //  ACTIONS — Single Product Update
    // ═══════════════════════════════════════════

    const handleRemoveFeatured = async (product) => {
        if (!confirm(`Are you sure you want to remove ${product.style_name || product.style_code} from featured?`)) return
        
        try {
            setProcessing(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${product.style_code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_featured: false,
                    featured_order: 999999
                })
            })
            if (!response.ok) throw new Error('Failed to update product')

            setSuccessMessage(`${product.style_name || product.style_code} removed from featured!`)
            await fetchProducts()
            setTimeout(() => setSuccessMessage(null), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    // ═══════════════════════════════════════════
    //  ORDERING — Select, Move, Rebalance
    // ═══════════════════════════════════════════

    const handleSelectRow = (product) => {
        setSelectedProducts(prev => {
            const next = new Map(prev)
            if (next.has(product.style_code)) {
                next.delete(product.style_code)
                setValidationErrors(v => { const u = new Map(v); u.delete(product.style_code); return u })
            } else {
                let order = product.featured_order
                if (order === 999999 || order == null) order = null
                next.set(product.style_code, { order, name: product.style_name || product.name })
            }
            return next
        })
    }

    const handleOrderChange = (product, value) => {
        const order = value === '' ? null : parseInt(value, 10)
        if (order != null && isNaN(order)) return
        setSelectedProducts(prev => {
            const next = new Map(prev)
            const current = next.get(product.style_code) || { name: product.style_name || product.name }
            next.set(product.style_code, { ...current, order })
            return next
        })
    }

    const checkConflict = (code, newPosition) => {
        if (newPosition == null || Number(newPosition) === 999999) return null
        for (const [productCode, data] of selectedProducts.entries()) {
            if (productCode !== code && data.order === newPosition) return productCode
        }
        const existingCode = pinnedPositions.get(newPosition)
        if (existingCode && existingCode !== code && !selectedProducts.has(existingCode)) return existingCode
        return null
    }

    const triggerConflictModal = (product) => {
        const code = product.style_code
        const currentData = selectedProducts.get(code)
        if (!currentData || currentData.order == null) return
        const conflictCode = checkConflict(code, currentData.order)
        if (conflictCode) {
            setConflictModal({
                newProduct: code,
                newProductName: currentData.name,
                existingProduct: conflictCode,
                existingProductName: products.find(p => p.style_code === conflictCode)?.style_name || selectedProducts.get(conflictCode)?.name || conflictCode,
                position: currentData.order
            })
        }
    }

    const handleReplaceExisting = () => {
        if (!conflictModal) return
        setSelectedProducts(prev => {
            const next = new Map(prev)
            const newCurrent = next.get(conflictModal.newProduct)
            next.set(conflictModal.newProduct, { ...newCurrent, order: conflictModal.position })
            const existingCurrent = next.get(conflictModal.existingProduct)
            if (existingCurrent) next.set(conflictModal.existingProduct, { ...existingCurrent, order: null })
            else next.set(conflictModal.existingProduct, { order: null, name: conflictModal.existingProductName })
            return next
        })
        setConflictModal(null)
    }

    const moveUp = (product) => {
        const code = product.style_code
        const data = selectedProducts.get(code) || { order: product.featured_order }
        if (data.order === 999999 || data.order == null || data.order <= 1) return
        const targetOrder = data.order - 1
        const conflictCode = checkConflict(code, targetOrder)
        setSelectedProducts(prev => {
            const next = new Map(prev)
            if (conflictCode) {
                const cd = next.get(conflictCode) || { name: products.find(p => p.style_code === conflictCode)?.style_name || conflictCode, order: targetOrder }
                next.set(conflictCode, { ...cd, order: data.order })
            }
            next.set(code, { ...(next.get(code) || { name: product.style_name || product.name }), order: targetOrder })
            return next
        })
    }

    const moveDown = (product) => {
        const code = product.style_code
        const data = selectedProducts.get(code) || { order: product.featured_order }
        if (data.order === 999999 || data.order == null) return
        const targetOrder = (data.order || 0) + 1
        const conflictCode = checkConflict(code, targetOrder)
        setSelectedProducts(prev => {
            const next = new Map(prev)
            if (conflictCode) {
                const cd = next.get(conflictCode) || { name: products.find(p => p.style_code === conflictCode)?.style_name || conflictCode, order: targetOrder }
                next.set(conflictCode, { ...cd, order: data.order })
            }
            next.set(code, { ...(next.get(code) || { name: product.style_name || product.name }), order: targetOrder })
            return next
        })
    }

    const handleSaveSequence = async () => {
        if (selectedProducts.size === 0) return

        // Validate
        const errors = new Map()
        const positions = new Map()
        selectedProducts.forEach((data, code) => {
            const order = data.order != null ? Number(data.order) : null
            if (order === null || order === 999999) return
            if (!Number.isInteger(order) || order < 1) { errors.set(code, 'Invalid position'); return }
            if (positions.has(order)) { errors.set(code, `Duplicate #${order}`); errors.set(positions.get(order), `Duplicate #${order}`) }
            else positions.set(order, code)
        })
        setValidationErrors(errors)
        if (errors.size > 0) { setError('Please resolve numbering conflicts before saving.'); return }

        try {
            setProcessing(true)
            const updates = []
            selectedProducts.forEach((data, code) => {
                const orderValue = data.order === null ? 999999 : data.order
                updates.push({
                    style_code: code,
                    featured_order: orderValue,
                    is_featured: orderValue !== 999999
                })
            })

            const response = await fetch(`${API_BASE}/api/admin/products/order-featured`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: updates })
            })
            if (!response.ok) throw new Error('Failed to save sequence')

            setSuccessMessage('Featured order saved successfully!')
            setSelectedProducts(new Map())
            setValidationErrors(new Map())
            await fetchProducts()
            setTimeout(() => setSuccessMessage(null), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    // ── Filter ──
    const filteredList = products.filter(p =>
        p.style_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.style_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // ═══════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto p-4">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Crown className="w-5 h-5 text-violet-500" />
                        Featured Products
                    </h1>
                    <p className="text-slate-500 text-xs font-medium mt-1">
                        Currently highlighting {featuredCount} products on your storefront.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {selectedProducts.size > 0 && (
                        <button
                            onClick={handleSaveSequence}
                            disabled={processing}
                            className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-2 ${hasUnsavedChanges
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-violet-600 hover:bg-violet-700'
                            }`}
                        >
                            {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save New Order ({selectedProducts.size})
                        </button>
                    )}
                    <button 
                        onClick={() => fetchProducts()}
                        className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg bg-white"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Notifications ── */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {error}
                    </div>
                    <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setError(null)} />
                </div>
            )}
            {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5" />
                    {successMessage}
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search featured products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                />
            </div>

            {/* ── Results Table ── */}
            <Card className="p-0 overflow-hidden shadow-sm border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-3 px-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-violet-600 accent-violet-600"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const items = new Map()
                                                filteredList.forEach(p => items.set(p.style_code, { order: p.featured_order === 999999 ? null : p.featured_order, name: p.style_name || p.name }))
                                                setSelectedProducts(items)
                                            } else {
                                                setSelectedProducts(new Map())
                                            }
                                        }}
                                        checked={filteredList.length > 0 && selectedProducts.size === filteredList.length}
                                    />
                                </th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Order</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand</th>
                                <th className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Price</th>
                                <th className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin text-slate-200 mx-auto" />
                                        <p className="text-slate-400 text-xs mt-2 font-medium">Loading...</p>
                                    </td>
                                </tr>
                            ) : filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Package className="w-8 h-8 text-slate-100 mx-auto" />
                                        <p className="text-slate-900 font-bold text-sm mt-2">No featured products found</p>
                                        <p className="text-slate-400 text-xs">Products marked as featured will appear here.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((product) => {
                                    const code = product.style_code
                                    const isSelected = selectedProducts.has(code)
                                    let displayOrder = isSelected ? selectedProducts.get(code).order : product.featured_order
                                    if (displayOrder === 999999) displayOrder = null

                                    return (
                                        <tr key={code} className={`border-b border-slate-50 last:border-none transition-all ${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/50'}`}>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-violet-600 accent-violet-600"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(product)}
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {isSelected && (
                                                        <div className="flex flex-col">
                                                            <button onClick={() => moveUp(product)} className="text-slate-300 hover:text-violet-600"><ChevronUp className="w-3 h-3" /></button>
                                                            <button onClick={() => moveDown(product)} className="text-slate-300 hover:text-violet-600"><ChevronDown className="w-3 h-3" /></button>
                                                        </div>
                                                    )}
                                                    <input
                                                        type="number"
                                                        value={displayOrder ?? ''}
                                                        onChange={(e) => handleOrderChange(product, e.target.value)}
                                                        onBlur={() => triggerConflictModal(product)}
                                                        placeholder="—"
                                                        className={`w-10 h-7 rounded border text-center text-xs font-bold focus:outline-none ${isSelected ? 'border-violet-300 bg-white ring-1 ring-violet-100' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={product.image} alt="" className="w-10 h-10 object-contain rounded bg-white border border-slate-100 p-0.5" onError={(e) => { e.target.src = 'https://placehold.co/100x120?text=NA' }} />
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 line-clamp-1">{product.style_name || product.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-semibold text-slate-600">{product.brand_name || 'Individual'}</td>
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
                                            <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">£{Number(product.price || 0).toFixed(2)}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => navigate(`/products/${code}`)}
                                                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveFeatured(product)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remove from Featured"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            {/* Conflict Modal */}
            {conflictModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Position Conflict</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Position <strong>#{conflictModal.position}</strong> is already assigned to <strong>{conflictModal.existingProductName}</strong>.
                        </p>
                        <div className="mt-6 flex flex-col gap-2">
                            <button onClick={handleReplaceExisting} className="w-full py-2 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200">
                                Replace Existing
                            </button>
                            <button onClick={() => setConflictModal(null)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FeaturedProductsManage
