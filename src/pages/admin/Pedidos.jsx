// ARCHIVO: src/pages/admin/Pedidos.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const STATUS_LABEL = {
  abierto: { label: "Abierto", bg: "#E6F1FB", color: "#185FA5" },
  en_preparacion: { label: "Preparando", bg: "#FAEEDA", color: "#854F0B" },
  listo: { label: "Listo", bg: "#EAF3DE", color: "#3B6D11" },
  cerrado: { label: "Cerrado", bg: "#F1EFE8", color: "#444441" },
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

export default function Pedidos() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // pedido seleccionado
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editQtys, setEditQtys] = useState({});
  const [editNotes, setEditNotes] = useState({});
  const [editGeneralNote, setEditGeneralNote] = useState("");
  const [newItems, setNewItems] = useState({});
  const [newItemNotes, setNewItemNotes] = useState({});
  const [products, setProducts] = useState([]);
  const [catFilter, setCatFilter] = useState("todos");
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("todos");

  async function loadOrders() {
    setLoading(true);
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
    const { data } = await supabase
      .from("orders")
      .select("*, tables(name), users(name)")
      .gte("created_at", today + "T00:00:00")
      .lte("created_at", today + "T23:59:59")
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }

  async function loadOrderItems(orderId) {
    setLoadingItems(true);
    const { data } = await supabase
      .from("order_items")
      .select("*, products(name, station, category)")
      .eq("order_id", orderId);
    setItems(data ?? []);
    setLoadingItems(false);
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

  // eslint-disable-next-line
  useEffect(() => {
    loadOrders();
  }, []);

  function selectOrder(order) {
    setSelected(order);
    setEditMode(false);
    setEditQtys({});
    setEditNotes({});
    setEditGeneralNote("");
    setNewItems({});
    setNewItemNotes({});
    setShowAddProducts(false);
    loadOrderItems(order.id);
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
    setEditGeneralNote(selected?.note ?? "");
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
    setEditGeneralNote("");
    setNewItems({});
    setNewItemNotes({});
    setShowAddProducts(false);
  }

  function filteredProducts() {
    if (catFilter === "todos") return products;
    return products.filter((p) => p.category === catFilter);
  }

  function filteredOrders() {
    if (filterStatus === "todos") return orders;
    return orders.filter((o) => o.status === filterStatus);
  }

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
    setSaving(true);
    const toUpdate = Object.entries(editQtys).filter(([, qty]) => qty > 0);
    const toDelete = Object.entries(editQtys).filter(([, qty]) => qty === 0);
    const toInsert = Object.entries(newItems).filter(([, qty]) => qty > 0);

    try {
      await Promise.all(
        toUpdate.map(([itemId, qty]) =>
          supabase
            .from("order_items")
            .update({ quantity: qty, note: editNotes[itemId] || null })
            .eq("id", itemId),
        ),
      );
      await Promise.all(
        toDelete.map(([itemId]) =>
          supabase.from("order_items").delete().eq("id", itemId),
        ),
      );
      if (toInsert.length > 0) {
        const newOrderItems = toInsert.map(([productId, qty]) => {
          const p = products.find((p) => p.id === productId);
          return {
            order_id: selected.id,
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
      await supabase
        .from("orders")
        .update({ total: editTotal, note: editGeneralNote || null })
        .eq("id", selected.id);
      setEditMode(false);
      setEditQtys({});
      setEditNotes({});
      setEditGeneralNote("");
      setNewItems({});
      setNewItemNotes({});
      setShowAddProducts(false);
      await loadOrderItems(selected.id);
      await loadOrders();
      // Actualizar el pedido seleccionado con el nuevo total y nota
      setSelected((prev) => ({
        ...prev,
        total: editTotal,
        note: editGeneralNote || null,
      }));
    } catch (e) {
      alert("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order) {
    if (
      !confirm(
        `¿Cancelar el pedido #${order.id.slice(-4).toUpperCase()}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setSaving(true);
    try {
      // Eliminar items primero (cascade debería hacerlo pero por seguridad)
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      setSelected(null);
      setItems([]);
      await loadOrders();
    } catch (e) {
      alert("Error al cancelar pedido");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(order, newStatus) {
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);
    setSelected((prev) => ({ ...prev, status: newStatus }));
    await loadOrders();
  }

  function formatPrice(n) {
    return "$" + (n ?? 0).toLocaleString("es-CO");
  }
  function formatTime(d) {
    return new Date(d).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const orderLabel = (order) => {
    if (!order) return "";
    return order.type === "mesa"
      ? order.tables?.name
      : order.type === "para_llevar"
        ? "Para llevar"
        : "Domicilio";
  };

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Control de pedidos</p>
            <p style={s.sub}>{orders.length} pedidos hoy</p>
          </div>
        </div>
        <button style={s.refreshBtn} onClick={loadOrders}>
          ↻ Actualizar
        </button>
      </div>

      <div style={s.layout}>
        {/* ── LISTA DE PEDIDOS ── */}
        <div style={s.leftPanel}>
          {/* Filtro por estado */}
          <div style={s.filterRow}>
            {[
              ["todos", "Todos"],
              ["abierto", "Abiertos"],
              ["en_preparacion", "Preparando"],
              ["listo", "Listos"],
              ["cerrado", "Cerrados"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                style={{
                  ...s.filterBtn,
                  backgroundColor: filterStatus === val ? "#E6F1FB" : "#FFF",
                  borderColor: filterStatus === val ? "#378ADD" : "#DDDDCC",
                  color: filterStatus === val ? "#185FA5" : "#666660",
                  fontWeight: filterStatus === val ? 600 : 400,
                }}
                onClick={() => setFilterStatus(val)}
              >
                {lbl}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={s.loadTxt}>Cargando...</p>
          ) : filteredOrders().length === 0 ? (
            <p style={s.loadTxt}>No hay pedidos</p>
          ) : (
            <div style={s.orderList}>
              {filteredOrders().map((order) => {
                const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.abierto;
                const isSelected = selected?.id === order.id;
                return (
                  <div
                    key={order.id}
                    style={{
                      ...s.orderCard,
                      borderColor: isSelected ? "#185FA5" : "#DDDDCC",
                      borderWidth: isSelected ? 1.5 : 0.5,
                      backgroundColor: isSelected ? "#E6F1FB" : "#FFF",
                    }}
                    onClick={() => selectOrder(order)}
                  >
                    <div style={s.orderCardTop}>
                      <p style={s.orderCardTitle}>
                        {orderLabel(order)} · #
                        {order.id.slice(-4).toUpperCase()}
                      </p>
                      <div
                        style={{
                          ...s.statusPill,
                          backgroundColor: st.bg,
                          color: st.color,
                        }}
                      >
                        {st.label}
                      </div>
                    </div>
                    <div style={s.orderCardMeta}>
                      <span>{formatTime(order.created_at)}</span>
                      <span style={{ fontWeight: 500, color: "#1A1A1A" }}>
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── DETALLE DEL PEDIDO ── */}
        <div style={s.rightPanel}>
          {!selected ? (
            <div style={s.emptyDetail}>
              <p style={s.emptyTxt}>Selecciona un pedido para ver el detalle</p>
            </div>
          ) : (
            <>
              {/* Header detalle */}
              <div style={s.detailHeader}>
                <div>
                  <p style={s.detailTitle}>
                    {orderLabel(selected)} · #
                    {selected.id.slice(-4).toUpperCase()}
                  </p>
                  <p style={s.detailSub}>
                    {formatTime(selected.created_at)} ·{" "}
                    {selected.users?.name ?? "Sin tomador"}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {selected.status !== "cerrado" && !editMode && (
                    <button style={s.editBtn} onClick={openEdit}>
                      ✏️ Editar
                    </button>
                  )}
                  {selected.status !== "cerrado" && !editMode && (
                    <button
                      style={s.cancelBtn}
                      onClick={() => cancelOrder(selected)}
                    >
                      🗑 Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              {loadingItems ? (
                <p style={s.loadTxt}>Cargando items...</p>
              ) : editMode ? (
                <div style={s.editBox}>
                  <p style={s.editTitle}>Editando pedido</p>
                  <p style={s.editSub}>
                    Ajusta cantidades y notas · Pon 0 para eliminar · Agrega
                    productos
                  </p>

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
                                  [item.id]:
                                    (prev[item.id] ?? item.quantity) + 1,
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

                  {/* Items nuevos */}
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

                  <button
                    style={{ ...s.addProdBtn, marginTop: 8 }}
                    onClick={() => setShowAddProducts(!showAddProducts)}
                  >
                    {showAddProducts
                      ? "▲ Ocultar productos"
                      : "+ Agregar producto"}
                  </button>

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
                              color:
                                catFilter === cat.value ? "#185FA5" : "#666660",
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

                  <p style={{ fontSize: 11, fontWeight: 500, color: "#666660", marginBottom: 8 }}>
                    Nota general del pedido
                  </p>
                  <textarea
                    style={s.generalNoteTextarea}
                    placeholder="Nota general del pedido (opcional)..."
                    value={editGeneralNote}
                    onChange={(e) => setEditGeneralNote(e.target.value)}
                    rows={2}
                  />

                  <div style={s.divider} />
                  <div style={s.totalRow}>
                    <span>Nuevo total</span>
                    <span>{formatPrice(editTotal)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      style={{ ...s.btnGhost, flex: 1 }}
                      onClick={cancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      style={{
                        ...s.btnPrimary,
                        flex: 2,
                        opacity: saving ? 0.7 : 1,
                      }}
                      disabled={
                        saving || Object.values(editQtys).every((q) => q === 0)
                      }
                      onClick={saveEdit}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={s.itemsBox}>
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
                    <span>{formatPrice(selected.total)}</span>
                  </div>
                </div>
              )}

              {/* Cambiar estado */}
              {!editMode && selected.status !== "cerrado" && (
                <>
                  <div style={s.divider} />
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#666660",
                      marginBottom: 8,
                    }}
                  >
                    Cambiar estado
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[
                      ["abierto", "Abierto"],
                      ["en_preparacion", "En preparacion"],
                      ["listo", "Listo"],
                      ["cerrado", "Cerrado"],
                    ].map(([st, lbl]) => {
                      const stInfo = STATUS_LABEL[st];
                      return (
                        <button
                          key={st}
                          style={{
                            ...s.stateBtn,
                            backgroundColor:
                              selected.status === st ? stInfo.bg : "#FFF",
                            borderColor:
                              selected.status === st ? stInfo.color : "#DDDDCC",
                            color:
                              selected.status === st ? stInfo.color : "#666660",
                            fontWeight: selected.status === st ? 600 : 400,
                          }}
                          onClick={() => changeStatus(selected, st)}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {selected.note && (
                <div style={{ ...s.noteBox, marginTop: 12 }}>
                  <span style={s.noteLabel}>Nota: </span>
                  {selected.note}
                </div>
              )}

              {selected.type === "domicilio" && (
                <div style={{ ...s.noteBox, marginTop: 8 }}>
                  {selected.address && (
                    <p style={{ margin: "0 0 4px" }}>
                      <span style={s.noteLabel}>Direccion: </span>
                      {selected.address}
                    </p>
                  )}
                  {selected.customer_name && (
                    <p style={{ margin: "0 0 4px" }}>
                      <span style={s.noteLabel}>Cliente: </span>
                      {selected.customer_name}
                    </p>
                  )}
                  {selected.customer_phone && (
                    <p style={{ margin: "0 0 4px" }}>
                      <span style={s.noteLabel}>Telefono: </span>
                      {selected.customer_phone}
                    </p>
                  )}
                  {selected.payment_method && (
                    <p style={{ margin: 0 }}>
                      <span style={s.noteLabel}>Medio de pago: </span>
                      {selected.payment_method === "efectivo"
                        ? "Efectivo"
                        : "Transferencia"}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#FAFAF8",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
    flexShrink: 0,
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
  title: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  refreshBtn: {
    fontSize: 12,
    color: "#185FA5",
    backgroundColor: "#E6F1FB",
    border: "0.5px solid #B5D4F4",
    borderRadius: 20,
    padding: "5px 12px",
    cursor: "pointer",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    borderRight: "0.5px solid #DDDDCC",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  },
  rightPanel: { overflow: "auto", padding: 16 },
  filterRow: {
    display: "flex",
    gap: 4,
    padding: "8px 10px",
    overflowX: "auto",
    borderBottom: "0.5px solid #DDDDCC",
    flexShrink: 0,
  },
  filterBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "sans-serif",
  },
  loadTxt: { fontSize: 13, color: "#888880", textAlign: "center", padding: 20 },
  orderList: { display: "flex", flexDirection: "column", gap: 6, padding: 10 },
  orderCard: {
    border: "solid",
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
  },
  orderCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderCardTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: 0,
  },
  statusPill: {
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 20,
  },
  orderCardMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#888880",
  },
  emptyDetail: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  emptyTxt: { fontSize: 13, color: "#888880", textAlign: "center" },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  detailSub: { fontSize: 11, color: "#666660", margin: 0 },
  editBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#854F0B",
    backgroundColor: "#FAEEDA",
    border: "0.5px solid #FAC775",
    borderRadius: 20,
    padding: "5px 10px",
    cursor: "pointer",
  },
  cancelBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#A32D2D",
    backgroundColor: "#FCEBEB",
    border: "0.5px solid #F5BCBC",
    borderRadius: 20,
    padding: "5px 10px",
    cursor: "pointer",
  },
  itemsBox: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 10,
  },
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
  generalNoteTextarea: {
    width: "100%",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "#666660",
    fontFamily: "sans-serif",
    backgroundColor: "#F1EFE8",
    resize: "none",
    boxSizing: "border-box",
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
    fontStyle: "italic",
  },
  noteLabel: { fontWeight: 500, fontStyle: "normal" },
  stateBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "sans-serif",
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
};
