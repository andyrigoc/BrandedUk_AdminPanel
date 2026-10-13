import { API_BASE } from './config'

const TOKEN_KEY = 'admin_auth_token'
const USER_KEY = 'admin_user'
const nativeFetch = window.fetch.bind(window)

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveAdminSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAdminUser(user) {
  return user?.role === 'admin' || user?.role === 'super_admin'
}

export async function adminFetch(input, init = {}) {
  const requestUrl = typeof input === 'string' ? input : input.url
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
  const token = getAdminToken()

  if (token && requestUrl.startsWith(API_BASE)) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await nativeFetch(input, { ...init, headers })
  if (response.status === 401 && requestUrl.startsWith(API_BASE)) {
    clearAdminSession()
    window.dispatchEvent(new Event('admin-auth-expired'))
  }
  return response
}
