// ARCHIVO: src/pages/admin/Productos.jsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { theme } from '../../theme'

const c = theme.color

const CATEGORIAS = [
  { value: 'todos',     label: 'Todos'      },
  { value: 'sandwich',  label: 'Sandwiches' },
  { value: 'granizado', label: 'Granizados' },
  { value: 'adicion',   label: 'Adiciones'  },
]

const STATION_BADGE = {
  frio:     { label: 'Frio',     bg: c.accentSoft, color: c.accent },
  caliente: { label: 'Caliente', bg: c.warnSoft, color: c.warn },
}

const EMPTY_FORM = { name: '', category: 'sandwich', station: 'caliente', price: '', active: true }

export default function Productos() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [products, setProducts]   = useState([])
  const [filtro, setFiltro]       = useState('todos')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function loadProducts() {
    try {
      const data = await apiGet(session.access_token, 'products', {
        order: 'category,name',
      })
      setProducts(Array.isArray(data) ? data : [])
    } catch(e) {
      console.error('loadProducts error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line
  useEffect(() => {
    if (!session) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts()
  }, [session])

  function filtered() {
    if (filtro === 'todos') return products
    return products.filter(p => p.category === filtro)
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(p) {
    setForm({ name: p.name, category: p.category, station: p.station, price: String(p.price), active: p.active })
    setEditingId(p.id)
    setError('')
    setShowForm(true)
  }

  async function toggleActive(p) {
    try {
      await apiPatch(session.access_token, 'products', `id=eq.${p.id}`, { active: !p.active })
      loadProducts()
    } catch(e) {
      console.error('toggleActive error:', e.message)
    }
  }

  async function saveProduct() {
    setError('')
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setError('El precio debe ser un numero mayor a 0'); return
    }

    setSaving(true)
    const payload = {
      name:     form.name.trim(),
      category: form.category,
      station:  form.station,
      price:    Number(form.price),
      active:   form.active,
    }

    try {
      if (editingId) {
        await apiPatch(session.access_token, 'products', `id=eq.${editingId}`, payload)
      } else {
        await apiPost(session.access_token, 'products', payload)
      }
      setShowForm(false)
      loadProducts()
    } catch(e) {
      console.log(e)
      setError('Error al guardar producto')
    } finally {
      setSaving(false)
    }
  }

  function formatPrice(n) {
    return '$' + (n ?? 0).toLocaleString('es-CO')
  }

  const activeCount   = products.filter(p => p.active).length
  const inactiveCount = products.filter(p => !p.active).length

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate('/admin')}>←</button>
          <div>
            <p style={s.title}>Productos</p>
            <p style={s.sub}>{activeCount} activos · {inactiveCount} inactivos</p>
          </div>
        </div>
        <button style={s.newBtn} onClick={openNew}>+ nuevo</button>
      </div>

      <div style={s.filterRow}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat.value}
            style={{
              ...s.filterBtn,
              backgroundColor: filtro === cat.value ? c.accentSoft : '#FFF',
              borderColor:     filtro === cat.value ? c.accent : c.border,
              color:           filtro === cat.value ? c.accent : c.inkSoft,
              fontWeight:      filtro === cat.value ? 600 : 400,
            }}
            onClick={() => setFiltro(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {loading && <p style={s.loadTxt}>Cargando productos...</p>}
        {!loading && filtered().length === 0 && (
          <p style={s.loadTxt}>No hay productos en esta categoria</p>
        )}
        {filtered().map(p => {
          const stBadge = STATION_BADGE[p.station]
          return (
            <div key={p.id} style={{ ...s.prodRow, opacity: p.active ? 1 : 0.5 }}>
              <div style={s.prodInfo}>
                <p style={s.prodName}>{p.name}</p>
                <div style={s.prodMeta}>
                  <span style={{ ...s.stBadge, backgroundColor: stBadge.bg, color: stBadge.color }}>
                    {stBadge.label}
                  </span>
                  <span style={s.prodPrice}>{formatPrice(p.price)}</span>
                </div>
              </div>
              <div style={s.prodActions}>
                <button style={s.editBtn} onClick={() => openEdit(p)}>✏️</button>
                <div style={{ ...s.toggle, backgroundColor: p.active ? c.success : c.inkFaint }}
                  onClick={() => toggleActive(p)}>
                  <div style={{ ...s.toggleDot, left: p.active ? 12 : 2 }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>{editingId ? 'Editar producto' : 'Nuevo producto'}</p>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div style={s.formBody}>
              <p style={s.label}>Nombre <span style={s.req}>*</span></p>
              <input
                style={s.input}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Sandwich de pollo"
              />

              <div style={s.row2}>
                <div style={{ flex: 1 }}>
                  <p style={s.label}>Precio (COP) <span style={s.req}>*</span></p>
                  <input
                    style={s.input}
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="12000"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={s.label}>Categoria</p>
                  <select style={s.select}
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="sandwich">Sandwich</option>
                    <option value="granizado">Granizado</option>
                    <option value="adicion">Adicion</option>
                  </select>
                </div>
              </div>

              <p style={s.label}>Estacion de preparacion <span style={s.req}>*</span></p>
              <div style={s.stationRow}>
                {['caliente', 'frio'].map(st => (
                  <div
                    key={st}
                    style={{
                      ...s.stationOpt,
                      backgroundColor: form.station === st ? (st === 'caliente' ? c.warnSoft : c.accentSoft) : '#FFF',
                      borderColor:     form.station === st ? (st === 'caliente' ? c.accent : c.accent) : c.border,
                      borderWidth:     form.station === st ? 1.5 : 0.5,
                    }}
                    onClick={() => setForm(f => ({ ...f, station: st }))}
                  >
                    <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 2px', color: form.station === st ? (st === 'caliente' ? c.warn : c.accent) : c.ink }}>
                      {st === 'caliente' ? 'Caliente' : 'Frio'}
                    </p>
                    <p style={{ fontSize: 13, color: c.inkFaint, margin: 0 }}>
                      {st === 'caliente' ? 'Sandwiches' : 'Granizados'}
                    </p>
                  </div>
                ))}
              </div>

              <div style={s.activeRow}>
                <span style={s.activeLabel}>Producto activo</span>
                <div
                  style={{ ...s.toggle, backgroundColor: form.active ? c.success : c.inkFaint }}
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                  <div style={{ ...s.toggleDot, left: form.active ? 12 : 2 }} />
                </div>
              </div>

              {error && <p style={s.error}>{error}</p>}

              <button
                style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
                disabled={saving}
                onClick={saveProduct}
              >
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
              <button style={s.btnGhost} onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:       { minHeight: '100vh', backgroundColor: c.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  topbar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFF', borderBottom: `0.5px solid ${c.border}` },
  topLeft:    { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn:    { fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: c.inkSoft, padding: '0 4px' },
  title:      { fontSize: 18, fontWeight: 600, color: c.ink, margin: '0 0 2px' },
  sub:        { fontSize: 13, color: c.inkSoft, margin: 0 },
  newBtn:     { fontSize: 14, fontWeight: 500, color: c.accent, backgroundColor: c.accentSoft, border: `0.5px solid ${c.accentBorder}`, borderRadius: 20, padding: '6px 14px', cursor: 'pointer' },
  filterRow:  { display: 'flex', gap: 6, padding: '10px 16px', backgroundColor: '#FFF', borderBottom: `0.5px solid ${c.border}`, overflowX: 'auto' },
  filterBtn:  { border: '0.5px solid', borderRadius: 20, padding: '5px 12px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  body:       { padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  loadTxt:    { fontSize: 15, color: c.inkFaint, textAlign: 'center', padding: 20 },
  prodRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FFF', border: `0.5px solid ${c.border}`, borderRadius: 8 },
  prodInfo:   { flex: 1 },
  prodName:   { fontSize: 15, fontWeight: 500, color: c.ink, margin: '0 0 4px' },
  prodMeta:   { display: 'flex', alignItems: 'center', gap: 8 },
  stBadge:    { fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 20 },
  prodPrice:  { fontSize: 14, color: c.inkSoft },
  prodActions:{ display: 'flex', alignItems: 'center', gap: 10 },
  editBtn:    { background: 'none', border: `0.5px solid ${c.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14, backgroundColor: c.bgMuted },
  toggle:     { width: 28, height: 16, borderRadius: 8, position: 'relative', cursor: 'pointer', flexShrink: 0 },
  toggleDot:  { width: 12, height: 12, backgroundColor: '#FFF', borderRadius: '50%', position: 'absolute', top: 2, transition: 'left 0.15s' },
  overlay:    { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal:      { backgroundColor: '#FFF', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0' },
  modalTitle: { fontSize: 18, fontWeight: 600, color: c.ink, margin: 0 },
  closeBtn:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: c.inkSoft },
  formBody:   { padding: 16 },
  label:      { fontSize: 14, fontWeight: 500, color: c.inkSoft, margin: '0 0 4px' },
  req:        { color: c.danger },
  input:      { width: '100%', border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', backgroundColor: c.bg, marginBottom: 12, boxSizing: 'border-box' },
  select:     { width: '100%', border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: c.bg, marginBottom: 12, boxSizing: 'border-box' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  stationRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  stationOpt: { border: 'solid', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'center' },
  activeRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bgMuted, borderRadius: 8, padding: '10px 12px', marginBottom: 16 },
  activeLabel:{ fontSize: 15, color: c.ink },
  error:      { fontSize: 14, color: c.danger, backgroundColor: c.dangerSoft, padding: '8px 12px', borderRadius: 6, marginBottom: 12 },
  btnPrimary: { width: '100%', padding: 12, backgroundColor: c.accent, color: "#FFFFFF", border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, cursor: 'pointer' },
  btnGhost:   { width: '100%', padding: 10, backgroundColor: '#FFF', color: c.ink, border: `0.5px solid ${c.border}`, borderRadius: 8, fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' },
}