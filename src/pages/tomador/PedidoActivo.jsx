// ARCHIVO: src/pages/tomador/PedidoActivo.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const STATUS_LABEL = {
  abierto: { label: "Abierto", bg: "#E6F1FB", color: "#185FA5" },
  en_preparacion: { label: "En preparacion", bg: "#FAEEDA", color: "#854F0B" },
  listo: { label: "Listo", bg: "#EAF3DE", color: "#3B6D11" },
};

const PREP_LABEL = {
  pendiente: { label: "Pendiente", color: "#888880" },
  en_preparacion: { label: "Preparando", color: "#854F0B" },
  listo: { label: "Listo", color: "#3B6D11" },
};

const CATEGORIAS = [
  { value: "todos", label: "Todos" },
  { value: "sandwich", label: "Sandwiches" },
  { value: "granizado", label: "Granizados" },
  { value: "adicion", label: "Adiciones" },
];

export default function PedidoActivo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editQtys, setEditQtys] = useState({});
  const [editNotes, setEditNotes] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Para agregar nuevos productos
  const [products, setProducts] = useState([]);
  const [catFilter, setCatFilter] = useState("todos");
  const [newItems, setNewItems] = useState({}); // { productId: qty }
  const [newItemNotes, setNewItemNotes] = useState({}); // { productId: note }
  const [showAddProducts, setShowAddProducts] = useState(false);

  useEffect(() => {
    loadOrder();
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${id}`,
        },
        () => loadOrder(),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  async function loadOrder() {
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase.from("orders").select("*, tables(name)").eq("id", id).single(),
      supabase
        .from("order_items")
        .select("*, products(name, station)")
        .eq("order_id", id),
    ]);
    setOrder(orderData);
    setItems(itemsData ?? []);
    setLoading(false);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("category")
      .order("name");
    setProducts(data ?? []);
  }

  function formatPrice(n) {
    return "$" + (n ?? 0).toLocaleString("es-CO");
  }

  function vuelto() {
    const received = parseInt(cashReceived.replace(/\D/g, "")) || 0;
    return received - (order?.total ?? 0);
  }

  function openEdit() {
    const qtys = {};
    const notes = {};
    items.forEach((item) => {
      qtys[item.id] = item.quantity;
      notes[item.id] = item.note ?? "";
    });
    setEditQtys(qtys);
    setEditNotes(notes);
    setNewItems({});
    setNewItemNotes({});
    setShowAddProducts(false);
    loadProducts();
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditQtys({});
    setEditNotes({});
    setNewItems({});
    setNewItemNotes({});
    setShowAddProducts(false);
  }

  function filteredProducts() {
    if (catFilter === "todos") return products;
    return products.filter((p) => p.category === catFilter);
  }

  // Total edicion = items existentes + items nuevos
  const editTotal =
    Object.entries(editQtys).reduce((acc, [itemId, qty]) => {
      const item = items.find((i) => i.id === itemId);
      return acc + (item?.unit_price ?? 0) * qty;
    }, 0) +
    Object.entries(newItems).reduce((acc, [productId, qty]) => {
      const p = products.find((p) => p.id === productId);
      return acc + (p?.price ?? 0) * qty;
    }, 0);

  async function saveEdit() {
    setSavingEdit(true);
    const toUpdate = Object.entries(editQtys).filter(([, qty]) => qty > 0);
    const toDelete = Object.entries(editQtys).filter(([, qty]) => qty === 0);
    const toInsert = Object.entries(newItems).filter(([, qty]) => qty > 0);

    try {
      // Actualizar cantidades y notas existentes
      await Promise.all(
        toUpdate.map(([itemId, qty]) =>
          supabase
            .from("order_items")
            .update({ quantity: qty, note: editNotes[itemId] || null })
            .eq("id", itemId),
        ),
      );

      // Eliminar items con cantidad 0
      await Promise.all(
        toDelete.map(([itemId]) =>
          supabase.from("order_items").delete().eq("id", itemId),
        ),
      );

      // Insertar nuevos items
      if (toInsert.length > 0) {
        const newOrderItems = toInsert.map(([productId, qty]) => {
          const p = products.find((p) => p.id === productId);
          return {
            order_id: id,
            product_id: productId,
            quantity: qty,
            unit_price: p?.price ?? 0,
            station: p?.station ?? "caliente",
            prep_status: "pendiente",
            note: newItemNotes[productId] || null,
          };
        });
        await supabase.from("order_items").insert(newOrderItems);
      }

      // Recalcular total
      await supabase.from("orders").update({ total: editTotal }).eq("id", id);

      setEditMode(false);
      setEditQtys({});
      setEditNotes({});
      setNewItems({});
      setNewItemNotes({});
      setShowAddProducts(false);
      await loadOrder();
    } catch (e) {
      alert("Error al guardar cambios");
    } finally {
      setSavingEdit(false);
    }
  }

  async function registrarPago() {
    setSaving(true);
    const received = parseInt(cashReceived.replace(/\D/g, "")) || null;
    const { error } = await supabase
      .from("orders")
      .update({
        status: "cerrado",
        payment_method: method,
        cash_received: method === "efectivo" ? received : null,
        closed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      alert("Error al registrar pago");
      setSaving(false);
      return;
    }
    navigate("/tomador");
  }

  if (loading)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Cargando pedido...</p>
      </div>
    );
  if (!order)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Pedido no encontrado</p>
      </div>
    );

  const statusInfo = STATUS_LABEL[order.status] ?? STATUS_LABEL.abierto;
  const orderLabel =
    order.type === "mesa"
      ? order.tables?.name
      : order.type === "para_llevar"
        ? "Para llevar"
        : "Domicilio";
  const canEdit = order.status !== "cerrado";
  const hasChanges =
    Object.values(editQtys).some((q, i) => q !== items[i]?.quantity) ||
    Object.values(newItems).some((q) => q > 0);

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/tomador")}>
            ←
          </button>
          <div>
            <p style={s.title}>
              {orderLabel} · Pedido #{id.slice(-4).toUpperCase()}
            </p>
            <p style={s.sub}>
              {new Date(order.created_at).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canEdit && !editMode && (
            <button style={s.editBtn} onClick={openEdit}>
              ✏️ Editar
            </button>
          )}
          <div
            style={{
              ...s.pill,
              backgroundColor: statusInfo.bg,
              color: statusInfo.color,
            }}
          >
            {statusInfo.label}
          </div>
        </div>
      </div>

      <div style={s.steps}>
        <div style={{ ...s.stepDot, backgroundColor: "#378ADD" }} />
        <div style={{ ...s.stepLine, backgroundColor: "#378ADD" }} />
        <div style={{ ...s.stepDot, backgroundColor: "#378ADD" }} />
        <div style={{ ...s.stepLine, backgroundColor: "#DDDDCC" }} />
        <div style={{ ...s.stepDot, backgroundColor: "#D3D1C7" }} />
      </div>

      <div style={s.body}>
        {/* ── MODO EDICION ── */}
        {editMode ? (
          <div style={s.editBox}>
            <p style={s.editTitle}>Editando pedido</p>
            <p style={s.editSub}>
              Ajusta cantidades y notas · Pon 0 para eliminar · Agrega
              productos nuevos
            </p>

            {/* Items existentes */}
            {items.map((item) => {
              const qty = editQtys[item.id] ?? item.quantity;
              return (
                <div key={item.id} style={{ opacity: qty === 0 ? 0.4 : 1 }}>
                  <div style={s.itemRow}>
                    <div style={s.itemLeft}>
                      <p style={s.itemName}>{item.products?.name}</p>
                      <p style={s.itemNote}>
                        {formatPrice(item.unit_price)} c/u
                      </p>
                    </div>
                    <div style={s.qtyCtrl}>
                      <button
                        style={s.qtyBtn}
                        onClick={() =>
                          setEditQtys((prev) => ({
                            ...prev,
                            [item.id]: Math.max(
                              0,
                              (prev[item.id] ?? item.quantity) - 1,
                            ),
                          }))
                        }
                      >
                        −
                      </button>
                      <span
                        style={{
                          ...s.qtyNum,
                          color: qty === 0 ? "#A32D2D" : "#1A1A1A",
                        }}
                      >
                        {qty}
                      </span>
                      <button
                        style={s.qtyBtn}
                        onClick={() =>
                          setEditQtys((prev) => ({
                            ...prev,
                            [item.id]: (prev[item.id] ?? item.quantity) + 1,
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#1A1A1A",
                        minWidth: 72,
                        textAlign: "right",
                      }}
                    >
                      {formatPrice(item.unit_price * qty)}
                    </p>
                  </div>
                  {qty > 0 && (
                    <input
                      style={s.noteInput}
                      placeholder={`Nota para ${item.products?.name} (ej: sin lechuga...)`}
                      value={editNotes[item.id] ?? ""}
                      onChange={(e) =>
                        setEditNotes((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}

            {/* Items nuevos agregados */}
            {Object.entries(newItems)
              .filter(([, qty]) => qty > 0)
              .map(([productId, qty]) => {
                const p = products.find((p) => p.id === productId);
                if (!p) return null;
                return (
                  <div key={productId}>
                    <div
                      style={{
                        ...s.itemRow,
                        backgroundColor: "#EAF3DE",
                        borderRadius: 6,
                        padding: "8px 6px",
                      }}
                    >
                      <div style={s.itemLeft}>
                        <p style={{ ...s.itemName, color: "#3B6D11" }}>
                          + {p.name}
                        </p>
                        <p style={s.itemNote}>
                          {formatPrice(p.price)} c/u · nuevo
                        </p>
                      </div>
                      <div style={s.qtyCtrl}>
                        <button
                          style={s.qtyBtn}
                          onClick={() =>
                            setNewItems((prev) => ({
                              ...prev,
                              [productId]: Math.max(
                                0,
                                (prev[productId] ?? 0) - 1,
                              ),
                            }))
                          }
                        >
                          −
                        </button>
                        <span style={s.qtyNum}>{qty}</span>
                        <button
                          style={s.qtyBtn}
                          onClick={() =>
                            setNewItems((prev) => ({
                              ...prev,
                              [productId]: (prev[productId] ?? 0) + 1,
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#3B6D11",
                          minWidth: 72,
                          textAlign: "right",
                        }}
                      >
                        {formatPrice(p.price * qty)}
                      </p>
                    </div>
                    <input
                      style={s.noteInput}
                      placeholder={`Nota para ${p.name} (ej: sin lechuga...)`}
                      value={newItemNotes[productId] ?? ""}
                      onChange={(e) =>
                        setNewItemNotes((prev) => ({
                          ...prev,
                          [productId]: e.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}

            {/* Boton agregar productos */}
            <button
              style={{ ...s.addProdBtn, marginTop: 8 }}
              onClick={() => setShowAddProducts(!showAddProducts)}
            >
              {showAddProducts
                ? "▲ Ocultar productos"
                : "+ Agregar producto al pedido"}
            </button>

            {/* Selector de productos */}
            {showAddProducts && (
              <div style={s.addProdBox}>
                <div style={s.catTabs}>
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.value}
                      style={{
                        ...s.catTab,
                        backgroundColor:
                          catFilter === cat.value ? "#E6F1FB" : "#FFF",
                        borderColor:
                          catFilter === cat.value ? "#378ADD" : "#DDDDCC",
                        color: catFilter === cat.value ? "#185FA5" : "#666660",
                        fontWeight: catFilter === cat.value ? 600 : 400,
                      }}
                      onClick={() => setCatFilter(cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {filteredProducts().map((p) => {
                  const qty = newItems[p.id] ?? 0;
                  return (
                    <div key={p.id} style={s.prodRow}>
                      <div style={s.itemLeft}>
                        <p style={s.itemName}>{p.name}</p>
                        <p style={s.itemNote}>{formatPrice(p.price)}</p>
                      </div>
                      <div style={s.qtyCtrl}>
                        <button
                          style={s.qtyBtn}
                          onClick={() =>
                            setNewItems((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, (prev[p.id] ?? 0) - 1),
                            }))
                          }
                        >
                          −
                        </button>
                        <span style={s.qtyNum}>{qty}</span>
                        <button
                          style={s.qtyBtn}
                          onClick={() =>
                            setNewItems((prev) => ({
                              ...prev,
                              [p.id]: (prev[p.id] ?? 0) + 1,
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={s.divider} />
            <div style={s.totalRow}>
              <span>Nuevo total</span>
              <span>{formatPrice(editTotal)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ ...s.btnGhost, flex: 1 }} onClick={cancelEdit}>
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnPrimary,
                  flex: 2,
                  opacity: savingEdit ? 0.7 : 1,
                }}
                disabled={
                  savingEdit || Object.values(editQtys).every((q) => q === 0)
                }
                onClick={saveEdit}
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── VISTA NORMAL ── */}
            <div style={s.resumenBox}>
              {items.map((item) => {
                const prepInfo =
                  PREP_LABEL[item.prep_status] ?? PREP_LABEL.pendiente;
                return (
                  <div key={item.id} style={s.itemRow}>
                    <div style={s.itemLeft}>
                      <p style={s.itemName}>
                        {item.quantity}x {item.products?.name}
                      </p>
                      {item.note && <p style={s.itemNote}>{item.note}</p>}
                    </div>
                    <div style={s.itemRight}>
                      <p style={s.itemPrice}>
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                      <p style={{ ...s.itemStatus, color: prepInfo.color }}>
                        {prepInfo.label}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div style={s.divider} />
              <div style={s.totalRow}>
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>

            {order.note && (
              <div style={s.noteBox}>
                <span style={s.noteLabel}>Nota: </span>
                {order.note}
              </div>
            )}

            {order.type === "domicilio" && (
              <div style={s.noteBox}>
                {order.address && (
                  <p style={{ margin: "0 0 4px" }}>
                    <span style={s.noteLabel}>Direccion: </span>
                    {order.address}
                  </p>
                )}
                {order.customer_name && (
                  <p style={{ margin: "0 0 4px" }}>
                    <span style={s.noteLabel}>Cliente: </span>
                    {order.customer_name}
                  </p>
                )}
                {order.customer_phone && (
                  <p style={{ margin: "0 0 4px" }}>
                    <span style={s.noteLabel}>Telefono: </span>
                    {order.customer_phone}
                  </p>
                )}
                {order.payment_method && (
                  <p style={{ margin: 0 }}>
                    <span style={s.noteLabel}>Medio de pago: </span>
                    {order.payment_method === "efectivo"
                      ? "Efectivo"
                      : "Transferencia"}
                  </p>
                )}
              </div>
            )}

            {order.status === "cerrado" && (
              <div style={s.closedBox}>
                <p style={s.closedTxt}>
                  Pedido cerrado · {order.payment_method}
                </p>
                {order.payment_method === "efectivo" && order.cash_received && (
                  <p style={s.closedSub}>
                    Recibido: {formatPrice(order.cash_received)} · Vuelto:{" "}
                    {formatPrice(order.cash_received - order.total)}
                  </p>
                )}
              </div>
            )}

            {order.status !== "cerrado" && (
              <>
                <div style={s.divider} />
                <p style={s.sectionLabel}>Forma de pago</p>
                <div style={s.methodRow}>
                  {["efectivo", "transferencia"].map((m) => (
                    <button
                      key={m}
                      style={{
                        ...s.methodBtn,
                        backgroundColor: method === m ? "#EAF3DE" : "#FFF",
                        borderColor: method === m ? "#3B6D11" : "#DDDDCC",
                        color: method === m ? "#3B6D11" : "#666660",
                        fontWeight: method === m ? 600 : 400,
                      }}
                      onClick={() => setMethod(m)}
                    >
                      {m === "efectivo" ? "$ Efectivo" : "⇄ Transferencia"}
                    </button>
                  ))}
                </div>

                {method === "efectivo" && (
                  <>
                    <input
                      style={s.cashInput}
                      placeholder="Efectivo recibido: $0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      type="number"
                    />
                    {cashReceived !== "" && vuelto() >= 0 && (
                      <div style={s.vueltoBox}>
                        <span style={s.vueltoLabel}>Vuelto</span>
                        <span style={s.vueltoVal}>{formatPrice(vuelto())}</span>
                      </div>
                    )}
                    {cashReceived !== "" && vuelto() < 0 && (
                      <div
                        style={{ ...s.vueltoBox, backgroundColor: "#FCEBEB" }}
                      >
                        <span style={{ ...s.vueltoLabel, color: "#A32D2D" }}>
                          Falta
                        </span>
                        <span style={{ ...s.vueltoVal, color: "#A32D2D" }}>
                          {formatPrice(Math.abs(vuelto()))}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <button
                  style={{
                    ...s.btnPrimary,
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                  disabled={saving || (method === "efectivo" && vuelto() < 0)}
                  onClick={registrarPago}
                >
                  {saving ? "Registrando..." : "Registrar pago y cerrar"}
                </button>
              </>
            )}
          </>
        )}
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
  title: { fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  pill: {
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 10px",
    borderRadius: 20,
  },
  editBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#854F0B",
    backgroundColor: "#FAEEDA",
    border: "0.5px solid #FAC775",
    borderRadius: 20,
    padding: "4px 10px",
    cursor: "pointer",
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
  editBox: {
    backgroundColor: "#FFF",
    border: "1.5px solid #EF9F27",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 10,
  },
  editTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#854F0B",
    margin: "0 0 2px",
  },
  editSub: { fontSize: 11, color: "#888880", margin: "0 0 12px" },
  resumenBox: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 10,
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "0.5px solid #DDDDCC",
  },
  itemLeft: { flex: 1 },
  itemName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  itemNote: {
    fontSize: 12,
    color: "#A32D2D",
    margin: 0,
    fontStyle: "italic",
    fontWeight: 500,
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
    marginBottom: 8,
    boxSizing: "border-box",
    borderLeft: "2px solid #378ADD",
  },
  itemRight: { textAlign: "right" },
  itemPrice: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  itemStatus: { fontSize: 10, margin: 0 },
  qtyCtrl: { display: "flex", alignItems: "center", gap: 8, marginRight: 10 },
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
  },
  qtyNum: { fontSize: 14, fontWeight: 500, minWidth: 16, textAlign: "center" },
  divider: { height: "0.5px", backgroundColor: "#DDDDCC", margin: "10px 0" },
  totalRow: {
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
    marginBottom: 10,
    fontStyle: "italic",
  },
  noteLabel: { fontWeight: 500, fontStyle: "normal" },
  closedBox: {
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 10,
  },
  closedTxt: {
    fontSize: 13,
    fontWeight: 500,
    color: "#3B6D11",
    margin: "0 0 2px",
    textTransform: "capitalize",
  },
  closedSub: { fontSize: 12, color: "#3B6D11", margin: 0 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#666660",
    marginBottom: 8,
  },
  methodRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },
  methodBtn: {
    border: "0.5px solid",
    borderRadius: 8,
    padding: "12px 8px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  cashInput: {
    width: "100%",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: "sans-serif",
    backgroundColor: "#FFF",
    marginBottom: 8,
    boxSizing: "border-box",
  },
  vueltoBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 12,
  },
  vueltoLabel: { fontSize: 13, fontWeight: 500, color: "#3B6D11" },
  vueltoVal: { fontSize: 16, fontWeight: 600, color: "#3B6D11" },
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
    marginTop: 4,
    cursor: "pointer",
  },
  btnGhost: {
    padding: 10,
    backgroundColor: "#FFF",
    color: "#1A1A1A",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "sans-serif",
    cursor: "pointer",
  },
  addProdBtn: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#E6F1FB",
    color: "#185FA5",
    border: "0.5px solid #B5D4F4",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  addProdBox: {
    backgroundColor: "#FAFAF8",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    padding: "10px",
    marginTop: 8,
  },
  catTabs: { display: "flex", gap: 4, marginBottom: 10, overflowX: "auto" },
  catTab: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "sans-serif",
  },
  prodRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 4px",
    borderBottom: "0.5px solid #DDDDCC",
  },
};
