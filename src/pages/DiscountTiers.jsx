import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { Tags, Edit3, Check, X, AlertCircle, TrendingDown, RefreshCw } from 'lucide-react'

import { API_BASE } from '../config'

const DiscountTiers = () => {
    const [tiers, setTiers] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [editDiscount, setEditDiscount] = useState('')

    useEffect(() => {
        fetchTiers()
    }, [])

    const fetchTiers = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`${API_BASE}/api/admin/price-breaks`)
            if (!response.ok) throw new Error('Failed to fetch global tiers')
            const data = await response.json()
            const tiersList = data.tiers || data.items || []
            setTiers(tiersList.map((t, idx) => ({
                id: idx,
                min: t.min_qty,
                max: t.max_qty,
                discount: t.discount_percent,
                label: t.discount_percent === 0 ? 'Base Price' : `${t.discount_percent}% Off`
            })))
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const startEditing = (tier) => {
        setEditingId(tier.id)
        setEditDiscount(tier.discount.toString())
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditDiscount('')
    }

    const saveEdit = async (tier) => {
        const newDiscount = parseFloat(editDiscount)
        if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) return

        const updatedTiers = tiers.map(t =>
            t.id === tier.id ? { ...t, discount: newDiscount } : t
        )

        try {
            setSaving(true)
            const response = await fetch(`${API_BASE}/api/admin/price-breaks`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tiers: updatedTiers.map(t => ({
                        min_qty: t.min,
                        max_qty: t.max,
                        discount_percent: t.discount
                    }))
                })
            })

            if (!response.ok) throw new Error('Failed to update global tiers')

            setTiers(updatedTiers.map(t => ({
                ...t,
                label: t.discount === 0 ? 'Base Price' : `${t.discount}% Off`
            })))
            setEditingId(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const basePrice = 10.00
    const getDiscountedPrice = (discount) => basePrice * (1 - discount / 100)

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Global Discount Tiers</h1>
                    <p className="text-gray-500 mt-2">Configure default volume-based discount percentages for all products</p>
                </div>
                <button
                    onClick={fetchTiers}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded shadow-sm">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-700 font-bold">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Loading discount tiers...</p>
                </div>
            ) : (
                <>
                    {/* Visual Preview */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                        {tiers.map((tier, idx) => (
                            <Card key={tier.id} className={`p-4 text-center transition-all ${idx === 0 ? 'bg-gray-50' : 'bg-gradient-to-b from-green-50 to-white border-green-200 shadow-sm'}`}>
                                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
                                    {tier.min}-{tier.max >= 99999 ? '∞' : tier.max}
                                </div>
                                <div className={`text-2xl font-black mb-1 ${tier.discount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                    {tier.discount > 0 ? `-${tier.discount}%` : '—'}
                                </div>
                                <div className="text-xs font-bold text-gray-400">
                                    £{getDiscountedPrice(tier.discount).toFixed(2)}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Table */}
                    <Card className="overflow-hidden border-gray-200 shadow-xl shadow-slate-200/50">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Discount Configuration</h3>
                                <p className="text-sm text-gray-500 mt-1">Example based on £10.00 base unit price</p>
                            </div>
                            {saving && (
                                <div className="flex items-center gap-2 text-primary font-bold animate-pulse text-xs uppercase tracking-widest">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Saving Changes...
                                </div>
                            )}
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="text-left py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Quantity Range</th>
                                    <th className="text-center py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Discount %</th>
                                    <th className="text-center py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Example Price</th>
                                    <th className="text-center py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Savings</th>
                                    <th className="text-right py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tiers.map((tier) => (
                                    <tr key={tier.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                                                    <Tags className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="text-lg font-black text-gray-900">
                                                        {tier.min} - {tier.max >= 99999 ? '∞' : tier.max.toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{tier.label}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center font-bold">
                                            {editingId === tier.id ? (
                                                <div className="relative inline-block w-24">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                        value={editDiscount}
                                                        onChange={(e) => setEditDiscount(e.target.value)}
                                                        className="w-full pl-3 pr-8 py-2 border-2 border-primary rounded-lg text-center font-black focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
                                                </div>
                                            ) : (
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-black tracking-tight
                                                    ${tier.discount > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                                                    {tier.discount}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <span className="text-lg font-black text-slate-900 tracking-tight">
                                                £{getDiscountedPrice(tier.discount).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            {tier.discount > 0 ? (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="text-green-600 font-black">
                                                        £{(basePrice - getDiscountedPrice(tier.discount)).toFixed(2)}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-green-500 tracking-widest bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Saved</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Base Rate</span>
                                            )}
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            {editingId === tier.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => saveEdit(tier)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                                        disabled={saving}
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(tier)}
                                                    className="p-3 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {/* Formula Explanation */}
                    <Card className="p-8 mt-8 border-2 border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">How Volume Discounts Work</h3>
                                <p className="text-sm text-slate-500">The mathematical formula for unit pricing</p>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm text-white/90 shadow-lg">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="opacity-60 uppercase text-[10px] tracking-widest font-black">Calculation Algorithm</span>
                            </div>
                            <div className="mb-2"><span className="text-primary font-bold">discountedPrice</span> = basePrice × (1 - discountPercent / 100)</div>
                            <div className="opacity-50">Example Execution:</div>
                            <div className="text-green-400 font-bold">£10.00 × (1 - 25/100) = £10.00 × 0.75 = £7.50 unit cost</div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

export default DiscountTiers
