import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
    Image as ImageIcon,
    Send,
    BadgePercent,
    ArrowLeft,
    ChevronRight,
    UserX
} from 'lucide-react'

import { API_BASE } from '../config'
import WorkflowDropdown, { WORKFLOW_STATUSES, getStatusStyle } from '../components/WorkflowDropdown'

const Orders = () => {
    const navigate = useNavigate()
    const { orderId } = useParams()
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
    const [deletingCustomerKey, setDeletingCustomerKey] = useState(null)
    const [quoteAdjustments, setQuoteAdjustments] = useState({})
    const [sendingQuote, setSendingQuote] = useState(null)
    const [quoteActionMessage, setQuoteActionMessage] = useState(null)
    const [loadedRevisionOrderIds, setLoadedRevisionOrderIds] = useState(new Set())
    const [revisionTotals, setRevisionTotals] = useState({})
    const requestedOpenOrderId = searchParams.get('open')
    const isDetailPage = Boolean(orderId)

    useEffect(() => {
        fetchOrders()
    }, [statusFilter])

    useEffect(() => {
        if (!requestedOpenOrderId || orders.length === 0) return

        const targetOrder = orders.find((order) => String(order.id) === String(requestedOpenOrderId))
        if (!targetOrder) return

        navigate(`/orders/${encodeURIComponent(targetOrder.quote_id || targetOrder.id)}`, { replace: true })
    }, [orders, requestedOpenOrderId, navigate])

    useEffect(() => {
        if (!orderId || orders.length === 0) return

        const targetOrder = orders.find((order) => (
            String(order.id) === String(orderId) || String(order.quote_id) === String(orderId)
        ))
        if (!targetOrder) return

        setExpandedOrder(targetOrder.id)
        hydrateLatestQuoteRevision(targetOrder)
    }, [orders, orderId])

    useEffect(() => {
        if (!quoteActionMessage) return
        const timeoutId = window.setTimeout(() => setQuoteActionMessage(null), 4200)
        return () => window.clearTimeout(timeoutId)
    }, [quoteActionMessage])

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

    const PDF_SNAPSHOT_WIDTH = 1120
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
                            size: A4 landscape;
                        }

                        @media print {
                            @page {
                                size: A4 landscape;
                                margin: 0;
                            }

                            html, body {
                                background: #ffffff;
                                width: 100%;
                                height: auto;
                                overflow: visible;
                            }

                            body {
                                padding: 8px;
                            }

                            .pdf-print-root {
                                width: ${PDF_SNAPSHOT_WIDTH}px;
                                min-width: ${PDF_SNAPSHOT_WIDTH}px;
                                max-width: ${PDF_SNAPSHOT_WIDTH}px;
                                margin: 0 auto;
                                transform: none !important;
                                rotate: none !important;
                                writing-mode: horizontal-tb !important;
                                break-inside: avoid !important;
                                page-break-inside: avoid !important;
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

                            .quote-admin-only {
                                display: none !important;
                            }

                            .quote-print-shell {
                                border: 0 !important;
                                box-shadow: none !important;
                                background: #ffffff !important;
                            }

                            .quote-print-content {
                                padding: 0 !important;
                            }

                            .quote-print-layout {
                                display: grid !important;
                                grid-template-columns: 31% minmax(0, 69%) !important;
                                gap: 14px !important;
                                padding: 0 !important;
                                background: #ffffff !important;
                                align-items: start !important;
                                break-inside: avoid !important;
                                page-break-inside: avoid !important;
                            }

                            .quote-print-sidebar,
                            .quote-print-main {
                                min-width: 0 !important;
                            }

                            .quote-print-sidebar > * + *,
                            .quote-print-main > * + * {
                                margin-top: 12px !important;
                            }

                            .quote-print-card {
                                padding: 12px !important;
                                border-radius: 12px !important;
                                box-shadow: none !important;
                                break-inside: avoid;
                            }

                            .quote-print-card h4 {
                                margin-bottom: 8px !important;
                            }

                            .quote-print-card .space-y-3 > * + *,
                            .quote-print-card .space-y-4 > * + * {
                                margin-top: 7px !important;
                            }

                            .quote-print-logo-preview {
                                height: 112px !important;
                            }

                            .quote-print-cost {
                                padding: 14px !important;
                                border-radius: 14px !important;
                                box-shadow: none !important;
                                break-inside: avoid;
                            }

                            .quote-print-cost h4 {
                                margin-bottom: 10px !important;
                                font-size: 18px !important;
                            }

                            .quote-print-cost .space-y-4 > * + * {
                                margin-top: 8px !important;
                            }

                            .quote-print-cost .p-5,
                            .quote-print-cost .lg\\:p-6 {
                                padding: 11px !important;
                            }

                            .quote-print-cost .text-2xl,
                            .quote-print-cost .lg\\:text-3xl {
                                font-size: 19px !important;
                                line-height: 1.15 !important;
                            }

                            .quote-print-items {
                                box-shadow: none !important;
                                border-radius: 12px !important;
                                break-inside: avoid;
                            }

                            .quote-print-items .p-4,
                            .quote-print-items .p-6 {
                                padding: 10px !important;
                            }

                            .quote-print-items .w-16.h-16 {
                                width: 48px !important;
                                height: 48px !important;
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

    const getCustomerKey = (order) => {
        const email = String(order.customer_email || '').trim().toLowerCase()
        if (email) return `email:${email}`
        return `name:${String(order.customer_name || '').trim().toLowerCase()}`
    }

    const handleDeleteCustomerOrders = async (order) => {
        const customerKey = getCustomerKey(order)
        setDeletingCustomerKey(customerKey)

        let allOrders = orders
        try {
            const response = await fetch(`${API_BASE}/api/admin/quotes?limit=10000`)
            if (response.ok) {
                const data = await response.json()
                allOrders = data.items || orders
            }
        } catch (error) {
            console.warn('Could not load the full customer order list before deletion:', error)
        }

        const customerOrders = allOrders.filter((item) => getCustomerKey(item) === customerKey)
        if (customerOrders.length === 0) {
            setDeletingCustomerKey(null)
            return
        }
        const customerLabel = order.customer_email || order.customer_name || 'this customer'
        const confirmed = window.confirm(
            `Delete all ${customerOrders.length} order${customerOrders.length === 1 ? '' : 's'} for ${customerLabel}? This cannot be undone.`
        )
        if (!confirmed) {
            setDeletingCustomerKey(null)
            return
        }

        const failedIds = []

        await Promise.all(customerOrders.map(async (customerOrder) => {
            try {
                const response = await fetch(`${API_BASE}/api/admin/quotes/${customerOrder.id}`, { method: 'DELETE' })
                if (!response.ok) failedIds.push(customerOrder.id)
            } catch {
                failedIds.push(customerOrder.id)
            }
        }))

        const customerOrderIds = new Set(customerOrders.map((item) => item.id))
        setOrders((prev) => prev.filter((item) => !customerOrderIds.has(item.id) || failedIds.includes(item.id)))
        setSelectedOrders((prev) => {
            const next = new Set(prev)
            customerOrders.forEach((item) => {
                if (!failedIds.includes(item.id)) next.delete(item.id)
            })
            return next
        })
        setDeletingCustomerKey(null)

        setQuoteActionMessage({
            type: failedIds.length > 0 ? 'error' : 'success',
            message: failedIds.length > 0
                ? `${customerOrders.length - failedIds.length} orders deleted. ${failedIds.length} could not be deleted.`
                : `Deleted all ${customerOrders.length} orders for ${customerLabel}.`
        })
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

    const money = (value) => {
        const amount = Number(value)
        return Number.isFinite(amount) ? amount : 0
    }

    const formatMoney = (value) => `£${money(value).toFixed(2)}`

    const getBasketQuantity = (item) => {
        if (item?.quantity !== undefined) return money(item.quantity)
        if (item?.sizes && typeof item.sizes === 'object') {
            return Object.values(item.sizes).reduce((total, qty) => total + money(qty), 0)
        }
        return 1
    }

    const getBasketTotal = (basket) => basket.reduce((total, item) => {
        const quantity = getBasketQuantity(item)
        return total + money(item.itemTotal ?? item.lineTotal ?? item.totalPrice ?? item.total ?? money(item.unitPrice) * quantity)
    }, 0)

    const getAdjustedAmount = (orderId, lineKey, originalAmount) => {
        const rawValue = quoteAdjustments[String(orderId)]?.[lineKey]
        if (rawValue === undefined || rawValue === '') return money(originalAmount)

        const parsed = Number(rawValue)
        return Number.isFinite(parsed) ? Math.max(0, parsed) : money(originalAmount)
    }

    const updateQuoteAmount = (orderId, lineKey, value) => {
        setQuoteAdjustments((prev) => ({
            ...prev,
            [String(orderId)]: {
                ...(prev[String(orderId)] || {}),
                [lineKey]: value
            }
        }))
    }

    const resetQuoteAdjustments = (orderId) => {
        setQuoteAdjustments((prev) => {
            const next = { ...prev }
            delete next[String(orderId)]
            return next
        })
    }

    const getRevisionSnapshot = (revision) => {
        const snapshot = revision?.snapshot_json ?? revision?.snapshotJson ?? revision?.snapshot
        if (!snapshot) return null

        if (typeof snapshot === 'string') {
            try {
                return JSON.parse(snapshot)
            } catch {
                return null
            }
        }

        return snapshot
    }

    const getLatestRevision = (items = []) => {
        return [...items].sort((a, b) => {
            const dateA = new Date(a.sent_at || a.sentAt || a.created_at || a.createdAt || 0)
            const dateB = new Date(b.sent_at || b.sentAt || b.created_at || b.createdAt || 0)
            return dateB - dateA
        })[0]
    }

    const buildAdjustmentsFromSnapshot = (snapshot) => {
        const adjustments = {}
        const totals = snapshot?.totals || {}

        if (totals.garmentAdjustedLineTotal !== undefined && totals.garmentAdjustedLineTotal !== null) {
            adjustments['garment-cost'] = String(money(totals.garmentAdjustedLineTotal).toFixed(2))
        }

        if (totals.digitizingAdjustedLineTotal !== undefined && totals.digitizingAdjustedLineTotal !== null) {
            adjustments['digitizing-fee'] = String(money(totals.digitizingAdjustedLineTotal).toFixed(2))
        }

        ;(snapshot?.customizations || []).forEach((customization, idx) => {
            if (customization.adjustedLineTotal !== undefined && customization.adjustedLineTotal !== null) {
                adjustments[`customization-${idx}`] = String(money(customization.adjustedLineTotal).toFixed(2))
            }
        })

        return adjustments
    }

    const getRevisionTotalsFromMetadata = (revision) => {
        if (!revision) return null

        const originalTotalIncVat = money(revision.original_total ?? revision.originalTotal ?? revision.originalTotalIncVat)
        const totalIncVat = money(revision.adjusted_total ?? revision.adjustedTotal ?? revision.totalIncVat)
        const discountAmount = money(revision.discount_amount ?? revision.discountAmount)
        const discountPercent = money(revision.discount_percent ?? revision.discountPercent)

        if (!originalTotalIncVat && !totalIncVat) return null

        return {
            originalTotalIncVat,
            totalIncVat,
            discountAmount,
            discountPercent,
            hasChanges: Math.abs(originalTotalIncVat - totalIncVat) > 0.009
        }
    }

    const hydrateLatestQuoteRevision = async (order) => {
        const orderKey = String(order.id)
        if (loadedRevisionOrderIds.has(orderKey)) return

        setLoadedRevisionOrderIds((prev) => new Set([...prev, orderKey]))

        try {
            const quoteIdentifier = encodeURIComponent(order.id || order.quote_id)
            const response = await fetch(`${API_BASE}/api/admin/quotes/${quoteIdentifier}/revisions`)
            if (!response.ok) return

            const data = await response.json()
            const latestRevision = getLatestRevision(data.data?.items || [])
            const metadataTotals = getRevisionTotalsFromMetadata(latestRevision)
            if (metadataTotals) {
                setRevisionTotals((prev) => ({
                    ...prev,
                    [orderKey]: metadataTotals
                }))
                setOrders((prev) => prev.map((item) => (
                    String(item.id) === orderKey ? { ...item, status: 'Quote Sent' } : item
                )))
            }

            let snapshot = getRevisionSnapshot(latestRevision)
            if (!snapshot && latestRevision?.id) {
                const detailResponse = await fetch(`${API_BASE}/api/admin/quotes/${quoteIdentifier}/revisions/${encodeURIComponent(latestRevision.id)}`)
                if (detailResponse.ok) {
                    const detailData = await detailResponse.json()
                    snapshot = getRevisionSnapshot(detailData.data)
                }
            }
            if (!snapshot) return

            const adjustments = buildAdjustmentsFromSnapshot(snapshot)
            const snapshotTotals = snapshot.totals
            if (snapshotTotals) {
                setRevisionTotals((prev) => ({
                    ...prev,
                    [orderKey]: {
                        originalTotalIncVat: money(snapshotTotals.originalTotalIncVat),
                        totalIncVat: money(snapshotTotals.totalIncVat),
                        discountAmount: money(snapshotTotals.discountAmount),
                        discountPercent: money(snapshotTotals.discountPercent),
                        hasChanges: Math.abs(money(snapshotTotals.originalTotalIncVat) - money(snapshotTotals.totalIncVat)) > 0.009
                    }
                }))
            }
            if (Object.keys(adjustments).length === 0) return

            setQuoteAdjustments((prev) => ({
                ...prev,
                [orderKey]: {
                    ...(prev[orderKey] || {}),
                    ...adjustments
                }
            }))
            setOrders((prev) => prev.map((item) => (
                String(item.id) === orderKey ? { ...item, status: 'Quote Sent' } : item
            )))
        } catch (error) {
            console.error('Error loading quote revision:', error)
            setLoadedRevisionOrderIds((prev) => {
                const next = new Set(prev)
                next.delete(orderKey)
                return next
            })
        }
    }

    const buildQuotePreview = (order, basket, customizations, summary) => {
        const orderId = String(order.id)
        const lines = []
        const garmentOriginal = money(summary.garmentCost ?? getBasketTotal(basket))

        if (garmentOriginal > 0) {
            lines.push({
                key: 'garment-cost',
                type: 'garment',
                label: 'Garment Cost',
                description: `${money(summary.totalQuantity) || basket.reduce((total, item) => total + getBasketQuantity(item), 0)} item${(money(summary.totalQuantity) || basket.length) === 1 ? '' : 's'}`,
                original: garmentOriginal,
                adjusted: getAdjustedAmount(orderId, 'garment-cost', garmentOriginal)
            })
        }

        customizations.forEach((cust, idx) => {
            const original = money(cust.lineTotal ?? money(cust.unitPrice) * money(cust.quantity || 1))
            if (original <= 0) return

            const labelParts = [cust.position || cust.positionSlug, cust.method].filter(Boolean)
            lines.push({
                key: `customization-${idx}`,
                type: 'customization',
                label: labelParts.length ? labelParts.join(' ') : `Customization ${idx + 1}`,
                description: `Qty ${cust.quantity || 1}${cust.unitPrice !== undefined ? ` at ${formatMoney(cust.unitPrice)}` : ''}`,
                original,
                adjusted: getAdjustedAmount(orderId, `customization-${idx}`, original)
            })
        })

        const digitizingOriginal = money(summary.digitizingFee)
        if (digitizingOriginal > 0) {
            lines.push({
                key: 'digitizing-fee',
                type: 'setup',
                label: 'Digitisation / Setup Fee',
                description: 'One-time template setup fee',
                original: digitizingOriginal,
                adjusted: getAdjustedAmount(orderId, 'digitizing-fee', digitizingOriginal)
            })
        }

        const originalSubtotalFromLines = lines.reduce((total, line) => total + line.original, 0)
        const adjustedSubtotalFromLines = lines.reduce((total, line) => total + line.adjusted, 0)
        const fallbackSubtotal = money(summary.totalExVat ?? summary.subtotal)
        const originalSubtotal = originalSubtotalFromLines || fallbackSubtotal
        const adjustedSubtotal = adjustedSubtotalFromLines || fallbackSubtotal
        const vatRate = Number.isFinite(Number(summary.vatRate))
            ? Number(summary.vatRate)
            : (originalSubtotal > 0 && summary.vatAmount !== undefined ? money(summary.vatAmount) / originalSubtotal : 0.2)
        const vatAmount = adjustedSubtotal * vatRate
        const totalIncVat = adjustedSubtotal + vatAmount
        const originalTotalIncVat = money(summary.totalIncVat) || (originalSubtotal * (1 + vatRate))
        const discountAmount = Math.max(0, originalTotalIncVat - totalIncVat)
        const discountPercent = originalTotalIncVat > 0 ? (discountAmount / originalTotalIncVat) * 100 : 0
        const hasChanges = lines.some((line) => Math.abs(line.original - line.adjusted) > 0.009)
        const savedTotals = revisionTotals[orderId]

        return {
            lines,
            originalSubtotal,
            adjustedSubtotal,
            vatRate,
            vatAmount,
            totalIncVat: savedTotals?.totalIncVat ?? totalIncVat,
            originalTotalIncVat: savedTotals?.originalTotalIncVat ?? originalTotalIncVat,
            discountAmount: savedTotals?.discountAmount ?? discountAmount,
            discountPercent: savedTotals?.discountPercent ?? discountPercent,
            hasChanges: savedTotals?.hasChanges ?? hasChanges
        }
    }

    const buildQuoteSnapshot = (order, basket, customizations, logos, quotePreview) => {
        const lineByKey = quotePreview.lines.reduce((acc, line) => {
            acc[line.key] = line
            return acc
        }, {})
        const garmentLine = lineByKey['garment-cost']
        const digitizingLine = lineByKey['digitizing-fee']
        const productOriginalTotal = basket.reduce((total, item) => (
            total + money(item.itemTotal ?? item.lineTotal ?? item.totalPrice ?? item.total ?? money(item.unitPrice) * getBasketQuantity(item))
        ), 0)

        return {
            customer: {
                name: order.customer_name || '',
                email: order.customer_email || '',
                phone: order.customer_phone || '',
                company: order.customer_company || '',
                address: order.customer_address || ''
            },
            products: basket.map((item) => {
                const originalLineTotal = money(item.itemTotal ?? item.lineTotal ?? item.totalPrice ?? item.total ?? money(item.unitPrice) * getBasketQuantity(item))
                const adjustedLineTotal = garmentLine && productOriginalTotal > 0
                    ? (originalLineTotal / productOriginalTotal) * garmentLine.adjusted
                    : originalLineTotal

                return {
                    code: item.code || '',
                    name: item.name || '',
                    colour: item.color || item.colour || '',
                    image: typeof item.image === 'string' ? item.image : item.image?.url || '',
                    sizes: item.sizes || (item.size ? { [item.size]: item.quantity || 1 } : {}),
                    quantity: getBasketQuantity(item),
                    unitPrice: money(item.unitPrice),
                    originalLineTotal,
                    adjustedLineTotal
                }
            }),
            customizations: customizations.map((cust, idx) => {
                const line = lineByKey[`customization-${idx}`]
                return {
                    method: cust.method || '',
                    position: cust.position || cust.positionSlug || '',
                    quantity: money(cust.quantity || 1),
                    unitPrice: money(cust.unitPrice),
                    originalLineTotal: money(cust.lineTotal ?? money(cust.unitPrice) * money(cust.quantity || 1)),
                    adjustedLineTotal: line ? line.adjusted : money(cust.lineTotal ?? money(cust.unitPrice) * money(cust.quantity || 1)),
                    text: cust.text || ''
                }
            }),
            logos: logos || {},
            totals: {
                originalSubtotal: quotePreview.originalSubtotal,
                adjustedSubtotal: quotePreview.adjustedSubtotal,
                vatRate: quotePreview.vatRate,
                vatAmount: quotePreview.vatAmount,
                originalTotalIncVat: quotePreview.originalTotalIncVat,
                totalIncVat: quotePreview.totalIncVat,
                discountAmount: quotePreview.discountAmount,
                discountPercent: quotePreview.discountPercent,
                garmentOriginalLineTotal: garmentLine?.original ?? 0,
                garmentAdjustedLineTotal: garmentLine?.adjusted ?? 0,
                digitizingOriginalLineTotal: digitizingLine?.original ?? 0,
                digitizingAdjustedLineTotal: digitizingLine?.adjusted ?? 0
            }
        }
    }

    const handleSendQuote = async (order, basket, customizations, logos, quotePreview) => {
        setSendingQuote(order.id)

        const payload = buildQuoteSnapshot(order, basket, customizations, logos, quotePreview)

        try {
            const response = await fetch(`${API_BASE}/api/admin/quotes/${encodeURIComponent(order.id || order.quote_id)}/send-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await response.json().catch(() => ({}))

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'Failed to send quote')
            }

            setOrders((prev) => prev.map((item) => (
                item.id === order.id ? { ...item, status: data.data?.status || 'Quote Sent' } : item
            )))
            setRevisionTotals((prev) => ({
                ...prev,
                [String(order.id)]: {
                    originalTotalIncVat: quotePreview.originalTotalIncVat,
                    totalIncVat: quotePreview.totalIncVat,
                    discountAmount: quotePreview.discountAmount,
                    discountPercent: quotePreview.discountPercent,
                    hasChanges: quotePreview.hasChanges
                }
            }))
            setLoadedRevisionOrderIds((prev) => {
                const next = new Set(prev)
                next.delete(String(order.id))
                return next
            })
            setQuoteActionMessage({
                type: 'success',
                message: `Quote sent to ${data.data?.sentTo || payload.customer.email}.`
            })
        } catch (error) {
            console.error('Error sending quote:', error)
            setQuoteActionMessage({
                type: 'error',
                message: error.message || 'Could not send quote. Please try again.'
            })
        } finally {
            setSendingQuote(null)
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
    const detailOrders = isDetailPage
        ? sortedOrders.filter((order) => (
            String(order.id) === String(orderId) || String(order.quote_id) === String(orderId)
        ))
        : []

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
        <div className={`${isDetailPage ? 'max-w-7xl space-y-8' : 'max-w-[1500px] space-y-5'} mx-auto pb-12`}>
            {quoteActionMessage && (
                <div className="fixed bottom-8 right-8 z-[120] w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-black text-slate-900 uppercase tracking-widest">Quote action</div>
                            <p className="text-sm font-semibold text-slate-600 mt-1 leading-relaxed">{quoteActionMessage.message}</p>
                        </div>
                        <button
                            onClick={() => setQuoteActionMessage(null)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className={`flex flex-col md:flex-row justify-between ${isDetailPage ? 'md:items-end gap-6' : 'md:items-center gap-4'}`}>
                {isDetailPage ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-sm transition-all"
                            title="Back to orders"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Order Detail</div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{orderId}</h1>
                        </div>
                    </div>
                ) : (
                    <>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quote Requests</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Review and manage customer quote requests.</p>
                        </div>

                        <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto max-w-full">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider whitespace-nowrap
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
                                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider whitespace-nowrap border
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
                    </>
                )}
            </div>

            {!isDetailPage && (
                <>
            {/* Filters & Search Row */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="relative flex-1 flex items-center gap-2">
                    {/* Select All Checkbox */}
                    {sortedOrders.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className={`w-8 h-8 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all
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
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, Name or Email..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-sm font-semibold text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Sort Controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort By:</span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => {
                                    if (sortBy === 'date') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                    } else {
                                        setSortBy('date')
                                        setSortOrder('desc')
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all
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
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all
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
                    <div className="flex gap-2">
                        <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 min-w-[100px]">
                            <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</div>
                                <div className="text-sm font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</div>
                            </div>
                        </div>
                        <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 min-w-[115px]">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <PoundSterling className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</div>
                                <div className="text-sm font-black text-slate-800">
                                    £{orders.reduce((acc, curr) => {
                                        const { basket, customizations, summary } = parseQuoteData(curr)
                                        const preview = buildQuotePreview(curr, basket, customizations, summary)
                                        const amount = preview.totalIncVat || parseFloat(curr.total_amount) || summary.totalIncVat || 0
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
                </>
            )}

            {/* Orders List */}
            <div className="space-y-4">
                {!isDetailPage ? (
                    sortedOrders.length === 0 ? (
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
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1080px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="w-12 px-3 py-3 text-left">
                                                <button
                                                    onClick={toggleSelectAll}
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                        selectedOrders.size === sortedOrders.length
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'bg-white border-slate-300 text-transparent'
                                                    }`}
                                                    title="Select all"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </th>
                                            {['Quote', 'Customer', 'Company', 'Products', 'Date', 'Status', 'Total', ''].map((heading) => (
                                                <th key={heading || 'action'} className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedOrders.map((order) => {
                                            const { basket, customizations, summary } = parseQuoteData(order)
                                            const quotePreview = buildQuotePreview(order, basket, customizations, summary)
                                            const displayTotal = quotePreview.totalIncVat || parseFloat(order.total_amount) || summary.totalIncVat || 0
                                            const statusStyle = getStatusStyle(order.status)
                                            const quantity = basket.reduce((total, item) => total + getBasketQuantity(item), 0)
                                            const productNames = basket.map((item) => item.name || item.code).filter(Boolean)
                                            const primaryProductName = productNames[0] || 'No product details'
                                            const additionalProductCount = Math.max(0, productNames.length - 1)
                                            const customerKey = getCustomerKey(order)
                                            const customerOrderCount = orders.filter((item) => getCustomerKey(item) === customerKey).length
                                            const isDeletingCustomer = deletingCustomerKey === customerKey

                                            return (
                                                <tr
                                                    key={order.id}
                                                    onClick={() => navigate(`/orders/${encodeURIComponent(order.quote_id || order.id)}`)}
                                                    className="group cursor-pointer hover:bg-primary/[0.025] transition-colors"
                                                >
                                                    <td className="px-3 py-3">
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                toggleSelectOrder(order.id)
                                                            }}
                                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                selectedOrders.has(order.id)
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : 'bg-white border-slate-300 text-transparent group-hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="font-mono text-[11px] font-black text-slate-800 max-w-[180px] truncate">{order.quote_id}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">#{order.id}</div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px]">
                                                                {order.customer_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-black text-slate-900">{order.customer_name || 'Unknown customer'}</div>
                                                                <div className="text-[10px] font-medium text-slate-400 max-w-[190px] truncate">{order.customer_email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-xs font-bold text-slate-600 max-w-[160px] truncate">{order.customer_company || '—'}</td>
                                                    <td className="px-3 py-3 max-w-[230px]">
                                                        <div className="text-xs font-black text-slate-800 truncate" title={productNames.join(', ')}>{primaryProductName}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                            Qty {quantity || basket.length}
                                                            {additionalProductCount > 0 ? ` · +${additionalProductCount} more product${additionalProductCount === 1 ? '' : 's'}` : ''}
                                                            {customizations.length > 0 ? ` · ${customizations.length} design` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-xs font-bold text-slate-700">{new Date(order.created_at).toLocaleDateString()}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span
                                                            className="inline-flex px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider"
                                                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
                                                        >
                                                            {statusStyle.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-sm font-black text-slate-900">{formatMoney(displayTotal)}</div>
                                                        {quotePreview.hasChanges && <div className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">Adjusted</div>}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    handleDeleteCustomerOrders(order)
                                                                }}
                                                                disabled={isDeletingCustomer}
                                                                title={`Delete all ${customerOrderCount} order${customerOrderCount === 1 ? '' : 's'} for this customer`}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                                            >
                                                                {isDeletingCustomer ? (
                                                                    <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                                                                ) : (
                                                                    <UserX className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    navigate(`/orders/${encodeURIComponent(order.quote_id || order.id)}`)
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white text-[10px] font-black transition-all"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : detailOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
                        <h3 className="text-xl font-black text-slate-800 mb-2">Order not found</h3>
                        <p className="text-slate-500">This order may have been removed or the link is incorrect.</p>
                    </div>
                ) : (
                    detailOrders.map((order) => {
                        const isExpanded = true
                        const { basket, customizations, summary, logos } = parseQuoteData(order)
                        const quotePreview = buildQuotePreview(order, basket, customizations, summary)
                        const displayTotal = quotePreview.totalIncVat || parseFloat(order.total_amount) || summary.totalIncVat || 0

                        return (
                            <div
                                key={order.id}
                                id={`invoice-content-${order.id}`}
                                className={`quote-print-shell bg-white rounded-2xl border transition-all duration-300 overflow-hidden group
                                    ${isExpanded ? 'border-primary shadow-xl shadow-primary/5 ring-1 ring-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
                            >
                                {/* Main Order Row */}
                                <div data-html2canvas-ignore="true" className="p-6">
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
                                                <div className="text-lg font-black text-slate-900">{formatMoney(displayTotal)}</div>
                                                {quotePreview.hasChanges && (
                                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">Adjusted</div>
                                                )}
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
                                                <div className="text-xl font-black text-slate-900">{formatMoney(displayTotal)}</div>
                                                {quotePreview.hasChanges && (
                                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">Adjusted quote</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50">
                                        <div className="quote-print-content p-8">
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
                                                    <button
                                                        data-html2canvas-ignore="true"
                                                        onClick={() => handleSendQuote(order, basket, customizations, logos, quotePreview)}
                                                        disabled={sendingQuote === order.id}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/15 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {sendingQuote === order.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Send className="w-3.5 h-3.5" />
                                                        )}
                                                        {sendingQuote === order.id ? 'Preparing...' : 'Send Quote'}
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

                                            <div data-html2canvas-ignore="true" className="quote-admin-only mb-8 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                    <div className="grid grid-cols-3 gap-3 w-full lg:max-w-[520px]">
                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Original</div>
                                                            <div className="text-lg font-black text-slate-500 line-through">{formatMoney(quotePreview.originalTotalIncVat)}</div>
                                                        </div>
                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">New Total</div>
                                                            <div className="text-lg font-black text-slate-900">{formatMoney(quotePreview.totalIncVat)}</div>
                                                        </div>
                                                        <div className="bg-slate-900 text-white rounded-xl p-3">
                                                            <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">Discount</div>
                                                            <div className="text-lg font-black">
                                                                {quotePreview.discountAmount > 0 ? `${quotePreview.discountPercent.toFixed(0)}% off` : 'No change'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {quotePreview.hasChanges && (
                                                        <button
                                                            type="button"
                                                            onClick={() => resetQuoteAdjustments(order.id)}
                                                            className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                                                        >
                                                            Reset price edits
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="quote-print-layout grid grid-cols-1 lg:grid-cols-3 gap-8 p-1 sm:p-2 bg-slate-50">
                                                {/* Left Column: Customer & Details */}
                                                <div className="quote-print-sidebar space-y-6">
                                                    <div className="quote-print-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
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
                                                        <div className="quote-print-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
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
                                                            <div className="quote-print-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <ImageIcon className="w-4 h-4 text-primary" /> Uploaded Logos ({allLogos.length})
                                                                </h4>
                                                                <div className="space-y-4">
                                                                    {allLogos.map((logo, idx) => (
                                                                        <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                                                            <div className="p-2">
                                                                                <div className="quote-print-logo-preview w-full h-40 bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative">
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
                                                <div className="quote-print-main lg:col-span-2 space-y-8">
                                                    
                                                    {/* Cost Breakdown Section (Inspired by App Design) */}
                                                    <div className="quote-print-cost bg-white rounded-[24px] border-2 border-primary/20 shadow-md p-6 lg:p-8">
                                                        <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                            Cost Breakdown
                                                        </h4>
                                                        
                                                        <div className="space-y-4">
                                                            {quotePreview.lines.map((line, idx) => {
                                                                const color = line.type === 'garment'
                                                                    ? '#f97316'
                                                                    : line.type === 'setup'
                                                                        ? '#b15d24'
                                                                        : ['#8b3f96', '#70864f'][idx % 2]
                                                                const lineDiscount = Math.max(0, line.original - line.adjusted)
                                                                const lineDiscountPercent = line.original > 0 ? (lineDiscount / line.original) * 100 : 0
                                                                const rawValue = quoteAdjustments[String(order.id)]?.[line.key]

                                                                return (
                                                                    <div key={line.key} style={{ backgroundColor: color }} className="p-5 rounded-2xl text-white flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
                                                                        <div>
                                                                            <div className="font-bold text-lg mb-1.5 flex items-center gap-2">
                                                                                {line.label} <span className="text-[10px] font-black opacity-90 uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">ex vat</span>
                                                                            </div>
                                                                            <div className="text-sm font-semibold opacity-90 flex flex-wrap gap-x-6 gap-y-1">
                                                                                <span>{line.description}</span>
                                                                                {lineDiscount > 0 && (
                                                                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">{lineDiscountPercent.toFixed(0)}% discount</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                                                                            <div className="text-right">
                                                                                {lineDiscount > 0 && (
                                                                                    <div className="text-sm font-black opacity-60 line-through">{formatMoney(line.original)}</div>
                                                                                )}
                                                                                <div className="text-2xl font-black tracking-tight">{formatMoney(line.adjusted)}</div>
                                                                            </div>
                                                                            <div data-html2canvas-ignore="true" className="quote-admin-only w-full sm:w-36">
                                                                                <label className="block text-[9px] font-black uppercase tracking-widest text-white/70 mb-1">New price</label>
                                                                                <div className="relative">
                                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-black">£</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        step="0.01"
                                                                                        value={rawValue ?? line.original.toFixed(2)}
                                                                                        onChange={(event) => updateQuoteAmount(order.id, line.key, event.target.value)}
                                                                                        className="w-full rounded-xl border-0 bg-white py-2.5 pl-7 pr-3 text-sm font-black text-slate-900 shadow-sm outline-none focus:ring-4 focus:ring-white/25"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}

                                                            {quotePreview.lines.length === 0 && (
                                                                <div className="p-5 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm font-bold">
                                                                    No priced quote lines were found in this request.
                                                                </div>
                                                            )}

                                                            {/* Total Cost Block */}
                                                            <div className="bg-[#cda42c] p-5 lg:p-6 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mt-6">
                                                                <div className="font-black text-xl flex items-center gap-2">
                                                                    Total Cost
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    {quotePreview.discountAmount > 0 && (
                                                                        <div className="text-sm font-black opacity-60 line-through">
                                                                            {formatMoney(quotePreview.originalTotalIncVat)} inc VAT
                                                                        </div>
                                                                    )}
                                                                    <div className="text-2xl lg:text-3xl font-black tracking-tight flex items-baseline gap-1">
                                                                        {formatMoney(quotePreview.adjustedSubtotal)}
                                                                        <span className="text-xs font-bold opacity-70 uppercase">ex vat</span>
                                                                    </div>
                                                                    <div className="text-sm font-bold opacity-70 mt-0.5">
                                                                        {formatMoney(quotePreview.totalIncVat)} inc VAT
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="quote-print-items bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                                                                                <div className="font-bold text-slate-900">{formatMoney(item.itemTotal)}</div>
                                                                                <div className="text-xs text-slate-500">{formatMoney(item.unitPrice)} ea</div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Size & Quantity Display */}
                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                            {/* If data has single size/quantity fields */}
                                                                            {item.size && (
                                                                                <div className="px-2 py-1 rounded-md bg-primary/5 border border-primary/10 text-xs font-medium text-primary flex items-center gap-1.5">
                                                                                    <span className="font-bold">Size: {item.size}</span>
                                                                                    <span className="opacity-40">|</span>
                                                                                    <span>Qty: {item.quantity || 0}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* If data has the sizes breakdown object */}
                                                                            {item.sizes && Object.entries(item.sizes).map(([size, qty]) => (
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
                                                                    <span className="font-bold text-slate-900">{formatMoney(quotePreview.adjustedSubtotal)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-slate-500 font-medium">VAT ({(quotePreview.vatRate * 100).toFixed(0)}%)</span>
                                                                    <span className="font-bold text-slate-900">{formatMoney(quotePreview.vatAmount)}</span>
                                                                </div>
                                                                {quotePreview.discountAmount > 0 && (
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-emerald-600 font-bold">Customer discount</span>
                                                                        <span className="font-black text-emerald-600">{quotePreview.discountPercent.toFixed(0)}% off</span>
                                                                    </div>
                                                                )}
                                                                <div className="h-px bg-slate-200 my-1"></div>
                                                                <div className="flex justify-between text-base">
                                                                    <span className="font-black text-slate-800 uppercase tracking-wide">Total</span>
                                                                    <span className="font-black text-primary text-lg">{formatMoney(quotePreview.totalIncVat)}</span>
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
