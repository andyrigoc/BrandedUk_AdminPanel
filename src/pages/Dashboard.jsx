import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import {
    Package,
    ShoppingCart,
    Users,
    CreditCard,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    Trash2,
    ArrowDown,
    ArrowUp,
    Check,
    TrendingUp,
    TrendingDown,
    Calendar,
    Star,
    Eye
} from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

import { API_BASE } from '../config'

const TIME_FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
]

const PIE_COLORS = ['#995BD5', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']

const Dashboard = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [allQuotes, setAllQuotes] = useState([])
    const [totalProducts, setTotalProducts] = useState(0)
    const [timeFilter, setTimeFilter] = useState('all')

    const [selectedOrders, setSelectedOrders] = useState([])
    const [deletingOrderIds, setDeletingOrderIds] = useState([])
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

    const getOrderTotal = (quote) => {
        try {
            let amount = parseFloat(quote.total_amount)
            if (isNaN(amount) || amount === 0) {
                const data = typeof quote.quote_data === 'string'
                    ? JSON.parse(quote.quote_data)
                    : quote.quote_data
                amount = parseFloat(data?.summary?.totalIncVat || 0)
            }
            return amount || 0
        } catch (e) {
            return 0
        }
    }

    const parseQuoteData = (quote) => {
        try {
            return typeof quote.quote_data === 'string'
                ? JSON.parse(quote.quote_data)
                : quote.quote_data || {}
        } catch (e) {
            return {}
        }
    }

    const fetchData = async ({ showLoading = true } = {}) => {
        try {
            if (showLoading) setLoading(true)

            const quotesRes = await fetch(`${API_BASE}/api/admin/quotes?limit=1000`)
            if (!quotesRes.ok) throw new Error('Failed to fetch sales data')
            const quotesData = await quotesRes.json()
            setAllQuotes(quotesData.items || [])

            const productsRes = await fetch(`${API_BASE}/api/products?limit=1`)
            const productsData = await productsRes.json()
            setTotalProducts(productsData.total || productsData.pagination?.totalItems || 0)
        } catch (err) {
            console.error('Dashboard Error:', err)
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Filter quotes by time
    const getTimeFilteredQuotes = (quotes, filter) => {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        return quotes.filter(q => {
            if (filter === 'all') return true
            const date = new Date(q.created_at)
            if (filter === 'today') return date >= startOfDay
            if (filter === 'week') return date >= startOfWeek
            if (filter === 'month') return date >= startOfMonth
            if (filter === 'year') return date >= startOfYear
            return true
        })
    }

    const getPreviousPeriodQuotes = (quotes, filter) => {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        let currentStart, previousStart
        if (filter === 'today') {
            currentStart = startOfDay
            previousStart = new Date(startOfDay)
            previousStart.setDate(previousStart.getDate() - 1)
        } else if (filter === 'week') {
            currentStart = new Date(startOfDay)
            currentStart.setDate(currentStart.getDate() - currentStart.getDay() + 1)
            previousStart = new Date(currentStart)
            previousStart.setDate(previousStart.getDate() - 7)
        } else if (filter === 'month') {
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
            previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        } else if (filter === 'year') {
            currentStart = new Date(now.getFullYear(), 0, 1)
            previousStart = new Date(now.getFullYear() - 1, 0, 1)
        } else {
            return []
        }

        return quotes.filter(q => {
            const date = new Date(q.created_at)
            return date >= previousStart && date < currentStart
        })
    }

    const filteredQuotes = useMemo(() => getTimeFilteredQuotes(allQuotes, timeFilter), [allQuotes, timeFilter])
    const previousQuotes = useMemo(() => getPreviousPeriodQuotes(allQuotes, timeFilter), [allQuotes, timeFilter])

    // Metrics
    const metrics = useMemo(() => {
        const revenue = filteredQuotes.reduce((sum, q) => sum + getOrderTotal(q), 0)
        const customers = new Set(filteredQuotes.map(q => q.customer_email || q.customer_name)).size
        const prevRevenue = previousQuotes.reduce((sum, q) => sum + getOrderTotal(q), 0)
        const prevCustomers = new Set(previousQuotes.map(q => q.customer_email || q.customer_name)).size

        const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

        return {
            revenue, orders: filteredQuotes.length, customers, products: totalProducts,
            revenuePct: pctChange(revenue, prevRevenue),
            ordersPct: pctChange(filteredQuotes.length, previousQuotes.length),
            customersPct: pctChange(customers, prevCustomers),
        }
    }, [filteredQuotes, previousQuotes, totalProducts])

    // Revenue over time chart data
    const revenueChartData = useMemo(() => {
        const grouped = {}
        filteredQuotes.forEach(q => {
            const d = new Date(q.created_at)
            const key = timeFilter === 'today'
                ? `${d.getHours()}:00`
                : timeFilter === 'week'
                    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
                    : `${d.getDate()}/${d.getMonth() + 1}`
            if (!grouped[key]) grouped[key] = { name: key, revenue: 0, orders: 0 }
            grouped[key].revenue += getOrderTotal(q)
            grouped[key].orders += 1
        })
        return Object.values(grouped)
    }, [filteredQuotes, timeFilter])

    // Order status distribution
    const statusData = useMemo(() => {
        const counts = {}
        filteredQuotes.forEach(q => {
            const s = q.status || 'Pending'
            counts[s] = (counts[s] || 0) + 1
        })
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [filteredQuotes])

    // Best sellers
    const bestSellers = useMemo(() => {
        const productMap = {}
        filteredQuotes.forEach(q => {
            const data = parseQuoteData(q)
            const basket = data.basket || data.items || []
            basket.forEach(item => {
                const name = item.productName || item.name || item.description || 'Unknown'
                const code = item.productCode || item.code || item.sku || name
                const qty = parseInt(item.quantity) || 1
                const color = item.color || item.colour || ''
                const size = item.size || ''
                if (!productMap[code]) {
                    productMap[code] = { code, name, totalQty: 0, totalRevenue: 0, orders: 0, colors: {}, sizes: {} }
                }
                productMap[code].totalQty += qty
                productMap[code].totalRevenue += (parseFloat(item.totalPrice || item.price || 0) * qty)
                productMap[code].orders += 1
                if (color) productMap[code].colors[color] = (productMap[code].colors[color] || 0) + qty
                if (size) productMap[code].sizes[size] = (productMap[code].sizes[size] || 0) + qty
            })
        })
        return Object.values(productMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 10)
    }, [filteredQuotes])

    // Top customers
    const topCustomers = useMemo(() => {
        const customerMap = {}
        filteredQuotes.forEach(q => {
            const key = q.customer_email || q.customer_name || 'Guest'
            if (!customerMap[key]) {
                customerMap[key] = {
                    name: q.customer_name || 'Guest',
                    email: q.customer_email || '',
                    orders: 0,
                    totalSpent: 0,
                    items: 0,
                    lastOrder: q.created_at
                }
            }
            customerMap[key].orders += 1
            customerMap[key].totalSpent += getOrderTotal(q)
            const data = parseQuoteData(q)
            const basket = data.basket || data.items || []
            customerMap[key].items += basket.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0)
            if (new Date(q.created_at) > new Date(customerMap[key].lastOrder)) {
                customerMap[key].lastOrder = q.created_at
            }
        })
        return Object.values(customerMap)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)
    }, [filteredQuotes])

    // Recent orders for table
    const recentOrders = useMemo(() => {
        return filteredQuotes.slice(0, 10).map(q => {
            const data = parseQuoteData(q)
            const itemsCount = (data.basket || []).reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0)
            const totalVal = getOrderTotal(q)
            return {
                id: `#${q.id}`, rawId: q.id,
                customer: q.customer_name || 'Guest',
                email: q.customer_email,
                items: itemsCount,
                total: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(totalVal),
                rawTotal: totalVal,
                status: q.status || 'Pending',
                date: new Date(q.created_at).toLocaleDateString(),
                rawDate: new Date(q.created_at).getTime(),
                initial: (q.customer_name || 'G').charAt(0).toUpperCase()
            }
        })
    }, [filteredQuotes])

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)

    const handleSort = (key) => {
        let direction = 'desc'
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc'
        setSortConfig({ key, direction })
    }

    const openOrder = (orderId) => navigate(`/orders?open=${encodeURIComponent(orderId)}`)

    const deleteOrders = async (orderIds) => {
        const results = await Promise.allSettled(
            orderIds.map(async (orderId) => {
                const response = await fetch(`${API_BASE}/api/admin/quotes/${orderId}`, { method: 'DELETE' })
                if (!response.ok) throw new Error(`Failed to delete order ${orderId}`)
                return orderId
            })
        )
        const deletedIds = results.filter(r => r.status === 'fulfilled').map(r => r.value)
        const failedCount = results.length - deletedIds.length
        if (deletedIds.length > 0) {
            setSelectedOrders(prev => prev.filter(id => !deletedIds.includes(id)))
            await fetchData({ showLoading: false })
        }
        if (failedCount > 0) {
            window.alert(deletedIds.length > 0
                ? `${deletedIds.length} order(s) deleted, but ${failedCount} failed.`
                : 'Failed to delete the selected order(s).')
        }
    }

    const handleDeleteOrder = async (order) => {
        if (!window.confirm(`Delete order ${order.id} for ${order.customer}?`)) return
        setDeletingOrderIds(prev => [...prev, order.rawId])
        try { await deleteOrders([order.rawId]) }
        finally { setDeletingOrderIds(prev => prev.filter(id => id !== order.rawId)) }
    }

    const handleBulkDelete = async () => {
        if (selectedOrders.length === 0) return
        if (!window.confirm(`Delete ${selectedOrders.length} selected order(s)? This action cannot be undone.`)) return
        setBulkDeleting(true)
        try { await deleteOrders(selectedOrders) }
        finally { setBulkDeleting(false) }
    }

    const sortedOrders = [...recentOrders].sort((a, b) => {
        const aVal = a[sortConfig.key === 'id' ? 'rawId' : sortConfig.key === 'date' ? 'rawDate' : sortConfig.key === 'total' ? 'rawTotal' : sortConfig.key]
        const bVal = b[sortConfig.key === 'id' ? 'rawId' : sortConfig.key === 'date' ? 'rawDate' : sortConfig.key === 'total' ? 'rawTotal' : sortConfig.key]
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const PctBadge = ({ value }) => {
        if (value === 0 && timeFilter === 'all') return null
        const isUp = value >= 0
        return (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(value)}%
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
            {/* Header + Time Filter */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Overview of your store</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    {TIME_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setTimeFilter(f.key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                timeFilter === f.key
                                    ? 'bg-[#995BD5] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 shadow-sm hover:shadow-md transition-all rounded-xl" style={{ backgroundColor: '#70864f', borderColor: '#70864f' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80 mb-1">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-white">{formatCurrency(metrics.revenue)}</h3>
                            <PctBadge value={metrics.revenuePct} />
                        </div>
                        <div className="p-3 bg-white/15 rounded-full text-white">
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 shadow-sm hover:shadow-md transition-all rounded-xl" style={{ backgroundColor: '#8b3f96', borderColor: '#8b3f96' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80 mb-1">Total Orders</p>
                            <h3 className="text-2xl font-bold text-white">{metrics.orders}</h3>
                            <PctBadge value={metrics.ordersPct} />
                        </div>
                        <div className="p-3 bg-white/15 rounded-full text-white">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 shadow-sm hover:shadow-md transition-all rounded-xl" style={{ backgroundColor: '#b15d24', borderColor: '#b15d24' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80 mb-1">Active Products</p>
                            <h3 className="text-2xl font-bold text-white">{metrics.products}</h3>
                        </div>
                        <div className="p-3 bg-white/15 rounded-full text-white">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 shadow-sm hover:shadow-md transition-all rounded-xl" style={{ backgroundColor: '#9a3b83', borderColor: '#9a3b83' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80 mb-1">Customers</p>
                            <h3 className="text-2xl font-bold text-white">{metrics.customers}</h3>
                            <PctBadge value={metrics.customersPct} />
                        </div>
                        <div className="p-3 bg-white/15 rounded-full text-white">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <Card className="col-span-2 p-6 border-slate-200 shadow-sm rounded-xl">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue & Orders</h2>
                    {revenueChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#995BD5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#995BD5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `£${v}`} />
                                <Tooltip
                                    formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#995BD5" fill="url(#colorRevenue)" strokeWidth={2} />
                                <Bar dataKey="orders" fill="#995BD5" opacity={0.2} barSize={20} radius={[4, 4, 0, 0]} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No data for this period</div>
                    )}
                </Card>

                {/* Status Pie */}
                <Card className="p-6 border-slate-200 shadow-sm rounded-xl">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Order Status</h2>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No data</div>
                    )}
                </Card>
            </div>

            {/* Best Sellers + Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Best Sellers */}
                <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            <h2 className="text-lg font-bold text-slate-900">Best Sellers</h2>
                        </div>
                        <span className="text-xs font-medium text-slate-400">{bestSellers.length} products</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {bestSellers.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No sales data for this period</div>
                        ) : (
                            bestSellers.map((p, i) => (
                                <div key={p.code} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        i < 3 ? 'bg-[#995BD5]/10 text-[#995BD5]' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-slate-400">{p.code}</span>
                                            {Object.keys(p.colors).length > 0 && (
                                                <span className="text-xs text-slate-400">{Object.keys(p.colors).length} colours</span>
                                            )}
                                            {Object.keys(p.sizes).length > 0 && (
                                                <span className="text-xs text-slate-400">{Object.keys(p.sizes).length} sizes</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-slate-900">{p.totalQty} sold</p>
                                        <p className="text-xs text-slate-400">{p.orders} orders</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Top Customers */}
                <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#995BD5]" />
                            <h2 className="text-lg font-bold text-slate-900">Top Customers</h2>
                        </div>
                        <button
                            onClick={() => navigate('/customers')}
                            className="text-xs font-medium text-[#995BD5] hover:underline flex items-center gap-1"
                        >
                            View All <Eye className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {topCustomers.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No customer data</div>
                        ) : (
                            topCustomers.map((c, i) => (
                                <div key={c.email || i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-sm font-bold text-[#995BD5] shrink-0">
                                        {(c.name || 'G').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{c.email}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-slate-900">{formatCurrency(c.totalSpent)}</p>
                                        <p className="text-xs text-slate-400">{c.orders} orders &middot; {c.items} items</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Recent Orders Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
                <div className="px-6 py-5 flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                    <div className="text-sm text-slate-500 font-medium">
                        {filteredQuotes.length} orders
                    </div>
                </div>

                {selectedOrders.length > 0 && (
                    <div className="mx-6 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-medium text-primary">{selectedOrders.length} selected</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-px h-5 bg-slate-200"></div>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> {bulkDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-y border-slate-100 bg-slate-50/50">
                                <th className="pl-6 pr-4 py-3 w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                        checked={selectedOrders.length === recentOrders.length && recentOrders.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedOrders(recentOrders.map(o => o.rawId))
                                            else setSelectedOrders([])
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 group" onClick={() => handleSort('id')}>
                                        ORDER ID
                                        {sortConfig.key === 'id' ? (
                                            sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUp className="w-3 h-3 text-primary" />
                                        ) : (
                                            <ArrowDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 group" onClick={() => handleSort('date')}>
                                        DATE
                                        {sortConfig.key === 'date' ? (
                                            sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUp className="w-3 h-3 text-primary" />
                                        ) : (
                                            <ArrowDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CUSTOMER</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">STATUS</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 group" onClick={() => handleSort('total')}>
                                        TOTAL
                                        {sortConfig.key === 'total' ? (
                                            sortConfig.direction === 'desc' ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUp className="w-3 h-3 text-primary" />
                                        ) : (
                                            <ArrowDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </th>
                                <th className="pr-6 pl-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <p className="text-slate-500 text-sm">No orders found</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedOrders.map((order) => {
                                    const isSelected = selectedOrders.includes(order.rawId)
                                    const isDeleting = deletingOrderIds.includes(order.rawId)
                                    const statusColors = {
                                        Completed: { text: 'text-emerald-600', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                                        Pending: { text: 'text-amber-500', icon: <Clock className="w-3.5 h-3.5" /> },
                                        Processing: { text: 'text-blue-500', icon: <Loader2 className="w-3.5 h-3.5" /> },
                                        Cancelled: { text: 'text-rose-500', icon: <XCircle className="w-3.5 h-3.5" /> }
                                    }
                                    const config = statusColors[order.status] || statusColors.Pending

                                    return (
                                        <tr
                                            key={order.rawId}
                                            className={`transition-colors hover:bg-slate-50 group ${isSelected ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="pl-6 pr-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedOrders(prev => [...prev, order.rawId])
                                                        else setSelectedOrders(prev => prev.filter(id => id !== order.rawId))
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-4 cursor-pointer" onClick={() => openOrder(order.rawId)}>
                                                <span className="font-semibold text-slate-900 text-sm">{order.id}</span>
                                            </td>
                                            <td className="px-4 py-4 cursor-pointer" onClick={(e) => {
                                                e.stopPropagation()
                                                const d = new Date(order.rawDate)
                                                navigate(`/calendar?date=${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
                                            }}>
                                                <span className="text-sm text-[#995BD5] font-semibold hover:underline cursor-pointer">{order.date}</span>
                                            </td>
                                            <td className="px-4 py-4 cursor-pointer" onClick={() => openOrder(order.rawId)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-xs font-semibold text-purple-600">
                                                        {order.initial}
                                                    </div>
                                                    <span className="text-sm font-medium text-purple-700">{order.customer}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 cursor-pointer" onClick={() => openOrder(order.rawId)}>
                                                <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.text}`}>
                                                    {config.icon}
                                                    {order.status}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 cursor-pointer" onClick={() => openOrder(order.rawId)}>
                                                <span className="font-semibold text-slate-900 text-sm">{order.total}</span>
                                            </td>
                                            <td className="pr-6 pl-4 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteOrder(order)}
                                                    disabled={isDeleting || bulkDeleting}
                                                    title={isDeleting ? 'Deleting order' : 'Delete order'}
                                                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
    )
}

export default Dashboard
