import { useState, useEffect, useMemo } from 'react'
import Card from '../components/Card'
import {
    Users, Search, ArrowDown, ArrowUp, ShoppingCart, Package,
    Mail, Calendar, TrendingUp, Eye, X, Loader2, ChevronDown
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { API_BASE } from '../config'

const PIE_COLORS = ['#995BD5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const Customers = () => {
    const [loading, setLoading] = useState(true)
    const [allQuotes, setAllQuotes] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState({ key: 'totalSpent', direction: 'desc' })
    const [selectedCustomer, setSelectedCustomer] = useState(null)

    const getOrderTotal = (quote) => {
        try {
            let amount = parseFloat(quote.total_amount)
            if (isNaN(amount) || amount === 0) {
                const data = typeof quote.quote_data === 'string' ? JSON.parse(quote.quote_data) : quote.quote_data
                amount = parseFloat(data?.summary?.totalIncVat || 0)
            }
            return amount || 0
        } catch { return 0 }
    }

    const parseQuoteData = (quote) => {
        try {
            return typeof quote.quote_data === 'string' ? JSON.parse(quote.quote_data) : quote.quote_data || {}
        } catch { return {} }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const res = await fetch(`${API_BASE}/api/admin/quotes?limit=1000`)
                if (!res.ok) throw new Error('Failed')
                const data = await res.json()
                setAllQuotes(data.items || [])
            } catch (err) {
                console.error('Customers fetch error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const customers = useMemo(() => {
        const map = {}
        allQuotes.forEach(q => {
            const key = q.customer_email || q.customer_name || 'guest'
            const data = parseQuoteData(q)
            const basket = data.basket || data.items || []

            if (!map[key]) {
                map[key] = {
                    name: q.customer_name || 'Guest',
                    email: q.customer_email || '',
                    phone: q.customer_phone || data.customer?.phone || '',
                    orders: [],
                    totalSpent: 0,
                    totalItems: 0,
                    products: {},
                    colors: {},
                    sizes: {},
                    statuses: {},
                    firstOrder: q.created_at,
                    lastOrder: q.created_at,
                    monthlySpend: {}
                }
            }

            const c = map[key]
            const total = getOrderTotal(q)
            c.orders.push({
                id: q.id, date: q.created_at, total, status: q.status || 'Pending',
                items: basket.map(item => ({
                    name: item.productName || item.name || item.description || 'Unknown',
                    code: item.productCode || item.code || '',
                    qty: parseInt(item.quantity) || 1,
                    color: item.color || item.colour || '',
                    size: item.size || '',
                    price: parseFloat(item.totalPrice || item.price || 0)
                }))
            })
            c.totalSpent += total
            c.statuses[q.status || 'Pending'] = (c.statuses[q.status || 'Pending'] || 0) + 1

            const monthKey = new Date(q.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
            c.monthlySpend[monthKey] = (c.monthlySpend[monthKey] || 0) + total

            if (new Date(q.created_at) < new Date(c.firstOrder)) c.firstOrder = q.created_at
            if (new Date(q.created_at) > new Date(c.lastOrder)) c.lastOrder = q.created_at

            basket.forEach(item => {
                const name = item.productName || item.name || item.description || 'Unknown'
                const qty = parseInt(item.quantity) || 1
                const color = item.color || item.colour || ''
                const size = item.size || ''

                c.totalItems += qty
                c.products[name] = (c.products[name] || 0) + qty
                if (color) c.colors[color] = (c.colors[color] || 0) + qty
                if (size) c.sizes[size] = (c.sizes[size] || 0) + qty
            })
        })

        return Object.values(map)
    }, [allQuotes])

    const filteredCustomers = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return customers
            .filter(c => !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term))
            .sort((a, b) => {
                const aVal = a[sortConfig.key]
                const bVal = b[sortConfig.key]
                if (typeof aVal === 'number') return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal
                return sortConfig.direction === 'desc'
                    ? String(bVal).localeCompare(String(aVal))
                    : String(aVal).localeCompare(String(bVal))
            })
    }, [customers, searchTerm, sortConfig])

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }))
    }

    const SortIcon = ({ colKey }) => (
        sortConfig.key === colKey
            ? sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3 text-[#995BD5]" /> : <ArrowUp className="w-3 h-3 text-[#995BD5]" />
            : <ArrowDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading customers...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                    <p className="text-sm text-slate-500 mt-1">{customers.length} total customers</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-slate-200 shadow-sm rounded-xl">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Total Customers</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
                </Card>
                <Card className="p-5 border-slate-200 shadow-sm rounded-xl">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0))}</p>
                </Card>
                <Card className="p-5 border-slate-200 shadow-sm rounded-xl">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        {formatCurrency(allQuotes.length > 0 ? customers.reduce((s, c) => s + c.totalSpent, 0) / allQuotes.length : 0)}
                    </p>
                </Card>
                <Card className="p-5 border-slate-200 shadow-sm rounded-xl">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Repeat Customers</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{customers.filter(c => c.orders.length > 1).length}</p>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#995BD5]/30 focus:border-[#995BD5]"
                />
            </div>

            {/* Customer Table */}
            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group" onClick={() => handleSort('orders')}>
                                    <div className="flex items-center gap-1">Orders <SortIcon colKey="orders" /></div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group" onClick={() => handleSort('totalSpent')}>
                                    <div className="flex items-center gap-1">Total Spent <SortIcon colKey="totalSpent" /></div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer group" onClick={() => handleSort('totalItems')}>
                                    <div className="flex items-center gap-1">Items <SortIcon colKey="totalItems" /></div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Order</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-400">No customers found</td></tr>
                            ) : (
                                filteredCustomers.map((c, i) => (
                                    <tr key={c.email || i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-sm font-bold text-[#995BD5] shrink-0">
                                                    {(c.name || 'G').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                                                    <p className="text-xs text-slate-400">{c.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">{c.orders.length}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-900">{formatCurrency(c.totalSpent)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600">{c.totalItems}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500">
                                            {new Date(c.lastOrder).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedCustomer(c)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#995BD5] bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                            >
                                                <Eye className="w-3 h-3" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto pb-10" onClick={() => setSelectedCustomer(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#995BD5]/10 flex items-center justify-center text-lg font-bold text-[#995BD5]">
                                    {(selectedCustomer.name || 'G').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                        {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedCustomer.email}</span>}
                                        {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Customer KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Total Spent</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(selectedCustomer.totalSpent)}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Orders</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">{selectedCustomer.orders.length}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Avg Order</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">
                                        {formatCurrency(selectedCustomer.orders.length > 0 ? selectedCustomer.totalSpent / selectedCustomer.orders.length : 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Items Bought</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">{selectedCustomer.totalItems}</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Monthly Spending */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Spending Over Time</h3>
                                    {Object.keys(selectedCustomer.monthlySpend).length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={Object.entries(selectedCustomer.monthlySpend).map(([month, amount]) => ({ month, amount }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `£${v}`} />
                                                <Tooltip formatter={(v) => [formatCurrency(v), 'Spent']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                                <Bar dataKey="amount" fill="#995BD5" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </div>

                                {/* Favourite Colours */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Favourite Colours</h3>
                                    {Object.keys(selectedCustomer.colors).length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={Object.entries(selectedCustomer.colors).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))}
                                                    cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                                                >
                                                    {Object.keys(selectedCustomer.colors).slice(0, 8).map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No colour data</div>
                                    )}
                                </div>
                            </div>

                            {/* Top Products + Sizes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Top Products</h3>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {Object.entries(selectedCustomer.products)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 10)
                                            .map(([name, qty]) => (
                                                <div key={name} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                                                    <span className="text-sm text-slate-700 truncate flex-1">{name}</span>
                                                    <span className="text-xs font-bold text-[#995BD5] ml-2">{qty} pcs</span>
                                                </div>
                                            ))}
                                        {Object.keys(selectedCustomer.products).length === 0 && (
                                            <p className="text-sm text-slate-400">No product data</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">Size Breakdown</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedCustomer.sizes)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([size, qty]) => (
                                                <div key={size} className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                                                    <p className="text-xs font-bold text-slate-700">{size}</p>
                                                    <p className="text-[10px] text-slate-400">{qty} pcs</p>
                                                </div>
                                            ))}
                                        {Object.keys(selectedCustomer.sizes).length === 0 && (
                                            <p className="text-sm text-slate-400">No size data</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order History */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Order History</h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {selectedCustomer.orders
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(order => (
                                            <div key={order.id} className="px-4 py-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-slate-900">#{order.id}</span>
                                                    <span className="text-xs text-slate-400">{new Date(order.date).toLocaleDateString('en-GB')}</span>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                        order.status === 'Cancelled' ? 'bg-rose-50 text-rose-500' :
                                                        order.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-amber-50 text-amber-600'
                                                    }`}>{order.status}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-slate-400">{order.items.length} items</span>
                                                    <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Customers