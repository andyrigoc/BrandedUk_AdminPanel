import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, ShoppingCart, Eye } from 'lucide-react'
import { API_BASE } from '../config'
import WorkflowDropdown, { getStatusStyle } from '../components/WorkflowDropdown'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

const EVENT_COLORS = [
    'bg-[#995BD5] text-white',
    'bg-emerald-500 text-white',
    'bg-blue-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-teal-500 text-white',
    'bg-indigo-500 text-white',
    'bg-pink-500 text-white',
]

const Calendar = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [allQuotes, setAllQuotes] = useState([])
    const [viewMode, setViewMode] = useState('month') // day, week, month
    const [selectedEvent, setSelectedEvent] = useState(null)

    // Parse initial date from URL param or use today
    const initialDate = useMemo(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) {
            const d = new Date(dateParam)
            if (!isNaN(d.getTime())) return d
        }
        return new Date()
    }, [])

    const [currentDate, setCurrentDate] = useState(initialDate)

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

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const res = await fetch(`${API_BASE}/api/admin/quotes?limit=1000`)
                if (!res.ok) throw new Error('Failed')
                const data = await res.json()
                setAllQuotes(data.items || [])
            } catch (err) {
                console.error('Calendar fetch error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Build events from quotes
    const events = useMemo(() => {
        return allQuotes.map((q, i) => {
            const data = parseQuoteData(q)
            const basket = data.basket || data.items || []
            const itemCount = basket.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0)
            const total = getOrderTotal(q)
            const date = new Date(q.created_at)
            const hours = date.getHours()
            const minutes = date.getMinutes()
            const timeStr = `${hours}:${String(minutes).padStart(2, '0')}`

            return {
                id: q.id,
                title: `${q.customer_name || 'Guest'} — ${formatCurrency(total)}`,
                shortTitle: `${timeStr} ${q.customer_name || 'Guest'}`,
                date,
                dateKey: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
                customer: q.customer_name || 'Guest',
                email: q.customer_email || '',
                total,
                items: itemCount,
                status: q.status || 'Pending',
                colorClass: EVENT_COLORS[i % EVENT_COLORS.length],
                rawQuote: q
            }
        })
    }, [allQuotes])

    // Group events by date key
    const eventsByDate = useMemo(() => {
        const map = {}
        events.forEach(e => {
            if (!map[e.dateKey]) map[e.dateKey] = []
            map[e.dateKey].push(e)
        })
        return map
    }, [events])

    // Calendar grid helpers
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Monday = 0, Sunday = 6 (ISO)
    const startDay = (firstDayOfMonth.getDay() + 6) % 7
    const daysInMonth = lastDayOfMonth.getDate()

    // Build 6-week grid
    const calendarDays = useMemo(() => {
        const days = []
        const startDate = new Date(year, month, 1 - startDay)
        for (let i = 0; i < 42; i++) {
            const d = new Date(startDate)
            d.setDate(startDate.getDate() + i)
            days.push(d)
        }
        return days
    }, [year, month, startDay])

    // Week view: get the week containing currentDate
    const weekDays = useMemo(() => {
        const d = new Date(currentDate)
        const dayOfWeek = (d.getDay() + 6) % 7 // Monday=0
        const monday = new Date(d)
        monday.setDate(d.getDate() - dayOfWeek)
        const days = []
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday)
            day.setDate(monday.getDate() + i)
            days.push(day)
        }
        return days
    }, [currentDate])

    const navigate_month = (dir) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1))
    }

    const navigate_week = (dir) => {
        setCurrentDate(prev => {
            const d = new Date(prev)
            d.setDate(d.getDate() + dir * 7)
            return d
        })
    }

    const navigate_day = (dir) => {
        setCurrentDate(prev => {
            const d = new Date(prev)
            d.setDate(d.getDate() + dir)
            return d
        })
    }

    const goToday = () => setCurrentDate(new Date())

    const handleNav = (dir) => {
        if (viewMode === 'month') navigate_month(dir)
        else if (viewMode === 'week') navigate_week(dir)
        else navigate_day(dir)
    }

    const isToday = (d) => {
        const today = new Date()
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    }

    const isCurrentMonth = (d) => d.getMonth() === month

    const getDateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

    const getTitle = () => {
        if (viewMode === 'month') return `${MONTHS[month]} ${year}`
        if (viewMode === 'week') {
            const start = weekDays[0]
            const end = weekDays[6]
            return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} — ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)} ${year}`
        }
        return `${currentDate.getDate()} ${MONTHS[month]} ${year}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading calendar...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto pb-12 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900">{getTitle()}</h1>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {['day', 'week', 'month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                                    viewMode === mode
                                        ? 'bg-[#995BD5] text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleNav(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button onClick={() => handleNav(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    <button
                        onClick={goToday}
                        className="px-4 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {DAYS.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, i) => {
                            const key = getDateKey(day)
                            const dayEvents = eventsByDate[key] || []
                            const today = isToday(day)
                            const inMonth = isCurrentMonth(day)

                            return (
                                <div
                                    key={i}
                                    className={`min-h-[120px] border-b border-r border-slate-100 p-2 transition-colors ${
                                        !inMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/30'
                                    }`}
                                >
                                    <div className={`text-sm font-semibold mb-1 ${
                                        today
                                            ? 'w-7 h-7 rounded-full bg-[#995BD5] text-white flex items-center justify-center'
                                            : inMonth ? 'text-slate-700' : 'text-slate-300'
                                    }`}>
                                        {day.getDate()}
                                    </div>
                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <button
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-semibold truncate ${event.colorClass} hover:opacity-90 transition-opacity`}
                                            >
                                                {event.shortTitle}
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[10px] text-slate-400 font-medium pl-1">+{dayEvents.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {weekDays.map((day, i) => (
                            <div key={i} className="py-3 text-center">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{DAYS[i]}</div>
                                <div className={`text-lg font-bold mt-1 ${
                                    isToday(day) ? 'w-8 h-8 rounded-full bg-[#995BD5] text-white flex items-center justify-center mx-auto' : 'text-slate-700'
                                }`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 min-h-[500px]">
                        {weekDays.map((day, i) => {
                            const key = getDateKey(day)
                            const dayEvents = eventsByDate[key] || []
                            return (
                                <div key={i} className="border-r border-slate-100 p-2">
                                    <div className="space-y-2">
                                        {dayEvents.map(event => (
                                            <button
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className={`w-full text-left px-2 py-2 rounded-lg text-[11px] font-semibold ${event.colorClass} hover:opacity-90 transition-opacity`}
                                            >
                                                <div className="truncate">{event.shortTitle}</div>
                                                <div className="text-[10px] opacity-80 mt-0.5">{formatCurrency(event.total)}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* DAY VIEW */}
            {viewMode === 'day' && (() => {
                const key = getDateKey(currentDate)
                const dayEvents = eventsByDate[key] || []
                return (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="text-sm font-bold text-slate-700">
                                {DAYS[(currentDate.getDay() + 6) % 7]} — {currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{dayEvents.length} order(s)</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {dayEvents.length === 0 ? (
                                <div className="px-6 py-16 text-center text-slate-400 text-sm">No orders on this day</div>
                            ) : (
                                dayEvents.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div className={`w-3 h-3 rounded-full shrink-0 ${event.colorClass.split(' ')[0]}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                                            <p className="text-xs text-slate-400">{event.email} &middot; {event.items} items &middot; {event.status}</p>
                                        </div>
                                        <div className="text-sm font-bold text-slate-900">{formatCurrency(event.total)}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-4 ${selectedEvent.colorClass}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    <span className="text-sm font-bold">Order #{selectedEvent.id}</span>
                                </div>
                                <span className="text-xs font-semibold opacity-80">
                                    {selectedEvent.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                                    <p className="text-sm font-semibold text-slate-900">{selectedEvent.customer}</p>
                                    {selectedEvent.email && <p className="text-xs text-slate-400">{selectedEvent.email}</p>}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedEvent.total)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Items</p>
                                    <p className="text-sm font-semibold text-slate-900">{selectedEvent.items}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                        selectedEvent.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                        selectedEvent.status === 'Cancelled' ? 'bg-rose-50 text-rose-500' :
                                        selectedEvent.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                                        'bg-amber-50 text-amber-600'
                                    }`}>{selectedEvent.status}</span>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => { setSelectedEvent(null); navigate(`/orders?open=${selectedEvent.id}`) }}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#995BD5] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                >
                                    <Eye className="w-3 h-3" /> View Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Calendar