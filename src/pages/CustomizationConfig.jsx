import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { Palette, Plus, Upload, X, Check, Settings, Image as ImageIcon, AlertCircle } from 'lucide-react'

import { API_BASE } from '../config'

const CustomizationConfig = () => {
    const [productTypes, setProductTypes] = useState([])
    const [selectedType, setSelectedType] = useState(null)
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Default positions for different product types
    const defaultPositions = {
        'T-Shirts': [
            { id: 1, name: 'Front Center', code: 'front_center', image: null, maxWidth: 30, maxHeight: 40 },
            { id: 2, name: 'Back Center', code: 'back_center', image: null, maxWidth: 30, maxHeight: 40 },
            { id: 3, name: 'Left Chest', code: 'left_chest', image: null, maxWidth: 10, maxHeight: 10 },
            { id: 4, name: 'Right Chest', code: 'right_chest', image: null, maxWidth: 10, maxHeight: 10 },
        ],
        'Hoodies': [
            { id: 1, name: 'Front Center', code: 'front_center', image: null, maxWidth: 28, maxHeight: 35 },
            { id: 2, name: 'Back Center', code: 'back_center', image: null, maxWidth: 30, maxHeight: 40 },
            { id: 3, name: 'Left Chest', code: 'left_chest', image: null, maxWidth: 8, maxHeight: 8 },
            { id: 4, name: 'Hood', code: 'hood', image: null, maxWidth: 15, maxHeight: 10 },
        ],
        'Caps': [
            { id: 1, name: 'Front Panel', code: 'front_panel', image: null, maxWidth: 10, maxHeight: 6 },
            { id: 2, name: 'Side Left', code: 'side_left', image: null, maxWidth: 5, maxHeight: 5 },
            { id: 3, name: 'Side Right', code: 'side_right', image: null, maxWidth: 5, maxHeight: 5 },
            { id: 4, name: 'Back', code: 'back', image: null, maxWidth: 8, maxHeight: 5 },
        ],
    }

    useEffect(() => {
        fetchProductTypes()
    }, [])

    const fetchProductTypes = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE}/api/products/types`)
            if (!response.ok) throw new Error('Failed to fetch product types')
            const data = await response.json()
            setProductTypes(data.productTypes || [])

            // Select first type by default
            if (data.productTypes?.length > 0) {
                const firstType = data.productTypes[0]
                setSelectedType(firstType)
                setPositions(defaultPositions[firstType.name] || defaultPositions['T-Shirts'])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleTypeChange = (type) => {
        setSelectedType(type)
        setPositions(defaultPositions[type.name] || defaultPositions['T-Shirts'])
    }

    const addPosition = () => {
        const newId = Math.max(...positions.map(p => p.id), 0) + 1
        setPositions([...positions, {
            id: newId,
            name: 'New Position',
            code: `position_${newId}`,
            image: null,
            maxWidth: 20,
            maxHeight: 20
        }])
    }

    const updatePosition = (id, field, value) => {
        setPositions(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ))
    }

    const removePosition = (id) => {
        setPositions(prev => prev.filter(p => p.id !== id))
    }

    const handleSave = async () => {
        setSaving(true)
        // TODO: Call API when available
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSaving(false)
        alert('Configuration saved successfully!')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading configuration...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Customization Configuration</h1>
                <p className="text-gray-500 mt-2">Define print and embroidery positions for each product type</p>
            </div>

            {/* Info Banner */}
            <Card className="p-4 mb-8 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-medium text-blue-800">Configure Customization Areas</div>
                        <div className="text-sm text-blue-700 mt-1">
                            Define where customers can place their designs on each product type. Upload reference images showing available print/embroidery areas.
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Product Type Selector */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Product Types</h2>
                    <div className="space-y-2">
                        {productTypes.slice(0, 15).map((type) => (
                            <button
                                key={type.id}
                                onClick={() => handleTypeChange(type)}
                                className={`w-full text-left px-4 py-3 rounded text-sm font-medium transition-all
                  ${selectedType?.id === type.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Positions Configuration */}
                <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {selectedType?.name} - Customization Positions
                        </h2>
                        <button
                            onClick={addPosition}
                            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Position
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {positions.map((position) => (
                            <Card key={position.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
                                            <Palette className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <input
                                            type="text"
                                            value={position.name}
                                            onChange={(e) => updatePosition(position.id, 'name', e.target.value)}
                                            className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removePosition(position.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Reference Image */}
                                <div className="mb-4">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Reference Image</label>
                                    <div className="aspect-video bg-gray-100 rounded flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-primary transition-colors cursor-pointer">
                                        {position.image ? (
                                            <img src={position.image} alt={position.name} className="w-full h-full object-contain rounded" />
                                        ) : (
                                            <div className="text-center text-gray-400">
                                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                                <span className="text-sm">Upload Image</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dimensions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Max Width (cm)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={position.maxWidth}
                                            onChange={(e) => updatePosition(position.id, 'maxWidth', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Max Height (cm)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={position.maxHeight}
                                            onChange={(e) => updatePosition(position.id, 'maxHeight', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Save Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-primary text-white font-semibold rounded hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CustomizationConfig
