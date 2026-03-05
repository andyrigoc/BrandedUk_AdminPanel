import { useState, useEffect } from 'react'
import Card from '../components/Card'
import {
    Search,
    Filter,
    Eye,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    ShoppingCart,
    ChevronDown,
    ChevronUp,
    User,
    MapPin,
    CreditCard,
    DollarSign,
    Calendar,
    Phone,
    Mail,
    FileText,
    ArrowRight,
    Edit3
} from 'lucide-react'

import { API_BASE } from '../config'

const Orders = () => {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [updatingStatus, setUpdatingStatus] = useState(null)

    useEffect(() => {
        fetchOrders()
    }, [statusFilter])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            let url = `${API_BASE}/api/admin/quotes?limit=100`
            if (statusFilter !== 'all') {
                url += `&status=${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`
            }

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch orders')

            const data = await response.json()
            setOrders(data.items || [])
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingStatus(orderId)
        try {
            const response = await fetch(`${API_BASE}/api/admin/quotes/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })

            if (!response.ok) throw new Error('Failed to update status')

            // Optimistic update
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, status: newStatus } : o
            ))

            if (statusFilter !== 'all' && statusFilter.toLowerCase() !== newStatus.toLowerCase()) {
                // If filtering by status, remove the item that no longer matches
                setOrders(prev => prev.filter(o => o.id !== orderId))
            }
        } catch (error) {
            alert('Failed to update status')
        } finally {
            setUpdatingStatus(null)
        }
    }

    const statusConfig = {
        Pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock, border: 'border-amber-200' },
        Processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package, border: 'border-blue-200' },
        Contacted: { label: 'Contacted', color: 'bg-purple-100 text-purple-700', icon: Phone, border: 'border-purple-200' },
        Completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, border: 'border-emerald-200' },
        Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle, border: 'border-red-200' },
        Closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700', icon: FileText, border: 'border-slate-200' }
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            (order.quote_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customer_email || '').toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
    })

    const stats = {
        total: orders.length, // This is just current view count, ideally should come from API total
        pending: orders.filter(o => o.status === 'Pending').length,
        processing: orders.filter(o => o.status === 'Processing').length,
        completed: orders.filter(o => o.status === 'Completed').length,
    }

    // New format parsing based on your structure
    const parseQuoteData = (order) => {
        try {
            // quote_data comes as JSON column, assuming it's already parsed by pg driver or needs parsing
            const data = typeof order.quote_data === 'string' ? JSON.parse(order.quote_data) : order.quote_data

            return {
                basket: data?.basket || [],
                customizations: data?.customizations || [],
                summary: data?.summary || {}
            }
        } catch (e) {
            return { basket: [], customizations: [], summary: {} }
        }
    }

    if (loading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-[#f8fafc]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading requests...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Quote Requests</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage incoming quote requests and orders.</p>
                </div>

                {/* Status Tabs */}
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                    {['all', 'pending', 'contacted', 'completed', 'closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider whitespace-nowrap
                                ${statusFilter === status
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, Name or Email..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-semibold text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Quick Stats - Mini Cards */}
                <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
                    <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[160px]">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</div>
                            <div className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</div>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[160px]">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</div>
                            <div className="text-lg font-black text-slate-800">
                                £{orders.reduce((acc, curr) => {
                                    const { summary } = parseQuoteData(curr)
                                    const amount = parseFloat(curr.total_amount) || summary.totalIncVat || 0
                                    return acc + amount
                                }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingCart className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No Requests Found</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Try adjusting your search terms or filters to find what you're looking for.
                        </p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig['Pending']
                        const StatusIcon = status.icon
                        const isExpanded = expandedOrder === order.id
                        const { basket, customizations, summary } = parseQuoteData(order)

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden group
                                    ${isExpanded ? 'border-primary shadow-xl shadow-primary/5 ring-1 ring-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
                            >
                                {/* Main Order Row */}
                                <div
                                    className="p-6 cursor-pointer"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">

                                        {/* Status Badge */}
                                        <div className="flex items-center justify-between lg:w-48 shrink-0">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors 
                                                        ${isExpanded ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}
                                                >
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${status.color} ${status.border} border`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Mobile Total */}
                                            <div className="lg:hidden text-right">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</div>
                                                <div className="text-lg font-black text-slate-900">£{(parseFloat(order.total_amount) || summary.totalIncVat || 0).toFixed(2)}</div>
                                            </div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center font-black text-slate-500 text-sm">
                                                        {order.customer_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 leading-tight">{order.customer_name}</div>
                                                        <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{order.customer_email}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quote ID</div>
                                                <div className="font-bold text-slate-700 font-mono text-sm">{order.quote_id}</div>
                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total & Actions */}
                                        <div className="hidden lg:flex items-center gap-8 border-l border-slate-100 pl-8">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Total</div>
                                                <div className="text-xl font-black text-slate-900">£{(parseFloat(order.total_amount) || summary.totalIncVat || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50">
                                        <div className="p-8">
                                            {/* Action Bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Update Status:</span>
                                                    {['Pending', 'Contacted', 'Completed', 'Cancelled'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateOrderStatus(order.id, s)}
                                                            disabled={order.status === s || updatingStatus === order.id}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                                                ${order.status === s
                                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
                                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
                                                        <Mail className="w-3.5 h-3.5" /> Email Customer
                                                    </button>
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                                        <FileText className="w-3.5 h-3.5" /> Generate Invoice
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                {/* Left Column: Customer & Details */}
                                                <div className="space-y-6">
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <User className="w-4 h-4 text-primary" /> Customer Details
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Contact</div>
                                                                <div className="font-bold text-slate-900">{order.customer_name}</div>
                                                                <div className="text-sm font-medium text-slate-600">{order.customer_company}</div>
                                                            </div>
                                                            <div className="h-px bg-slate-100"></div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <a href={`mailto:${order.customer_email}`} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                                                                    <Mail className="w-4 h-4 text-slate-400" /> {order.customer_email}
                                                                </a>
                                                                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                                                                    <Phone className="w-4 h-4 text-slate-400" /> {order.customer_phone}
                                                                </a>
                                                                <div className="flex items-start gap-2 text-sm font-medium text-slate-600">
                                                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                                                    <span className="flex-1">{order.customer_address || 'No address provided'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Customization Summary */}
                                                    {customizations.length > 0 && (
                                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                <Edit3 className="w-4 h-4 text-primary" /> Design Requests
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {customizations.map((cust, idx) => (
                                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-primary">
                                                                            {idx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-800 text-sm">{cust.method} - {cust.position}</div>
                                                                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                                Qty: {cust.quantity} × £{cust.unitPrice}
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-auto font-bold text-slate-800 text-sm">
                                                                            £{cust.lineTotal}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Order Items */}
                                                <div className="lg:col-span-2 space-y-6">
                                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-primary" /> Order Items ({basket.length})
                                                            </h4>
                                                        </div>
                                                        <div className="divide-y divide-slate-100">
                                                            {basket.map((item, idx) => (
                                                                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                                                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                                                                        {item.image ? (
                                                                            <img src={item.image} alt={item.code} className="w-full h-full object-contain" />
                                                                        ) : (
                                                                            <Package className="w-6 h-6 text-slate-300" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <div>
                                                                                <h5 className="font-bold text-slate-900 text-sm">{item.name}</h5>
                                                                                <div className="text-xs font-bold text-slate-400 mt-0.5">{item.code} • {item.color}</div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="font-bold text-slate-900">£{item.itemTotal?.toFixed(2)}</div>
                                                                                <div className="text-xs text-slate-500">£{item.unitPrice} ea</div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Size Breakdown */}
                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                            {Object.entries(item.sizes || {}).map(([size, qty]) => (
                                                                                qty > 0 && (
                                                                                    <div key={size} className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                                                                        <span className="font-bold text-slate-800">{size}</span>
                                                                                        <span className="text-slate-400">×</span>
                                                                                        <span>{qty}</span>
                                                                                    </div>
                                                                                )
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Order Totals Footer */}
                                                        <div className="bg-slate-50 border-t border-slate-100 p-6">
                                                            <div className="flex flex-col gap-2 max-w-xs ml-auto">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                                                    <span className="font-bold text-slate-900">£{summary.subtotal?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-slate-500 font-medium">VAT ({(summary.vatRate * 100).toFixed(0)}%)</span>
                                                                    <span className="font-bold text-slate-900">£{summary.vatAmount?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="h-px bg-slate-200 my-1"></div>
                                                                <div className="flex justify-between text-base">
                                                                    <span className="font-black text-slate-800 uppercase tracking-wide">Total</span>
                                                                    <span className="font-black text-primary text-lg">£{summary.totalIncVat?.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default Orders
