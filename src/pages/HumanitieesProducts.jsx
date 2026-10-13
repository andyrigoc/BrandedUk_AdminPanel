import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import {
    AlertTriangle,
    Check,
    ExternalLink,
    Loader2,
    RefreshCw,
    Search,
    Store,
    Trash2,
    X
} from 'lucide-react'

import { API_BASE } from '../config'

const SITE_SLUG = 'humanitiees'

const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
})

const FALLBACK_IMAGE = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="%23f3f4f6"><rect width="48" height="48"/></svg>'

const resolveList = (data) => {
    if (Array.isArray(data)) return data
    return data?.items || data?.products || data?.rows || []
}

const resolveStyleCode = (product) => (
    product?.style_code ||
    product?.code ||
    product?.styleCode ||
    ''
)

const resolveName = (product) => (
    product?.style_name ||
    product?.name ||
    product?.product_name ||
    resolveStyleCode(product)
)

const resolveBrand = (product) => (
    product?.brand_name ||
    product?.brand ||
    product?.brandName ||
    '-'
)

const resolveType = (product) => (
    product?.product_type_name ||
    product?.product_type ||
    product?.type_name ||
    product?.productType ||
    '-'
)

const resolvePrice = (product) => {
    const price = Number(product?.sell_price ?? product?.price ?? product?.sellPrice ?? 0)
    return Number.isFinite(price) ? price : 0
}

const resolveImage = (product) => {
    const source = (
        (product?.image && product.image !== 'Not available' && product.image) ||
        product?.image_url ||
        product?.thumbnail ||
        product?.main_image ||
        product?.colors?.[0]?.thumb ||
        product?.colors?.[0]?.main ||
        ''
    )

    if (!source) return FALLBACK_IMAGE

    if (String(source).includes('absoluteapparel.co.uk')) {
        return `https://images.weserv.nl/?url=${encodeURIComponent(String(source).replace('http://', 'https://'))}`
    }

    return String(source).replace('http://', 'https://')
}

const HumanitieesProducts = () => {
    const navigate = useNavigate()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    const showSuccess = (message) => {
        setSuccessMessage(message)
        window.setTimeout(() => setSuccessMessage(null), 3000)
    }

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_BASE}/api/admin/sites/${SITE_SLUG}/products?active=true&_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch Humanitiees products')
            }

            const data = await response.json()
            setProducts(resolveList(data))
        } catch (err) {
            console.error('Error fetching Humanitiees products:', err)
            setError(err.message || 'Failed to fetch Humanitiees products')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return products

        return products.filter((product) => {
            const code = resolveStyleCode(product).toLowerCase()
            const name = resolveName(product).toLowerCase()
            const brand = resolveBrand(product).toLowerCase()
            return code.includes(query) || name.includes(query) || brand.includes(query)
        })
    }, [products, searchTerm])

    const handleRemoveProduct = async (styleCode) => {
        const confirmed = window.confirm(`Remove ${styleCode} from Humanitiees?`)
        if (!confirmed) return

        try {
            setProcessing(true)
            setError(null)

            const response = await fetch(`${API_BASE}/api/admin/sites/${SITE_SLUG}/products/${encodeURIComponent(styleCode)}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.message || 'Failed to remove product from Humanitiees')
            }

            await fetchProducts()
            showSuccess(`${styleCode} removed from Humanitiees`)
        } catch (err) {
            console.error('Error removing Humanitiees product:', err)
            setError(err.message || 'Failed to remove product from Humanitiees')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400 mb-2 tracking-wide">
                        <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/')}>DASHBOARD</span>
                        <span className="text-gray-300 font-normal">/</span>
                        <span className="text-gray-500">HUMANITIEES PRODUCTS</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Humanitiees Products</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        A simple view of products currently assigned to Humanitiees.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchProducts}
                        className="h-10 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                    <div className="px-4 h-10 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-[0.18em] flex items-center gap-2 shadow-lg shadow-primary/20">
                        <Store className="w-3.5 h-3.5" />
                        {products.length} Active
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Current Humanitiees Products</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Add products from the main Products page using <span className="font-semibold text-slate-700">Actions / Mark as Humanitiees</span>.
                        </p>
                    </div>

                    <div className="relative w-full lg:w-[320px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search current Humanitiees products"
                            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100">
                                <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Image</th>
                                <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Style Code</th>
                                <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                                <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Brand</th>
                                <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Price</th>
                                <th className="py-3 px-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-14 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                        <p className="text-slate-500 mt-3 text-sm font-medium">Loading Humanitiees products...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-14 text-center">
                                        <p className="text-lg font-bold text-slate-900">
                                            {products.length === 0 ? 'No Humanitiees products yet' : 'No products match your search'}
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            {products.length === 0
                                                ? 'Use the main Products page bulk action to mark items as Humanitiees.'
                                                : 'Try a different style code, product name, or brand.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const code = resolveStyleCode(product)

                                    return (
                                        <tr key={code} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
                                                    <img
                                                        src={resolveImage(product)}
                                                        alt={resolveName(product)}
                                                        className="w-full h-full object-contain"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            e.target.src = FALLBACK_IMAGE
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => navigate(`/products/${code}`)}
                                                    className="text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                                                >
                                                    {code}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">{resolveName(product)}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{resolveBrand(product)}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{resolveType(product)}</td>
                                            <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                                                {currencyFormatter.format(resolvePrice(product))}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/products/${code}`)}
                                                        className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-bold"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Open
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveProduct(code)}
                                                        disabled={processing}
                                                        className="h-9 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-40"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Remove
                                                    </button>
                                                </div>
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

export default HumanitieesProducts
