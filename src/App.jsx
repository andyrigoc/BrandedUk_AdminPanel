import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import MarkupTiers from './pages/MarkupTiers'
import DiscountTiers from './pages/DiscountTiers'
import ProductTypes from './pages/ProductTypes'
import Brands from './pages/Brands'
import FeaturedProducts from './pages/FeaturedProducts'
import FeaturedProductsManage from './pages/FeaturedProductsManage'
import CustomizationConfig from './pages/CustomizationConfig'
import Orders from './pages/Orders'
import Dashboard from './pages/Dashboard'
import System from './pages/System'
import MarkupOverrides from './pages/MarkupOverrides'
import PriceOverrides from './pages/PriceOverrides'

import { useState, useEffect } from 'react'
import Login from './pages/Login'

function App() {
  const [user, setUser] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('admin_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setInitialLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('admin_user', JSON.stringify(userData))
    window.location.href = '/'
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('admin_user')
  }

  if (initialLoading) return null

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:code" element={<ProductDetail />} />
          <Route path="/markup-tiers" element={<MarkupTiers />} />
          <Route path="/discount-tiers" element={<DiscountTiers />} />
          <Route path="/product-types" element={<ProductTypes />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/featured" element={<FeaturedProducts />} />
          <Route path="/featured-products" element={<FeaturedProductsManage />} />
          <Route path="/customization" element={<CustomizationConfig />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/system" element={<System />} />
          <Route path="/markup-overrides" element={<MarkupOverrides />} />
          <Route path="/price-overrides" element={<PriceOverrides />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
