import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
    ArrowDown,
    ArrowUp,
    User,
    MapPin,
    CreditCard,
    PoundSterling,
    Calendar,
    Phone,
    Mail,
    FileText,
    ArrowRight,
    Edit3,
    Download,
    Trash2,
    X,
    Image as ImageIcon
} from 'lucide-react'

import { API_BASE } from '../config'
import WorkflowDropdown, { WORKFLOW_STATUSES, getStatusStyle } from '../components/WorkflowDropdown'

const Orders = () => {
    const [searchParams] = useSearchParams()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [updatingStatus, setUpdatingStatus] = useState(null)
    const [sortBy, setSortBy] = useState('date')
    const [sortOrder, setSortOrder] = useState('desc')
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(null)
    const [deletingOrder, setDeletingOrder] = useState(null)
    const [selectedOrders, setSelectedOrders] = useState(new Set())
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const requestedOpenOrderId = searchParams.get('open')

    useEffect(() => {
        fetchOrders()
    }, [statusFilter])

    useEffect(() => {
        if (!requestedOpenOrderId || orders.length === 0) return

        const targetOrder = orders.find((order) => String(order.id) === String(requestedOpenOrderId))
        if (!targetOrder) return

        setExpandedOrder(targetOrder.id)

        const timeoutId = window.setTimeout(() => {
            const element = document.getElementById(`invoice-content-${targetOrder.id}`)
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)

        return () => window.clearTimeout(timeoutId)
    }, [orders, requestedOpenOrderId])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            let url = `${API_BASE}/api/admin/quotes?limit=100`
            if (statusFilter !== 'all') {
                url += `&status=${encodeURIComponent(statusFilter)}`
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

    const PDF_SNAPSHOT_WIDTH = 1560
    const PDF_PAGE_WIDTH_MM = 458
    const PDF_PAGE_HEIGHT_MM = 324
    const PDF_PAGE_PADDING_PX = 24

    const buildPrintDocument = (content) => {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map((node) => node.outerHTML)
            .join('\n')

        return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Order PDF</title>
                    ${styles}
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                            background: #f4f7fa;
                            color: #1a202c;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }

                        body {
                            padding: ${PDF_PAGE_PADDING_PX}px;
                        }

                        .pdf-print-root {
                            width: ${PDF_SNAPSHOT_WIDTH}px;
                            min-width: ${PDF_SNAPSHOT_WIDTH}px;
                            max-width: ${PDF_SNAPSHOT_WIDTH}px;
                            margin: 0 auto;
                        }

                        @page {
                            margin: 0;
                            size: ${PDF_PAGE_WIDTH_MM}mm ${PDF_PAGE_HEIGHT_MM}mm;
                        }

                        @media print {
                            @page {
                                size: ${PDF_PAGE_WIDTH_MM}mm ${PDF_PAGE_HEIGHT_MM}mm;
                                margin: 0;
                            }

                            html, body {
                                background: #ffffff;
                                width: 100%;
                                height: auto;
                                overflow: visible;
                            }

                            body {
                                padding: ${PDF_PAGE_PADDING_PX}px;
                            }

                            .pdf-print-root {
                                width: ${PDF_SNAPSHOT_WIDTH}px;
                                min-width: ${PDF_SNAPSHOT_WIDTH}px;
                                max-width: ${PDF_SNAPSHOT_WIDTH}px;
                                margin: 0 auto;
                                transform: none !important;
                                rotate: none !important;
                                writing-mode: horizontal-tb !important;
                            }

                            .pdf-print-root,
                            .pdf-print-root * {
                                transform: none !important;
                                rotate: none !important;
                            }

                            a {
                                color: inherit !important;
                                text-decoration: none !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="pdf-print-root">${content}</div>
                    <script>
                        window.addEventListener('afterprint', () => {
                            window.close();
                        });
                    </script>
                </body>
            </html>
        `
    }

    const waitForPrintAssets = async (printWindow) => {
        try {
            if (printWindow.document.fonts?.ready) {
                await printWindow.document.fonts.ready
            }
        } catch (error) {
            console.warn('Print font readiness check failed:', error)
        }

        const images = Array.from(printWindow.document.images || [])
        await Promise.all(images.map((img) => {
            if (img.complete) return Promise.resolve()

            return new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
            })
        }))
    }

    const printFromHiddenFrame = async (html, fileName) => {
        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        iframe.style.visibility = 'hidden'
        iframe.setAttribute('aria-hidden', 'true')

        document.body.appendChild(iframe)

        const cleanup = () => {
            window.setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe)
                }
            }, 500)
        }

        try {
            const frameWindow = iframe.contentWindow
            if (!frameWindow) {
                throw new Error('Unable to access print frame')
            }

            frameWindow.document.open()
            frameWindow.document.write(html)
            frameWindow.document.close()
            frameWindow.document.title = fileName

            await waitForPrintAssets(frameWindow)
            await new Promise((resolve) => setTimeout(resolve, 250))

            frameWindow.onafterprint = cleanup
            frameWindow.focus()
            frameWindow.print()

            window.setTimeout(cleanup, 60000)
        } catch (error) {
            cleanup()
            throw error
        }
    }

    const handleDownloadPDF = async (order) => {
        setIsGeneratingPdf(order.id)
        const elementId = `invoice-content-${order.id}`
        const element = document.getElementById(elementId)

        if (!element) {
            setIsGeneratingPdf(null)
            return
        }

        try {
            const clonedElement = element.cloneNode(true)
            clonedElement.querySelectorAll('[data-html2canvas-ignore="true"]').forEach((node) => node.remove())
            const fileName = `BrandedUK_Order_${order.customer_name || 'Customer'}_${order.quote_id}`.replace(/\s+/g, '_')
            await printFromHiddenFrame(buildPrintDocument(clonedElement.outerHTML), fileName)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Failed to generate PDF')
        } finally {
            setIsGeneratingPdf(null)
        }
    }

    const toggleSelectOrder = (orderId) => {
        setSelectedOrders(prev => {
            const next = new Set(prev)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedOrders.size === sortedOrders.length) {
            setSelectedOrders(new Set())
        } else {
            setSelectedOrders(new Set(sortedOrders.map(o => o.id)))
        }
    }

    const handleBulkDelete = async () => {
        const count = selectedOrders.size
        if (count === 0) return
        const confirmed = window.confirm(`Delete ${count} selected order${count > 1 ? 's' : ''}? This cannot be undone.`)
        if (!confirmed) return

        setBulkDeleting(true)
        const failed = []
        for (const id of selectedOrders) {
            try {
                const response = await fetch(`${API_BASE}/api/admin/quotes/${id}`, { method: 'DELETE' })
                if (!response.ok) failed.push(id)
            } catch {
                failed.push(id)
            }
        }

        setOrders(prev => prev.filter(o => !selectedOrders.has(o.id) || failed.includes(o.id)))
        if (selectedOrders.has(expandedOrder) && !failed.includes(expandedOrder)) setExpandedOrder(null)
        setSelectedOrders(new Set(failed))
        setBulkDeleting(false)

        if (failed.length > 0) alert(`${failed.length} order(s) failed to delete.`)
    }

    const handleDeleteOrder = async (order) => {
        const confirmed = window.confirm(`Delete quote ${order.quote_id} for ${order.customer_name || 'this customer'}?`)
        if (!confirmed) return

        setDeletingOrder(order.id)

        try {
            const response = await fetch(`${API_BASE}/api/admin/quotes/${order.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete order')
            }

            setOrders(prev => prev.filter((item) => item.id !== order.id))

            if (expandedOrder === order.id) {
                setExpandedOrder(null)
            }
        } catch (error) {
            console.error('Error deleting order:', error)
            alert('Failed to delete order')
        } finally {
            setDeletingOrder(null)
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

    // Move parseQuoteData up to fix ReferenceError
    const parseQuoteData = (order) => {
        try {
            const data = typeof order.quote_data === 'string' ? JSON.parse(order.quote_data) : order.quote_data
            return {
                basket: data?.basket || [],
                customizations: data?.customizations || [],
                summary: data?.summary || {},
                logos: data?.logos || {}
            }
        } catch (e) {
            return { basket: [], customizations: [], summary: {}, logos: {} }
        }
    }

    const sortedOrders = [...orders]
        .filter(order => {
            const matchesSearch =
                (order.quote_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.customer_email || '').toLowerCase().includes(searchTerm.toLowerCase())

            return matchesSearch
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.created_at)
                const dateB = new Date(b.created_at)
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
            } else if (sortBy === 'price') {
                const priceA = parseFloat(a.total_amount) || parseQuoteData(a).summary.totalIncVat || 0
                const priceB = parseFloat(b.total_amount) || parseQuoteData(b).summary.totalIncVat || 0
                return sortOrder === 'desc' ? priceB - priceA : priceA - priceB
            }
            return 0
        })

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'Pending').length,
        processing: orders.filter(o => o.status === 'Processing').length,
        completed: orders.filter(o => o.status === 'Completed').length,
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
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider whitespace-nowrap
                            ${statusFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        All
                    </button>
                    {WORKFLOW_STATUSES.map((ws) => {
                        const style = statusFilter === ws.key
                            ? { backgroundColor: ws.bg, color: ws.text, borderColor: ws.border }
                            : {}
                        return (
                            <button
                                key={ws.key}
                                onClick={() => setStatusFilter(ws.key)}
                                style={style}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider whitespace-nowrap border
                                    ${statusFilter === ws.key
                                        ? 'shadow-md border-transparent'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                                    }`}
                            >
                                {ws.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="relative flex-1 flex items-center gap-3">
                    {/* Select All Checkbox */}
                    {sortedOrders.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className={`w-10 h-10 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all
                                ${selectedOrders.size === sortedOrders.length && sortedOrders.length > 0
                                    ? 'bg-primary border-primary text-white'
                                    : selectedOrders.size > 0
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-white border-slate-300 text-transparent hover:border-primary/50'
                                }`}
                            title={selectedOrders.size === sortedOrders.length ? 'Deselect all' : 'Select all'}
                        >
                            {selectedOrders.size === sortedOrders.length && sortedOrders.length > 0 ? (
                                <CheckCircle className="w-5 h-5" />
                            ) : selectedOrders.size > 0 ? (
                                <div className="w-3 h-0.5 bg-primary rounded-full" />
                            ) : (
                                <div className="w-5 h-5" />
                            )}
                        </button>
                    )}
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
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* Sort Controls */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort By:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (sortBy === 'date') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                    } else {
                                        setSortBy('date')
                                        setSortOrder('desc')
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all
                                    ${sortBy === 'date'
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Date</span>
                                {sortBy === 'date' && (
                                    sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    if (sortBy === 'price') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                    } else {
                                        setSortBy('price')
                                        setSortOrder('desc')
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all
                                    ${sortBy === 'price'
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                                    }`}
                            >
                                <PoundSterling className="w-4 h-4" />
                                <span>Price</span>
                                {sortBy === 'price' && (
                                    sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats - Mini Cards */}
                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</div>
                                <div className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 min-w-[140px]">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <PoundSterling className="w-5 h-5" />
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
            </div>

            {/* Bulk Action Bar */}
            {selectedOrders.size > 0 && (
                <div className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black text-lg">{selectedOrders.size}</div>
                        <span className="text-sm font-bold">{selectedOrders.size === 1 ? '1 order selected' : `${selectedOrders.size} orders selected`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedOrders(new Set())}
                            className="px-4 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                        >
                            Deselect All
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-xs font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                            {bulkDeleting ? 'Deleting...' : `Delete ${selectedOrders.size === 1 ? 'Order' : `${selectedOrders.size} Orders`}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Orders List */}
            <div className="space-y-4">
                {sortedOrders.length === 0 ? (
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
                    sortedOrders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig['Pending']
                        const StatusIcon = status.icon
                        const isExpanded = expandedOrder === order.id
                        const { basket, customizations, summary, logos } = parseQuoteData(order)

                        return (
                            <div
                                key={order.id}
                                id={`invoice-content-${order.id}`}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden group
                                    ${isExpanded ? 'border-primary shadow-xl shadow-primary/5 ring-1 ring-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
                            >
                                {/* Main Order Row */}
                                <div
                                    className="p-6 cursor-pointer"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">

                                        {/* Checkbox */}
                                        <button
                                            data-html2canvas-ignore="true"
                                            onClick={(e) => { e.stopPropagation(); toggleSelectOrder(order.id) }}
                                            className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all
                                                ${selectedOrders.has(order.id)
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'bg-white border-slate-300 text-transparent hover:border-primary/50'
                                                }`}
                                        >
                                            {selectedOrders.has(order.id) && <CheckCircle className="w-4 h-4" />}
                                        </button>

                                        {/* Status Badge */}
                                        <div className="flex items-center justify-between lg:w-48 shrink-0">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    data-html2canvas-ignore="true"
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors 
                                                        ${isExpanded ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}
                                                >
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                                                    <WorkflowDropdown
                                                        currentStatus={order.status}
                                                        onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                                                        disabled={updatingStatus === order.id}
                                                    />
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
                                            <div data-html2canvas-ignore="true" className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Workflow Status:</span>
                                                    <WorkflowDropdown
                                                        currentStatus={order.status}
                                                        onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                                                        disabled={updatingStatus === order.id}
                                                        size="md"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
                                                        <Mail className="w-3.5 h-3.5" /> Email Customer
                                                    </button>
                                                    <button
                                                        data-html2canvas-ignore="true"
                                                        onClick={() => handleDeleteOrder(order)}
                                                        disabled={deletingOrder === order.id}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        {deletingOrder === order.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownloadPDF(order, summary)}
                                                        disabled={isGeneratingPdf === order.id}
                                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                    >
                                                        {isGeneratingPdf === order.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Download className="w-3.5 h-3.5" /> 
                                                        )}
                                                        {isGeneratingPdf === order.id ? 'Generating...' : 'Download PDF'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1 sm:p-2 bg-slate-50">
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
                                                                {customizations.map((cust, idx) => {
                                                                    return (
                                                                        <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex-wrap">
                                                                            <div className="flex items-start gap-3 w-full sm:w-auto flex-1 min-w-0">
                                                                                <div className="w-8 h-8 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-primary">
                                                                                    {idx + 1}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-bold text-slate-800 text-sm">{cust.method} - {cust.position || cust.positionSlug}</div>
                                                                                    {(cust.quantity !== undefined || cust.unitPrice !== undefined) && (
                                                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                                            Qty: {cust.quantity || 1} {cust.unitPrice !== undefined ? `× £${cust.unitPrice}` : ''}
                                                                                        </div>
                                                                                    )}

                                                                                    {cust.text && (
                                                                                        <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                                                            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Custom Text</div>
                                                                                            <div className="text-sm font-semibold text-slate-800">"{cust.text}"</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {cust.lineTotal !== undefined && (
                                                                                <div className="sm:ml-auto w-full sm:w-auto font-black text-slate-800 text-sm pl-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                                                                                    £{Number(cust.lineTotal).toFixed(2)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Uploaded Logos Section */}
                                                    {(() => {
                                                        // Helper to resolve any logo reference to a displayable URL
                                                        const resolveLogoUrl = (logoRef) => {
                                                            if (!logoRef) return null
                                                            // String: could be data-URL or a regular URL
                                                            if (typeof logoRef === 'string') {
                                                                if (logoRef.startsWith('data:')) return logoRef
                                                                if (logoRef.startsWith('http')) return logoRef.replace('http://localhost:3004', API_BASE).replace('http://127.0.0.1:3004', API_BASE)
                                                                if (logoRef.startsWith('/')) return `${API_BASE}${logoRef}`
                                                                if (logoRef.length > 20) return `${API_BASE}/${logoRef}` // relative path
                                                                return null
                                                            }
                                                            // Object with various possible keys
                                                            if (typeof logoRef === 'object') {
                                                                if (logoRef.dataUrl) return logoRef.dataUrl
                                                                if (logoRef.dataURL) return logoRef.dataURL
                                                                if (logoRef.data) return logoRef.data
                                                                if (logoRef.src) return logoRef.src
                                                                if (logoRef.relativePath) return `${API_BASE}/${logoRef.relativePath}`
                                                                if (logoRef.url) return logoRef.url.replace('http://localhost:3004', API_BASE).replace('http://127.0.0.1:3004', API_BASE)
                                                                if (logoRef.path) return `${API_BASE}/${logoRef.path}`
                                                                // Try to find any string value that looks like a URL or data-URL
                                                                const vals = Object.values(logoRef)
                                                                for (const v of vals) {
                                                                    if (typeof v === 'string' && (v.startsWith('data:') || v.startsWith('http') || v.startsWith('/'))) {
                                                                        return v.startsWith('http') ? v.replace('http://localhost:3004', API_BASE).replace('http://127.0.0.1:3004', API_BASE) : v.startsWith('/') ? `${API_BASE}${v}` : v
                                                                    }
                                                                }
                                                            }
                                                            return null
                                                        }

                                                        const getLogoName = (logoRef) => {
                                                            if (!logoRef || typeof logoRef === 'string') return 'logo.png'
                                                            return logoRef.originalName || logoRef.fileName || logoRef.name || 'logo.png'
                                                        }

                                                        const allLogos = []
                                                        const seenUrls = new Set()

                                                        // From customizations
                                                        customizations.forEach((cust, idx) => {
                                                            // Try multiple possible logo fields
                                                            const candidates = [cust.logo, cust.logoData, cust.logoUrl, cust.logoDataUrl, cust.image]
                                                            let found = false
                                                            for (const candidate of candidates) {
                                                                const url = resolveLogoUrl(candidate)
                                                                if (url && !seenUrls.has(url.slice(0, 100))) {
                                                                    seenUrls.add(url.slice(0, 100))
                                                                    allLogos.push({
                                                                        url,
                                                                        name: getLogoName(candidate),
                                                                        position: cust.position || cust.positionSlug || `Logo ${idx + 1}`,
                                                                        isDataUrl: url.startsWith('data:')
                                                                    })
                                                                    found = true
                                                                    break
                                                                }
                                                            }
                                                            // Fallback: check logos object with position key
                                                            if (!found && cust.hasLogo && logos) {
                                                                const key = cust.positionSlug || cust.position
                                                                const logoObj = logos[key] || Object.values(logos).find(l => l) || null
                                                                const url = resolveLogoUrl(logoObj)
                                                                if (url && !seenUrls.has(url.slice(0, 100))) {
                                                                    seenUrls.add(url.slice(0, 100))
                                                                    allLogos.push({
                                                                        url,
                                                                        name: getLogoName(logoObj),
                                                                        position: cust.position || cust.positionSlug || `Logo ${idx + 1}`,
                                                                        isDataUrl: url.startsWith('data:')
                                                                    })
                                                                }
                                                            }
                                                        })

                                                        // From logos object directly
                                                        if (logos && typeof logos === 'object') {
                                                            Object.entries(logos).forEach(([key, logoRef]) => {
                                                                const url = resolveLogoUrl(logoRef)
                                                                if (url && !seenUrls.has(url.slice(0, 100))) {
                                                                    seenUrls.add(url.slice(0, 100))
                                                                    allLogos.push({
                                                                        url,
                                                                        name: getLogoName(logoRef),
                                                                        position: key,
                                                                        isDataUrl: url.startsWith('data:')
                                                                    })
                                                                }
                                                            })
                                                        }

                                                        if (allLogos.length === 0) return null

                                                        return (
                                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <ImageIcon className="w-4 h-4 text-primary" /> Uploaded Logos ({allLogos.length})
                                                                </h4>
                                                                <div className="space-y-4">
                                                                    {allLogos.map((logo, idx) => (
                                                                        <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                                                            <div className="p-2">
                                                                                <div className="w-full h-40 bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative">
                                                                                    <div className="absolute inset-0 opacity-5 pointer-events-none"
                                                                                        style={{ backgroundImage: 'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                                                                                    </div>
                                                                                    <img
                                                                                        src={logo.url}
                                                                                        alt={`Logo - ${logo.position}`}
                                                                                        className="max-w-[85%] max-h-[85%] object-contain relative z-10 drop-shadow-sm"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="px-4 py-3 space-y-2">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{logo.position}</span>
                                                                                </div>
                                                                                <div className="text-xs font-bold text-slate-600 truncate" title={logo.name}>{logo.name}</div>
                                                                                <button
                                                                                    data-html2canvas-ignore="true"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault()
                                                                                        if (logo.isDataUrl) {
                                                                                            // Convert data-URL to blob for download
                                                                                            const [header, b64] = logo.url.split(',')
                                                                                            const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
                                                                                            const byteStr = atob(b64)
                                                                                            const ab = new ArrayBuffer(byteStr.length)
                                                                                            const ia = new Uint8Array(ab)
                                                                                            for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
                                                                                            const blob = new Blob([ab], { type: mime })
                                                                                            const url = window.URL.createObjectURL(blob)
                                                                                            const a = document.createElement('a')
                                                                                            a.href = url
                                                                                            a.download = logo.name
                                                                                            document.body.appendChild(a)
                                                                                            a.click()
                                                                                            window.URL.revokeObjectURL(url)
                                                                                            document.body.removeChild(a)
                                                                                        } else {
                                                                                            fetch(logo.url)
                                                                                                .then(res => res.blob())
                                                                                                .then(blob => {
                                                                                                    const url = window.URL.createObjectURL(blob)
                                                                                                    const a = document.createElement('a')
                                                                                                    a.href = url
                                                                                                    a.download = logo.name
                                                                                                    document.body.appendChild(a)
                                                                                                    a.click()
                                                                                                    window.URL.revokeObjectURL(url)
                                                                                                    document.body.removeChild(a)
                                                                                                })
                                                                                                .catch(() => window.open(logo.url, '_blank'))
                                                                                        }
                                                                                    }}
                                                                                    className="w-full inline-flex justify-center items-center gap-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg px-4 py-2.5 rounded-xl transition-all"
                                                                                >
                                                                                    <Download className="w-4 h-4" /> Download Logo
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>

                                                {/* Right Column: Cost Breakdown & Order Items */}
                                                <div className="lg:col-span-2 space-y-8">
                                                    
                                                    {/* Cost Breakdown Section (Inspired by App Design) */}
                                                    <div className="bg-white rounded-[24px] border-2 border-primary/20 shadow-md p-6 lg:p-8">
                                                        <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                            Cost Breakdown
                                                        </h4>
                                                        
                                                        <div className="space-y-4">
                                                            {/* Garment Cost */}
                                                            {summary.garmentCost > 0 && (
                                                                <div className="bg-[#f97316] p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                                                    <div>
                                                                        <div className="font-bold text-lg mb-1.5 flex items-center gap-2">
                                                                            Garment Cost <span className="text-[10px] font-black opacity-90 uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">ex vat</span>
                                                                        </div>
                                                                        <div className="text-sm font-semibold opacity-90 flex gap-6">
                                                                            <span>Unit Price: £{summary.totalQuantity > 0 ? (summary.garmentCost / summary.totalQuantity).toFixed(2) : '0.00'}</span>
                                                                            <span>Qty: {summary.totalQuantity || 0}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-2xl font-black tracking-tight">£{summary.garmentCost?.toFixed(2)}</div>
                                                                </div>
                                                            )}

                                                            {/* Customizations Iteration */}
                                                            {customizations.map((cust, idx) => {
                                                                const custColors = ['#8b3f96', '#70864f']
                                                                return (
                                                                <div key={`cost-cust-${idx}`} style={{ backgroundColor: custColors[idx % custColors.length] }} className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                                                    <div>
                                                                        <div className="font-bold text-lg mb-1.5 flex items-center gap-2">
                                                                            {cust.position ? `${cust.position} ${cust.method}` : cust.method}
                                                                        </div>
                                                                        <div className="text-sm font-semibold opacity-90 flex gap-6">
                                                                            <span>Unit Price: £{cust.unitPrice?.toFixed(2)}</span>
                                                                            <span>Qty: {cust.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-2xl font-black tracking-tight">£{cust.lineTotal?.toFixed(2)}</div>
                                                                </div>
                                                                )
                                                            })}
                                                            
                                                            {/* Digitizing Fee (if any) */}
                                                            {summary.digitizingFee > 0 && (
                                                                <div className="bg-[#b15d24] p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                                                    <div>
                                                                        <div className="font-bold text-lg mb-1.5 flex items-center gap-2">
                                                                            Digitisation / Setup Fee
                                                                        </div>
                                                                        <div className="text-sm font-semibold opacity-90">One-time template setup fee</div>
                                                                    </div>
                                                                    <div className="text-2xl font-black tracking-tight">£{summary.digitizingFee?.toFixed(2)}</div>
                                                                </div>
                                                            )}

                                                            {/* Total Cost Block */}
                                                            <div className="bg-[#cda42c] p-5 lg:p-6 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mt-6">
                                                                <div className="font-black text-xl flex items-center gap-2">
                                                                    Total Cost
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <div className="text-2xl lg:text-3xl font-black tracking-tight flex items-baseline gap-1">
                                                                        £{(summary.totalExVat || summary.subtotal)?.toFixed(2)}
                                                                        <span className="text-xs font-bold opacity-70 uppercase">ex vat</span>
                                                                    </div>
                                                                    {summary.totalIncVat > 0 && (
                                                                        <div className="text-sm font-bold opacity-60 mt-0.5">
                                                                            £{summary.totalIncVat?.toFixed(2)} inc VAT
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-primary" /> Order Items ({basket.length})
                                                            </h4>
                                                        </div>
                                                        <div className="divide-y divide-slate-100">
                                                            {basket.map((item, idx) => (
                                                                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                                                    <a 
                                                                        href={`https://www.brandeduk.com/product?code=${item.code}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 hover:border-primary transition-colors cursor-pointer relative block"
                                                                    >
                                                                        {item.image ? (
                                                                            <img src={typeof item.image === 'string' ? item.image : item.image?.url} alt={item.code} className="w-full h-full object-contain absolute inset-0 m-auto p-1" />
                                                                        ) : (
                                                                            <Package className="w-6 h-6 text-slate-300 absolute inset-0 m-auto" />
                                                                        )}
                                                                    </a>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <div>
                                                                                <a href={`https://www.brandeduk.com/product?code=${item.code}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 text-sm hover:text-primary transition-colors inline-block decoration-2 hover:underline">
                                                                                    {item.name}
                                                                                </a>
                                                                                <div className="text-xs font-bold text-slate-400 mt-0.5">{item.code} • {item.color}</div>
                                                                            </div>
                                                                            <div className="text-right shrink-0 ml-2">
                                                                                <div className="font-bold text-slate-900">£{item.itemTotal?.toFixed(2)}</div>
                                                                                <div className="text-xs text-slate-500">£{item.unitPrice?.toFixed(2)} ea</div>
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
