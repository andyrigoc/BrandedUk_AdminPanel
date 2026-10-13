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
import Customers from './pages/Customers'
import Calendar from './pages/Calendar'
import System from './pages/System'
import MarkupOverrides from './pages/MarkupOverrides'
import PriceOverrides from './pages/PriceOverrides'
import Clarity from './pages/Clarity'
import HumanitieesProducts from './pages/HumanitieesProducts'
import HumanitieesCustomers from './pages/HumanitieesCustomers'

import { useState, useEffect } from 'react'
import Login from './pages/Login'
import { API_BASE } from './config'
import { adminFetch, clearAdminSession, getAdminToken, isAdminUser, saveAdminSession } from './adminAuth'

function App() {
  const [user, setUser] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    let active = true
    const validateSession = async () => {
      const token = getAdminToken()
      if (!token) {
        if (active) setInitialLoading(false)
        return
      }

      try {
        const response = await adminFetch(`${API_BASE}/api/auth/me`)
        const result = await response.json().catch(() => ({}))
        const authenticatedUser = result?.data?.user
        if (!response.ok || !isAdminUser(authenticatedUser)) throw new Error('Invalid administrator session')
        if (active) setUser(authenticatedUser)
      } catch {
        clearAdminSession()
      } finally {
        if (active) setInitialLoading(false)
      }
    }

    const expireSession = () => setUser(null)
    window.addEventListener('admin-auth-expired', expireSession)
    validateSession()
    return () => {
      active = false
      window.removeEventListener('admin-auth-expired', expireSession)
    }
  }, [])

  const handleLogin = ({ user: userData, token }) => {
    saveAdminSession(token, userData)
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    clearAdminSession()
  }

  if (initialLoading) return null

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Orders />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
          <Route path="/orders/:orderId" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/system" element={<System />} />
          <Route path="/markup-overrides" element={<MarkupOverrides />} />
          <Route path="/price-overrides" element={<PriceOverrides />} />
          <Route path="/clarity" element={<Clarity />} />
          <Route path="/humanitiees-products" element={<HumanitieesProducts />} />
          <Route path="/humanitiees-customers" element={<HumanitieesCustomers />} />

        </Routes>
      </Layout>
    </Router>
  )
}

export default App
