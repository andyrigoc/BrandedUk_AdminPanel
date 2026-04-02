import { useState, useEffect } from 'react'
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
    Check
} from 'lucide-react'

import { API_BASE } from '../config'

const Dashboard = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    const [metrics, setMetrics] = useState({
        revenue: 0,
        orders: 0,
        customers: 0,
        products: 0
    })

    const [recentOrders, setRecentOrders] = useState([])
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
            const allQuotes = quotesData.items || []

            const totalRevenue = allQuotes.reduce((sum, quote) => sum + getOrderTotal(quote), 0)
            const uniqueCustomers = new Set(allQuotes.map(q => q.customer_email || q.customer_name)).size

            const productsRes = await fetch(`${API_BASE}/api/products?limit=1`)
            const productsData = await productsRes.json()
            const totalProducts = productsData.total || productsData.pagination?.totalItems || 0

            setMetrics({
                revenue: totalRevenue,
                orders: allQuotes.length,
                customers: uniqueCustomers,
                products: totalProducts
            })

            const recent = allQuotes.slice(0, 10).map(q => {
                const data = parseQuoteData(q)
                const itemsCount = (data.basket || []).reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0)
                const totalVal = getOrderTotal(q)

                return {
                    id: `#${q.id}`,
                    rawId: q.id,
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

            setRecentOrders(recent)
        } catch (err) {
            console.error('Dashboard Error:', err)
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)
    }

    const handleSort = (key) => {
        let direction = 'desc'
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc'
        }
        setSortConfig({ key, direction })
    }

    const openOrder = (orderId) => {
        navigate(`/orders?open=${encodeURIComponent(orderId)}`)
    }

    const deleteOrders = async (orderIds) => {
        const results = await Promise.allSettled(
            orderIds.map(async (orderId) => {
                const response = await fetch(`${API_BASE}/api/admin/quotes/${orderId}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    throw new Error(`Failed to delete order ${orderId}`)
                }

                return orderId
            })
        )

        const deletedIds = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)

        const failedCount = results.length - deletedIds.length

        if (deletedIds.length > 0) {
            setSelectedOrders(prev => prev.filter(id => !deletedIds.includes(id)))
            await fetchData({ showLoading: false })
        }

        if (failedCount > 0) {
            window.alert(
                deletedIds.length > 0
                    ? `${deletedIds.length} order(s) deleted, but ${failedCount} failed.`
                    : 'Failed to delete the selected order(s).'
            )
        }
    }

    const handleDeleteOrder = async (order) => {
        const confirmed = window.confirm(`Delete order ${order.id} for ${order.customer}?`)
        if (!confirmed) return

        setDeletingOrderIds(prev => [...prev, order.rawId])

        try {
            await deleteOrders([order.rawId])
        } finally {
            setDeletingOrderIds(prev => prev.filter(id => id !== order.rawId))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedOrders.length === 0) return

        const confirmed = window.confirm(
            `Delete ${selectedOrders.length} selected order(s)? This action cannot be undone.`
        )
        if (!confirmed) return

        setBulkDeleting(true)

        try {
            await deleteOrders(selectedOrders)
        } finally {
            setBulkDeleting(false)
        }
    }

    const sortedOrders = [...recentOrders].sort((a, b) => {
        const aVal = a[sortConfig.key === 'id' ? 'rawId' : sortConfig.key === 'date' ? 'rawDate' : sortConfig.key === 'total' ? 'rawTotal' : sortConfig.key]
        const bVal = b[sortConfig.key === 'id' ? 'rawId' : sortConfig.key === 'date' ? 'rawDate' : sortConfig.key === 'total' ? 'rawTotal' : sortConfig.key]

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

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
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <div className="text-sm text-slate-500">Overview of your store</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.revenue)}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <CreditCard className="w-5 h-5" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.orders}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Active Products</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.products}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                        <Package className="w-5 h-5" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Customers</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.customers}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Users className="w-5 h-5" />
                    </div>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white mt-8">
                <div className="px-6 py-5 flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900">All Orders</h2>
                    <div className="text-sm text-slate-500 font-medium">
                        {metrics.orders} orders
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
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Set Status:</span>
                                <div className="flex gap-1">
                                    {['Pending', 'Processing', 'Completed', 'Cancelled'].map(s => (
                                        <button
                                            key={s}
                                            className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 hover:border-slate-300 transition-all"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                                            <td className="px-4 py-4 cursor-pointer" onClick={() => openOrder(order.rawId)}>
                                                <span className="text-sm text-slate-600 font-medium">{order.date}</span>
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
