import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { Search, ChevronLeft, ChevronRight, Edit2, Plus, X, RefreshCw } from 'lucide-react'

import { API_BASE } from '../config'

const MarkupTiers = () => {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [repricing, setRepricing] = useState(false)
    const itemsPerPage = 25

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [editingRule, setEditingRule] = useState(null)
    const [formData, setFormData] = useState({
        version: '1.0',
        from_price: '',
        to_price: '',
        markup_percent: '',
        active: true
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchRules()
    }, [])

    const fetchRules = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/pricing/rules`)
            if (!response.ok) throw new Error('Failed to fetch pricing rules')
            const data = await response.json()
            setRules(data.items || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleReprice = async () => {
        if (!confirm('This will recalculate sell prices for all products. Continue?')) return

        try {
            setRepricing(true)
            const response = await fetch(`${API_BASE}/api/pricing/reprice`, {
                method: 'POST'
            })
            if (!response.ok) throw new Error('Failed to reprice products')
            const data = await response.json()
            alert(`Repricing complete! ${data.updatedProducts || 0} products updated.`)
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setRepricing(false)
        }
    }

    const openCreateModal = () => {
        setEditingRule(null)
        setFormData({
            version: '1.0',
            from_price: '',
            to_price: '',
            markup_percent: '',
            active: true
        })
        setModalOpen(true)
    }

    const openEditModal = (rule) => {
        setEditingRule(rule)
        setFormData({
            version: rule.version || '1.0',
            from_price: rule.from_price,
            to_price: rule.to_price,
            markup_percent: rule.markup_percent,
            active: rule.active
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            if (editingRule) {
                // Update existing rule
                const id = `${editingRule.version}:${editingRule.from_price}:${editingRule.to_price}`
                const response = await fetch(`${API_BASE}/api/pricing/rules/${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        from_price: parseFloat(formData.from_price),
                        to_price: parseFloat(formData.to_price),
                        markup_percent: parseFloat(formData.markup_percent)
                    })
                })
                if (!response.ok) throw new Error('Failed to update rule')
            } else {
                // Create new rule
                const response = await fetch(`${API_BASE}/api/pricing/rules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        from_price: parseFloat(formData.from_price),
                        to_price: parseFloat(formData.to_price),
                        markup_percent: parseFloat(formData.markup_percent)
                    })
                })
                if (!response.ok) throw new Error('Failed to create rule')
            }

            setModalOpen(false)
            fetchRules()
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Filter by search term
    const filteredRules = rules.filter(rule =>
        rule.from_price?.toString().includes(searchTerm) ||
        rule.to_price?.toString().includes(searchTerm) ||
        rule.markup_percent?.toString().includes(searchTerm)
    )

    // Pagination
    const totalPages = Math.ceil(filteredRules.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedRules = filteredRules.slice(startIndex, startIndex + itemsPerPage)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading pricing rules...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Error: {error}</div>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Markup Tiers</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage pricing rules ({rules.length} rules)</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReprice}
                        disabled={repricing}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${repricing ? 'animate-spin' : ''}`} />
                        {repricing ? 'Repricing...' : 'Reprice All'}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-accent transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Rule
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search pricing rules..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-600">From Price</th>
                                <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-600">To Price</th>
                                <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-600">Markup %</th>
                                <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-600">Status</th>
                                <th className="text-left py-4 px-6 font-semibold text-xs uppercase text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRules.map((rule, idx) => (
                                <tr
                                    key={`${rule.version}-${rule.from_price}-${rule.to_price}`}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                                        £{Number(rule.from_price || 0).toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                                        £{Number(rule.to_price || 0).toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-sm font-bold text-gray-900">
                                        {Number(rule.markup_percent || 0)}%
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rule.active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {rule.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <button
                                            onClick={() => openEditModal(rule)}
                                            className="inline-flex items-center px-3 py-1.5 bg-primary text-white text-sm font-medium rounded hover:bg-accent transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 mr-1.5" />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredRules.length)} of {filteredRules.length} entries
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 flex items-center border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1
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
                                    className={`w-8 h-8 flex items-center justify-center border rounded font-semibold text-sm
                    ${currentPage === pageNum
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            )
                        })}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 flex items-center border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Edit/Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Price (£)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.from_price}
                                    onChange={(e) => setFormData({ ...formData, from_price: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Price (£)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.to_price}
                                    onChange={(e) => setFormData({ ...formData, to_price: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.markup_percent}
                                    onChange={(e) => setFormData({ ...formData, markup_percent: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="100"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <label htmlFor="active" className="ml-2 text-sm text-gray-700">Active</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MarkupTiers
