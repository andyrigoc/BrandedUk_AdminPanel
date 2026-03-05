import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import {
    Package,
    ShoppingCart,
    Users,
    CreditCard,
    ArrowRight,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react'

import { API_BASE } from '../config'

const Dashboard = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    // Real Metrics State
    const [metrics, setMetrics] = useState({
        revenue: 0,
        orders: 0,
        customers: 0,
        products: 0
    })

    const [recentOrders, setRecentOrders] = useState([])

    // Helper to extract total from quote
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

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

                    return {
                        id: `#${q.id}`,
                        customer: q.customer_name || 'Guest',
                        email: q.customer_email,
                        items: itemsCount,
                        total: `£${getOrderTotal(q).toFixed(2)}`,
                        status: q.status || 'Pending',
                        date: new Date(q.created_at).toLocaleDateString(),
                        initial: (q.customer_name || 'G').charAt(0).toUpperCase()
                    }
                })
                setRecentOrders(recent)

            } catch (err) {
                console.error("Dashboard Error:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Shipped': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            case 'Cancelled': return <XCircle className="w-4 h-4 text-rose-500" />
            default: return <Clock className="w-4 h-4 text-amber-500" />
        }
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
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <div className="text-sm text-slate-500 font-medium">
                    Overview of your store
                </div>
            </div>

            {/* Simple Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.revenue)}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.orders}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Active Products</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.products}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                        <Package className="w-6 h-6" />
                    </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Customers</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.customers}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Users className="w-6 h-6" />
                    </div>
                </Card>
            </div>

            {/* Recent Orders Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
                    <button onClick={() => navigate('/orders')} className="text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-1">
                        View All <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                recentOrders.map((order, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/orders')}>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {order.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {order.initial}
                                                </div>
                                                <div className="text-sm font-medium text-slate-900">{order.customer}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(order.status)}
                                                <span className={`text-sm font-medium ${order.status === 'Shipped' ? 'text-emerald-700' :
                                                    order.status === 'Cancelled' ? 'text-rose-700' :
                                                        'text-amber-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                            {order.total}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}

export default Dashboard
