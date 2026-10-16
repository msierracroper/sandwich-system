// ARCHIVO: src/pages/tomador/NuevoPedido.jsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

const TIPOS = [
  { value: "mesa", label: "Mesa" },
  { value: "para_llevar", label: "Para llevar" },
  { value: "domicilio", label: "Domicilio" },
];

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

const CATEGORIAS = [
  { value: "sandwich", label: "Sandwiches" },
  { value: "granizado", label: "Granizados" },
  { value: "adicion", label: "Adiciones" },
];

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function NuevoPedido() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("mesa");
  const tableName = searchParams.get("nombre");

  const [tipo, setTipo] = useState(tableId ? "mesa" : "para_llevar");
  const [categoria, setCategoria] = useState("sandwich");
  const [products, setProducts] = useState([]);
  const [subcuentas, setSubcuentas] = useState(["Cuenta 1"]);
  const [activeSubcuenta, setActiveSubcuenta] = useState("Cuenta 1");
  const [lines, setLines] = useState([]); // [{ id, productId, qty, note, subcuenta }]
  const [pedidoNote, setPedidoNote] = useState("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("items"); // 'items' | 'resumen'

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("category")
      .order("name");
    setProducts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

  function filteredProducts() {
    return products.filter((p) => p.category === categoria);
  }

  function lineKey(productId, subcuenta) {
    return `${productId}::${subcuenta}`;
  }

  function addItem(productId) {
    const key = lineKey(productId, activeSubcuenta);
    setLines((prev) => {
      const existing = prev.find((l) => l.id === key);
      if (existing) {
        return prev.map((l) => (l.id === key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        { id: key, productId, qty: 1, note: "", subcuenta: activeSubcuenta },
      ];
    });
  }

  function removeItem(productId) {
    const key = lineKey(productId, activeSubcuenta);
    setLines((prev) => {
      const existing = prev.find((l) => l.id === key);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((l) => l.id !== key);
      return prev.map((l) => (l.id === key ? { ...l, qty: l.qty - 1 } : l));
    });
  }

  function qtyFor(productId) {
    return lines.find((l) => l.id === lineKey(productId, activeSubcuenta))?.qty ?? 0;
  }

  function noteFor(productId) {
    return (
      lines.find((l) => l.id === lineKey(productId, activeSubcuenta))?.note ?? ""
    );
  }

  function setNoteFor(productId, note) {
    const key = lineKey(productId, activeSubcuenta);
    setLines((prev) => prev.map((l) => (l.id === key ? { ...l, note } : l)));
  }

  function setNoteForLine(lineId, note) {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, note } : l)));
  }

  function addSubcuenta() {
    const next = `Cuenta ${subcuentas.length + 1}`;
    setSubcuentas((prev) => [...prev, next]);
    setActiveSubcuenta(next);
  }

  function totalItems() {
    return lines.reduce((a, l) => a + l.qty, 0);
  }

  function linesWithProduct() {
    return lines
      .filter((l) => l.qty > 0)
      .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) }));
  }

  function totalPrice() {
    return linesWithProduct().reduce(
      (acc, l) => acc + (l.product?.price ?? 0) * l.qty,
      0,
    );
  }

  function subcuentaSubtotal(label) {
    return linesWithProduct()
      .filter((l) => l.subcuenta === label)
      .reduce((acc, l) => acc + (l.product?.price ?? 0) * l.qty, 0);
  }

  function formatPrice(n) {
    return "$" + n.toLocaleString("es-CO");
  }

  async function crearPedido() {
    setSaving(true);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: profile.id,
        table_id: tipo === "mesa" ? tableId : null,
        type: tipo,
        status: "abierto",
        total: totalPrice(),
        note: pedidoNote || null,
        address: tipo === "domicilio" ? address || null : null,
        customer_name: tipo === "domicilio" ? customerName || null : null,
        customer_phone: tipo === "domicilio" ? customerPhone || null : null,
        payment_method: tipo === "domicilio" ? paymentMethod : null,
      })
      .select()
      .single();

    if (orderError) {
      alert("Error al crear pedido");
      setSaving(false);
      return;
    }

    const splitBill = subcuentas.length > 1;
    const orderItemsData = linesWithProduct().map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      quantity: l.qty,
      unit_price: l.product.price,
      station: l.product.station,
      prep_status: "pendiente",
      note: l.note || null,
      subcuenta: splitBill ? l.subcuenta : null,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      alert("Error al guardar items");
      setSaving(false);
      return;
    }

    navigate("/tomador");
  }

  if (loading)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Cargando productos...</p>
      </div>
    );

  // ── PASO 1: seleccionar items ──────────────────────────────────────────────
  if (step === "items")
    return (
      <div style={s.page}>
        <div style={s.topbar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => navigate("/tomador")} aria-label="Volver">
              <BackIcon />
            </button>
            <div>
              <p style={s.title}>Nuevo pedido</p>
              <p style={s.sub}>{tableId ? tableName : "Sin mesa"}</p>
            </div>
          </div>
          <div
            style={{
              ...s.pill,
              backgroundColor: totalItems() > 0 ? c.accentSoft : c.bgMuted,
              color: totalItems() > 0 ? c.accentDark : c.inkFaint,
            }}
          >
            {totalItems()} item{totalItems() !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          <div style={{ ...s.stepDot, backgroundColor: c.accent }} />
          <div style={s.stepLine} />
          <div style={{ ...s.stepDot, backgroundColor: c.borderStrong }} />
          <div style={s.stepLine} />
          <div style={{ ...s.stepDot, backgroundColor: c.borderStrong }} />
        </div>

        <div style={s.body}>
          {/* Tipo de pedido */}
          <p style={s.sectionLabel}>Tipo de pedido</p>
          <div style={s.tipoRow}>
            {TIPOS.map((t) => (
              <button
                key={t.value}
                style={{
                  ...s.tipoBtn,
                  backgroundColor: tipo === t.value ? c.accentSoft : c.surface,
                  borderColor: tipo === t.value ? c.accent : c.border,
                  color: tipo === t.value ? c.accentDark : c.inkSoft,
                  fontWeight: tipo === t.value ? 700 : 500,
                }}
                onClick={() => setTipo(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={s.divider} />

          {/* Cuentas (division de pedido, ej. grupos grandes en mesa) */}
          <p style={s.sectionLabel}>Cuenta</p>
          <div style={s.catRow}>
            {subcuentas.map((label) => (
              <button
                key={label}
                style={{
                  ...s.catBtn,
                  backgroundColor: activeSubcuenta === label ? c.accentSoft : c.surface,
                  borderColor: activeSubcuenta === label ? c.accent : c.border,
                  color: activeSubcuenta === label ? c.accentDark : c.inkSoft,
                  fontWeight: activeSubcuenta === label ? 700 : 500,
                }}
                onClick={() => setActiveSubcuenta(label)}
              >
                {label}
              </button>
            ))}
            <button style={s.addSubcuentaBtn} onClick={addSubcuenta}>
              + cuenta
            </button>
          </div>
          {subcuentas.length > 1 && (
            <p style={s.subcuentaHint}>
              Los productos que agregues quedan en <strong>{activeSubcuenta}</strong>
            </p>
          )}

          <div style={s.divider} />

          {/* Categorias */}
          <div style={s.catRow}>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.value}
                style={{
                  ...s.catBtn,
                  backgroundColor: categoria === cat.value ? c.accentSoft : c.surface,
                  borderColor: categoria === cat.value ? c.accent : c.border,
                  color: categoria === cat.value ? c.accentDark : c.inkSoft,
                  fontWeight: categoria === cat.value ? 700 : 500,
                }}
                onClick={() => setCategoria(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Productos */}
          <div style={s.prodList}>
            {filteredProducts().length === 0 && (
              <p style={s.emptyTxt}>No hay productos en esta categoria</p>
            )}
            {filteredProducts().map((p) => {
              const selected = qtyFor(p.id) > 0;
              return (
                <div
                  key={p.id}
                  style={{
                    ...s.prodRow,
                    borderColor: selected ? c.accent : c.border,
                    backgroundColor: selected ? c.accentSoft : c.surface,
                  }}
                >
                  <div style={s.prodInfo}>
                    <p style={s.prodName}>{p.name}</p>
                    <p style={s.prodPrice}>{formatPrice(p.price)}</p>
                  </div>
                  <div style={s.qtyCtrl}>
                    <button style={s.qtyBtn} onClick={() => removeItem(p.id)} aria-label={`Quitar ${p.name}`}>
                      −
                    </button>
                    <span style={s.qtyNum}>{qtyFor(p.id)}</span>
                    <button style={s.qtyBtn} onClick={() => addItem(p.id)} aria-label={`Agregar ${p.name}`}>
                      +
                    </button>
                  </div>
                  {/* Nota por item — aparece solo cuando tiene cantidad */}
                  {selected && (
                    <input
                      style={s.noteInput}
                      placeholder={`Nota para ${p.name} (ej: sin azucar, sin cebolla...)`}
                      value={noteFor(p.id)}
                      onChange={(e) => setNoteFor(p.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Nota general */}
          <textarea
            style={s.textarea}
            placeholder="Nota general del pedido (opcional)..."
            value={pedidoNote}
            onChange={(e) => setPedidoNote(e.target.value)}
            rows={2}
          />

          {/* Datos de domicilio — solo domicilio */}
          {tipo === "domicilio" && (
            <>
              <input
                style={s.textarea}
                placeholder="Direccion de entrega..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <input
                style={s.textarea}
                placeholder="Nombre del cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                style={s.textarea}
                placeholder="Telefono del cliente..."
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <p style={s.sectionLabel}>Medio de pago</p>
              <div style={s.catRow}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    style={{
                      ...s.catBtn,
                      backgroundColor:
                        paymentMethod === m.value ? c.accentSoft : c.surface,
                      borderColor:
                        paymentMethod === m.value ? c.accent : c.border,
                      color: paymentMethod === m.value ? c.accentDark : c.inkSoft,
                      fontWeight: paymentMethod === m.value ? 700 : 500,
                    }}
                    onClick={() => setPaymentMethod(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            style={{
              ...s.btnPrimary,
              opacity: totalItems() === 0 ? 0.4 : 1,
              cursor: totalItems() === 0 ? "not-allowed" : "pointer",
            }}
            disabled={totalItems() === 0}
            onClick={() => setStep("resumen")}
          >
            Ver resumen →
          </button>
        </div>
      </div>
    );

  // ── PASO 2: resumen ────────────────────────────────────────────────────────
  const splitBill = subcuentas.length > 1;

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => setStep("items")} aria-label="Volver">
            <BackIcon />
          </button>
          <div>
            <p style={s.title}>Resumen</p>
            <p style={s.sub}>
              {tableId
                ? tableName
                : tipo === "para_llevar"
                  ? "Para llevar"
                  : "Domicilio"}{" "}
              · {totalItems()} items
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={s.steps}>
        <div style={{ ...s.stepDot, backgroundColor: c.accent }} />
        <div style={{ ...s.stepLine, backgroundColor: c.accent }} />
        <div style={{ ...s.stepDot, backgroundColor: c.accent }} />
        <div style={s.stepLine} />
        <div style={{ ...s.stepDot, backgroundColor: c.borderStrong }} />
      </div>

      <div style={s.body}>
        {/* Items, agrupados por cuenta si se dividio */}
        <div style={s.resumenBox}>
          {subcuentas.map((label) => {
            const groupLines = linesWithProduct().filter(
              (l) => l.subcuenta === label,
            );
            if (groupLines.length === 0) return null;
            return (
              <div key={label}>
                {splitBill && (
                  <div style={s.subcuentaHeader}>
                    <span>{label}</span>
                    <span>{formatPrice(subcuentaSubtotal(label))}</span>
                  </div>
                )}
                {groupLines.map((line) => (
                  <div key={line.id}>
                    <div style={s.resumenRow}>
                      <span>
                        {line.qty}x {line.product.name}
                      </span>
                      <span>{formatPrice(line.product.price * line.qty)}</span>
                    </div>
                    {/* Nota por item */}
                    <input
                      style={s.noteInput}
                      placeholder={`Nota para ${line.product.name} (opcional)`}
                      value={line.note}
                      onChange={(e) => setNoteForLine(line.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
          <div style={s.divider} />
          <div style={s.resumenTotal}>
            <span>Total</span>
            <span>{formatPrice(totalPrice())}</span>
          </div>
        </div>

        {/* Badges */}
        <div style={s.badgeRow}>
          <div style={s.badge}>
            {tableId
              ? tableName
              : tipo === "para_llevar"
                ? "Para llevar"
                : "Domicilio"}
          </div>
          {linesWithProduct().some((l) => l.product?.station === "caliente") &&
            linesWithProduct().some((l) => l.product?.station === "frio") && (
              <div
                style={{
                  ...s.badge,
                  backgroundColor: c.warnSoft,
                  color: c.warn,
                }}
              >
                caliente + frio
              </div>
            )}
        </div>

        {tipo === "domicilio" && (
          <div style={{ ...s.noteBox, marginBottom: 12 }}>
            {address && (
              <p style={{ margin: "0 0 4px" }}>
                <span style={s.noteLabel}>Direccion: </span>
                {address}
              </p>
            )}
            {customerName && (
              <p style={{ margin: "0 0 4px" }}>
                <span style={s.noteLabel}>Cliente: </span>
                {customerName}
              </p>
            )}
            {customerPhone && (
              <p style={{ margin: "0 0 4px" }}>
                <span style={s.noteLabel}>Telefono: </span>
                {customerPhone}
              </p>
            )}
            <p style={{ margin: 0 }}>
              <span style={s.noteLabel}>Medio de pago: </span>
              {paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
            </p>
          </div>
        )}

        <button
          style={{
            ...s.btnPrimary,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
          disabled={saving}
          onClick={crearPedido}
        >
          {saving ? "Enviando..." : "Enviar a preparacion"}
        </button>
        <button style={s.btnGhost} onClick={() => setStep("items")}>
          ← Editar pedido
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: c.bg,
    fontFamily: theme.font,
  },
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  loadTxt: { fontSize: 15, color: c.inkSoft },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    backgroundColor: c.surface,
    borderBottom: `1px solid ${c.border}`,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: c.ink,
    flexShrink: 0,
    padding: 0,
  },
  title: { fontSize: 17, fontWeight: 700, color: c.ink, margin: "0 0 2px" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0 },
  pill: {
    fontSize: 13,
    fontWeight: 700,
    padding: "5px 13px",
    borderRadius: 20,
  },
  steps: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: c.bgMuted,
    borderBottom: `1px solid ${c.border}`,
  },
  stepDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  stepLine: { flex: 1, height: 1, backgroundColor: c.border },
  body: { padding: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: c.inkSoft,
    marginBottom: 9,
  },
  tipoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 7,
    marginBottom: 14,
  },
  tipoBtn: {
    border: "1.5px solid",
    borderRadius: 10,
    padding: "11px 4px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: theme.font,
    minHeight: 44,
  },
  divider: { height: "1px", backgroundColor: c.border, margin: "12px 0" },
  catRow: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" },
  catBtn: {
    flex: 1,
    border: "1.5px solid",
    borderRadius: 10,
    padding: "10px 6px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: theme.font,
    minHeight: 44,
  },
  addSubcuentaBtn: {
    border: `1.5px dashed ${c.borderStrong}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: theme.font,
    color: c.inkSoft,
    backgroundColor: c.surface,
    whiteSpace: "nowrap",
    minHeight: 44,
  },
  subcuentaHint: {
    fontSize: 13,
    color: c.accentDark,
    margin: "0 0 14px",
  },
  subcuentaHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    fontWeight: 700,
    color: c.accentDark,
    padding: "6px 0 4px",
    borderBottom: `1px solid ${c.border}`,
    marginBottom: 4,
  },
  prodList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 14,
  },
  prodRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    padding: "14px 14px",
    backgroundColor: c.surface,
    border: "1.5px solid",
    borderRadius: 12,
    boxShadow: theme.shadow,
    transition: "background-color .12s, border-color .12s",
  },
  prodInfo: { flex: 1, minWidth: 140 },
  prodName: {
    fontSize: 16,
    fontWeight: 700,
    color: c.ink,
    margin: "0 0 3px",
  },
  prodPrice: { fontSize: 14, fontWeight: 600, color: c.inkSoft, margin: 0 },
  qtyCtrl: { display: "flex", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: c.bgMuted,
    border: `1.5px solid ${c.border}`,
    fontSize: 19,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: theme.font,
    color: c.ink,
    padding: 0,
  },
  qtyNum: {
    fontSize: 18,
    fontWeight: 800,
    color: c.ink,
    minWidth: 26,
    textAlign: "center",
  },
  textarea: {
    width: "100%",
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 14,
    color: c.ink,
    fontFamily: theme.font,
    backgroundColor: c.bgMuted,
    resize: "none",
    marginBottom: 12,
    boxSizing: "border-box",
  },
  emptyTxt: {
    fontSize: 15,
    color: c.inkFaint,
    textAlign: "center",
    padding: "20px 0",
  },
  btnPrimary: {
    width: "100%",
    padding: 15,
    backgroundColor: c.accent,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    fontFamily: theme.font,
    marginBottom: 8,
    cursor: "pointer",
  },
  btnGhost: {
    width: "100%",
    padding: 13,
    backgroundColor: c.surface,
    color: c.ink,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: theme.font,
    cursor: "pointer",
  },
  resumenBox: {
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 12,
  },
  resumenRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 15,
    color: c.ink,
    padding: "4px 0",
  },
  resumenTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 18,
    fontWeight: 700,
    color: c.ink,
    padding: "4px 0",
  },
  noteBox: {
    fontSize: 13,
    color: c.inkSoft,
    backgroundColor: c.bgMuted,
    borderRadius: 8,
    padding: "10px 12px",
  },
  noteLabel: { fontWeight: 600, color: c.ink },
  badgeRow: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: 20,
    backgroundColor: c.accentSoft,
    color: c.accentDark,
  },
  noteInput: {
    width: "100%",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: c.ink,
    fontFamily: theme.font,
    backgroundColor: c.bg,
    marginTop: 7,
    boxSizing: "border-box",
    borderLeft: `3px solid ${c.accent}`,
  },
};
