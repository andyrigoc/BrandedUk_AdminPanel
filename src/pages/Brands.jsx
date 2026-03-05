import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import { Search, Edit3, Check, X, ToggleLeft, ToggleRight, Building2, Upload, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react'

import { API_BASE } from '../config'

const Brands = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const selectedSupplierSlug = searchParams.get('supplier') || ''

    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)
    const [suppliers, setSuppliers] = useState([])
    const [loadingSuppliers, setLoadingSuppliers] = useState(true)

    const setSupplier = (slug) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            if (slug) next.set('supplier', slug)
            else next.delete('supplier')
            return next
        })
    }

    const selectedSupplierName = selectedSupplierSlug
        ? (suppliers.find(s => s.slug === selectedSupplierSlug)?.name || selectedSupplierSlug)
        : ''

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

    const fetchBrands = useCallback(async () => {
        try {
            setLoading(true)
            const url = selectedSupplierSlug
                ? `${API_BASE}/api/admin/brands?supplier=${encodeURIComponent(selectedSupplierSlug)}`
                : `${API_BASE}/api/admin/brands`
            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch brands')
            const data = await response.json()

            const raw = data.items || data.brands || []
            const brandsList = raw.map(b => ({
                id: b.id,
                name: b.name,
                logo: b.logo || null,
                productCount: parseInt(b.product_count || 0),
                active: b.is_active
            }))
            brandsList.sort((a, b) => a.name.localeCompare(b.name))
            setBrands(brandsList)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [selectedSupplierSlug])

    useEffect(() => {
        fetchBrands()
    }, [fetchBrands])

    const handleToggleActive = async (brand) => {
        // Optimistic update
        const originalBrands = [...brands]
        setBrands(prev => prev.map(b =>
            b.id === brand.id ? { ...b, active: !b.active } : b
        ))

        try {
            const response = await fetch(`${API_BASE}/api/admin/brands/${brand.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: !brand.active }),
            })

            if (!response.ok) {
                throw new Error('Failed to update brand status')
            }
        } catch (err) {
            // Revert on error
            setBrands(originalBrands)
            alert('Failed to update brand status: ' + err.message)
        }
    }

    const startEditing = (brand) => {
        setEditingId(brand.id)
        setEditName(brand.name)
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName('')
    }

    const saveEdit = async (brand) => {
        if (!editName.trim()) return

        setSaving(true)
        setBrands(prev => prev.map(b =>
            b.id === brand.id ? { ...b, name: editName } : b
        ))
        // TODO: Call API when available

        setEditingId(null)
        setEditName('')
        setSaving(false)
    }

    const handleImageUpload = (brandId) => {
        // TODO: Implement image upload
        alert('Image upload will be available when the API is ready')
    }

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: brands.length,
        active: brands.filter(b => b.active).length,
        withLogos: brands.filter(b => b.logo).length
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading brands...</div>
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
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Brand Management</h1>
                    <p className="text-gray-500 mt-2 font-medium text-lg">Manage brand profiles, logos, and visibility across suppliers.</p>
                </div>

                {/* Supplier Tabs — functional: filters brands by selected supplier */}
                <div className="flex flex-wrap items-center gap-1 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200 shadow-sm backdrop-blur-sm self-start md:self-auto">
                    <button
                        onClick={() => setSupplier('')}
                        disabled={loadingSuppliers}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${!selectedSupplierSlug
                            ? 'bg-white text-primary shadow-md scale-105'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        } disabled:opacity-60`}
                    >
                        All suppliers
                    </button>
                    {suppliers.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSupplier(s.slug)}
                            disabled={loadingSuppliers}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${selectedSupplierSlug === s.slug
                                ? 'bg-white text-primary shadow-md scale-105'
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
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500">Total Brands</div>
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
                            <div className="text-sm font-semibold text-gray-500">Active Brands</div>
                            <div className="text-2xl font-black text-gray-900">{stats.active}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-500">With Logos</div>
                            <div className="text-2xl font-black text-gray-900">{stats.withLogos}</div>
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
                        placeholder={selectedSupplierName ? `Search ${selectedSupplierName} brands...` : 'Search brands...'}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Brands Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBrands.map((brand) => (
                            <Card key={brand.id} className={`p-6 transition-all rounded-3xl hover:shadow-xl hover:shadow-primary/5 group ${!brand.active ? 'opacity-60 grayscale' : 'hover:-translate-y-1'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    {/* Logo */}
                                    <div className="relative group/logo">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:bg-white transition-colors">
                                            {brand.logo ? (
                                                <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <Building2 className="w-10 h-10 text-slate-200" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleImageUpload(brand.id)}
                                            className="absolute inset-0 bg-primary/80 backdrop-blur-sm rounded-2xl opacity-0 group-hover/logo:opacity-100 transition-all duration-300 flex items-center justify-center transform scale-90 group-hover/logo:scale-100"
                                        >
                                            <Upload className="w-8 h-8 text-white" />
                                        </button>
                                    </div>

                                    {/* Status Toggle */}
                                    <button
                                        onClick={() => handleToggleActive(brand)}
                                        className={`p-2.5 rounded-xl transition-all duration-300 shadow-sm
                                          ${brand.active
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        title={brand.active ? 'Deactivate Brand' : 'Activate Brand'}
                                    >
                                        {brand.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                    </button>
                                </div>

                                {/* Name */}
                                <div className="mb-6">
                                    {editingId === brand.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white border-2 border-primary rounded-xl focus:outline-none text-lg font-black text-gray-900"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={cancelEditing}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => saveEdit(brand)}
                                                    className="p-2 text-primary hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group/title">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover/title:text-primary transition-colors">{brand.name}</h3>
                                            <button
                                                onClick={() => startEditing(brand)}
                                                className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Footer */}
                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Products</span>
                                    </div>
                                    <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-full text-xs border border-slate-100">{brand.productCount || 0}</span>
                                </div>
                            </Card>
                ))}
            </div>

            {filteredBrands.length === 0 && (
                <Card className="p-20 text-center rounded-[2.5rem] bg-gray-50/30 border-2 border-dashed border-gray-100">
                    <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                    <div className="text-lg font-black text-gray-400 uppercase tracking-widest">
                        {brands.length === 0 ? (selectedSupplierSlug ? 'No brands for this supplier' : 'No brands') : 'No matching brands'}
                    </div>
                    {brands.length > 0 && (
                        <button onClick={() => setSearchTerm('')} className="mt-4 text-primary font-bold hover:underline">Clear Search</button>
                    )}
                </Card>
            )}
        </div>
    )
}

export default Brands
