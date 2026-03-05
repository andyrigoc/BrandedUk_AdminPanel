import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { Search, Edit3, Check, X, ToggleLeft, ToggleRight, Package, AlertCircle } from 'lucide-react'

import { API_BASE } from '../config'

const ProductTypes = () => {
    const [productTypes, setProductTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchProductTypes()
    }, [])

    const fetchProductTypes = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/products/types`)
            if (!response.ok) throw new Error('Failed to fetch product types')
            const data = await response.json()
            // Add active status if not present
            const types = (data.productTypes || []).map(t => ({
                ...t,
                active: t.active !== false
            }))
            setProductTypes(types)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async (type) => {
        // Optimistic update
        setProductTypes(prev => prev.map(t =>
            t.id === type.id ? { ...t, active: !t.active } : t
        ))

        // TODO: Call API when available
        // try {
        //   await fetch(`${API_BASE}/api/admin/product-types/${type.id}/toggle`, { method: 'PUT' })
        // } catch (err) {
        //   // Revert on error
        //   setProductTypes(prev => prev.map(t => 
        //     t.id === type.id ? { ...t, active: type.active } : t
        //   ))
        // }
    }

    const startEditing = (type) => {
        setEditingId(type.id)
        setEditName(type.name)
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName('')
    }

    const saveEdit = async (type) => {
        if (!editName.trim()) return

        setSaving(true)

        // Optimistic update
        setProductTypes(prev => prev.map(t =>
            t.id === type.id ? { ...t, name: editName } : t
        ))

        // TODO: Call API when available
        // try {
        //   await fetch(`${API_BASE}/api/admin/product-types/${type.id}`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ name: editName })
        //   })
        // } catch (err) {
        //   // Revert on error
        // }

        setEditingId(null)
        setEditName('')
        setSaving(false)
    }

    const filteredTypes = productTypes.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: productTypes.length,
        active: productTypes.filter(t => t.active).length,
        totalProducts: productTypes.reduce((sum, t) => sum + (t.count || 0), 0)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading product types...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <div className="text-red-500 font-medium">Error: {error}</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Product Types</h1>
                <p className="text-gray-500 mt-2">Manage product categories and their visibility</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500">Total Types</div>
                            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-green-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <ToggleRight className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500">Active Types</div>
                            <div className="text-2xl font-black text-gray-900">{stats.active}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500">Total Products</div>
                            <div className="text-2xl font-black text-gray-900">{stats.totalProducts.toLocaleString()}</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search product types..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wide">Type Name</th>
                            <th className="text-center py-4 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wide">Products</th>
                            <th className="text-center py-4 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wide">Status</th>
                            <th className="text-right py-4 px-6 font-semibold text-xs uppercase text-gray-500 tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTypes.map((type) => (
                            <tr key={type.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-6">
                                    {editingId === type.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="px-3 py-2 border-2 border-primary rounded-lg focus:outline-none w-64"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-900">{type.name}</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                                        {type.count || 0}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <button
                                        onClick={() => handleToggleActive(type)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${type.active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {type.active ? (
                                            <>
                                                <ToggleRight className="w-4 h-4" />
                                                Active
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft className="w-4 h-4" />
                                                Inactive
                                            </>
                                        )}
                                    </button>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    {editingId === type.id ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={cancelEditing}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => saveEdit(type)}
                                                disabled={saving}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEditing(type)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredTypes.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                        No product types found
                    </div>
                )}
            </Card>
        </div>
    )
}

export default ProductTypes
