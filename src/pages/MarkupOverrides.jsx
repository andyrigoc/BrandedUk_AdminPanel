import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { Search, RefreshCw, AlertCircle, CheckCircle2, Edit3, X, Save, ExternalLink, Trash2, Percent, Layers } from 'lucide-react'

import { API_BASE } from '../config'

const MarkupOverrides = () => {
    const navigate = useNavigate()
    const [overrides, setOverrides] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingCode, setEditingCode] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    // Product types state (from summary)
    const [productTypes, setProductTypes] = useState([])
    const [selectedType, setSelectedType] = useState(null)

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

            const response = await fetch(`${API_BASE}/api/admin/products/markup-overrides?${params}`)
            if (!response.ok) throw new Error('Failed to fetch markup overrides')
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

    const filteredOverrides = useMemo(() => {
        return overrides.filter(o =>
            o.style_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.style_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [overrides, searchTerm])

    const handleEdit = (code, currentMarkup) => {
        setEditingCode(code)
        setEditValue(currentMarkup.toString())
    }

    const handleCancelEdit = () => {
        setEditingCode(null)
        setEditValue('')
    }

    const handleSaveEdit = async (code) => {
        try {
            setSaving(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${code}/markup-override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markup_percent: parseFloat(editValue) })
            })
            if (!response.ok) throw new Error('Failed to update markup')

            setSuccessMessage(`Markup for ${code} updated successfully`)
            setTimeout(() => setSuccessMessage(null), 3000)
            setEditingCode(null)
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (code) => {
        if (!confirm(`Are you sure you want to remove the markup override for ${code}?`)) return
        try {
            setDeleting(code)
            const encodedCode = encodeURIComponent(code)
            const response = await fetch(`${API_BASE}/api/admin/products/${encodedCode}/markup-override`, {
                method: 'DELETE'
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.message || 'Failed to remove markup override')
            }

            setSuccessMessage(`Markup override for ${code} removed`)
            setTimeout(() => setSuccessMessage(null), 3000)
            await fetchOverrides()
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
        } finally {
            setDeleting(null)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return
        if (!confirm(`Are you sure you want to remove ${selectedItems.size} markup overrides?`)) return

        try {
            setBulkDeleting(true)
            const response = await fetch(`${API_BASE}/api/admin/products/bulk-markup-overrides/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ style_codes: Array.from(selectedItems) })
            })

            if (!response.ok) throw new Error('Failed to bulk delete overrides')

            setSuccessMessage(`Successfully removed ${selectedItems.size} overrides`)
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
        if (selectedItems.size === filteredOverrides.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(filteredOverrides.map(o => o.style_code)))
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Markup Overrides</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        {selectedType ? (
                            <>Managing <span className="text-primary font-bold">{selectedType.name}</span> Markup Rules</>
                        ) : (
                            "Loading category data..."
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchOverrides}
                    disabled={loading}
                    className="group flex items-center px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50 shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 mr-2.5 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                    Refresh Overrides
                </button>
            </div>

            {/* Status Messages */}
            {successMessage && (
                <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <p className="text-sm text-green-700 font-bold">{successMessage}</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-sm text-red-700 font-bold">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden lg:block">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Markup Groups</h3>
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
                    {/* Filters and Bulk Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search within this category..."
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-primary focus:outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                                    Remove Selected
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Overrides Table */}
                    <Card className="p-0 overflow-hidden border-2 border-slate-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="py-4 px-6 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={filteredOverrides.length > 0 && selectedItems.size === filteredOverrides.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                            />
                                        </th>
                                        <th className="text-left py-4 px-6 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Product</th>
                                        <th className="text-center py-4 px-6 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Markup Override</th>
                                        <th className="text-center py-4 px-6 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && filteredOverrides.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-300 mb-2" />
                                                <p className="text-slate-400 text-sm font-medium">Fetching rules...</p>
                                            </td>
                                        </tr>
                                    ) : filteredOverrides.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Percent className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-slate-900 font-bold">No custom markups here</p>
                                                <p className="text-slate-500 text-xs mt-1">Products in this category are using the global markup rules.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOverrides.map((override) => {
                                            const isEditing = editingCode === override.style_code

                                            return (
                                                <tr key={override.style_code} className={`hover:bg-gray-50/50 transition-colors ${selectedItems.has(override.style_code) ? 'bg-indigo-50/30' : ''}`}>
                                                    <td className="py-4 px-6 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(override.style_code)}
                                                            onChange={() => toggleSelectItem(override.style_code)}
                                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {override.image ? (
                                                                    <img src={override.image} alt="" className="w-full h-full object-contain p-1" />
                                                                ) : (
                                                                    <Percent className="w-5 h-5 text-gray-200" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900">{override.style_code}</div>
                                                                <div className="text-[11px] text-slate-500 max-w-[250px] truncate font-medium">{override.style_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        {isEditing ? (
                                                            <div className="inline-flex items-center bg-white border-2 border-primary rounded-xl px-3 py-1 shadow-sm">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="w-16 border-0 focus:ring-0 p-0 text-sm font-black text-center text-primary"
                                                                    autoFocus
                                                                />
                                                                <span className="text-sm font-black text-primary/50">%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-black border border-indigo-100">
                                                                {override.percentage || 0}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleSaveEdit(override.style_code)}
                                                                        disabled={saving}
                                                                        className="p-2.5 bg-primary text-white rounded-xl hover:bg-accent transition-all shadow-md shadow-primary/20"
                                                                    >
                                                                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEdit(override.style_code, override.percentage || 0)}
                                                                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                                        title="Edit Inline"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => navigate(`/products/${override.style_code}`)}
                                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                        title="View Details"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(override.style_code)}
                                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                        disabled={deleting === override.style_code}
                                                                        title="Remove Override"
                                                                    >
                                                                        {deleting === override.style_code ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                                    </button>
                                                                </>
                                                            )}
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
                </div>
            </div>
        </div>
    )
}

export default MarkupOverrides
