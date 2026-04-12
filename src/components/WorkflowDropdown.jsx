import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

// Workflow statuses with colors matching the screenshot
export const WORKFLOW_STATUSES = [
    { key: 'New', label: 'New', bg: '#93c5fd', text: '#ffffff', border: '#60a5fa' },
    { key: 'In Warehouse', label: 'In Warehouse', bg: '#ef4444', text: '#ffffff', border: '#dc2626' },
    { key: 'In Queue', label: 'In Queue', bg: '#f97316', text: '#ffffff', border: '#ea580c' },
    { key: 'Production', label: 'Production', bg: '#eab308', text: '#ffffff', border: '#ca8a04' },
    { key: 'Completed', label: 'Completed', bg: '#16a34a', text: '#ffffff', border: '#15803d' },
    { key: 'Ready to Collect', label: 'Ready to Collect', bg: '#1e3a8a', text: '#ffffff', border: '#1e40af' },
    { key: 'Delivered', label: 'Delivered', bg: '#7c3aed', text: '#ffffff', border: '#6d28d9' },
    { key: 'Paid', label: 'Paid', bg: '#db2777', text: '#ffffff', border: '#be185d' },
]

export const getStatusStyle = (statusKey) => {
    return WORKFLOW_STATUSES.find(s => s.key === statusKey) || WORKFLOW_STATUSES[0]
}

const WorkflowDropdown = ({ currentStatus, onStatusChange, disabled = false, size = 'sm' }) => {
    const [open, setOpen] = useState(false)
    const btnRef = useRef(null)
    const menuRef = useRef(null)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

    const calcPosition = useCallback(() => {
        if (!btnRef.current) return
        const rect = btnRef.current.getBoundingClientRect()
        const menuH = 340 // approximate max height of 8 items
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow < menuH ? rect.top - menuH - 4 : rect.bottom + 4
        setMenuPos({ top, left: rect.left })
    }, [])

    useEffect(() => {
        const handleClick = (e) => {
            if (btnRef.current && !btnRef.current.contains(e.target) &&
                menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    useEffect(() => {
        if (!open) return
        calcPosition()
        const onScroll = () => calcPosition()
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onScroll)
        }
    }, [open, calcPosition])

    const current = getStatusStyle(currentStatus)
    const isSmall = size === 'sm'

    return (
        <div className="relative inline-block">
            <button
                ref={btnRef}
                onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen(!open) }}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 rounded-md font-bold uppercase tracking-wider transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
                }`}
                style={{
                    backgroundColor: current.bg,
                    color: current.text,
                    borderColor: current.border,
                }}
            >
                {current.label}
                <ChevronDown className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden min-w-[180px]"
                    style={{ top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                >
                    {WORKFLOW_STATUSES.map((status) => {
                        const isActive = status.key === currentStatus
                        return (
                            <button
                                key={status.key}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(status.key)
                                    setOpen(false)
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold transition-all hover:bg-slate-50 ${
                                    isActive ? 'bg-slate-50' : ''
                                }`}
                            >
                                <div
                                    className="w-4 h-4 rounded-sm shrink-0 border"
                                    style={{ backgroundColor: status.bg, borderColor: status.border }}
                                />
                                <span className="text-slate-700 flex-1">{status.label}</span>
                                {isActive && (
                                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                                )}
                            </button>
                        )
                    })}
                </div>,
                document.body
            )}
        </div>
    )
}

export default WorkflowDropdown