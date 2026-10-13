const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE = configuredApiBase || (import.meta.env.DEV ? '' : 'https://api.brandeduk.com')
