import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import { ArrowLeft, XCircle, CheckCircle, Save, X, Edit3, Package, Palette, DollarSign, FileText, Image as ImageIcon, Calculator, TrendingUp, AlertCircle, Plus, Star, Sparkles, Camera, Trash2, ListRestart, Layers, Info } from 'lucide-react'

import { API_BASE } from '../config'

const ProductDetail = () => {
    const navigate = useNavigate()
    const { code } = useParams()

    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [selectedColor, setSelectedColor] = useState(null)
    const [selectedImage, setSelectedImage] = useState(null)

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({})
    const [newMainImageFile, setNewMainImageFile] = useState(null)
    const [newMainImagePreview, setNewMainImagePreview] = useState(null)
    const [saving, setSaving] = useState(false)

    // Pricing calculator state
    const [pricingMode, setPricingMode] = useState(false)
    const [editCartonPrice, setEditCartonPrice] = useState('')
    const [editMarkupTier, setEditMarkupTier] = useState('')
    const [priceBreaksEditData, setPriceBreaksEditData] = useState([])
    const [savingPrice, setSavingPrice] = useState(false)
    const [savingOverrides, setSavingOverrides] = useState(false)

    // Price Overrides State
    const [priceOverrides, setPriceOverrides] = useState({
        has_overrides: false,
        overrides: [],
        global_tiers: []
    })
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [overridesLocked, setOverridesLocked] = useState(true)

    // Add Color state
    const [addColorModal, setAddColorModal] = useState(false)
    const [newColorName, setNewColorName] = useState('')
    const [newColorFile, setNewColorFile] = useState(null)
    const [newColorPreview, setNewColorPreview] = useState(null)
    const [uploadingColor, setUploadingColor] = useState(false)

    // Local input management to allow clearing/typing freely
    const [focusedInput, setFocusedInput] = useState(null) // 'sell' or 'unit-{index}'
    const [localInputVal, setLocalInputVal] = useState('')

    useEffect(() => {
        fetchProduct()
    }, [code])

    const fetchProduct = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/products/${code}`)
            if (!response.ok) throw new Error('Failed to fetch product')
            const data = await response.json()
            setProduct(data)

            // Set default selected image
            const primaryImage = (data.image && data.image !== 'Not available') ? data.image : null
            const mainImage = data.images?.find(img => img.type === 'main')

            if (primaryImage) {
                setSelectedImage(primaryImage)
            } else if (mainImage) {
                setSelectedImage(mainImage.url)
            } else if (data.colors?.length > 0) {
                setSelectedImage(data.colors[0].main)
                setSelectedColor(data.colors[0])
            }

            // Initialize edit data
            setEditData({
                style_name: data.name || '',
                specification: data.description || '',
                fabric_description: data.details?.fabric || '',
                is_best_seller: data.is_best_seller || false,
                is_recommended: data.is_recommended || false,
                primary_image_url: (data.image && data.image !== 'Not available') ? data.image : (data.images?.find(img => img.type === 'main')?.url || '')
            })

            // Initialize carton price and markup tier
            setEditCartonPrice((data.carton_price || data.cartonPrice || 0).toString())
            setEditMarkupTier((data.markup_tier || data.markupPercent || 0).toString())

            // Fetch specific price overrides data
            await fetchPriceOverridesData()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchPriceOverridesData = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/products/${code}/price-overrides`)
            if (!response.ok) throw new Error('Failed to fetch price overrides')
            const data = await response.json()
            setPriceOverrides(data)
            setIsCustomMode(data.has_overrides)

            // Initialize edit data for the table
            const currentTiers = data.has_overrides ? data.overrides : data.global_tiers
            setPriceBreaksEditData(currentTiers.map(t => ({
                min_qty: t.min_qty,
                max_qty: t.max_qty,
                discount_percent: t.discount_percent
            })))
        } catch (err) {
            console.error('Error fetching price overrides:', err)
        }
    }

    // Real-time price calculations
    const calculatedPrices = useMemo(() => {
        if (!product) return null

        const cartonPrice = parseFloat(editCartonPrice) || 0
        const markupPercent = parseFloat(editMarkupTier) || 0

        // Calculate new sell price based on carton price and markup
        const newSellPrice = cartonPrice * (1 + markupPercent / 100)

        // Calculate ratio for price breaks
        const originalCartonPrice = product.carton_price || product.cartonPrice || 1
        const priceRatio = cartonPrice / originalCartonPrice

        // Calculate new price breaks based on current UI state (edit data)
        const newPriceBreaks = priceBreaksEditData.map(pb => ({
            ...pb,
            min: pb.min_qty,
            max: pb.max_qty,
            percentage: pb.discount_percent,
            price: Number((newSellPrice * (1 - pb.discount_percent / 100)).toFixed(2))
        }))

        // Calculate difference from original
        const originalSellPrice = product.sell_price || product.price || 0
        const priceDifference = newSellPrice - originalSellPrice
        const percentChange = originalSellPrice > 0 ? ((priceDifference / originalSellPrice) * 100) : 0

        return {
            cartonPrice,
            sellPrice: newSellPrice,
            priceBreaks: newPriceBreaks,
            priceDifference,
            percentChange,
            hasChanges: Math.abs(cartonPrice - (product.carton_price || product.cartonPrice || 0)) > 0.001 ||
                Math.abs(markupPercent - (product.markup_tier || product.markupPercent || 0)) > 0.001
        }
    }, [product, editCartonPrice, editMarkupTier])

    const priceBreaksModified = useMemo(() => {
        const originalTiers = priceOverrides.has_overrides ? priceOverrides.overrides : priceOverrides.global_tiers
        if (!originalTiers || originalTiers.length === 0) return priceBreaksEditData.length > 0
        if (priceBreaksEditData.length !== originalTiers.length) return true
        return priceBreaksEditData.some((pb, i) => {
            const orig = originalTiers[i]
            return pb.min_qty !== orig.min_qty || pb.max_qty !== orig.max_qty || pb.discount_percent !== orig.discount_percent
        })
    }, [priceBreaksEditData, priceOverrides])

    const handleDiscontinue = async () => {
        if (!confirm('Are you sure you want to discontinue this product?')) return

        try {
            setActionLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${code}/discontinue`, {
                method: 'PUT'
            })
            if (!response.ok) throw new Error('Failed to discontinue product')
            alert('Product discontinued successfully')
            fetchProduct()
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleActivate = async () => {
        try {
            setActionLoading(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${code}/activate`, {
                method: 'PUT'
            })
            if (!response.ok) throw new Error('Failed to activate product')
            setSuccessMessage('Product activated successfully')
            setTimeout(() => setSuccessMessage(null), 3000)
            fetchProduct()
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleToggleFlag = async (flag) => {
        try {
            setActionLoading(true)
            const newValue = !product[flag]

            // Optimistic update
            setProduct(prev => ({ ...prev, [flag]: newValue }))
            setEditData(prev => ({ ...prev, [flag]: newValue }))

            const response = await fetch(`${API_BASE}/api/admin/products/${code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editData,
                    [flag]: newValue
                })
            })

            if (!response.ok) throw new Error('Failed to update product status')

            setSuccessMessage(`${flag.replace(/is_|_/g, ' ').trim()} updated!`)
            setTimeout(() => setSuccessMessage(null), 2000)
        } catch (err) {
            // Revert on error
            setProduct(prev => ({ ...prev, [flag]: !product[flag] }))
            setEditData(prev => ({ ...prev, [flag]: !product[flag] }))
            setError('Error: ' + err.message)
            setTimeout(() => setError(null), 5000)
        } finally {
            setActionLoading(false)
        }
    }

    const handleSaveChanges = async () => {
        try {
            setSaving(true)

            // 1. Save text details
            const response = await fetch(`${API_BASE}/api/admin/products/${code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            })
            if (!response.ok) throw new Error('Failed to update product details')

            // 2. Upload new main image if selected (file upload takes precedence over URL if both are provided)
            if (newMainImageFile) {
                const formData = new FormData()
                formData.append('image', newMainImageFile)

                const imgResponse = await fetch(`${API_BASE}/api/admin/products/${code}/image`, {
                    method: 'PUT',
                    body: formData
                })

                if (!imgResponse.ok) {
                    const errorData = await imgResponse.json().catch(() => ({}))
                    throw new Error(errorData.message || 'Failed to update product image')
                }
            }

            setIsEditing(false)
            setNewMainImageFile(null)
            setNewMainImagePreview(null)
            await fetchProduct()
            setSuccessMessage('Product updated successfully!')
            setTimeout(() => setSuccessMessage(null), 5000)
        } catch (err) {
            setError('Error saving: ' + err.message)
            setTimeout(() => setError(null), 5000)
        } finally {
            setSaving(false)
        }
    }

    const handleSavePricing = async () => {
        try {
            setSavingPrice(true)

            // 1. Update carton price (base cost)
            const cartonResponse = await fetch(`${API_BASE}/api/admin/products/${code}/carton-price`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carton_price: parseFloat(editCartonPrice),
                    markup_tier: parseFloat(editMarkupTier)
                })
            })

            if (!cartonResponse.ok) {
                const errorData = await cartonResponse.json().catch(() => ({}))
                throw new Error(errorData.message || 'Failed to update carton price')
            }

            // 2. Update markup using the bulk override API
            await fetch(`${API_BASE}/api/admin/products/bulk-markup-override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    overrides: [{
                        style_code: code,
                        markup_percent: parseFloat(editMarkupTier)
                    }]
                })
            })

            // 3. Update Price Overrides if modified
            if (priceBreaksModified) {
                // Validate ranges
                for (let i = 0; i < priceBreaksEditData.length; i++) {
                    const current = priceBreaksEditData[i];
                    if (current.min_qty >= current.max_qty && current.max_qty !== 99999) {
                        throw new Error(`Invalid range in tier ${i + 1}: Min must be less than Max.`);
                    }
                    if (i > 0) {
                        const prev = priceBreaksEditData[i - 1];
                        if (current.min_qty <= prev.max_qty) {
                            throw new Error(`Overlap detected between tier ${i} and ${i + 1}.`);
                        }
                    }
                }

                const overridesResponse = await fetch(`${API_BASE}/api/admin/products/${code}/price-overrides`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        replaceAll: true,
                        overrides: priceBreaksEditData
                    })
                })

                if (!overridesResponse.ok) {
                    const errorData = await overridesResponse.json().catch(() => ({}))
                    throw new Error(errorData.message || 'Failed to update price overrides')
                }
            }

            setPricingMode(false)
            setOverridesLocked(true)
            await fetchProduct()

            setSuccessMessage(`Success! Product pricing and discounts updated.`)
            setTimeout(() => setSuccessMessage(null), 5000)
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
        } finally {
            setSavingPrice(false)
        }
    }

    const handleResetToGlobal = async () => {
        if (!confirm('Revert to global price breaks? All custom tiers for this product will be deleted.')) return

        try {
            setSavingOverrides(true)
            const response = await fetch(`${API_BASE}/api/admin/products/${code}/price-overrides`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replaceAll: true,
                    overrides: []
                })
            })

            if (!response.ok) throw new Error('Failed to reset price overrides')

            setIsCustomMode(false)
            setPricingMode(false)
            await fetchProduct()
            setSuccessMessage('Successfully reverted to global price breaks')
            setTimeout(() => setSuccessMessage(null), 5000)
        } catch (err) {
            setError(err.message)
        } finally {
            setSavingOverrides(false)
        }
    }

    const handleAddTier = () => {
        const lastTier = priceBreaksEditData[priceBreaksEditData.length - 1]
        const nextMin = lastTier ? lastTier.max_qty + 1 : 1
        setPriceBreaksEditData([...priceBreaksEditData, {
            min_qty: nextMin,
            max_qty: nextMin + 10,
            discount_percent: 0
        }])
    }

    const handleRemoveTier = (index) => {
        if (priceBreaksEditData.length <= 1) {
            alert('At least one price tier is required.')
            return
        }
        const newData = [...priceBreaksEditData]
        newData.splice(index, 1)
        setPriceBreaksEditData(newData)
    }

    const handleCancelEdit = () => {
        setEditData({
            style_name: product.name || '',
            specification: product.description || '',
            fabric_description: product.details?.fabric || ''
        })
        setIsEditing(false)
        setNewMainImageFile(null)
        setNewMainImagePreview(null)
    }

    const handleCancelPricing = () => {
        setEditCartonPrice((product.carton_price || product.cartonPrice || 0).toString())
        setEditMarkupTier((product.markup_tier || product.markupPercent || 0).toString())
        setPriceBreaksEditData(product.priceBreaks?.map(pb => ({
            min_qty: pb.min,
            max_qty: pb.max,
            discount_percent: pb.percentage || 0
        })) || [])
        setPricingMode(false)
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setNewColorFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setNewColorPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUploadColor = async () => {
        if (!newColorName || !newColorFile) {
            alert('Please provide both a color name and an image file.')
            return
        }

        try {
            setUploadingColor(true)
            const formData = new FormData()
            formData.append('color_name', newColorName)
            formData.append('image', newColorFile)

            const response = await fetch(`${API_BASE}/api/admin/products/${code}/colors`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to upload color variant')
            }

            // Reset and refresh
            setAddColorModal(false)
            setNewColorName('')
            setNewColorFile(null)
            setNewColorPreview(null)
            await fetchProduct()
            alert('Color variant added successfully!')
        } catch (err) {
            alert('Upload error: ' + err.message)
        } finally {
            setUploadingColor(false)
        }
    }

    const handleCloseColorModal = () => {
        setAddColorModal(false)
        setNewColorName('')
        setNewColorFile(null)
        setNewColorPreview(null)
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Package },
        { id: 'pricing', label: 'Pricing', icon: DollarSign },
        { id: 'colors', label: `Colors (${product?.colors?.length || 0})`, icon: Palette },
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'images', label: `Images (${product?.images?.length || 0})`, icon: ImageIcon }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading product...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <div className="text-red-500 font-medium">Error: {error}</div>
                    <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-gray-500">Product not found</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Breadcrumb & Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Products</button>
                    <span>/</span>
                    <button onClick={() => navigate(`/?type=${product.productType}`)} className="hover:text-primary transition-colors">{product.productType}</button>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{product.code}</span>
                </div>

                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-1 p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-mono font-medium rounded-lg">
                                    {product.code}
                                </span>
                                <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg">
                                    {product.brand}
                                </span>
                                {product.customization?.map((type, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg capitalize">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={() => handleToggleFlag('is_best_seller')}
                                    disabled={actionLoading}
                                    className={`group relative h-10 px-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-2 ${product.is_best_seller
                                        ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200/50'
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Star className={`w-4 h-4 transition-transform duration-500 ${product.is_best_seller ? 'fill-white text-white scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Best Seller</span>
                                </button>

                                <button
                                    onClick={() => handleToggleFlag('is_recommended')}
                                    disabled={actionLoading}
                                    className={`group relative h-10 px-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-2 ${product.is_recommended
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Sparkles className={`w-4 h-4 transition-transform duration-500 ${product.is_recommended ? 'fill-white text-white scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Recommended</span>
                                </button>

                                <div className="w-px h-8 bg-gray-200 mx-1" />
                            </>
                        )}

                        {(isEditing || pricingMode) ? (
                            <>
                                <button
                                    onClick={() => {
                                        handleCancelEdit()
                                        handleCancelPricing()
                                    }}
                                    className="inline-flex items-center px-5 py-2.5 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (isEditing) handleSaveChanges()
                                        if (pricingMode) handleSavePricing()
                                    }}
                                    disabled={saving || savingPrice}
                                    className="inline-flex items-center px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-accent transition-colors disabled:opacity-50 shadow-lg shadow-primary/25"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving || savingPrice ? 'Saving...' : 'Save All Changes'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    if (activeTab === 'pricing') setPricingMode(true)
                                    else setIsEditing(true)
                                }}
                                className="inline-flex items-center px-5 py-2.5 border-2 border-gray-200 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                {activeTab === 'pricing' ? 'Edit Pricing' : 'Edit Details'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
                <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 animate-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-bold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto opacity-50 hover:opacity-100 p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Tabs - Pill Style */}
            <div className="bg-gray-100 p-1 mb-8 inline-flex rounded-full shadow-inner border border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center px-6 py-2 text-sm font-bold rounded-full transition-all
                ${activeTab === tab.id
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Product Image - 3 cols */}
                        <div className="lg:col-span-3">
                            <Card className="p-6 h-full">
                                <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden mb-6 relative group">
                                    <img
                                        src={newMainImagePreview || selectedImage || product.images?.[0]?.url}
                                        alt={product.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23f3f4f6"><rect width="400" height="400"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="20">No Image</text></svg>'
                                        }}
                                    />

                                    {isEditing && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <label className="cursor-pointer px-4 py-2 bg-white rounded-xl font-bold text-sm text-gray-900 shadow-xl hover:bg-gray-50 transition-transform hover:scale-105 flex items-center gap-2">
                                                <Camera className="w-4 h-4" />
                                                Change Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0]
                                                        if (file) {
                                                            setNewMainImageFile(file)
                                                            const reader = new FileReader()
                                                            reader.onloadend = () => setNewMainImagePreview(reader.result)
                                                            reader.readAsDataURL(file)
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Color Thumbnails */}
                                {product.colors && product.colors.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Color</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {product.colors.slice(0, 10).map((color, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedColor(color)
                                                        setSelectedImage(color.main)
                                                    }}
                                                    className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all
                            ${selectedColor?.name === color.name
                                                            ? 'ring-3 ring-primary ring-offset-2'
                                                            : 'ring-1 ring-gray-200 hover:ring-gray-300'
                                                        }`}
                                                    title={color.name}
                                                >
                                                    <img
                                                        src={color.thumb}
                                                        alt={color.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="%23e5e7eb"><rect width="56" height="56"/></svg>'
                                                        }}
                                                    />
                                                </button>
                                            ))}
                                            {product.colors.length > 10 && (
                                                <button
                                                    onClick={() => setActiveTab('colors')}
                                                    className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                                >
                                                    +{product.colors.length - 10}
                                                </button>
                                            )}
                                            {/* Mini Add Color Placeholder */}
                                            <button
                                                onClick={() => setAddColorModal(true)}
                                                className="w-14 h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all text-gray-400 hover:text-primary"
                                                title="Add New Color"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Product Info - 2 cols */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick Pricing */}
                            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Pricing</h3>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setActiveTab('pricing')}
                                            className="text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                                        >
                                            View Details →
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveTab('pricing')
                                                setPricingMode(true)
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/20 transition-all border border-primary/20"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                            Edit Price
                                        </button>
                                    </div>
                                </div>
                                <div className="text-4xl font-bold text-gray-900 mb-2">
                                    £{Number(product.sell_price || product.price || 0).toFixed(2)}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500">Carton: £{Number(product.carton_price || product.cartonPrice || 0).toFixed(2)}</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        {product.markup_tier || product.markupPercent || 0}% markup
                                    </span>
                                </div>
                            </Card>

                            {/* Quick Info */}
                            <Card className="p-6">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Product Info</h3>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                            <input
                                                type="text"
                                                value={editData.style_name}
                                                onChange={(e) => setEditData({ ...editData, style_name: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fabric</label>
                                            <input
                                                type="text"
                                                value={editData.fabric_description}
                                                onChange={(e) => setEditData({ ...editData, fabric_description: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Image URL</label>
                                            <input
                                                type="text"
                                                value={editData.primary_image_url}
                                                onChange={(e) => {
                                                    setEditData({ ...editData, primary_image_url: e.target.value })
                                                    setSelectedImage(e.target.value)
                                                }}
                                                placeholder="https://example.com/image.jpg"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-xs"
                                            />
                                            <p className="mt-1 text-[10px] text-gray-400">Updating this URL will propagate to all variants of this style.</p>
                                        </div>

                                        <div className="pt-2 flex flex-col gap-3">
                                            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-50 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.is_best_seller}
                                                    onChange={(e) => setEditData({ ...editData, is_best_seller: e.target.checked })}
                                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                <div>
                                                    <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Best Seller</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pin to best seller featured section</div>
                                                </div>
                                            </label>

                                            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-50 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={editData.is_recommended}
                                                    onChange={(e) => setEditData({ ...editData, is_recommended: e.target.checked })}
                                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                <div>
                                                    <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Recommended</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mark as staff favorite/recommended</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                            <span className="text-gray-500">Brand</span>
                                            <span className="font-semibold text-gray-900">{product.brand}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                            <span className="text-gray-500">Type</span>
                                            <span className="font-semibold text-gray-900">{product.productType}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                            <span className="text-gray-500">Sizes</span>
                                            <span className="font-semibold text-gray-900">{product.sizes?.join(', ') || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-gray-500">Colors</span>
                                            <span className="font-semibold text-gray-900">{product.colors?.length || 0} available</span>
                                        </div>

                                        <div className="pt-6 grid grid-cols-2 gap-3 border-t border-gray-100">
                                            <button
                                                onClick={handleActivate}
                                                disabled={actionLoading}
                                                className="inline-flex items-center justify-center px-4 py-2.5 bg-white border-2 border-green-100 text-green-700 text-xs font-bold rounded-xl hover:bg-green-50 hover:border-green-200 transition-all disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 mr-2" />
                                                Activate
                                            </button>
                                            <button
                                                onClick={handleDiscontinue}
                                                disabled={actionLoading}
                                                className="inline-flex items-center justify-center px-4 py-2.5 bg-white border-2 border-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50"
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-2" />
                                                Discontinue
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Fabric Info */}
                            {product.details?.fabric && (
                                <Card className="p-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Fabric</h3>
                                    <p className="text-gray-900 font-medium">{product.details.fabric}</p>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                    <div className="space-y-8">
                        {/* Pricing Calculator */}
                        <Card className="p-8 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Calculator className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Pricing Calculator</h2>
                                        <p className="text-sm text-gray-500">Adjust carton price to see real-time calculations</p>
                                    </div>
                                </div>

                                {pricingMode ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCancelPricing}
                                            className="px-4 py-2 border-2 border-gray-300 text-sm font-semibold rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSavePricing}
                                            disabled={savingPrice || (!calculatedPrices?.hasChanges && !priceBreaksModified)}
                                            className="px-6 py-2.5 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-accent transition-all disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center gap-2"
                                        >
                                            <Save className="w-4 h-4" />
                                            {savingPrice ? 'SAVING...' : 'SAVE PRICING'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setPricingMode(true)}
                                        className="px-6 py-2.5 bg-primary/10 text-primary text-sm font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2"
                                    >
                                        <Calculator className="w-4 h-4" />
                                        ENTER EDIT MODE
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Carton Price Input */}
                                <div className={`p-6 rounded-2xl transition-all ${pricingMode ? 'bg-primary/5 border-2 border-primary/20' : 'bg-white border-2 border-gray-100'}`}>
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Carton Price</label>
                                    {pricingMode ? (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">£</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={editCartonPrice}
                                                onChange={(e) => setEditCartonPrice(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-gray-900 border-2 border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-3xl font-bold text-gray-900">
                                            £{Number(product.carton_price || product.cartonPrice || 0).toFixed(2)}
                                        </div>
                                    )}
                                </div>

                                {/* Markup */}
                                <div className={`p-6 rounded-2xl transition-all ${pricingMode ? 'bg-primary/5 border-2 border-primary/20' : 'bg-white border-2 border-gray-100'}`}>
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Markup %</label>
                                    {pricingMode ? (
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={editMarkupTier === '0' ? '' : editMarkupTier}
                                                placeholder="0.00"
                                                onChange={(e) => setEditMarkupTier(e.target.value)}
                                                className="w-full pr-8 py-3 text-2xl font-bold text-gray-900 border-2 border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">%</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-3xl font-bold text-gray-900">
                                                {product.markup_tier || product.markupPercent || 0}%
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Based on pricing tier</p>
                                        </>
                                    )}
                                </div>

                                {/* Calculated Sell Price */}
                                <div className={`p-6 rounded-2xl transition-all ${pricingMode ? 'bg-primary/5 border-2 border-primary/20' : 'bg-white border-2 border-gray-100'}`}>
                                    <label className={`text-sm font-semibold uppercase tracking-wide mb-2 block ${pricingMode ? 'text-primary' : 'text-gray-500'}`}>
                                        {pricingMode ? 'Edit Sell Price' : 'Sell Price'}
                                    </label>
                                    {pricingMode ? (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">£</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={focusedInput === 'sell' ? localInputVal : calculatedPrices?.sellPrice.toFixed(2)}
                                                onFocus={() => {
                                                    setFocusedInput('sell')
                                                    setLocalInputVal(calculatedPrices?.sellPrice.toFixed(2))
                                                }}
                                                onBlur={() => {
                                                    setFocusedInput(null)
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLocalInputVal(val);

                                                    if (val === '') return;

                                                    const newSellPrice = parseFloat(val);
                                                    const cartonPrice = parseFloat(editCartonPrice) || 0;

                                                    if (cartonPrice > 0.01) {
                                                        const newMarkup = ((newSellPrice / cartonPrice) - 1) * 100;
                                                        if (newMarkup > -100 && newMarkup < 1000000) {
                                                            setEditMarkupTier(newMarkup.toFixed(2));
                                                        }
                                                    }
                                                }}
                                                className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-gray-900 border-2 border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-3xl font-bold text-gray-900">
                                            £{Number(product.sell_price || product.price || 0).toFixed(2)}
                                        </div>
                                    )}
                                    {pricingMode && calculatedPrices?.hasChanges && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <TrendingUp className={`w-4 h-4 ${calculatedPrices.priceDifference >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                                            <span className="text-sm font-bold text-gray-600">
                                                {calculatedPrices.priceDifference >= 0 ? '+' : ''}£{calculatedPrices.priceDifference.toFixed(2)}
                                                ({calculatedPrices.percentChange >= 0 ? '+' : ''}{calculatedPrices.percentChange.toFixed(1)}%)
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Base Price */}
                                <div className="p-6 bg-white rounded-2xl border-2 border-gray-100">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Base Price</label>
                                    <div className="text-3xl font-bold text-gray-900">
                                        £{Number(product.basePrice || product.price || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Price Breaks */}
                        <Card className="overflow-hidden border-2 border-slate-200 shadow-sm">
                            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                                            Quantity Price Breaks
                                            {isCustomMode ? (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-200">Custom</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-200">Global Default</span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {isCustomMode ? 'Strict override logic: system uses these exact tiers.' : 'Using system-wide default price break tiers.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {pricingMode ? (
                                        <>
                                            {isCustomMode && (
                                                <button
                                                    onClick={handleResetToGlobal}
                                                    className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-100 transition-colors"
                                                >
                                                    <ListRestart className="w-3.5 h-3.5 mr-2" />
                                                    Reset to Global
                                                </button>
                                            )}
                                            <button
                                                onClick={handleSavePricing}
                                                disabled={savingPrice || (!calculatedPrices?.hasChanges && !priceBreaksModified)}
                                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                                            >
                                                <Save className="w-3.5 h-3.5 mr-2" />
                                                {savingPrice ? 'Saving...' : 'SAVE ALL PRICING'}
                                            </button>
                                            <button
                                                onClick={handleAddTier}
                                                className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 border border-primary/20 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-2" />
                                                Add Tier
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                            <Info className="w-3 h-3" />
                                            Click Enter Edit Mode to modify
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="text-left py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Min Qty</th>
                                            <th className="text-left py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Max Qty</th>
                                            <th className="text-center py-4 px-8 font-semibold text-xs uppercase text-amber-600 tracking-wide">Discount %</th>
                                            <th className="text-right py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Unit Price</th>
                                            <th className="text-right py-4 px-8 font-semibold text-xs uppercase text-gray-500 tracking-wide">Status</th>
                                            {pricingMode && <th className="py-4 px-8"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {priceBreaksEditData.map((pb, idx) => {
                                            const baseSellPrice = pricingMode ? calculatedPrices.sellPrice : (product.sell_price || product.price)
                                            const discount = pb.discount_percent
                                            const unitPrice = baseSellPrice * (1 - discount / 100)

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-5 px-8">
                                                        {pricingMode ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={pb.min_qty}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0
                                                                        const next = [...priceBreaksEditData]
                                                                        next[idx] = { ...next[idx], min_qty: val }
                                                                        setPriceBreaksEditData(next)
                                                                        setIsCustomMode(true)
                                                                    }}
                                                                    className="w-20 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-primary text-sm font-bold text-slate-700"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-base font-bold text-slate-700">{pb.min_qty.toLocaleString()}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-8">
                                                        {pricingMode ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={pb.max_qty >= 99999 ? '' : pb.max_qty}
                                                                    placeholder="∞"
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === '' ? 99999 : (parseInt(e.target.value) || 0)
                                                                        const next = [...priceBreaksEditData]
                                                                        next[idx] = { ...next[idx], max_qty: val }
                                                                        setPriceBreaksEditData(next)
                                                                        setIsCustomMode(true)
                                                                    }}
                                                                    className="w-20 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-primary text-sm font-bold text-slate-700"
                                                                />
                                                                {pb.max_qty >= 99999 && <span className="text-xl text-slate-400">∞</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-base font-bold text-slate-700">
                                                                {pb.max_qty >= 99999 ? '∞' : pb.max_qty.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-8 text-center">
                                                        <div className="flex justify-center">
                                                            {pricingMode ? (
                                                                <div className="relative w-24">
                                                                    <input
                                                                        type="number"
                                                                        value={pb.discount_percent}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0
                                                                            const next = [...priceBreaksEditData]
                                                                            next[idx] = { ...next[idx], discount_percent: val }
                                                                            setPriceBreaksEditData(next)
                                                                            setIsCustomMode(true)
                                                                        }}
                                                                        className="w-full pl-3 pr-8 py-2 border-2 border-amber-100 rounded-lg focus:border-amber-500 font-bold text-amber-900 text-sm"
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400">%</span>
                                                                </div>
                                                            ) : (
                                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-sm font-black rounded-lg border border-amber-100">
                                                                    {pb.discount_percent}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-8 text-right">
                                                        <div className="flex flex-col items-end">
                                                            {pricingMode ? (
                                                                <div className="relative w-32">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">£</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="0.00"
                                                                        value={focusedInput === `unit-${idx}` ? localInputVal : unitPrice.toFixed(2)}
                                                                        onFocus={() => {
                                                                            setFocusedInput(`unit-${idx}`)
                                                                            setLocalInputVal(unitPrice.toFixed(2))
                                                                        }}
                                                                        onBlur={() => {
                                                                            setFocusedInput(null)
                                                                        }}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setLocalInputVal(val);

                                                                            if (val === '') return;

                                                                            const newUnitPrice = parseFloat(val);
                                                                            const baseSellPrice = calculatedPrices.sellPrice;

                                                                            if (baseSellPrice > 0.01) {
                                                                                let newDiscount = (1 - (newUnitPrice / baseSellPrice)) * 100;
                                                                                newDiscount = Math.max(-100, Math.min(100, newDiscount));

                                                                                const next = [...priceBreaksEditData];
                                                                                next[idx] = { ...next[idx], discount_percent: parseFloat(newDiscount.toFixed(2)) };
                                                                                setPriceBreaksEditData(next);
                                                                                setIsCustomMode(true);
                                                                            }
                                                                        }}
                                                                        className="w-full pl-7 pr-3 py-2 border-2 border-primary/20 rounded-lg focus:border-primary font-black text-primary text-base text-right"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-lg font-black text-slate-900">
                                                                        £{unitPrice.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Per Unit</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-8 text-right">
                                                        {discount > 0 ? (
                                                            <div className="inline-flex flex-col items-end">
                                                                <span className="text-sm font-black text-green-600">
                                                                    -£{(baseSellPrice - unitPrice).toFixed(2)}
                                                                </span>
                                                                <span className="text-[9px] font-black uppercase text-green-500 bg-green-50 px-1.5 py-0.5 rounded tracking-widest border border-green-100">Discounted</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Base Rate</span>
                                                        )}
                                                    </td>
                                                    {pricingMode && (
                                                        <td className="py-5 px-8 text-right">
                                                            <button
                                                                onClick={() => handleRemoveTier(idx)}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Remove Tier"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {pricingMode && (
                                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                                    <button
                                        onClick={handleAddTier}
                                        className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-primary transition-colors group"
                                    >
                                        <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                        ADD NEW QUANTITY TIER
                                    </button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                    <Card className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Available Colors</h3>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                                {product.colors?.length || 0} colors
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {product.colors?.map((color, idx) => (
                                <div
                                    key={idx}
                                    className="group cursor-pointer"
                                    onClick={() => {
                                        setSelectedColor(color)
                                        setSelectedImage(color.main)
                                        setActiveTab('overview')
                                    }}
                                >
                                    <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 ring-2 ring-gray-100 group-hover:ring-primary transition-all">
                                        <img
                                            src={color.thumb}
                                            alt={color.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e5e7eb"><rect width="100" height="100"/></svg>'
                                            }}
                                        />
                                    </div>
                                    <p className="mt-3 text-sm text-center text-gray-700 font-medium truncate">{color.name}</p>
                                </div>
                            ))}

                            {/* Add New Color Placeholder */}
                            <button onClick={() => setAddColorModal(true)} className="group">
                                <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all text-gray-400 hover:text-primary">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <p className="mt-3 text-sm text-center font-semibold text-gray-400 group-hover:text-primary transition-colors">Add Color</p>
                            </button>
                        </div>
                    </Card>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Description */}
                        <Card className="p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                            {isEditing ? (
                                <textarea
                                    value={editData.specification}
                                    onChange={(e) => setEditData({ ...editData, specification: e.target.value })}
                                    rows={10}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                />
                            ) : (
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {product.description || 'No description available.'}
                                </p>
                            )}
                        </Card>

                        {/* Specifications */}
                        <Card className="p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Specifications</h3>
                            <div className="space-y-4">
                                {product.details?.fabric && (
                                    <div className="flex justify-between items-start py-4 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Fabric</span>
                                        <span className="text-gray-900 font-semibold text-right max-w-xs">{product.details.fabric}</span>
                                    </div>
                                )}
                                {product.details?.weight && (
                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Weight</span>
                                        <span className="text-gray-900 font-semibold">{product.details.weight}</span>
                                    </div>
                                )}
                                {product.details?.fit && (
                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Fit</span>
                                        <span className="text-gray-900 font-semibold">{product.details.fit}</span>
                                    </div>
                                )}
                                {product.sizes && (
                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Available Sizes</span>
                                        <div className="flex gap-2">
                                            {product.sizes.map((size, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg">
                                                    {size}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {product.customization && product.customization.length > 0 && (
                                    <div className="flex justify-between items-center py-4">
                                        <span className="text-gray-500 font-medium">Customization</span>
                                        <div className="flex gap-2">
                                            {product.customization.map((type, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-lg capitalize">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Images Tab */}
                {activeTab === 'images' && (
                    <Card className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Product Images</h3>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                                {product.images?.length || 0} images
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {product.images?.map((image, idx) => (
                                <div
                                    key={idx}
                                    className="group cursor-pointer"
                                    onClick={() => {
                                        setSelectedImage(image.url)
                                        setActiveTab('overview')
                                    }}
                                >
                                    <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 ring-2 ring-gray-100 group-hover:ring-primary transition-all">
                                        <img
                                            src={image.url}
                                            alt={`Product image ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e5e7eb"><rect width="100" height="100"/></svg>'
                                            }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-center">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize
                      ${image.type === 'main' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                                            {image.type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Add Color Modal */}
            {addColorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Add New Color Variant</h3>
                                <button
                                    onClick={handleCloseColorModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Color Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Royal Blue"
                                        value={newColorName}
                                        onChange={(e) => setNewColorName(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Variant Image</label>
                                    <div
                                        onClick={() => document.getElementById('color-upload').click()}
                                        className={`cursor-pointer aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 
                                            ${newColorPreview ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
                                    >
                                        {newColorPreview ? (
                                            <div className="w-full h-full relative group">
                                                <img src={newColorPreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                                    <span className="text-white text-xs font-bold">Click to Change</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                                    <Plus className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-500">Tap to select image</p>
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">JPG, PNG or WEBP</p>
                                            </>
                                        )}
                                        <input
                                            id="color-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleCloseColorModal}
                                        className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUploadColor}
                                        disabled={uploadingColor || !newColorName || !newColorFile}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-primary hover:bg-accent rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                                    >
                                        {uploadingColor ? 'Uploading...' : 'Save Variant'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default ProductDetail
