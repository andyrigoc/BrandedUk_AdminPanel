import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy,
  Check,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react'

const API_URL = 'https://api.thehumanitee.com/admin/customers'

const HumanitieesCustomers = () => {
  // Data and state management
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({ totalUniqueNumbers: 0, totalCustomers: 0 })
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [sortOption, setSortOption] = useState('newest_assigned')
  const [page, setPage] = useState(1)
  const limit = 25

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState([])

  // Interaction states
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [copiedNumber, setCopiedNumber] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Accessibility & Focus Refs
  const triggerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const drawerRef = useRef(null)

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Map sort options to API keys
  const getSortParams = (option) => {
    switch (option) {
      case 'newest_assigned':
        return { sortBy: 'created_at', sortOrder: 'desc' }
      case 'oldest_assigned':
        return { sortBy: 'created_at', sortOrder: 'asc' }
      case 'customer_az':
        return { sortBy: 'customer_name', sortOrder: 'asc' }
      case 'highest_amount':
        return { sortBy: 'total_amount', sortOrder: 'desc' }
      case 'lowest_amount':
        return { sortBy: 'total_amount', sortOrder: 'asc' }
      default:
        return { sortBy: 'created_at', sortOrder: 'desc' }
    }
  }

  // Fetch data from local backend API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { sortBy, sortOrder } = getSortParams(sortOption)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        sortBy,
        sortOrder
      })

      // Send filter fields to the backend
      if (paymentFilter !== 'all') queryParams.append('status', paymentFilter)
      if (productFilter !== 'all') queryParams.append('product', productFilter)
      if (dateFilter !== 'all') queryParams.append('dateRange', dateFilter)

      const res = await fetch(`${API_URL}?${queryParams.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to load data (Status: ${res.status})`)
      }

      const payload = await res.json()
      setCustomers(payload.data || [])
      setPagination(payload.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 })
      setStats(payload.stats || { totalUniqueNumbers: 0, totalCustomers: 0 })
    } catch (err) {
      console.error('Fetch Error:', err)
      setError(err.message || 'Unable to load humanity numbers.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, paymentFilter, dateFilter, productFilter, sortOption])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Global Key Bindings (Escape key closes drawer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedCustomer(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (selectedCustomer) {
      triggerRef.current = document.activeElement
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    } else {
      document.body.style.overflow = ''
      triggerRef.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedCustomer])

  // Single Delete Handler
  const handleDeleteSingle = async (e, num) => {
    e.stopPropagation()
    const confirmed = window.confirm(`Are you sure you want to delete humanity number ${num}?`)
    if (!confirmed) return

    try {
      setDeletingId(num)
      const res = await fetch(`${API_URL}/${num}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete humanity number assignment.')
      }

      // Deselect if currently selected
      setSelectedIds(prev => prev.filter(id => id !== num))
      
      // Close drawer if deleted item is open
      if (selectedCustomer?.humanity_number === num) {
        setSelectedCustomer(null)
      }

      await fetchData()
    } catch (err) {
      console.error('Delete Error:', err)
      alert(err.message || 'Could not delete humanity number.')
    } finally {
      setDeletingId(null)
    }
  }

  // Bulk Delete Handler
  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected humanity numbers?`)
    if (!confirmed) return

    try {
      setBulkDeleting(true)
      const res = await fetch(`${API_URL}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanity_numbers: selectedIds })
      })

      if (!res.ok) {
        throw new Error('Failed to delete selected assignments.')
      }

      // If the selected customer drawer was open and is in the deleted list, close it
      if (selectedCustomer && selectedIds.includes(selectedCustomer.humanity_number)) {
        setSelectedCustomer(null)
      }

      setSelectedIds([])
      await fetchData()
    } catch (err) {
      console.error('Bulk Delete Error:', err)
      alert(err.message || 'Could not delete selected items.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Client-Side Fallback Filtering Logic (Ensures filters work immediately)
  const getFilteredCustomers = () => {
    return customers.filter(row => {
      // 1. Payment status filter fallback
      if (paymentFilter !== 'all') {
        const rowStatus = String(row.order?.status || 'pending').toLowerCase()
        if (rowStatus !== paymentFilter.toLowerCase()) return false
      }

      // 2. Product filter fallback
      if (productFilter !== 'all') {
        const rowProduct = row.order?.product_name || ''
        if (rowProduct !== productFilter) return false
      }

      // 3. Date range filter fallback
      if (dateFilter !== 'all') {
        const rowDate = new Date(row.created_at)
        const now = new Date()
        if (isNaN(rowDate.getTime())) return false

        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (rowDate < today) return false
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (rowDate < sevenDaysAgo) return false
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (rowDate < thirtyDaysAgo) return false
        }
      }

      return true
    })
  }

  const displayedCustomers = getFilteredCustomers()

  // Selection Helpers
  const isRowSelected = (num) => selectedIds.includes(num)
  
  const handleSelectRow = (e, num) => {
    e.stopPropagation()
    if (isRowSelected(num)) {
      setSelectedIds(prev => prev.filter(id => id !== num))
    } else {
      setSelectedIds(prev => [...prev, num])
    }
  }

  const allOnPageSelected = displayedCustomers.length > 0 && displayedCustomers.every(c => isRowSelected(c.humanity_number))

  const handleSelectAll = (e) => {
    e.stopPropagation()
    if (allOnPageSelected) {
      const pageIds = displayedCustomers.map(c => c.humanity_number)
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      const pageIds = displayedCustomers.map(c => c.humanity_number)
      setSelectedIds(prev => {
        const union = [...prev]
        pageIds.forEach(id => {
          if (!union.includes(id)) union.push(id)
        })
        return union
      })
    }
  }

  // Clear all filters action
  const handleClearFilters = () => {
    setPaymentFilter('all')
    setDateFilter('all')
    setProductFilter('all')
    setSearchTerm('')
    setSortOption('newest_assigned')
    setPage(1)
  }

  // Check if filters are active
  const hasActiveFilters =
    paymentFilter !== 'all' ||
    dateFilter !== 'all' ||
    productFilter !== 'all' ||
    searchTerm !== ''

  // Copy to clipboard with success state
  const handleCopyText = (e, text, fieldName = 'number') => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedNumber(text)
    setCopiedField(fieldName)
    setTimeout(() => {
      setCopiedNumber(null)
      setCopiedField(null)
    }, 2000)
  }

  // Format humanity number 4-3-3 grouping (e.g. 6686 131 030)
  const formatHumanityNumber = (num) => {
    if (!num) return '-'
    const str = String(num).replace(/\s+/g, '')
    if (str.length === 10) {
      return `${str.slice(0, 4)} ${str.slice(4, 7)} ${str.slice(7)}`
    }
    return str.replace(/(.{4})/g, '$1 ').trim()
  }

  // Format short date (e.g. 25 Apr 2026)
  const formatHumanDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  // Format time (e.g. 16:44)
  const formatHumanTime = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  // Format Currency (always displays £XX.XX)
  const formatCurrency = (amount) => {
    const val = parseFloat(amount)
    if (isNaN(val)) return '£0.00'
    return `£${val.toFixed(2)}`
  }

  // Pull unique products from list to populate filters dynamically
  const uniqueProductsList = Array.from(
    new Set(customers.map((c) => c.order?.product_name).filter(Boolean))
  )

  return (
    <div className="w-full pb-12 font-sans text-[#111827]">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Humanity Numbers</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            View and manage humanity numbers assigned to customer orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              {bulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Selected ({selectedIds.length})
            </button>
          )}
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F8FAFC] active:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer, email, order or humanity number..."
            className="w-full pl-9 pr-8 py-1.5 bg-white border border-[#E5E7EB] rounded-md text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/10 focus:border-[#7C3AED] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Payment Status Dropdown */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value)
              setPage(1)
            }}
            className="bg-white border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="all">Payment: All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Assigned Date Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value)
              setPage(1)
            }}
            className="bg-white border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="all">Assigned Date: All</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Product Dropdown */}
          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value)
              setPage(1)
            }}
            className="bg-white border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] max-w-[160px] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="all">Product: All</option>
            {uniqueProductsList.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value)
              setPage(1)
            }}
            className="bg-white border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          >
            <option value="newest_assigned">Newest First</option>
            <option value="oldest_assigned">Oldest First</option>
            <option value="customer_az">Customer A–Z</option>
            <option value="highest_amount">Highest Amount</option>
            <option value="lowest_amount">Lowest Amount</option>
          </select>

          {/* Clear Filters Action */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-medium text-[#7C3AED] hover:text-[#7C3AED]/80 ml-1.5 px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Table view (Desktop / Tablet) */}
      <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center text-xs">
            <p className="font-medium text-[#111827] mb-1">Unable to load humanity numbers</p>
            <p className="text-[#64748B] mb-4">Please try again.</p>
            <button
              onClick={fetchData}
              className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white font-medium rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          /* Table Skeleton loading rows */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider h-[46px]">
                  <th className="w-10 px-4 py-2.5">
                    <input type="checkbox" disabled className="rounded border-[#E5E7EB]" />
                  </th>
                  <th className="px-4 py-2.5">Humanity Number</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Assigned</th>
                  <th className="px-4 py-2.5 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse h-[65px]">
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-4"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-28"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-32 mb-1"></div>
                      <div className="h-3 bg-[#E5E7EB] rounded w-24"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-20"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-36 mb-1"></div>
                      <div className="h-3 bg-[#E5E7EB] rounded w-16"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-5 bg-[#E5E7EB] rounded w-12"></div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="h-4 bg-[#E5E7EB] rounded w-14 ml-auto"></div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-4 bg-[#E5E7EB] rounded w-20"></div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="h-4 bg-[#E5E7EB] rounded w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="py-16 text-center text-xs">
            <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-3 border border-[#E5E7EB]">
              <Search className="w-5 h-5 text-[#94A3B8]" />
            </div>
            <p className="font-medium text-[#111827] mb-1">No humanity numbers found</p>
            <p className="text-[#64748B] mb-4">Try changing your search or filters.</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#111827] font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/10"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
              {/* Sticky Header */}
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E5E7EB]">
                <tr className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider h-[46px] select-none">
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={handleSelectAll}
                      className="rounded border-[#E5E7EB] text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                      title="Select all on page"
                    />
                  </th>
                  <th className="px-4 py-2">Humanity Number</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2 hidden lg:table-cell">Order</th>
                  <th className="px-4 py-2 hidden lg:table-cell">Product</th>
                  <th className="px-4 py-2">Payment</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Assigned</th>
                  <th className="px-4 py-2 text-right w-24">Action</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-[#E5E7EB] text-xs">
                {displayedCustomers.map((row, index) => {
                  const num = row.humanity_number || '-'
                  const isSelected = selectedCustomer?.humanity_number === num
                  const isCopied = copiedNumber === num && copiedField === 'number'
                  const isChecked = isRowSelected(num)

                  return (
                    <tr
                      key={`${num}-${index}`}
                      onClick={() => setSelectedCustomer(row)}
                      className={`h-[65px] hover:bg-[#F8FAFC] cursor-pointer transition-colors group select-none ${
                        isSelected ? 'bg-[#7C3AED]/5' : ''
                      } ${isChecked ? 'bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10' : ''}`}
                    >
                      {/* Checkbox Select */}
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(e, num)}
                          className="rounded border-[#E5E7EB] text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                        />
                      </td>

                      {/* Humanity Number */}
                      <td className="px-4 py-2 font-mono font-medium text-[#111827] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatHumanityNumber(num)}</span>
                          <button
                            onClick={(e) => handleCopyText(e, num, 'number')}
                            className="p-1 text-[#94A3B8] hover:text-[#7C3AED] rounded bg-white hover:bg-slate-50 border border-[#E5E7EB] opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                            title="Copy Humanity Number"
                            aria-label={`Copy Humanity Number ${num}`}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-2">
                        <div className="font-medium text-[#111827]">
                          {row.customer?.first_name || '-'} {row.customer?.last_name || ''}
                        </div>
                        <div
                          className="text-[11px] text-[#64748B] truncate max-w-[160px] lowercase"
                          title={row.customer?.email || ''}
                        >
                          {row.customer?.email || '-'}
                        </div>
                      </td>

                      {/* Order Reference */}
                      <td className="px-4 py-2 font-mono text-[11px] hidden lg:table-cell">
                        <div
                          className="truncate max-w-[130px]"
                          title={row.order?.order_number || ''}
                        >
                          {row.order?.order_number || '-'}
                        </div>
                      </td>

                      {/* Product details */}
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <div className="font-medium text-[#111827] max-w-[180px] truncate">
                          {row.order?.product_name || '-'}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Size {row.order?.size || '-'} · Qty {row.order?.quantity || '0'}
                        </div>
                      </td>

                      {/* Payment Status Badges */}
                      <td className="px-4 py-2">
                        {(() => {
                          const status = String(row.order?.status || 'pending').toLowerCase()
                          let bg = 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]' // Refunded/Default
                          if (status === 'paid') {
                            bg = 'bg-[#EAFDF4] text-[#107C41] border-[#BFF6DC]'
                          } else if (status === 'pending') {
                            bg = 'bg-[#FFF8E6] text-[#A16207] border-[#FEF3C7]'
                          } else if (status === 'failed') {
                            bg = 'bg-[#FDF2F2] text-[#9B1C1C] border-[#FDE8E8]'
                          }

                          return (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${bg}`}
                            >
                              {status}
                            </span>
                          )
                        })()}
                      </td>

                      {/* Right-aligned Tabular Amount */}
                      <td className="px-4 py-2 text-right font-medium text-[#111827] tabular-nums">
                        {formatCurrency(row.order?.total_amount)}
                      </td>

                      {/* Assigned Date */}
                      <td className="px-4 py-2 text-[#64748B] whitespace-nowrap">
                        {formatHumanDate(row.created_at)}
                      </td>

                      {/* Actions: Delete & Chevron */}
                      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteSingle(e, num)}
                            disabled={deletingId === num}
                            className="p-1 text-[#94A3B8] hover:text-red-600 rounded bg-[#F8FAFC] border border-[#E5E7EB] transition-colors focus:outline-none"
                            title="Delete Humanity Number Assignment"
                            aria-label={`Delete Humanity Number Assignment ${num}`}
                          >
                            {deletingId === num ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <span
                            className="inline-flex items-center justify-center w-6 h-6 text-lg text-[#94A3B8] group-hover:text-[#64748B] group-hover:translate-x-0.5 transition-transform"
                            aria-label="View humanity number details"
                          >
                            ›
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Mobile stacked card view */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-lg p-4 animate-pulse space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-4 bg-[#E5E7EB] rounded w-28"></div>
                <div className="h-5 bg-[#E5E7EB] rounded w-12"></div>
              </div>
              <div className="h-4 bg-[#E5E7EB] rounded w-36"></div>
              <div className="h-3 bg-[#E5E7EB] rounded w-28"></div>
            </div>
          ))
        ) : displayedCustomers.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 text-center text-xs">
            <p className="font-medium text-[#111827] mb-1">No humanity numbers found</p>
            <p className="text-[#64748B]">Try changing search/filters.</p>
          </div>
        ) : (
          displayedCustomers.map((row, index) => {
            const num = row.humanity_number || '-'
            const isSelected = selectedCustomer?.humanity_number === num
            const isChecked = isRowSelected(num)
            const status = String(row.order?.status || 'pending').toLowerCase()

            let badgeBg = 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
            if (status === 'paid') {
              badgeBg = 'bg-[#EAFDF4] text-[#107C41] border-[#BFF6DC]'
            } else if (status === 'pending') {
              badgeBg = 'bg-[#FFF8E6] text-[#A16207] border-[#FEF3C7]'
            } else if (status === 'failed') {
              badgeBg = 'bg-[#FDF2F2] text-[#9B1C1C] border-[#FDE8E8]'
            }

            return (
              <div
                key={`${num}-${index}`}
                onClick={() => setSelectedCustomer(row)}
                className={`bg-white border rounded-lg p-4 cursor-pointer select-none active:bg-[#F8FAFC] transition-colors relative flex items-center justify-between ${
                  isSelected ? 'border-[#7C3AED] bg-[#7C3AED]/5' : 'border-[#E5E7EB]'
                } ${isChecked ? 'bg-[#7C3AED]/5 border-[#7C3AED]' : ''}`}
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  {/* First row: Checkbox, Number & Status */}
                  <div className="flex items-center gap-2">
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleSelectRow(e, num)}
                        className="rounded border-[#E5E7EB] text-[#7C3AED] focus:ring-[#7C3AED] mr-1 cursor-pointer"
                      />
                    </div>
                    <span className="font-mono font-medium text-sm text-[#111827]">
                      {formatHumanityNumber(num)}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border capitalize ${badgeBg}`}
                    >
                      {status}
                    </span>
                  </div>
                  {/* Customer name */}
                  <div className="text-xs font-medium text-[#111827]">
                    {row.customer?.first_name || '-'} {row.customer?.last_name || ''}
                  </div>
                  {/* Product attribute line */}
                  <div className="text-[11px] text-[#64748B] truncate">
                    {row.order?.product_name || '-'} · Size {row.order?.size || '-'}
                  </div>
                  {/* Price & Date line */}
                  <div className="text-[11px] text-[#94A3B8] flex items-center justify-between">
                    <span>
                      {formatCurrency(row.order?.total_amount)} · {formatHumanDate(row.created_at)}
                    </span>
                    {/* Delete button for mobile */}
                    <button
                      onClick={(e) => handleDeleteSingle(e, num)}
                      disabled={deletingId === num}
                      className="p-1 text-[#94A3B8] hover:text-red-600 rounded bg-[#F8FAFC] border border-[#E5E7EB] relative z-10 focus:outline-none"
                      aria-label={`Delete Assignment ${num}`}
                    >
                      {deletingId === num ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-lg text-[#94A3B8] shrink-0 font-light select-none">›</div>
              </div>
            )
          })
        )}
      </div>

      {/* 6. Pagination Footer */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing{' '}
            <span className="font-medium text-[#111827]">
              {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
            </span>
            –
            <span className="font-medium text-[#111827]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium text-[#111827]">{pagination.total}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#94A3B8]">Rows per page: {limit}</span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 bg-white border border-[#E5E7EB] rounded-md text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:hover:bg-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-medium text-[#111827]">
                {page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1 bg-white border border-[#E5E7EB] rounded-md text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:hover:bg-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Details Drawer */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          {/* Backdrop overlay */}
          <div
            onClick={() => setSelectedCustomer(null)}
            className="absolute inset-0 bg-[#111827]/30 backdrop-blur-[1px] transition-opacity duration-200"
          />

          {/* Drawer container panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div
              ref={drawerRef}
              className="w-screen max-w-md md:max-w-lg lg:max-w-[460px] max-w-[40vw] bg-white border-l border-[#E5E7EB] flex flex-col shadow-2xl transition-transform duration-250 ease-out"
            >
              {/* FIXED HEADER */}
              <div className="px-6 py-4.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white">
                <div>
                  <h2 id="drawer-title" className="text-sm font-semibold text-[#111827]">
                    Humanity Number Details
                  </h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Customer, order and assignment information
                  </p>
                </div>
                 <button
                  ref={closeButtonRef}
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
                {/* Humanity Number Hero Card */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm relative group/drawerhero">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                        Assigned Humanity Number
                      </span>
                      <div className="mt-1.5">
                        <span className="text-xl font-mono font-semibold tracking-tight text-[#7C3AED]">
                          {formatHumanityNumber(selectedCustomer.humanity_number)}
                        </span>
                      </div>
                    </div>
                    {/* Delete action in Hero Box */}
                    <button
                      onClick={(e) => handleDeleteSingle(e, selectedCustomer.humanity_number)}
                      disabled={deletingId === selectedCustomer.humanity_number}
                      className="p-2 text-[#94A3B8] hover:text-red-600 rounded bg-[#F8FAFC] border border-[#E5E7EB] hover:border-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                      title="Delete assignment"
                    >
                      {deletingId === selectedCustomer.humanity_number ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F3F4F6]">
                    <span className="text-[10px] text-[#94A3B8]">Quick Actions</span>
                    <button
                      onClick={(e) =>
                        handleCopyText(e, selectedCustomer.humanity_number, 'drawerNum')
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                      aria-label="Copy humanity number"
                    >
                      {copiedNumber === selectedCustomer.humanity_number &&
                      copiedField === 'drawerNum' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied ✓
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Number
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-3 pt-2 border-t border-[#F3F4F6] flex justify-between">
                    <span>Assigned</span>
                    <span className="font-medium text-[#64748B]">
                      {formatHumanDate(selectedCustomer.created_at)} at{' '}
                      {formatHumanTime(selectedCustomer.created_at)}
                    </span>
                  </div>
                </div>

                {/* Customer Information Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Customer Information
                  </span>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 space-y-3 shadow-sm text-xs">
                    {/* Full Name */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Full name</span>
                      <span className="font-medium text-[#111827] truncate">
                        {selectedCustomer.customer?.first_name || '-'}{' '}
                        {selectedCustomer.customer?.last_name || ''}
                      </span>
                    </div>

                    {/* Email address */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Email address</span>
                      <a
                        href={`mailto:${selectedCustomer.customer?.email || ''}`}
                        className="font-medium text-[#7C3AED] hover:underline truncate"
                      >
                        {selectedCustomer.customer?.email || '-'}
                      </a>
                    </div>

                    {/* Phone number */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Phone number</span>
                      {selectedCustomer.customer?.phone ? (
                        <a
                          href={`tel:${selectedCustomer.customer.phone}`}
                          className="font-medium text-[#7C3AED] hover:underline"
                        >
                          {selectedCustomer.customer.phone}
                        </a>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order and Product Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Order & Product
                  </span>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 space-y-3 shadow-sm text-xs">
                    {/* Order Reference */}
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline">
                        <span className="w-32 text-[#64748B] shrink-0">Order reference</span>
                        <span className="font-mono font-medium text-[#111827] break-all">
                          {selectedCustomer.order?.order_number || '-'}
                        </span>
                      </div>
                      {selectedCustomer.order?.order_number && (
                        <button
                          onClick={(e) =>
                            handleCopyText(
                              e,
                              selectedCustomer.order.order_number,
                              'orderRef'
                            )
                          }
                          className="text-[10px] text-[#7C3AED] font-semibold hover:underline shrink-0"
                          aria-label="Copy order reference"
                        >
                          {copiedField === 'orderRef' ? 'Copied ✓' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {/* Product */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Product</span>
                      <span className="font-medium text-[#111827]">
                        {selectedCustomer.order?.product_name || '-'}
                      </span>
                    </div>

                    {/* Size */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Size</span>
                      <span className="font-medium text-[#111827]">
                        {selectedCustomer.order?.size || '-'}
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Quantity</span>
                      <span className="font-medium text-[#111827]">
                        {selectedCustomer.order?.quantity || '0'}
                      </span>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Payment status</span>
                      {(() => {
                        const status = String(
                          selectedCustomer.order?.status || 'pending'
                        ).toLowerCase()
                        let bg = 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
                        if (status === 'paid') {
                          bg = 'bg-[#EAFDF4] text-[#107C41] border-[#BFF6DC]'
                        } else if (status === 'pending') {
                          bg = 'bg-[#FFF8E6] text-[#A16207] border-[#FEF3C7]'
                        } else if (status === 'failed') {
                          bg = 'bg-[#FDF2F2] text-[#9B1C1C] border-[#FDE8E8]'
                        }
                        return (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border capitalize ${bg}`}
                          >
                            {status}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Order Total */}
                    <div className="flex items-baseline pt-2 border-t border-[#F3F4F6]">
                      <span className="w-32 text-[#111827] font-semibold shrink-0">Order total</span>
                      <span className="font-semibold text-sm text-[#111827]">
                        {formatCurrency(selectedCustomer.order?.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assignment Metadata */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                    Assignment
                  </span>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 space-y-3 shadow-sm text-xs">
                    {/* Assigned Date */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Assigned date</span>
                      <span className="font-medium text-[#111827]">
                        {formatHumanDate(selectedCustomer.created_at)}
                      </span>
                    </div>

                    {/* Assigned Time */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Assigned time</span>
                      <span className="font-medium text-[#111827]">
                        {formatHumanTime(selectedCustomer.created_at)}
                      </span>
                    </div>

                    {/* Assignment Source */}
                    <div className="flex items-baseline">
                      <span className="w-32 text-[#64748B] shrink-0">Assignment source</span>
                      <span className="font-medium text-[#111827]">
                        {selectedCustomer.assignment_source || 'Automatic'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FIXED FOOTER */}
              <div className="border-t border-[#E5E7EB] p-4 bg-[#F8FAFC] flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#111827] font-semibold rounded-md transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 active:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HumanitieesCustomers
