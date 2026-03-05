import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { Search, RefreshCw, AlertCircle, CheckCircle2, Edit3, X, Save, Tags, ChevronDown, ChevronRight, Trash2, Package, Layers, ExternalLink } from 'lucide-react'

import { API_BASE } from '../config'

const PriceOverrides = () => {
    const navigate = useNavigate()
    const [overrides, setOverrides] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedProducts, setExpandedProducts] = useState(new Set())

    // Product types state (from summary)
    const [productTypes, setProductTypes] = useState([])
    const [selectedType, setSelectedType] = useState(null)

    // Editing state (at tier level)
    const [editingTierId, setEditingTierId] = useState(null) // style_code|min
    const [editValue, setEditValue] = useState('')
    const [savingId, setSavingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    const [selectedItems, setSelectedItems] = useState(new Set())
    const [bulkDeleting, setBulkDeleting] = useState(false)

    useEffect(() => {
        fetchOverrides()
        setSelectedItems(new Set())
    }, [selectedType])

    const fetchOverrides = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams()
            if (selectedType) {
                params.append('product_type_id', selectedType.id)
            }

            const response = await fetch(`${API_BASE}/api/admin/products/price-overrides?${params}`)
            if (!response.ok) throw new Error('Failed to fetch price overrides')
            const data = await response.json()

            setOverrides(data.items || [])

            // Extract product types summary with counts
            if (data.by_product_type) {
                setProductTypes(data.by_product_type)
                // Auto-select first if none active
                if (!selectedType && data.by_product_type.length > 0) {
                    setSelectedType(data.by_product_type[0])
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return
        if (!confirm(`Are you sure you want to revert ${selectedItems.size} products to Global Pricing? All custom tiers will be lost.`)) return

        try {
            setBulkDeleting(true)
            const response = await fetch(`${API_BASE}/api/admin/products/bulk-price-overrides/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ style_codes: Array.from(selectedItems) })
            })

            if (!response.ok) throw new Error('Failed to bulk delete overrides')

            setSuccessMessage(`Successfully reverted ${selectedItems.size} products to global pricing`)
            setTimeout(() => setSuccessMessage(null), 3000)
            setSelectedItems(new Set())
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
        } finally {
            setBulkDeleting(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedItems.size === groupedOverrides.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(groupedOverrides.map(o => o.style_code)))
        }
    }

    const toggleSelectItem = (code) => {
        const next = new Set(selectedItems)
        if (next.has(code)) {
            next.delete(code)
        } else {
            next.add(code)
        }
        setSelectedItems(next)
    }

    // Grouping overrides by product
    const groupedOverrides = useMemo(() => {
        const groups = {}
        overrides.forEach(item => {
            if (!groups[item.style_code]) {
                groups[item.style_code] = {
                    style_code: item.style_code,
                    style_name: item.style_name,
                    image: item.image,
                    tiers: []
                }
            }
            groups[item.style_code].tiers.push(item)
        })

        // Sort tiers within each group by min_qty
        Object.values(groups).forEach(group => {
            group.tiers.sort((a, b) => a.min - b.min)
        })

        return Object.values(groups).filter(group =>
            group.style_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.style_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [overrides, searchTerm])

    const toggleProduct = (styleCode) => {
        const newSet = new Set(expandedProducts)
        if (newSet.has(styleCode)) {
            newSet.delete(styleCode)
        } else {
            newSet.add(styleCode)
        }
        setExpandedProducts(newSet)
    }

    const handleEditTier = (tier) => {
        setEditingTierId(`${tier.style_code}|${tier.min}`)
        setEditValue(tier.percentage.toString())
    }

    const handleCancelEdit = () => {
        setEditingTierId(null)
        setEditValue('')
    }

    const handleSaveTier = async (tier) => {
        const id = `${tier.style_code}|${tier.min}`
        try {
            setSavingId(id)

            const updatedOverride = [{
                min_qty: tier.min,
                max_qty: tier.max,
                discount_percent: parseFloat(editValue)
            }]

            const response = await fetch(`${API_BASE}/api/admin/products/${tier.style_code}/price-overrides`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    overrides: updatedOverride,
                    replaceAll: false
                })
            })

            if (!response.ok) throw new Error('Failed to update price tier')

            setSuccessMessage(`Updated ${tier.style_code} (Tier ${tier.min}-${tier.max})`)
            setTimeout(() => setSuccessMessage(null), 3000)
            setEditingTierId(null)
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
        } finally {
            setSavingId(null)
        }
    }

    const handleDeleteTier = async (tier) => {
        if (!confirm('Are you sure you want to remove this specific pricing tier?')) return

        const id = `${tier.style_code}|${tier.min}`
        try {
            setDeletingId(id)
            const encodedCode = encodeURIComponent(tier.style_code)
            const url = `${API_BASE}/api/admin/products/${encodedCode}/price-overrides?min_qty=${tier.min}&max_qty=${tier.max}`

            const response = await fetch(url, { method: 'DELETE' })
            if (!response.ok) throw new Error('Failed to remove price tier')

            setSuccessMessage(`Tier removed from ${tier.style_code}`)
            setTimeout(() => setSuccessMessage(null), 3000)
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
        } finally {
            setDeletingId(null)
        }
    }

    const handleDeleteAllForProduct = async (styleCode) => {
        if (!confirm(`Switch ${styleCode} back to Global Pricing? All custom overrides will be deleted.`)) return

        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${styleCode}/price-overrides`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to reset product pricing')

            setSuccessMessage(`${styleCode} reverted to global pricing`)
            setTimeout(() => setSuccessMessage(null), 3000)
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Price Overrides</h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        {selectedType ? (
                            <>Managing <span className="text-primary font-bold">{selectedType.name}</span> Overrides</>
                        ) : (
                            "Loading category data..."
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchOverrides}
                    disabled={loading}
                    className="group flex items-center px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50 shadow-sm shadow-slate-200/50"
                >
                    <RefreshCw className={`w-4 h-4 mr-2.5 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                    Refresh Overrides
                </button>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-green-700 font-black">{successMessage}</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-red-700 font-black">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-red-400" />
                    </button>
                </div>
            )}

            <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden lg:block">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Pricing Categories</h3>
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                            <Layers className="w-3 h-3 text-slate-400" />
                        </div>
                    </div>
                    <div className="space-y-1 pr-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {productTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-[13px] transition-all ${selectedType?.id === type.id
                                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span>{type.name}</span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedType?.id === type.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {type.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 w-full max-w-md">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={groupedOverrides.length > 0 && selectedItems.size === groupedOverrides.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select All</span>
                            </div>
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter results..."
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-primary focus:outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedItems.size > 0 && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                <span className="text-sm font-bold text-slate-500">{selectedItems.size} selected</span>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors border border-red-100"
                                >
                                    {bulkDeleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Revert Selected
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Grouped Table */}
                    <div className="space-y-4">
                        {loading && groupedOverrides.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                                <p className="text-slate-500 font-bold">Synchronizing override data...</p>
                            </div>
                        ) : groupedOverrides.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-3xl border-2 border-slate-100">
                                <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">No overrides in this category</h3>
                                <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">This product type is currently following system-wide global pricing rules.</p>
                            </div>
                        ) : (
                            groupedOverrides.map((product) => (
                                <Card key={product.style_code} className={`p-0 overflow-hidden border-2 transition-all shadow-sm ${selectedItems.has(product.style_code) ? 'border-primary/30 bg-indigo-50/10' : 'border-slate-100'}`}>
                                    {/* Product Summary Row */}
                                    <div
                                        className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-colors ${expandedProducts.has(product.style_code) ? 'bg-slate-50/80 border-b-2 border-slate-100' : 'hover:bg-slate-50/50'}`}
                                        onClick={() => toggleProduct(product.style_code)}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(product.style_code)}
                                                    onChange={() => toggleSelectItem(product.style_code)}
                                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </div>
                                            <div className="relative w-14 h-14 rounded-2xl border-2 border-white bg-white shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {product.image ? (
                                                    <img src={product.image} alt="" className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <Tags className="w-6 h-6 text-slate-200" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">{product.style_code}</h3>
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-200">Custom Rules</span>
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium mt-1 truncate max-w-[400px]">{product.style_name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-2 text-slate-900 font-black">
                                                    <Layers className="w-4 h-4 text-primary" />
                                                    {product.tiers.length} Active Tiers
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Volume Breaks</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/products/${product.style_code}`)
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-primary hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                    title="View Details"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteAllForProduct(product.style_code)
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                    title="Reset to Global"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <div className="w-px h-8 bg-slate-200 mx-2" />
                                                <div className="p-2 text-slate-400">
                                                    {expandedProducts.has(product.style_code) ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Tiers View */}
                                    {expandedProducts.has(product.style_code) && (
                                        <div className="bg-white overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-50/50">
                                                        <th className="text-left py-4 px-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Quantity Range</th>
                                                        <th className="text-center py-4 px-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Override Discount</th>
                                                        <th className="text-right py-4 px-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-sm">
                                                    {product.tiers.map((tier) => {
                                                        const currentId = `${tier.style_code}|${tier.min}`
                                                        const isEditing = editingTierId === currentId
                                                        const isSaving = savingId === currentId
                                                        const isDeleting = deletingId === currentId

                                                        return (
                                                            <tr key={currentId} className="hover:bg-slate-50/30 transition-colors">
                                                                <td className="py-4 px-8">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                                                                        <span className="font-bold text-slate-700 tracking-tight">
                                                                            {tier.min.toLocaleString()} — {tier.max >= 99999 ? '∞' : tier.max.toLocaleString()} Units
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-8 text-center">
                                                                    {isEditing ? (
                                                                        <div className="inline-flex items-center bg-white border-2 border-primary rounded-xl px-3 py-1 shadow-inner">
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={editValue}
                                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                                className="w-14 border-0 focus:ring-0 p-0 text-sm font-black text-center text-primary"
                                                                                autoFocus
                                                                            />
                                                                            <span className="text-sm font-black text-primary/50">%</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-xl bg-orange-50 text-orange-700 text-sm font-black border-2 border-orange-100/50">
                                                                            {tier.percentage}% OFF
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="py-4 px-8 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {isEditing ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleSaveTier(tier)}
                                                                                    disabled={isSaving}
                                                                                    className="p-2 bg-primary text-white rounded-xl hover:bg-accent transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                                                                                >
                                                                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                                </button>
                                                                                <button
                                                                                    onClick={handleCancelEdit}
                                                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleEditTier(tier)}
                                                                                    className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                                                    title="Edit Tier"
                                                                                >
                                                                                    <Edit3 className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteTier(tier)}
                                                                                    disabled={isDeleting}
                                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                                    title="Delete Tier"
                                                                                >
                                                                                    {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PriceOverrides
