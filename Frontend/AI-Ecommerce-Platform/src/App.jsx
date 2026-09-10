import { useState, useEffect } from 'react'
import './App.css'
import { SellerApp } from './components/Seller/SellerApp'
import { CustomerApp } from './components/Customer/CustomerApp'
import { getUserProfile } from './api/userApi'
import { onSessionExpired } from './api/apiClient'

/*
 * The signed-in identity has to survive a full page load, because paying takes
 * the customer off the site entirely and the gateway sends them back with a
 * fresh document. Keeping `user` in React state alone dropped them onto the
 * login screen instead of their order.
 *
 * This stores only what the header renders. It grants nothing: the access
 * token stays in its HttpOnly cookie and every API call is still authorised
 * server-side, so a tampered entry just produces 401s.
 */
const SESSION_KEY = 'intellicart.session'

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.userId && parsed?.role ? parsed : null
  } catch {
    return null
  }
}

function storeSession(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Private browsing can refuse storage; the app still works within a tab.
  }
}

const AUTH_ENDPOINTS = {
  register: 'http://localhost:8090/auth-service/auth/register',
  login: 'http://localhost:8090/auth-service/auth/login',
  logout: 'http://localhost:8090/auth-service/auth/logout',
}

const initialRegisterForm = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  phone: '',
  role: 'CUSTOMER',
}

const initialLoginForm = {
  usernameOrEmail: '',
  password: '',
}

function createFlash(type, title, message, status) {
  return {
    type,
    title,
    message,
    status,
  }
}

function resolveApiMessage(payload, fallbackMessage) {
  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error
    }
  }

  return fallbackMessage
}

async function requestAuth(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw createFlash(
      'error',
      responseData?.error || 'Request failed',
      resolveApiMessage(responseData, 'Please check your details and try again.'),
      response.status,
    )
  }

  return {
    status: response.status,
    data: responseData,
  }
}

function App() {
  const [page, setPage] = useState('register')
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [user, setUser] = useState(null)
  const [flash, setFlash] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [restoring, setRestoring] = useState(true)

  /**
   * Pick the session back up after a reload.
   *
   * The stored entry says who this TAB thinks it is, but the access token is
   * a cookie, and cookies are shared by every tab on the origin. Signing in
   * as a seller in a second tab silently replaces the token this one is
   * using - the UI still shows the customer app while every request now
   * carries the seller's role, and the backend answers "You do not have the
   * required role" on each one.
   *
   * So the cookie is the authority, not sessionStorage: ask the server who
   * the token actually belongs to and use that. A mismatch, or no valid
   * token at all, drops the stale session and sends the customer to login.
   */
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      const stored = readStoredSession()
      if (!stored) {
        if (!cancelled) setRestoring(false)
        return
      }

      try {
        const profile = await getUserProfile()
        if (cancelled) return

        const actual = {
          userId: profile.id,
          username: profile.username,
          role: profile.role,
        }
        if (actual.userId !== stored.userId || actual.role !== stored.role) {
          // Another tab signed in as somebody else.
          storeSession(null)
          setUser(null)
          setPage('login')
          setFlash(createFlash(
            'error',
            'Signed in as someone else',
            `This browser is now signed in as ${actual.username} (${actual.role}). Please log in again.`,
          ))
        } else {
          setUser(actual)
          storeSession(actual)
          setPage('home')
        }
      } catch {
        if (cancelled) return
        // No usable token - the 15-minute access token simply expired.
        storeSession(null)
        setUser(null)
        setPage('login')
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }

    restore()
    return () => { cancelled = true }
  }, [])

  // The refresh token is spent or rejected: nothing the customer clicks will
  // work again until they sign in, so say that once rather than letting every
  // action fail with an authorization error.
  useEffect(() => onSessionExpired(() => {
    storeSession(null)
    setUser(null)
    setPage('login')
    setFlash(createFlash(
      'error',
      'Session expired',
      'Your session has ended. Please log in again to continue.',
    ))
  }), [])

  const switchToLogin = () => {
    setPage('login')
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFlash(null)

    try {
      const payload = {
        ...registerForm,
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
      }

      const response = await requestAuth(AUTH_ENDPOINTS.register, payload)
      setFlash(
        createFlash(
          'success',
          'Registration successful',
          resolveApiMessage(response.data, 'Account created successfully. Please sign in.'),
          response.status,
        ),
      )
      setPage('login')
      setLoginForm((current) => ({
        ...current,
        usernameOrEmail: payload.username,
      }))
      setRegisterForm(initialRegisterForm)
    } catch (error) {
      if (error?.type === 'error') {
        setFlash(error)
      } else {
        setFlash(
          createFlash(
            'error',
            'Network error',
            'Unable to reach the server. Please ensure backend services are running.',
          ),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFlash(null)

    try {
      const payload = {
        usernameOrEmail: loginForm.usernameOrEmail.trim(),
        password: loginForm.password,
      }

      const response = await requestAuth(AUTH_ENDPOINTS.login, payload)
      const signedIn = {
        userId: response.data?.userId,
        username: response.data?.username,
        role: response.data?.role,
      }
      setUser(signedIn)
      storeSession(signedIn)
      setPage('home')
      setLoginForm(initialLoginForm)
      setFlash(
        createFlash(
          'success',
          'Login successful',
          resolveApiMessage(response.data, 'Welcome back to IntelliCart.'),
          response.status,
        ),
      )
    } catch (error) {
      if (error?.type === 'error') {
        setFlash(error)
      } else {
        setFlash(
          createFlash(
            'error',
            'Network error',
            'Unable to reach the server. Please ensure backend services are running.',
          ),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setIsSubmitting(true)
    setFlash(null)

    try {
      const response = await requestAuth(AUTH_ENDPOINTS.logout, {})
      setUser(null)
      storeSession(null)
      setPage('login')
      setFlash(
        createFlash(
          'success',
          'Logged out',
          resolveApiMessage(response.data, 'You have been logged out successfully.'),
          response.status,
        ),
      )
    } catch (error) {
      if (error?.type === 'error') {
        setFlash(error)
      } else {
        setFlash(
          createFlash(
            'error',
            'Network error',
            'Unable to reach the server. Please ensure backend services are running.',
          ),
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Avoid flashing the login form for the split second before the stored
  // session is read back.
  if (restoring) {
    return <main className="app-shell" />
  }

  if (page === 'home' && user) {
    if (user.role === 'SELLER') {
      return <SellerApp user={user} onLogout={handleLogout} />
    }
    return <CustomerApp user={user} onLogout={handleLogout} />
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <header className="card-header">
          <p className="eyebrow">IntelliCart</p>
          <h1>Authentication</h1>
          <p className="subtitle">
            {page === 'register' &&
              'Create your account to start your clean and secure shopping journey.'}
            {page === 'login' && 'Sign in to continue to your ecommerce dashboard.'}
          </p>
        </header>

        {flash && (
          <div className={`flash flash-${flash.type}`} role="status" aria-live="polite">
            <strong>{flash.title}</strong>
            <span>{flash.message}</span>
            {flash.status && <small>Status: {flash.status}</small>}
          </div>
        )}

        {page === 'register' && (
          <form className="form-grid" onSubmit={handleRegisterSubmit}>
            <label>
              First Name
              <input
                name="firstName"
                type="text"
                value={registerForm.firstName}
                onChange={handleRegisterChange}
                required
              />
            </label>
            <label>
              Last Name
              <input
                name="lastName"
                type="text"
                value={registerForm.lastName}
                onChange={handleRegisterChange}
              />
            </label>
            <label>
              Username
              <input
                name="username"
                type="text"
                value={registerForm.username}
                onChange={handleRegisterChange}
                required
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                required
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                value={registerForm.phone}
                onChange={handleRegisterChange}
              />
            </label>
            <label className="full-width">
              Role
              <select name="role" value={registerForm.role} onChange={handleRegisterChange}>
                <option value="CUSTOMER">Customer</option>
                <option value="SELLER">Seller</option>
              </select>
            </label>
            <div className="action-row full-width">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Register'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={switchToLogin}>
                Go to Login
              </button>
            </div>
          </form>
        )}

        {page === 'login' && (
          <form className="form-stack" onSubmit={handleLoginSubmit}>
            <label>
              Username or Email
              <input
                name="usernameOrEmail"
                type="text"
                value={loginForm.usernameOrEmail}
                onChange={handleLoginChange}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
              />
            </label>
            <div className="action-row">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage('register')}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

      </section>
    </main>
  )
}

export default App
