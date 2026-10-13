import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Card from '../components/Card'
import {
    Activity,
    Users,
    Layers,
    Clock,
    PlayCircle,
    Flame,
    LayoutDashboard,
    ExternalLink,
    RefreshCw,
    Loader2,
    Lock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    TrendingUp,
    TrendingDown,
    Smartphone,
    Megaphone,
    FileText,
    Globe2,
    Monitor,
    Compass,
    HeartPulse,
    LineChart as LineChartIcon,
    ChevronDown,
} from 'lucide-react'
import { RingCard, Sparkline, DonutCard, TrendCard, PageBars } from '../components/clarity/ClarityCharts'
import {
    RING_METRICS,
    GOOGLE_ADS,
    ratingFor,
    classifyChannel,
    isGoogleAds,
    toSlices,
    formatNumber,
    formatDecimal,
    formatDuration,
    formatDateTime,
    shortDate,
    pctChange,
} from '../components/clarity/clarityMetrics'

const CLARITY_PROJECT_ID = 'ywi8r3ew9l'
const SESSION_KEY = 'clarity_admin_session'
const RANGE_FILTERS = [7, 14, 30, 90]
const DEFAULT_LINKS = {
    dashboard: `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard`,
    recordings: `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/impressions`,
    heatmaps: `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/heatmaps`,
    settings: `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/settings`,
}

const loadSession = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
        return saved && new Date(saved.expiresAt).getTime() > Date.now() ? saved : null
    } catch {
        return null
    }
}

const DeltaBadge = ({ value, invert = false, light = false }) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return null
    const isUp = value >= 0
    const good = invert ? !isUp : isUp
    const tone = light ? 'text-white/90' : good ? 'text-emerald-600' : 'text-rose-500'
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${tone}`} title="Change vs previous day">
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? '+' : '−'}{Math.abs(value)}%
            <span className="sr-only"> vs previous day</span>
        </span>
    )
}

const LinkButton = ({ href, icon: Icon, children, primary = false }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
            primary
                ? 'bg-[#995BD5] border-[#995BD5] text-white hover:bg-[#8447c4]'
                : 'bg-white border-slate-200 text-slate-600 hover:border-[#995BD5] hover:text-[#995BD5]'
        }`}
    >
        <Icon className="w-4 h-4" />
        {children}
        <ExternalLink className="w-3 h-3 opacity-60" />
        <span className="sr-only">(opens Microsoft Clarity in a new tab)</span>
    </a>
)

const StatusDot = ({ ok, label }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-400" />}
        {label}
    </span>
)

const SectionTitle = ({ icon: Icon, title, subtitle, children }) => (
    <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-[#995BD5]" />
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
    </div>
)

const SegmentedControl = ({ options, value, onChange, label }) => (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm" role="group" aria-label={label}>
        {options.map((option) => (
            <button
                key={option.key}
                onClick={() => onChange(option.key)}
                disabled={option.disabled}
                aria-pressed={value === option.key}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${value === option.key ? 'bg-[#995BD5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
                {option.label}
            </button>
        ))}
    </div>
)

const UnlockCard = ({ onUnlocked, notice }) => {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')
        try {
            const response = await fetch('/api/clarity/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result.error || 'Unlock failed')
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(result))
            onUnlocked(result)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="max-w-md mx-auto mt-10 p-8 border-slate-200 shadow-sm rounded-xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#995BD5]/10 rounded-lg flex items-center justify-center">
                    <Lock className="w-6 h-6 text-[#995BD5]" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Unlock Clarity data</h2>
                    <p className="text-sm text-slate-500">Server-verified admin password</p>
                </div>
            </div>
            {notice && <p className="text-sm text-slate-500 mb-4">{notice}</p>}
            <form onSubmit={submit} className="space-y-4">
                <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Admin password"
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#995BD5] focus:ring-4 focus:ring-[#995BD5]/10 text-slate-900 font-semibold"
                />
                {error && (
                    <p className="text-sm text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#995BD5] text-white font-bold rounded-lg hover:bg-[#8447c4] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Unlock
                </button>
            </form>
        </Card>
    )
}

const SetupCard = ({ data, authMissing }) => {
    const configured = data?.configured || {}
    if (data?.mode === 'local') {
        const syncError = data.lastSync && !data.lastSync.ok ? data.lastSync.errors?.[0]?.error : null
        return (
            <Card className="p-8 border-slate-200 shadow-sm rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                        <Activity className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">
                            {configured.token ? 'Waiting for first sync' : 'Waiting for first sync — paste your Clarity token into .env.local'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            When this page is opened, the panel pulls the last 24h from Clarity once a day (4 of Clarity's 10 daily calls) and keeps the history on this PC, so trends build up beyond Clarity's 3-day export window.
                            Recordings and heatmaps can't be exported — use the buttons above to open them in Clarity.
                        </p>
                        {syncError && <p className="text-sm font-medium text-rose-600 mt-3">Last attempt failed: {syncError}</p>}
                        {!configured.token && (
                            <ol className="mt-6 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                                <li>Clarity → Settings → Data Export → <b>Generate new API token</b> (project admin only).</li>
                                <li>Open <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Branded Admin Panel\.env.local</code> and paste it right after <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">CLARITY_API_TOKEN=</code>, then save.</li>
                                <li>Reload this page — the first sync runs automatically (no restart needed).</li>
                            </ol>
                        )}
                    </div>
                </div>
            </Card>
        )
    }
    return (
        <Card className="p-8 border-slate-200 shadow-sm rounded-xl">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900">
                        {authMissing ? 'Clarity section not configured yet' : 'Waiting for first sync — add CLARITY_API_TOKEN in Vercel'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Clarity data is pulled once a day (00:30 UTC) and stored here, so the panel can show trends beyond Clarity's 3-day export window.
                        Recordings and heatmaps can't be exported — use the buttons above to open them in Clarity.
                    </p>
                    {!authMissing && (
                        <div className="flex flex-wrap gap-5 mt-5">
                            <StatusDot ok={configured.token} label="CLARITY_API_TOKEN" />
                            <StatusDot ok={Boolean(configured.storage)} label={`Storage${configured.storage ? ` (${configured.storage})` : ' (Upstash Redis)'}`} />
                            <StatusDot ok={configured.cronSecret} label="CRON_SECRET" />
                        </div>
                    )}
                    <ol className="mt-6 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                        <li>Clarity → Settings → Data Export → <b>Generate new API token</b> (project admin only).</li>
                        <li>Vercel → this admin project → Storage → connect <b>Upstash for Redis</b> (adds KV_REST_API_URL / KV_REST_API_TOKEN).</li>
                        <li>Vercel → Settings → Environment Variables: <b>CLARITY_API_TOKEN</b>, <b>CRON_SECRET</b>, <b>ADMIN_PANEL_PASSWORD</b>, <b>ADMIN_SESSION_SECRET</b>.</li>
                        <li>Redeploy, unlock this page, then press <b>Sync now</b> (or wait for the nightly sync).</li>
                    </ol>
                </div>
            </div>
        </Card>
    )
}

const Clarity = () => {
    const [session, setSession] = useState(loadSession)
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [status, setStatus] = useState('loading')
    const [error, setError] = useState('')
    const [breakdownMode, setBreakdownMode] = useState('latest')
    const [syncing, setSyncing] = useState(false)
    const [syncMessage, setSyncMessage] = useState(null)

    const autoSyncTried = useRef(false)
    const authHeaders = useMemo(() => (session?.token ? { Authorization: `Bearer ${session.token}` } : {}), [session])

    const fetchInsights = useCallback(async () => {
        setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
        try {
            const response = await fetch(`/api/clarity/insights?days=${days}`, { headers: authHeaders })
            const result = await response.json().catch(() => ({}))
            if (response.status === 401) {
                sessionStorage.removeItem(SESSION_KEY)
                setSession(null)
                setStatus('locked')
                return
            }
            if (result.code === 'auth_not_configured') {
                setStatus('auth-missing')
                return
            }
            if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
            setData(result)
            setError('')
            setStatus('ready')
        } catch (err) {
            setError(err.message || 'Could not load Clarity data')
            setStatus('error')
        }
    }, [authHeaders, days])

    useEffect(() => { fetchInsights() }, [fetchInsights])

    const runSync = useCallback(async ({ auto = false } = {}) => {
        setSyncing(true)
        setSyncMessage(auto ? { type: 'info', text: "Fetching today's data from Clarity…" } : null)
        try {
            const response = await fetch('/api/clarity/sync', {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ auto }),
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result.error || `Sync failed (HTTP ${response.status})`)
            setSyncMessage({ type: 'success', text: `${auto ? "Today's snapshot saved" : 'Synced'}. ${result.usedToday}/${result.budget} Clarity calls used today.` })
            await fetchInsights()
        } catch (err) {
            setSyncMessage({ type: 'error', text: err.message })
            if (auto) await fetchInsights()
        } finally {
            setSyncing(false)
        }
    }, [authHeaders, fetchInsights])

    useEffect(() => {
        if (status !== 'ready' || !data?.autoSyncDue || autoSyncTried.current) return
        autoSyncTried.current = true
        runSync({ auto: true })
    }, [status, data, runSync])

    const handleSync = () => {
        if (!syncing) runSync()
    }

    const links = data?.links || DEFAULT_LINKS
    const latest = data?.latest
    const history = useMemo(() => data?.history || [], [data])
    const totals = latest?.totals || {}

    const previousTotals = useMemo(() => {
        if (!latest) return null
        const earlier = history.filter((entry) => entry.date < latest.date)
        return earlier.length ? earlier[earlier.length - 1].totals : null
    }, [history, latest])

    const trendData = useMemo(() => history.map((entry) => ({
        label: shortDate(entry.date),
        sessions: entry.totals?.sessions ?? 0,
        users: entry.totals?.users ?? 0,
        pagesPerSession: entry.totals?.pagesPerSession ?? 0,
        engagementActive: entry.totals?.engagementActive ?? 0,
        engagementTotal: entry.totals?.engagementTotal ?? 0,
        rageClicks: entry.totals?.rageClicks ?? 0,
        deadClicks: entry.totals?.deadClicks ?? 0,
        quickbacks: entry.totals?.quickbacks ?? 0,
    })), [history])

    const useRange = breakdownMode === 'range' && history.length > 0
    const range = data?.range || {}
    const periodLabel = useRange ? `Last ${days} days` : 'Last 24h'

    const breakdowns = useMemo(() => {
        const acquisition = (useRange ? range.acquisition : latest?.acquisition) || []
        const deviceRows = (useRange ? range.byDevice : latest?.byDevice) || []
        const devices = deviceRows.length
            ? deviceRows
            : (latest?.devices || []).map((row) => ({ device: row.name, sessions: row.value }))
        const listOf = (field) => (useRange ? range[field] : latest?.[field]) || []
        const urlRows = (useRange ? range.byUrl : latest?.byUrl) || []
        const pages = urlRows.length
            ? urlRows.map((row) => ({ name: row.url, value: row.sessions ?? 0 }))
            : latest?.popularPages || []
        const pageDenominator = useRange
            ? history.reduce((sum, entry) => sum + (entry.totals?.sessions || 0), 0)
            : totals.sessions || 0

        return {
            acquisition,
            devices,
            pages,
            pageDenominator,
            channels: toSlices(acquisition, { nameOf: classifyChannel, top: 6, highlight: (name) => name === GOOGLE_ADS }),
            deviceSlices: toSlices(devices, { nameOf: (row) => row.device }),
            countrySlices: toSlices(listOf('countries'), { nameOf: (row) => row.name, valueFor: (row) => row.value }),
            browserSlices: toSlices(listOf('browsers'), { nameOf: (row) => row.name, valueFor: (row) => row.value }),
            osSlices: toSlices(listOf('os'), { nameOf: (row) => row.name, valueFor: (row) => row.value }),
        }
    }, [useRange, range, latest, history, totals.sessions])

    const googleAdsShare = useMemo(() => {
        const rows = latest?.acquisition || []
        const total = rows.reduce((sum, row) => sum + (row.sessions || 0), 0)
        if (!total) return null
        return (rows.filter(isGoogleAds).reduce((sum, row) => sum + (row.sessions || 0), 0) / total) * 100
    }, [latest])

    const header = (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Clarity</h1>
                <p className="text-sm text-slate-500 mt-1">Microsoft Clarity behaviour analytics · project {data?.projectId || CLARITY_PROJECT_ID}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <LinkButton href={links.recordings} icon={PlayCircle} primary>Recordings</LinkButton>
                <LinkButton href={links.heatmaps} icon={Flame}>Heatmaps</LinkButton>
                <LinkButton href={links.dashboard} icon={LayoutDashboard}>Clarity dashboard</LinkButton>
            </div>
        </div>
    )

    if (status === 'locked') {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
                {header}
                <UnlockCard notice="Clarity figures come from a protected server endpoint. Enter the admin password set in Vercel (ADMIN_PANEL_PASSWORD)." onUnlocked={(result) => setSession(result)} />
            </div>
        )
    }

    if (status === 'auth-missing') {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
                {header}
                <SetupCard authMissing />
            </div>
        )
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    const kpis = [
        { label: 'Sessions', value: formatNumber(totals.sessions), key: 'sessions', delta: pctChange(totals.sessions, previousTotals?.sessions), icon: Activity, colour: '#70864f' },
        { label: 'Distinct users', value: formatNumber(totals.users), key: 'users', delta: pctChange(totals.users, previousTotals?.users), icon: Users, colour: '#8b3f96' },
        { label: 'Pages / session', value: formatDecimal(totals.pagesPerSession), key: 'pagesPerSession', delta: pctChange(totals.pagesPerSession, previousTotals?.pagesPerSession), icon: Layers, colour: '#b15d24' },
        { label: 'Active engagement', value: formatDuration(totals.engagementActive), key: 'engagementActive', sub: totals.engagementTotal != null ? `${formatDuration(totals.engagementTotal)} total` : null, delta: pctChange(totals.engagementActive, previousTotals?.engagementActive), icon: Clock, colour: '#9a3b83' },
    ]

    const rings = [
        ...RING_METRICS.map((metric) => ({
            ...metric,
            value: totals[metric.key],
            rating: ratingFor(metric, totals[metric.key]),
            footnote: metric.key !== 'scrollDepth' && totals[metric.key.replace('Pct', '')] != null
                ? `${formatNumber(totals[metric.key.replace('Pct', '')])} events`
                : null,
        })),
        {
            key: 'googleAds',
            label: 'Google Ads share',
            value: googleAdsShare,
            rating: googleAdsShare === null ? 'none' : 'info',
            hint: 'Share of sessions arriving from Google Ads (paid search) in the last 24h.',
        },
    ]

    const lastSync = data?.lastSync
    const budget = data?.budget
    const trendSubtitle = `Last ${days} days · ${history.length} day${history.length === 1 ? '' : 's'} recorded`

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
            {header}

            {/* Sync status bar */}
            <Card className="p-4 border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                        <span>Data window: <b className="text-slate-700">{latest ? `last 24h to ${formatDateTime(latest.capturedAt)}` : '—'}</b></span>
                        <span>Last sync: <b className="text-slate-700">{lastSync ? `${formatDateTime(lastSync.at)} (${lastSync.source})` : 'never'}</b></span>
                        {budget && <span>Clarity calls today: <b className="text-slate-700">{budget.usedToday}/{budget.limit}</b> <span className="text-slate-400">(API max {budget.clarityLimit}, {budget.callsPerSync} per sync)</span></span>}
                        {lastSync?.partial && <span className="text-amber-600 font-semibold">Partial sync: {lastSync.errors?.map((e) => e.key).join(', ')}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <SegmentedControl
                            label="Trend range"
                            value={days}
                            onChange={setDays}
                            options={RANGE_FILTERS.map((value) => ({ key: value, label: `${value}d` }))}
                        />
                        <button
                            onClick={handleSync}
                            disabled={syncing || !data?.configured?.token}
                            title={data?.configured?.token ? 'Pull the last 24h from Clarity now (uses 4 of 10 daily calls)' : 'CLARITY_API_TOKEN not set'}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#995BD5] hover:text-[#995BD5] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            Sync now
                        </button>
                    </div>
                </div>
                {syncMessage && (
                    <p role="status" className={`mt-3 text-xs font-medium ${syncMessage.type === 'success' ? 'text-emerald-600' : syncMessage.type === 'info' ? 'text-slate-500' : 'text-rose-600'}`}>{syncMessage.text}</p>
                )}
                {status === 'error' && <p role="alert" className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
            </Card>

            {!latest ? (
                <SetupCard data={data} />
            ) : (
                <>
                    {/* KPI cards with sparklines */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                        {kpis.map((kpi) => (
                            <Card key={kpi.label} className="p-5 shadow-sm hover:shadow-md transition-all rounded-xl flex flex-col" style={{ backgroundColor: kpi.colour, borderColor: kpi.colour }}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white/80 mb-1">{kpi.label}</p>
                                        <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 min-h-[18px]">
                                            <DeltaBadge value={kpi.delta} light />
                                            {kpi.sub && <span className="text-xs text-white/70">{kpi.sub}</span>}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/15 rounded-full text-white">
                                        <kpi.icon className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Sparkline data={trendData} dataKey={kpi.key} label={`${kpi.label} trend over the last ${history.length} days`} />
                                    {trendData.length < 2 && <p className="h-10 flex items-end text-[11px] text-white/60">Sparkline appears after 2+ days</p>}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Behaviour health rings */}
                    <SectionTitle
                        icon={HeartPulse}
                        title="Behaviour health"
                        subtitle="Share of sessions in the last 24h · green = good, amber = watch, red = needs attention"
                    />
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {rings.map((ring) => (
                            <RingCard key={ring.key} label={ring.label} value={ring.value} rating={ring.rating} hint={ring.hint} footnote={ring.footnote} />
                        ))}
                    </div>
                    {latest.totalsEstimated && (
                        <p className="text-xs text-amber-600">Totals estimated from the device breakdown (the overall Clarity query failed in the last sync).</p>
                    )}

                    {/* Trends */}
                    <SectionTitle icon={LineChartIcon} title="Trends" subtitle={trendSubtitle} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        <TrendCard
                            title="Sessions & users"
                            subtitle={`Last ${days} days`}
                            data={trendData}
                            series={[
                                { key: 'sessions', name: 'Sessions', colour: '#995BD5' },
                                { key: 'users', name: 'Users', colour: '#10b981', fill: false },
                            ]}
                        />
                        <TrendCard
                            title="Engagement time"
                            subtitle="Average per session"
                            data={trendData}
                            formatValue={formatDuration}
                            axisWidth={66}
                            series={[
                                { key: 'engagementActive', name: 'Active', colour: '#9a3b83' },
                                { key: 'engagementTotal', name: 'Total', colour: '#f59e0b', fill: false },
                            ]}
                        />
                        <TrendCard
                            title="Pages per session"
                            subtitle="How deep visitors browse"
                            data={trendData}
                            formatValue={(value) => formatDecimal(value, 1)}
                            series={[{ key: 'pagesPerSession', name: 'Pages / session', colour: '#b15d24' }]}
                        />
                        <TrendCard
                            title="Frustration signals"
                            subtitle="Events per day — lower is better"
                            data={trendData}
                            series={[
                                { key: 'rageClicks', name: 'Rage clicks', colour: '#ef4444' },
                                { key: 'deadClicks', name: 'Dead clicks', colour: '#f59e0b', fill: false },
                                { key: 'quickbacks', name: 'Quickbacks', colour: '#3b82f6', fill: false },
                            ]}
                        />
                    </div>

                    {/* Audience donuts */}
                    <SectionTitle icon={Compass} title="Where visitors come from" subtitle={`${periodLabel} · slices show share of sessions`}>
                        <SegmentedControl
                            label="Breakdown period"
                            value={breakdownMode}
                            onChange={setBreakdownMode}
                            options={[
                                { key: 'latest', label: 'Last 24h' },
                                { key: 'range', label: `Last ${days} days`, disabled: !history.length },
                            ]}
                        />
                    </SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        <DonutCard icon={Megaphone} title="Traffic by channel" subtitle={periodLabel} data={breakdowns.channels} highlightLabel="paid" />
                        <DonutCard icon={Smartphone} title="Devices" subtitle={periodLabel} data={breakdowns.deviceSlices} />
                        <DonutCard icon={Globe2} title="Countries" subtitle={`${periodLabel} · top 5`} data={breakdowns.countrySlices} />
                        <DonutCard icon={Compass} title="Browsers" subtitle={periodLabel} data={breakdowns.browserSlices} />
                        <DonutCard icon={Monitor} title="Operating systems" subtitle={periodLabel} data={breakdowns.osSlices} />
                        <Card className="p-6 border-slate-200 shadow-sm rounded-xl">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#995BD5]" />
                                    <h2 className="text-base font-bold text-slate-900">Top pages</h2>
                                </div>
                                <span className="text-xs font-medium text-slate-400 text-right">{periodLabel} · % of sessions</span>
                            </div>
                            <PageBars rows={breakdowns.pages} totalSessions={breakdowns.pageDenominator} limit={8} />
                        </Card>
                    </div>

                    {/* Secondary detail tables */}
                    <details className="group bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <summary className="flex items-center justify-between gap-3 px-6 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                            <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                                <Layers className="w-4 h-4 text-[#995BD5]" />
                                Details
                                <span className="text-xs font-medium text-slate-400">source / medium / campaign, devices, referrers · {periodLabel}</span>
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-slate-100 divide-y divide-slate-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <caption className="sr-only">Sessions by source, medium and campaign</caption>
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th scope="col" className="text-left px-6 py-3 font-semibold">Source</th>
                                            <th scope="col" className="text-left px-6 py-3 font-semibold">Medium</th>
                                            <th scope="col" className="text-left px-6 py-3 font-semibold">Campaign</th>
                                            <th scope="col" className="text-left px-6 py-3 font-semibold">Channel</th>
                                            <th scope="col" className="text-right px-6 py-3 font-semibold">Sessions</th>
                                            <th scope="col" className="text-right px-6 py-3 font-semibold">Users</th>
                                            <th scope="col" className="text-right px-6 py-3 font-semibold">Pages / session</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {breakdowns.acquisition.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-6 text-center text-slate-400">No acquisition data</td></tr>
                                        ) : breakdowns.acquisition.slice(0, 25).map((row) => (
                                            <tr key={`${row.source}|${row.medium}|${row.campaign}`} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 font-semibold text-slate-900">{row.source}</td>
                                                <td className="px-6 py-3 text-slate-600">{row.medium}</td>
                                                <td className="px-6 py-3 text-slate-600 max-w-[240px] truncate" title={row.campaign}>{row.campaign}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${isGoogleAds(row) ? 'bg-[#995BD5]/10 text-[#995BD5]' : 'bg-slate-100 text-slate-600'}`}>{classifyChannel(row)}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-900">{formatNumber(row.sessions)}</td>
                                                <td className="px-6 py-3 text-right text-slate-600">{formatNumber(row.users)}</td>
                                                <td className="px-6 py-3 text-right text-slate-600">{useRange ? '—' : formatDecimal(row.pagesPerSession)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-slate-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <caption className="sr-only">Sessions by device</caption>
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th scope="col" className="text-left px-6 py-3 font-semibold">Device</th>
                                                <th scope="col" className="text-right px-6 py-3 font-semibold">Sessions</th>
                                                <th scope="col" className="text-right px-6 py-3 font-semibold">Users</th>
                                                <th scope="col" className="text-right px-6 py-3 font-semibold">Rage clicks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {breakdowns.devices.map((row) => (
                                                <tr key={row.device}>
                                                    <td className="px-6 py-3 font-semibold text-slate-900">{row.device}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-slate-900">{formatNumber(row.sessions)}</td>
                                                    <td className="px-6 py-3 text-right text-slate-600">{formatNumber(row.users)}</td>
                                                    <td className="px-6 py-3 text-right text-slate-600">{formatNumber(row.rageClicks ?? 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <caption className="sr-only">Top referrers in the last 24 hours</caption>
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th scope="col" className="text-left px-6 py-3 font-semibold">Referrer (24h)</th>
                                                <th scope="col" className="text-right px-6 py-3 font-semibold">Sessions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(latest.referrers || []).length === 0 ? (
                                                <tr><td colSpan={2} className="px-6 py-6 text-center text-slate-400">No referrers</td></tr>
                                            ) : latest.referrers.slice(0, 10).map((row) => (
                                                <tr key={row.name}>
                                                    <td className="px-6 py-3 text-slate-700 max-w-[320px] truncate" title={row.name}>{row.name}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-slate-900">{formatNumber(row.value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </details>
                    <p className="text-[11px] text-slate-400">New vs returning visitors isn’t included in Clarity’s data export — see it in the Clarity dashboard.</p>
                </>
            )}
        </div>
    )
}

export default Clarity
