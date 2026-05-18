// ARCHIVO: src/pages/tomador/PedidoActivo.jsx

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const STATUS_LABEL = {
  abierto:        { label: 'Abierto',        bg: '#E6F1FB', color: '#185FA5' },
  en_preparacion: { label: 'En preparacion', bg: '#FAEEDA', color: '#854F0B' },
  listo:          { label: 'Listo',          bg: '#EAF3DE', color: '#3B6D11' },
}

const PREP_LABEL = {
  pendiente:      { label: 'Pendiente',      color: '#888880' },
  en_preparacion: { label: 'Preparando',     color: '#854F0B' },
  listo:          { label: 'Listo',          color: '#3B6D11' },
}

export default function PedidoActivo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder]       = useState(null)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [paying, setPaying]     = useState(false)
  const [method, setMethod]     = useState('efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    loadOrder()

    // Tiempo real: actualiza cuando los preparadores cambian estado
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'order_items',
        filter: `order_id=eq.${id}`
      }, () => loadOrder())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  async function loadOrder() {
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase.from('orders').select('*, tables(name)').eq('id', id).single(),
      supabase.from('order_items').select('*, products(name, station)').eq('order_id', id),
    ])
    setOrder(orderData)
    setItems(itemsData ?? [])
    setLoading(false)
  }

  function formatPrice(n) {
    return '$' + (n ?? 0).toLocaleString('es-CO')
  }

  function vuelto() {
    const received = parseInt(cashReceived.replace(/\D/g, '')) || 0
    return received - (order?.total ?? 0)
  }

  function allItemsReady() {
    return items.length > 0 && items.every(i => i.prep_status === 'listo')
  }

  async function registrarPago() {
    setSaving(true)
    const received = parseInt(cashReceived.replace(/\D/g, '')) || null

    const { error } = await supabase
      .from('orders')
      .update({
        status:             'cerrado',
        payment_method:     method,
        cash_received:      method === 'efectivo' ? received : null,
        closed_at:          new Date().toISOString(),
      })
      .eq('id', id)

    if (error) { alert('Error al registrar pago'); setSaving(false); return }
    navigate('/tomador')
  }

  if (loading) return (
    <div style={s.loadWrap}><p style={s.loadTxt}>Cargando pedido...</p></div>
  )

  if (!order) return (
    <div style={s.loadWrap}><p style={s.loadTxt}>Pedido no encontrado</p></div>
  )

  const statusInfo = STATUS_LABEL[order.status] ?? STATUS_LABEL.abierto
  const orderLabel = order.type === 'mesa'
    ? order.tables?.name
    : order.type === 'para_llevar' ? 'Para llevar' : 'Domicilio'

  return (
    <div style={s.page}>

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate('/tomador')}>←</button>
          <div>
            <p style={s.title}>{orderLabel} · Pedido #{id.slice(-4).toUpperCase()}</p>
            <p style={s.sub}>
              {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div style={{ ...s.pill, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
          {statusInfo.label}
        </div>
      </div>

      {/* Steps */}
      <div style={s.steps}>
        <div style={{ ...s.stepDot, backgroundColor: '#378ADD' }} />
        <div style={{ ...s.stepLine, backgroundColor: '#378ADD' }} />
        <div style={{ ...s.stepDot, backgroundColor: '#378ADD' }} />
        <div style={{ ...s.stepLine, backgroundColor: paying ? '#378ADD' : '#DDDDCC' }} />
        <div style={{ ...s.stepDot, backgroundColor: paying ? '#185FA5' : '#D3D1C7' }} />
      </div>

      <div style={s.body}>

        {/* Resumen de items */}
        <div style={s.resumenBox}>
          {items.map(item => {
            const prepInfo = PREP_LABEL[item.prep_status] ?? PREP_LABEL.pendiente
            return (
              <div key={item.id} style={s.itemRow}>
                <div style={s.itemLeft}>
                  <p style={s.itemName}>{item.quantity}x {item.products?.name}</p>
                  {item.note && <p style={s.itemNote}>{item.note}</p>}
                </div>
                <div style={s.itemRight}>
                  <p style={s.itemPrice}>{formatPrice(item.unit_price * item.quantity)}</p>
                  <p style={{ ...s.itemStatus, color: prepInfo.color }}>{prepInfo.label}</p>
                </div>
              </div>
            )
          })}
          <div style={s.divider} />
          <div style={s.totalRow}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Nota del pedido */}
        {order.note && (
          <div style={s.noteBox}>
            <span style={s.noteLabel}>Nota: </span>{order.note}
          </div>
        )}

        {/* Si ya fue cerrado */}
        {order.status === 'cerrado' && (
          <div style={s.closedBox}>
            <p style={s.closedTxt}>Pedido cerrado · {order.payment_method}</p>
            {order.payment_method === 'efectivo' && order.cash_received && (
              <p style={s.closedSub}>
                Recibido: {formatPrice(order.cash_received)} · Vuelto: {formatPrice(order.cash_received - order.total)}
              </p>
            )}
          </div>
        )}

        {/* Pago — solo si no está cerrado */}
        {order.status !== 'cerrado' && (
          <>
            <div style={s.divider} />
            <p style={s.sectionLabel}>Forma de pago</p>

            <div style={s.methodRow}>
              {['efectivo', 'transferencia'].map(m => (
                <button
                  key={m}
                  style={{
                    ...s.methodBtn,
                    backgroundColor: method === m ? '#EAF3DE' : '#FFF',
                    borderColor:     method === m ? '#3B6D11' : '#DDDDCC',
                    color:           method === m ? '#3B6D11' : '#666660',
                    fontWeight:      method === m ? 600 : 400,
                  }}
                  onClick={() => setMethod(m)}
                >
                  {m === 'efectivo' ? '$ Efectivo' : '⇄ Transferencia'}
                </button>
              ))}
            </div>

            {method === 'efectivo' && (
              <>
                <input
                  style={s.cashInput}
                  placeholder="Efectivo recibido: $0"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  type="number"
                />
                {cashReceived !== '' && vuelto() >= 0 && (
                  <div style={s.vueltoBox}>
                    <span style={s.vueltoLabel}>Vuelto</span>
                    <span style={s.vueltoVal}>{formatPrice(vuelto())}</span>
                  </div>
                )}
                {cashReceived !== '' && vuelto() < 0 && (
                  <div style={{ ...s.vueltoBox, backgroundColor: '#FCEBEB' }}>
                    <span style={{ ...s.vueltoLabel, color: '#A32D2D' }}>Falta</span>
                    <span style={{ ...s.vueltoVal, color: '#A32D2D' }}>{formatPrice(Math.abs(vuelto()))}</span>
                  </div>
                )}
              </>
            )}

            <button
              style={{
                ...s.btnPrimary,
                opacity: saving ? 0.7 : 1,
                cursor:  saving ? 'not-allowed' : 'pointer',
              }}
              disabled={saving || (method === 'efectivo' && vuelto() < 0)}
              onClick={registrarPago}
            >
              {saving ? 'Registrando...' : 'Registrar pago y cerrar'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

const s = {
  page:        { minHeight: '100vh', backgroundColor: '#FAFAF8', fontFamily: 'sans-serif' },
  loadWrap:    { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  loadTxt:     { fontSize: 14, color: '#666660' },
  topbar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFF', borderBottom: '0.5px solid #DDDDCC' },
  topLeft:     { display: 'flex', alignItems: 'center', gap: 10 },
  backBtn:     { fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#666660', padding: '0 4px' },
  title:       { fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px' },
  sub:         { fontSize: 11, color: '#666660', margin: 0 },
  pill:        { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 },
  steps:       { display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: '#F1EFE8', borderBottom: '0.5px solid #DDDDCC' },
  stepDot:     { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  stepLine:    { flex: 1, height: 1, backgroundColor: '#DDDDCC' },
  body:        { padding: 16 },
  resumenBox:  { backgroundColor: '#F1EFE8', borderRadius: 8, padding: '12px 14px', marginBottom: 10 },
  itemRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '0.5px solid #DDDDCC' },
  itemLeft:    { flex: 1 },
  itemName:    { fontSize: 13, fontWeight: 500, color: '#1A1A1A', margin: '0 0 2px' },
  itemNote:    { fontSize: 11, color: '#888880', margin: 0, fontStyle: 'italic' },
  itemRight:   { textAlign: 'right' },
  itemPrice:   { fontSize: 13, fontWeight: 500, color: '#1A1A1A', margin: '0 0 2px' },
  itemStatus:  { fontSize: 10, margin: 0 },
  divider:     { height: '0.5px', backgroundColor: '#DDDDCC', margin: '10px 0' },
  totalRow:    { display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: '#1A1A1A', padding: '4px 0' },
  noteBox:     { fontSize: 12, color: '#666660', backgroundColor: '#F1EFE8', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontStyle: 'italic' },
  noteLabel:   { fontWeight: 500, fontStyle: 'normal' },
  closedBox:   { backgroundColor: '#EAF3DE', borderRadius: 8, padding: '10px 14px', marginBottom: 10 },
  closedTxt:   { fontSize: 13, fontWeight: 500, color: '#3B6D11', margin: '0 0 2px', textTransform: 'capitalize' },
  closedSub:   { fontSize: 12, color: '#3B6D11', margin: 0 },
  sectionLabel:{ fontSize: 11, fontWeight: 500, color: '#666660', marginBottom: 8 },
  methodRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  methodBtn:   { border: '0.5px solid', borderRadius: 8, padding: '12px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' },
  cashInput:   { width: '100%', border: '0.5px solid #DDDDCC', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#1A1A1A', fontFamily: 'sans-serif', backgroundColor: '#FFF', marginBottom: 8, boxSizing: 'border-box' },
  vueltoBox:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EAF3DE', borderRadius: 8, padding: '10px 14px', marginBottom: 12 },
  vueltoLabel: { fontSize: 13, fontWeight: 500, color: '#3B6D11' },
  vueltoVal:   { fontSize: 16, fontWeight: 600, color: '#3B6D11' },
  btnPrimary:  { width: '100%', padding: 12, backgroundColor: '#185FA5', color: '#E6F1FB', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'sans-serif', marginTop: 4 },
}