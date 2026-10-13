import React, { useState } from 'react'
import {
    User,
    Lock,
    ArrowRight,
    ShieldCheck,
    Shapes,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react'
import { API_BASE } from '../config'
import { isAdminUser } from '../adminAuth'

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const result = await response.json().catch(() => ({}))
            const user = result?.data?.user
            const token = result?.data?.token

            if (!response.ok || !token || !isAdminUser(user)) {
                throw new Error('Unauthorized access. Please check your administrator credentials.')
            }

            onLogin({ user, token })
        } catch (loginError) {
            setError(loginError.message || 'Unable to sign in right now.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-screen w-full flex bg-[#F8FAFC] overflow-hidden font-sans">

            {/* BRAND SIDEBAR - High-End Aesthetic (60% Width) */}
            <div className="hidden lg:flex w-[60%] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] p-20 flex-col relative shrink-0 overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.1)]">

                {/* Abstract Premium Background Elements */}
                <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-white rounded-full blur-[150px] opacity-10"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#4c1d95] rounded-full blur-[120px] opacity-20"></div>

                {/* Delicate Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full">
                    <div className="flex items-center gap-4 mb-24">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                            <ShieldCheck className="text-white w-7 h-7" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-2xl tracking-tight leading-none">BRANDEDUK</span>
                            <span className="text-purple-200 font-bold text-xs tracking-[0.25em] uppercase mt-1.5">Management Dashboard</span>
                        </div>
                    </div>

                    <div className="max-w-xl">
                        <h2 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] mb-10 tracking-tighter">
                            Welcome Back to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-purple-300">The Powerhouse.</span>
                        </h2>
                        <div className="w-16 h-1.5 bg-white/30 rounded-full mb-10"></div>
                        <p className="text-purple-100/80 text-xl leading-relaxed font-medium max-w-lg">
                            Seamlessly manage your storefront, tracking inventory and prices with precision control.
                        </p>
                    </div>

                    <div className="mt-auto relative">
                        <div className="p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group max-w-md">
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Shapes className="text-white w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="h-2 w-32 bg-white/40 rounded-full mb-2.5"></div>
                                    <div className="h-2 w-full bg-white/20 rounded-full"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                <div className="h-2 w-3/4 bg-white/10 rounded-full"></div>
                            </div>

                            {/* Visual Accent */}
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl"></div>
                        </div>

                        <div className="mt-8 flex items-center gap-3 px-2">
                            <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.6)] animate-pulse"></div>
                            <span className="text-purple-200 font-bold text-xs uppercase tracking-[0.2em]">System Status: Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGIN CONTENT - (40% Width) */}
            <div className="flex-1 lg:w-[40%] flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white relative">
                <div className="max-w-[400px] w-full flex flex-col">

                    <div className="lg:hidden mb-12 flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#7c3aed] rounded-xl flex items-center justify-center shadow-lg">
                            <ShieldCheck className="text-white w-7 h-7" />
                        </div>
                        <span className="text-[#7c3aed] font-black text-2xl tracking-tighter">BRANDEDUK</span>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-[32px] font-black text-slate-900 leading-none tracking-tight mb-3">Login as Admin User</h1>
                        <p className="text-slate-500 text-base font-medium leading-relaxed">
                            Please enter your credentials to access the dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-red-700 shadow-sm animate-shake">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-300 group-focus-within:text-[#7c3aed] transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-slate-900 placeholder-slate-400 font-semibold"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-[#7c3aed] transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 transition-all text-slate-900 placeholder-slate-400 font-semibold"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#7c3aed] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#7c3aed] text-white py-4 px-6 rounded-xl font-bold text-sm tracking-[0.1em] uppercase hover:bg-[#6d28d9] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] mt-4 overflow-hidden relative group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="relative z-10">LOGIN</span>
                                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button className="text-slate-400 text-sm font-semibold hover:text-[#7c3aed] transition-colors flex items-center justify-center gap-2 mx-auto">
                            <AlertCircle className="w-4 h-4" /> Get help signed in
                        </button>
                    </div>

                    <div className="mt-auto pt-12 flex items-center justify-center gap-8 border-t border-slate-50">
                        <button className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Terms of use</button>
                        <button className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Privacy policy</button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}} />
        </div>
    )
}

export default Login
