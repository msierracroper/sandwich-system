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
  const [items, setItems] = useState({}); // { productId: quantity }
  const [notes, setNotes] = useState({}); // { productId: note }
  const [pedidoNote, setPedidoNote] = useState("");
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

  function addItem(productId) {
    setItems((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  function removeItem(productId) {
    setItems((prev) => {
      const qty = (prev[productId] ?? 0) - 1;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: qty };
    });
  }

  function totalItems() {
    return Object.values(items).reduce((a, b) => a + b, 0);
  }

  function totalPrice() {
    return Object.entries(items).reduce((acc, [id, qty]) => {
      const p = products.find((p) => p.id === id);
      return acc + (p?.price ?? 0) * qty;
    }, 0);
  }

  function selectedItems() {
    return Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        product: products.find((p) => p.id === id),
        qty,
      }));
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
      })
      .select()
      .single();

    if (orderError) {
      alert("Error al crear pedido");
      setSaving(false);
      return;
    }

    const orderItemsData = selectedItems().map(({ product, qty }) => ({
      order_id: order.id,
      product_id: product.id,
      quantity: qty,
      unit_price: product.price,
      station: product.station,
      prep_status: "pendiente",
      note: notes[product.id] || null,
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
                  <span style={s.qtyNum}>{items[p.id] ?? 0}</span>
                  <button style={s.qtyBtn} onClick={() => addItem(p.id)}>
                    +
                  </button>
                </div>
                {/* Nota por item — aparece solo cuando tiene cantidad */}
                {(items[p.id] ?? 0) > 0 && (
                  <input
                    style={s.noteInput}
                    placeholder={`Nota para ${p.name} (ej: sin azucar, sin cebolla...)`}
                    value={notes[p.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
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
        {/* Items */}
        <div style={s.resumenBox}>
          {selectedItems().map(({ product, qty }) => (
            <div key={product.id}>
              <div style={s.resumenRow}>
                <span>
                  {qty}x {product.name}
                </span>
                <span>{formatPrice(product.price * qty)}</span>
              </div>
              {/* Nota por item */}
              <input
                style={s.noteInput}
                placeholder={`Nota para ${product.name} (opcional)`}
                value={notes[product.id] ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [product.id]: e.target.value,
                  }))
                }
              />
            </div>
          ))}
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
          {selectedItems().some((i) => i.product.station === "caliente") &&
            selectedItems().some((i) => i.product.station === "frio") && (
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
  catRow: { display: "flex", gap: 6, marginBottom: 12 },
  catBtn: {
    flex: 1,
    border: "0.5px solid",
    borderRadius: 8,
    padding: "7px 4px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
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
