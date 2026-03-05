import { useState } from 'react'
import Card from '../components/Card'
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react'

import { API_BASE } from '../config'

const System = () => {
    const [refreshing, setRefreshing] = useState(false)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [refreshResult, setRefreshResult] = useState(null)

    const handleRefreshViews = async () => {
        try {
            setRefreshing(true)
            setRefreshResult(null)

            // TODO: Use actual API endpoint when available
            const response = await fetch(`${API_BASE}/api/admin/refresh-views`, {
                method: 'POST'
            })

            if (!response.ok) {
                throw new Error('Failed to refresh views')
            }

            const data = await response.json()
            setLastRefresh(new Date())
            setRefreshResult({ success: true, message: data.message || 'Views refreshed successfully' })
        } catch (err) {
            setRefreshResult({ success: false, message: err.message })
        } finally {
            setRefreshing(false)
        }
    }

    const systemStatus = [
        { name: 'Product Search View', status: 'active', lastUpdate: '2 min ago' },
        { name: 'Category Aggregates', status: 'active', lastUpdate: '2 min ago' },
        { name: 'Brand Statistics', status: 'active', lastUpdate: '5 min ago' },
        { name: 'Price Indexes', status: 'active', lastUpdate: '1 min ago' },
    ]

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">System Tools</h1>
                <p className="text-gray-500 mt-2">Database maintenance and system administration</p>
            </div>

            {/* Refresh Views Card */}
            <Card className="p-8 mb-8 border-gray-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded bg-blue-50 flex items-center justify-center">
                            <Database className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Refresh Materialized Views</h2>
                            <p className="text-gray-500 mt-1">
                                Update cached data to reflect latest changes in products, pricing, and inventory.
                            </p>
                            {lastRefresh && (
                                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    Last refreshed: {lastRefresh.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleRefreshViews}
                        disabled={refreshing}
                        className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh Views'}
                    </button>
                </div>

                {/* Result Message */}
                {refreshResult && (
                    <div className={`mt-6 p-4 rounded flex items-center gap-3
            ${refreshResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {refreshResult.success ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        {refreshResult.message}
                    </div>
                )}
            </Card>

            {/* System Status */}
            <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900">Materialized Views Status</h3>
                </div>

                <div className="divide-y divide-gray-100">
                    {systemStatus.map((item, idx) => (
                        <div key={idx} className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500">Updated {item.lastUpdate}</div>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full capitalize">
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Cache Info */}
            <Card className="p-6 mt-8">
                <h3 className="font-semibold text-gray-900 mb-4">About Materialized Views</h3>
                <p className="text-gray-600 leading-relaxed">
                    Materialized views are pre-computed database queries that improve performance for complex operations
                    like product search and filtering. After making bulk changes to products or pricing, refresh the
                    views to ensure all users see the latest data.
                </p>
            </Card>
        </div>
    )
}

export default System
