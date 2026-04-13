import { createContext, useContext, useLayoutEffect, useState } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
    const [dark, setDark] = useState(false)

    // Apply dark class and persist whenever `dark` changes
    useLayoutEffect(() => {
        if (dark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        try { localStorage.setItem('brandeduk-dark', dark) } catch {}
    }, [dark])

    // Pure toggle — no side effects inside the setter
    const toggle = () => setDark(prev => !prev)

    return (
        <ThemeContext.Provider value={{ dark, toggle }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
