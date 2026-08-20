// ARCHIVO: src/pages/Login.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

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
  }, [profile])

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
          <h1 style={s.title}>Bienvenido</h1>
          <p style={s.sub}>Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleLogin} style={s.form}>

          {/* Email */}
          <div style={s.field}>
            <label style={s.label}>Correo electronico</label>
            <input
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
            <label style={s.label}>Contrasena</label>
            <div style={s.inputWrap}>
              <input
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
              >
                {showPassword ? '🙈' : '👁️'}
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
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#F1EFE8', padding: 16,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, border: '0.5px solid #DDDDCC',
    padding: '32px 28px', width: '100%', maxWidth: 380,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  header:    { marginBottom: 24 },
  title:     { fontSize: 22, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px', fontFamily: 'sans-serif' },
  sub:       { fontSize: 13, color: '#666660', margin: 0, fontFamily: 'sans-serif' },
  form:      { display: 'flex', flexDirection: 'column', gap: 16 },
  field:     { display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 12, fontWeight: 500, color: '#444441', fontFamily: 'sans-serif' },
  input:     {
    border: '0.5px solid #B0AFA5', borderRadius: 8, padding: '10px 12px',
    fontSize: 14, color: '#1A1A1A', fontFamily: 'sans-serif',
    outline: 'none', backgroundColor: '#FAFAF8', width: '100%',
    boxSizing: 'border-box',
  },
  inputWrap: {
    display: 'flex', alignItems: 'center',
    border: '0.5px solid #B0AFA5', borderRadius: 8,
    backgroundColor: '#FAFAF8', overflow: 'hidden',
  },
  inputInner: {
    flex: 1, border: 'none', outline: 'none', padding: '10px 12px',
    fontSize: 14, color: '#1A1A1A', fontFamily: 'sans-serif',
    backgroundColor: 'transparent',
  },
  eyeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, padding: '0 12px', color: '#666660',
    display: 'flex', alignItems: 'center',
  },
  error: {
    fontSize: 12, color: '#A32D2D', backgroundColor: '#FCEBEB',
    padding: '8px 12px', borderRadius: 6, margin: 0, fontFamily: 'sans-serif',
  },
  btn: {
    backgroundColor: '#185FA5', color: '#E6F1FB', border: 'none',
    borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600,
    fontFamily: 'sans-serif', marginTop: 4,
  },
}