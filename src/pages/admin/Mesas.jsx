// ARCHIVO: src/pages/admin/Mesas.jsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { theme } from '../../theme'

const c = theme.color

export default function Mesas() {
  const navigate = useNavigate()
  const [mesas, setMesas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { loadMesas() }, [])

  async function loadMesas() {
    const { data } = await supabase.from('tables').select('*').order('name')
    setMesas(data ?? [])
    setLoading(false)
  }

  async function addMesa() {
    setError('')
    if (!newName.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    await supabase.from('tables').insert({ name: newName.trim(), active: true })
    setNewName('')
    setSaving(false)
    loadMesas()
  }

  async function toggleActive(mesa) {
    await supabase.from('tables').update({ active: !mesa.active }).eq('id', mesa.id)
    loadMesas()
  }

  const activeCount = mesas.filter(m => m.active).length

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate('/admin')}>←</button>
          <div>
            <p style={s.title}>Mesas</p>
            <p style={s.sub}>{activeCount} activas · {mesas.length - activeCount} inactivas</p>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {/* Agregar mesa */}
        <p style={s.sectionLabel}>Agregar mesa</p>
        <div style={s.addRow}>
          <input
            style={s.input}
            placeholder="Ej: Mesa 7"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMesa()}
          />
          <button
            style={{ ...s.addBtn, opacity: saving ? 0.7 : 1 }}
            disabled={saving}
            onClick={addMesa}
          >
            {saving ? '...' : '+ Agregar'}
          </button>
        </div>
        {error && <p style={s.error}>{error}</p>}

        <div style={s.divider} />
        <p style={s.sectionLabel}>Mesas del local</p>

        {loading && <p style={s.loadTxt}>Cargando mesas...</p>}

        <div style={s.grid}>
          {mesas.map(mesa => (
            <div
              key={mesa.id}
              style={{
                ...s.mesaCard,
                backgroundColor: mesa.active ? '#FFF' : c.bgMuted,
                opacity: mesa.active ? 1 : 0.6,
              }}
            >
              <p style={s.mesaName}>{mesa.name}</p>
              <div style={{ ...s.toggle, backgroundColor: mesa.active ? c.success : c.inkFaint }}
                onClick={() => toggleActive(mesa)}>
                <div style={{ ...s.toggleDot, left: mesa.active ? 12 : 2 }} />
              </div>
              <p style={s.mesaStatus}>{mesa.active ? 'Activa' : 'Inactiva'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  page:        { minHeight: '100vh', backgroundColor: c.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  topbar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFF', borderBottom: `0.5px solid ${c.border}` },
  topLeft:     { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn:     { fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: c.inkSoft, padding: '0 4px' },
  title:       { fontSize: 18, fontWeight: 600, color: c.ink, margin: '0 0 2px' },
  sub:         { fontSize: 13, color: c.inkSoft, margin: 0 },
  body:        { padding: 16 },
  sectionLabel:{ fontSize: 13, fontWeight: 500, color: c.inkSoft, marginBottom: 8 },
  addRow:      { display: 'flex', gap: 8, marginBottom: 6 },
  input:       { flex: 1, border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', backgroundColor: c.bg },
  addBtn:      { backgroundColor: c.accent, color: "#FFFFFF", border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 15, fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer', whiteSpace: 'nowrap' },
  error:       { fontSize: 14, color: c.danger, backgroundColor: c.dangerSoft, padding: '8px 12px', borderRadius: 6, marginBottom: 8 },
  divider:     { height: '0.5px', backgroundColor: c.border, margin: '16px 0' },
  loadTxt:     { fontSize: 15, color: c.inkFaint, textAlign: 'center', padding: 20 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  mesaCard:    { border: `0.5px solid ${c.border}`, borderRadius: 8, padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  mesaName:    { fontSize: 16, fontWeight: 500, color: c.ink, margin: 0 },
  mesaStatus:  { fontSize: 12, color: c.inkFaint, margin: 0 },
  toggle:      { width: 28, height: 16, borderRadius: 8, position: 'relative', cursor: 'pointer', flexShrink: 0 },
  toggleDot:   { width: 12, height: 12, backgroundColor: '#FFF', borderRadius: '50%', position: 'absolute', top: 2, transition: 'left 0.15s' },
}