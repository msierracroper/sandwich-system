// ARCHIVO: src/pages/Login.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { theme } from '../theme'

const c = theme.color

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.4 5.5A10.4 10.4 0 0 1 12 5c5 0 8.5 3.5 10 7-0.6 1.3-1.4 2.5-2.4 3.5M6.1 6.9C4.2 8.2 2.8 9.9 2 12c1.5 3.5 5 7 10 7 1.2 0 2.3-.2 3.4-.6" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-3.5 5-7 10-7s8.5 3.5 10 7c-1.5 3.5-5 7-10 7s-8.5-3.5-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function Login() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  // Cuando el perfil cargue despues del login, redirige al rol correcto
  useEffect(() => {
    if (!profile) return
    if (profile.role === 'admin')             navigate('/admin',        { replace: true })
    else if (profile.role === 'tomador')      navigate('/tomador',      { replace: true })
    else if (profile.role === 'preparador')   navigate('/preparador',   { replace: true })
    else if (profile.role === 'domiciliario') navigate('/domiciliario', { replace: true })
  }, [profile, navigate])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contrasena incorrectos')
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.brandMark}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11c0-3 4-5 9-5s9 2 9 5" />
              <path d="M3 11h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
              <path d="M6 15l.6 2.4A2 2 0 0 0 8.5 19h7a2 2 0 0 0 1.9-1.6L18 15" />
            </svg>
          </div>
          <h1 style={s.title}>Sandwich System</h1>
          <p style={s.sub}>Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleLogin} style={s.form}>

          {/* Email */}
          <div style={s.field}>
            <label style={s.label} htmlFor="login-email">Correo electronico</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={s.input}
            />
          </div>

          {/* Contrasena con toggle */}
          <div style={s.field}>
            <label style={s.label} htmlFor="login-password">Contrasena</label>
            <div style={s.inputWrap}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={s.inputInner}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={s.eyeBtn}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

        </form>

        <p style={s.footer}>Acceso exclusivo del personal · Sanduchería</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: c.bg, padding: 16,
    fontFamily: theme.font,
  },
  card: {
    backgroundColor: c.surface, borderRadius: 18, border: `1px solid ${c.border}`,
    padding: '36px 28px', width: '100%', maxWidth: 400,
    boxShadow: theme.shadow,
  },
  header: { marginBottom: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  brandMark: {
    width: 56, height: 56, borderRadius: 15, backgroundColor: c.accentSoft,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title:     { fontSize: 21, fontWeight: 800, color: c.ink, margin: '0 0 4px', letterSpacing: '-0.01em', fontFamily: theme.font },
  sub:       { fontSize: 14, color: c.inkSoft, margin: 0, fontFamily: theme.font },
  form:      { display: 'flex', flexDirection: 'column', gap: 18 },
  field:     { display: 'flex', flexDirection: 'column', gap: 7 },
  label:     { fontSize: 13, fontWeight: 600, color: c.inkSoft, fontFamily: theme.font },
  input:     {
    border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px',
    fontSize: 15, color: c.ink, fontFamily: theme.font,
    outline: 'none', backgroundColor: c.bg, width: '100%',
    boxSizing: 'border-box', minHeight: 48,
  },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    border: `1px solid ${c.border}`, borderRadius: 10,
    backgroundColor: c.bg, overflow: 'hidden',
  },
  inputInner: {
    flex: 1, border: 'none', outline: 'none', padding: '12px 14px',
    fontSize: 15, color: c.ink, fontFamily: theme.font,
    backgroundColor: 'transparent', minHeight: 48, boxSizing: 'border-box',
  },
  eyeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '0 14px', color: c.inkFaint,
    display: 'flex', alignItems: 'center', height: 48,
  },
  error: {
    fontSize: 13, color: c.danger, backgroundColor: c.dangerSoft,
    padding: '10px 13px', borderRadius: 8, margin: 0, fontFamily: theme.font,
  },
  btn: {
    backgroundColor: c.accent, color: '#FFFFFF', border: 'none',
    borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700,
    fontFamily: theme.font, marginTop: 4,
  },
  footer: {
    fontSize: 12, color: c.inkFaint, textAlign: 'center',
    marginTop: 22, marginBottom: 0, fontFamily: theme.font,
  },
}
