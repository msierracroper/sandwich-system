// ARCHIVO: src/pages/tomador/NuevoPedido.jsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

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
      .order("category");
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
            <button style={s.backBtn} onClick={() => navigate("/tomador")}>
              ←
            </button>
            <div>
              <p style={s.title}>Nuevo pedido</p>
              <p style={s.sub}>{tableId ? tableName : "Sin mesa"}</p>
            </div>
          </div>
          <div
            style={{
              ...s.pill,
              backgroundColor: totalItems() > 0 ? "#E6F1FB" : "#F1EFE8",
              color: totalItems() > 0 ? "#185FA5" : "#888880",
            }}
          >
            {totalItems()} item{totalItems() !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          <div style={{ ...s.stepDot, backgroundColor: "#185FA5" }} />
          <div style={s.stepLine} />
          <div style={{ ...s.stepDot, backgroundColor: "#D3D1C7" }} />
          <div style={s.stepLine} />
          <div style={{ ...s.stepDot, backgroundColor: "#D3D1C7" }} />
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
                  backgroundColor: tipo === t.value ? "#E6F1FB" : "#FFF",
                  borderColor: tipo === t.value ? "#378ADD" : "#DDDDCC",
                  color: tipo === t.value ? "#185FA5" : "#666660",
                  fontWeight: tipo === t.value ? 600 : 400,
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
                  backgroundColor: activeSubcuenta === label ? "#E6F1FB" : "#FFF",
                  borderColor: activeSubcuenta === label ? "#378ADD" : "#DDDDCC",
                  color: activeSubcuenta === label ? "#185FA5" : "#666660",
                  fontWeight: activeSubcuenta === label ? 600 : 400,
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
                  backgroundColor: categoria === cat.value ? "#E6F1FB" : "#FFF",
                  borderColor: categoria === cat.value ? "#378ADD" : "#DDDDCC",
                  color: categoria === cat.value ? "#185FA5" : "#666660",
                  fontWeight: categoria === cat.value ? 600 : 400,
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
            {filteredProducts().map((p) => (
              <div key={p.id} style={s.prodRow}>
                <div style={s.prodInfo}>
                  <p style={s.prodName}>{p.name}</p>
                  <p style={s.prodPrice}>{formatPrice(p.price)}</p>
                </div>
                <div style={s.qtyCtrl}>
                  <button style={s.qtyBtn} onClick={() => removeItem(p.id)}>
                    −
                  </button>
                  <span style={s.qtyNum}>{qtyFor(p.id)}</span>
                  <button style={s.qtyBtn} onClick={() => addItem(p.id)}>
                    +
                  </button>
                </div>
                {/* Nota por item — aparece solo cuando tiene cantidad */}
                {qtyFor(p.id) > 0 && (
                  <input
                    style={s.noteInput}
                    placeholder={`Nota para ${p.name} (ej: sin azucar, sin cebolla...)`}
                    value={noteFor(p.id)}
                    onChange={(e) => setNoteFor(p.id, e.target.value)}
                  />
                )}
              </div>
            ))}
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
                        paymentMethod === m.value ? "#E6F1FB" : "#FFF",
                      borderColor:
                        paymentMethod === m.value ? "#378ADD" : "#DDDDCC",
                      color: paymentMethod === m.value ? "#185FA5" : "#666660",
                      fontWeight: paymentMethod === m.value ? 600 : 400,
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
          <button style={s.backBtn} onClick={() => setStep("items")}>
            ←
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
        <div style={{ ...s.stepDot, backgroundColor: "#378ADD" }} />
        <div style={{ ...s.stepLine, backgroundColor: "#378ADD" }} />
        <div style={{ ...s.stepDot, backgroundColor: "#185FA5" }} />
        <div style={s.stepLine} />
        <div style={{ ...s.stepDot, backgroundColor: "#D3D1C7" }} />
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
                  backgroundColor: "#FAEEDA",
                  color: "#854F0B",
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
    backgroundColor: "#FAFAF8",
    fontFamily: "sans-serif",
  },
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  loadTxt: { fontSize: 14, color: "#666660" },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
  },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: {
    fontSize: 18,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666660",
    padding: "0 4px",
  },
  title: { fontSize: 15, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  pill: {
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 20,
  },
  steps: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    backgroundColor: "#F1EFE8",
    borderBottom: "0.5px solid #DDDDCC",
  },
  stepDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  stepLine: { flex: 1, height: 1, backgroundColor: "#DDDDCC" },
  body: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#666660",
    marginBottom: 8,
  },
  tipoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
    marginBottom: 12,
  },
  tipoBtn: {
    border: "0.5px solid",
    borderRadius: 8,
    padding: "8px 4px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  divider: { height: "0.5px", backgroundColor: "#DDDDCC", margin: "10px 0" },
  catRow: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  catBtn: {
    flex: 1,
    border: "0.5px solid",
    borderRadius: 8,
    padding: "7px 4px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  addSubcuentaBtn: {
    border: "0.5px dashed #B0AFA5",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
    color: "#666660",
    backgroundColor: "#FFF",
    whiteSpace: "nowrap",
  },
  subcuentaHint: {
    fontSize: 11,
    color: "#185FA5",
    margin: "0 0 12px",
  },
  subcuentaHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    fontWeight: 600,
    color: "#185FA5",
    padding: "6px 0 4px",
    borderBottom: "0.5px solid #DDDDCC",
    marginBottom: 4,
  },
  prodList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  prodRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
  },
  prodInfo: { flex: 1 },
  prodName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  prodPrice: { fontSize: 11, color: "#666660", margin: 0 },
  qtyCtrl: { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    backgroundColor: "#F1EFE8",
    border: "0.5px solid #DDDDCC",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  },
  qtyNum: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1A1A1A",
    minWidth: 16,
    textAlign: "center",
  },
  textarea: {
    width: "100%",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "#666660",
    fontFamily: "sans-serif",
    backgroundColor: "#F1EFE8",
    resize: "none",
    marginBottom: 12,
    boxSizing: "border-box",
  },
  emptyTxt: {
    fontSize: 13,
    color: "#888880",
    textAlign: "center",
    padding: "20px 0",
  },
  btnPrimary: {
    width: "100%",
    padding: 12,
    backgroundColor: "#185FA5",
    color: "#E6F1FB",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "sans-serif",
    marginBottom: 8,
  },
  btnGhost: {
    width: "100%",
    padding: 10,
    backgroundColor: "#FFF",
    color: "#1A1A1A",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "sans-serif",
    cursor: "pointer",
  },
  resumenBox: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 10,
  },
  resumenRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#666660",
    padding: "3px 0",
  },
  resumenTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
    padding: "4px 0",
  },
  noteBox: {
    fontSize: 12,
    color: "#666660",
    backgroundColor: "#F1EFE8",
    borderRadius: 6,
    padding: "8px 10px",
    fontStyle: "italic",
  },
  noteLabel: { fontWeight: 500, fontStyle: "normal" },
  badgeRow: { display: "flex", gap: 6, marginBottom: 12 },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 20,
    backgroundColor: "#E6F1FB",
    color: "#185FA5",
  },
  noteInput: {
    width: "100%",
    border: "0.5px solid #DDDDCC",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 11,
    color: "#444441",
    fontFamily: "sans-serif",
    backgroundColor: "#FAFAF8",
    marginTop: 6,
    boxSizing: "border-box",
    borderLeft: "2px solid #378ADD",
  },
};
