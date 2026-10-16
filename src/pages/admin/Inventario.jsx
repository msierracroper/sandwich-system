// ARCHIVO: src/pages/admin/Inventario.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

const UNIDADES = ["unidad", "g", "kg", "ml", "l", "cm"];

const EMPTY_ITEM_FORM = {
  name: "",
  unit: "unidad",
  stock: "",
  min_stock: "",
  is_estimated: false,
  auto_discount: false,
};

const EMPTY_MOVE_FORM = { type: "compra", quantity: "", note: "" };

function isLow(item) {
  return item.min_stock > 0 && item.stock <= item.min_stock;
}

export default function Inventario() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [editingId, setEditingId] = useState(null);
  const [itemError, setItemError] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  const [moveTarget, setMoveTarget] = useState(null);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVE_FORM);
  const [moveError, setMoveError] = useState("");
  const [savingMove, setSavingMove] = useState(false);

  async function loadItems() {
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("active", true)
      .order("name");
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadItems();
  }, []);

  function sorted() {
    return [...items].sort((a, b) => {
      const aLow = isLow(a);
      const bLow = isLow(b);
      if (aLow !== bLow) return aLow ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function lowStockItems() {
    return items.filter(isLow);
  }

  function formatQty(n, unit) {
    return `${Number(n).toLocaleString("es-CO")} ${unit}`;
  }

  function openNewItem() {
    setItemForm(EMPTY_ITEM_FORM);
    setEditingId(null);
    setItemError("");
    setShowItemForm(true);
  }

  function openEditItem(item) {
    setItemForm({
      name: item.name,
      unit: item.unit,
      stock: String(item.stock),
      min_stock: String(item.min_stock),
      is_estimated: item.is_estimated,
      auto_discount: item.auto_discount,
    });
    setEditingId(item.id);
    setItemError("");
    setShowItemForm(true);
  }

  async function saveItem() {
    setItemError("");
    if (!itemForm.name.trim()) {
      setItemError("El nombre es obligatorio");
      return;
    }
    if (itemForm.stock !== "" && isNaN(Number(itemForm.stock))) {
      setItemError("El stock actual debe ser un numero");
      return;
    }
    if (itemForm.min_stock !== "" && isNaN(Number(itemForm.min_stock))) {
      setItemError("El punto de reorden debe ser un numero");
      return;
    }

    setSavingItem(true);
    const payload = {
      name: itemForm.name.trim(),
      unit: itemForm.unit,
      stock: itemForm.stock === "" ? 0 : Number(itemForm.stock),
      min_stock: itemForm.min_stock === "" ? 0 : Number(itemForm.min_stock),
      is_estimated: itemForm.is_estimated,
      auto_discount: itemForm.auto_discount,
    };

    const { error } = editingId
      ? await supabase.from("inventory_items").update(payload).eq("id", editingId)
      : await supabase.from("inventory_items").insert(payload);

    setSavingItem(false);
    if (error) {
      setItemError("Error al guardar el insumo");
      return;
    }
    setShowItemForm(false);
    loadItems();
  }

  async function deactivateItem(item) {
    if (!confirm(`¿Dejar de controlar "${item.name}"?`)) return;
    await supabase.from("inventory_items").update({ active: false }).eq("id", item.id);
    loadItems();
  }

  function openMove(item) {
    setMoveTarget(item);
    setMoveForm(EMPTY_MOVE_FORM);
    setMoveError("");
  }

  async function saveMove() {
    setMoveError("");
    const n = Number(moveForm.quantity);
    if (!moveForm.quantity || isNaN(n) || n === 0) {
      setMoveError("La cantidad debe ser un numero distinto de 0");
      return;
    }
    const signedQty = moveForm.type === "compra" ? Math.abs(n) : n;

    setSavingMove(true);
    const { error: moveErr } = await supabase.from("inventory_movements").insert({
      inventory_item_id: moveTarget.id,
      type: moveForm.type,
      quantity: signedQty,
      note: moveForm.note.trim() || null,
      created_by: profile.id,
    });
    if (moveErr) {
      setMoveError("Error al registrar el movimiento");
      setSavingMove(false);
      return;
    }

    const { error: stockErr } = await supabase
      .from("inventory_items")
      .update({ stock: moveTarget.stock + signedQty })
      .eq("id", moveTarget.id);
    setSavingMove(false);
    if (stockErr) {
      setMoveError("El movimiento quedo registrado pero no se pudo actualizar el stock");
      return;
    }
    setMoveTarget(null);
    loadItems();
  }

  const alerting = lowStockItems();

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Inventario</p>
            <p style={s.sub}>
              {items.length} insumos
              {alerting.length > 0 ? ` · ${alerting.length} en alerta` : ""}
            </p>
          </div>
        </div>
        <button style={s.newBtn} onClick={openNewItem}>
          + nuevo
        </button>
      </div>

      <div style={s.body}>
        {loading ? (
          <p style={s.loadTxt}>Cargando inventario...</p>
        ) : (
          <>
            {alerting.length > 0 && (
              <div style={s.alertBox}>
                <p style={s.alertTitle}>
                  ⚠ {alerting.length} insumo{alerting.length !== 1 ? "s" : ""}{" "}
                  bajo{alerting.length !== 1 ? "s" : ""} de stock
                </p>
                <div style={s.alertList}>
                  {alerting.map((i) => (
                    <div key={i.id} style={s.alertRow}>
                      <span>{i.name}</span>
                      <span>
                        {formatQty(i.stock, i.unit)} · minimo{" "}
                        {formatQty(i.min_stock, i.unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <p style={s.loadTxt}>Aun no has agregado ningun insumo</p>
            ) : (
              <div style={s.itemList}>
                {sorted().map((item) => {
                  const low = isLow(item);
                  return (
                    <div
                      key={item.id}
                      style={{
                        ...s.itemRow,
                        borderColor: low ? c.dangerBorder : c.border,
                        backgroundColor: low ? c.dangerSoft : "#FFF",
                      }}
                    >
                      <div style={s.itemTop}>
                        <div style={s.itemLeft}>
                          <p style={s.itemName}>{item.name}</p>
                          <div style={s.itemMeta}>
                            <span
                              style={{
                                ...s.tag,
                                backgroundColor: item.is_estimated
                                  ? c.warnSoft
                                  : c.successSoft,
                                color: item.is_estimated ? c.warn : c.success,
                              }}
                            >
                              {item.is_estimated ? "Estimado" : "Exacto"}
                            </span>
                            {item.auto_discount && (
                              <span style={{ ...s.tag, backgroundColor: c.accentSoft, color: c.accent }}>
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={s.itemRight}>
                          <p
                            style={{
                              ...s.stockVal,
                              color: low ? c.danger : c.ink,
                            }}
                          >
                            {formatQty(item.stock, item.unit)}
                          </p>
                          {item.min_stock > 0 && (
                            <p style={s.reorderTxt}>
                              minimo {formatQty(item.min_stock, item.unit)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={s.itemActions}>
                        <button style={s.actionBtn} onClick={() => openMove(item)}>
                          + movimiento
                        </button>
                        <button style={s.actionBtn} onClick={() => openEditItem(item)}>
                          ✏️ Editar
                        </button>
                        <button
                          style={{ ...s.actionBtn, color: c.danger }}
                          onClick={() => deactivateItem(item)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: nuevo/editar insumo */}
      {showItemForm && (
        <div style={s.overlay} onClick={() => setShowItemForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>
                {editingId ? "Editar insumo" : "Nuevo insumo"}
              </p>
              <button style={s.closeBtn} onClick={() => setShowItemForm(false)}>
                ✕
              </button>
            </div>
            <div style={s.formBody}>
              <p style={s.label}>
                Nombre <span style={{ color: c.danger }}>*</span>
              </p>
              <input
                style={s.input}
                placeholder="Ej: Pollo desmechado"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              <p style={s.label}>Unidad</p>
              <div style={s.unitBtns}>
                {UNIDADES.map((u) => (
                  <button
                    key={u}
                    style={{
                      ...s.unitBtn,
                      backgroundColor: itemForm.unit === u ? c.accentSoft : "#FFF",
                      borderColor: itemForm.unit === u ? c.accent : c.border,
                      color: itemForm.unit === u ? c.accent : c.inkSoft,
                      fontWeight: itemForm.unit === u ? 600 : 400,
                    }}
                    onClick={() => setItemForm((f) => ({ ...f, unit: u }))}
                  >
                    {u}
                  </button>
                ))}
              </div>

              <p style={s.label}>Stock actual</p>
              <input
                style={s.input}
                type="number"
                placeholder="0"
                value={itemForm.stock}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, stock: e.target.value }))
                }
              />

              <p style={s.label}>Punto de reorden (opcional)</p>
              <input
                style={s.input}
                type="number"
                placeholder="Avisar cuando baje de..."
                value={itemForm.min_stock}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, min_stock: e.target.value }))
                }
              />

              <p style={s.label}>Como se descuenta</p>
              <div style={s.unitBtns}>
                <button
                  style={{
                    ...s.unitBtn,
                    flex: 1,
                    backgroundColor: !itemForm.is_estimated ? c.successSoft : "#FFF",
                    borderColor: !itemForm.is_estimated ? c.success : c.border,
                    color: !itemForm.is_estimated ? c.success : c.inkSoft,
                    fontWeight: !itemForm.is_estimated ? 600 : 400,
                  }}
                  onClick={() =>
                    setItemForm((f) => ({ ...f, is_estimated: false }))
                  }
                >
                  Exacto
                </button>
                <button
                  style={{
                    ...s.unitBtn,
                    flex: 1,
                    backgroundColor: itemForm.is_estimated ? c.warnSoft : "#FFF",
                    borderColor: itemForm.is_estimated ? c.warn : c.border,
                    color: itemForm.is_estimated ? c.warn : c.inkSoft,
                    fontWeight: itemForm.is_estimated ? 600 : 400,
                  }}
                  onClick={() =>
                    setItemForm((f) => ({ ...f, is_estimated: true }))
                  }
                >
                  Estimado
                </button>
              </div>

              <div
                style={s.toggleRow}
                onClick={() =>
                  setItemForm((f) => ({ ...f, auto_discount: !f.auto_discount }))
                }
              >
                <div>
                  <p style={s.toggleTitle}>Descuento automatico</p>
                  <p style={s.toggleDesc}>
                    Se descontara solo cuando se conecten las recetas de
                    productos (mas adelante).
                  </p>
                </div>
                <div
                  style={{
                    ...s.toggle,
                    backgroundColor: itemForm.auto_discount ? c.success : c.inkFaint,
                  }}
                >
                  <div
                    style={{
                      ...s.toggleDot,
                      left: itemForm.auto_discount ? 12 : 2,
                    }}
                  />
                </div>
              </div>

              {itemError && <p style={s.error}>{itemError}</p>}

              <button
                style={{ ...s.btnPrimary, opacity: savingItem ? 0.7 : 1 }}
                disabled={savingItem}
                onClick={saveItem}
              >
                {savingItem ? "Guardando..." : "Guardar insumo"}
              </button>
              <button style={s.btnGhost} onClick={() => setShowItemForm(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: registrar movimiento */}
      {moveTarget && (
        <div style={s.overlay} onClick={() => setMoveTarget(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Movimiento · {moveTarget.name}</p>
              <button style={s.closeBtn} onClick={() => setMoveTarget(null)}>
                ✕
              </button>
            </div>
            <div style={s.formBody}>
              <p style={s.label}>Tipo</p>
              <div style={s.unitBtns}>
                {[
                  ["compra", "Compra (entra)"],
                  ["ajuste", "Ajuste"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    style={{
                      ...s.unitBtn,
                      flex: 1,
                      backgroundColor: moveForm.type === val ? c.accentSoft : "#FFF",
                      borderColor: moveForm.type === val ? c.accent : c.border,
                      color: moveForm.type === val ? c.accent : c.inkSoft,
                      fontWeight: moveForm.type === val ? 600 : 400,
                    }}
                    onClick={() => setMoveForm((f) => ({ ...f, type: val }))}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <p style={s.label}>
                Cantidad ({moveTarget.unit})
                {moveForm.type === "ajuste" && " — usa negativo para restar"}
              </p>
              <input
                style={s.input}
                type="number"
                placeholder={moveForm.type === "compra" ? "Ej: 5000" : "Ej: -200"}
                value={moveForm.quantity}
                onChange={(e) =>
                  setMoveForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />

              <p style={s.label}>Nota (opcional)</p>
              <input
                style={s.input}
                placeholder="Ej: Compra a proveedor X"
                value={moveForm.note}
                onChange={(e) =>
                  setMoveForm((f) => ({ ...f, note: e.target.value }))
                }
              />

              <p style={s.helperTxt}>
                Stock actual: {formatQty(moveTarget.stock, moveTarget.unit)}
              </p>

              {moveError && <p style={s.error}>{moveError}</p>}

              <button
                style={{ ...s.btnPrimary, opacity: savingMove ? 0.7 : 1 }}
                disabled={savingMove}
                onClick={saveMove}
              >
                {savingMove ? "Guardando..." : "Registrar movimiento"}
              </button>
              <button style={s.btnGhost} onClick={() => setMoveTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: c.bg,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#FFF",
    borderBottom: `0.5px solid ${c.border}`,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: {
    fontSize: 20,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: c.inkSoft,
    padding: "0 4px",
  },
  title: { fontSize: 18, fontWeight: 600, color: c.ink, margin: "0 0 2px" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0 },
  newBtn: {
    fontSize: 14,
    fontWeight: 500,
    color: c.accent,
    backgroundColor: c.accentSoft,
    border: `0.5px solid ${c.accentBorder}`,
    borderRadius: 20,
    padding: "6px 14px",
    cursor: "pointer",
  },
  body: { padding: 16 },
  loadTxt: { fontSize: 15, color: c.inkFaint, textAlign: "center", padding: 20 },
  alertBox: {
    backgroundColor: c.dangerSoft,
    border: `0.5px solid ${c.dangerBorder}`,
    borderRadius: 8,
    padding: "10px 12px",
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: c.danger,
    margin: "0 0 8px",
  },
  alertList: { display: "flex", flexDirection: "column", gap: 5 },
  alertRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: c.danger,
  },
  itemList: { display: "flex", flexDirection: "column", gap: 8 },
  itemRow: {
    border: "0.5px solid",
    borderRadius: 8,
    padding: "10px 12px",
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemLeft: { flex: 1 },
  itemName: {
    fontSize: 16,
    fontWeight: 600,
    color: c.ink,
    margin: "0 0 4px",
  },
  itemMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  tag: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  itemRight: { textAlign: "right" },
  stockVal: { fontSize: 17, fontWeight: 600, margin: "0 0 2px" },
  reorderTxt: { fontSize: 12, color: c.inkFaint, margin: 0 },
  itemActions: { display: "flex", gap: 6, flexWrap: "wrap" },
  actionBtn: {
    fontSize: 13,
    color: c.inkSoft,
    background: c.bgMuted,
    border: `0.5px solid ${c.border}`,
    borderRadius: 6,
    padding: "5px 10px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: "16px 16px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 0",
  },
  modalTitle: { fontSize: 18, fontWeight: 600, color: c.ink, margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: c.inkSoft,
  },
  formBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: 500, color: c.inkSoft, margin: "0 0 4px" },
  input: {
    width: "100%",
    border: `0.5px solid ${c.inkFaint}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 16,
    color: c.ink,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    backgroundColor: c.bg,
    marginBottom: 12,
    boxSizing: "border-box",
  },
  unitBtns: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  unitBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "7px 12px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: c.bgMuted,
    borderRadius: 8,
    marginBottom: 12,
    cursor: "pointer",
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: c.ink,
    margin: "0 0 2px",
  },
  toggleDesc: { fontSize: 13, color: c.inkSoft, margin: 0, maxWidth: 260 },
  toggle: {
    width: 28,
    height: 16,
    borderRadius: 8,
    position: "relative",
    flexShrink: 0,
  },
  toggleDot: {
    width: 12,
    height: 12,
    backgroundColor: "#FFF",
    borderRadius: "50%",
    position: "absolute",
    top: 2,
    transition: "left 0.15s",
  },
  helperTxt: { fontSize: 13, color: c.inkFaint, margin: "0 0 12px" },
  error: {
    fontSize: 14,
    color: c.danger,
    backgroundColor: c.dangerSoft,
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 12,
  },
  btnPrimary: {
    width: "100%",
    padding: 12,
    backgroundColor: c.accent,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    marginBottom: 8,
    cursor: "pointer",
  },
  btnGhost: {
    width: "100%",
    padding: 10,
    backgroundColor: "#FFF",
    color: c.ink,
    border: `0.5px solid ${c.border}`,
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    cursor: "pointer",
  },
};
