// ARCHIVO: src/pages/admin/Recetas.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { theme } from "../../theme";

const c = theme.color;

const CATEGORIAS = [
  { value: "todos", label: "Todos" },
  { value: "sandwich", label: "Sandwiches" },
  { value: "granizado", label: "Granizados" },
  { value: "adicion", label: "Adiciones" },
];

const TIPOS_PEDIDO = [
  { value: "para_llevar", label: "Para llevar" },
  { value: "domicilio", label: "Domicilio" },
];

export default function Recetas() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [typeRecipes, setTypeRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [rowError, setRowError] = useState("");
  const [savingRow, setSavingRow] = useState(false);

  async function loadAll() {
    const [
      { data: productsData },
      { data: itemsData },
      { data: recipesData },
      { data: typeRecipesData },
    ] = await Promise.all([
      supabase.from("products").select("*").eq("active", true).order("category").order("name"),
      supabase.from("inventory_items").select("*").eq("active", true).order("name"),
      supabase.from("product_recipes").select("*, inventory_items(name, unit, is_estimated)"),
      supabase.from("order_type_recipes").select("*, inventory_items(name, unit, is_estimated)"),
    ]);
    setProducts(productsData ?? []);
    setItems(itemsData ?? []);
    setRecipes(recipesData ?? []);
    setTypeRecipes(typeRecipesData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadAll();
  }, []);

  function filtered() {
    if (filtro === "todos") return products;
    return products.filter((p) => p.category === filtro);
  }

  function recipesFor(productId) {
    return recipes.filter((r) => r.product_id === productId);
  }

  function typeRecipesFor(orderType) {
    return typeRecipes.filter((r) => r.order_type === orderType);
  }

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedType(null);
    setNewItemId("");
    setNewQty("");
    setRowError("");
  }

  function openType(orderType) {
    setSelectedType(orderType);
    setSelectedProduct(null);
    setNewItemId("");
    setNewQty("");
    setRowError("");
  }

  function closeModal() {
    setSelectedProduct(null);
    setSelectedType(null);
  }

  async function addRow() {
    setRowError("");
    if (!newItemId) {
      setRowError("Elige un insumo");
      return;
    }
    if (!newQty || isNaN(Number(newQty)) || Number(newQty) <= 0) {
      setRowError("La cantidad debe ser mayor a 0");
      return;
    }

    setSavingRow(true);
    const { error } = selectedProduct
      ? await supabase.from("product_recipes").insert({
          product_id: selectedProduct.id,
          inventory_item_id: newItemId,
          quantity: Number(newQty),
        })
      : await supabase.from("order_type_recipes").insert({
          order_type: selectedType,
          inventory_item_id: newItemId,
          quantity: Number(newQty),
        });
    setSavingRow(false);
    if (error) {
      setRowError("Error al agregar el insumo");
      return;
    }
    setNewItemId("");
    setNewQty("");
    loadAll();
  }

  async function removeRow(row, isTypeRow) {
    const table = isTypeRow ? "order_type_recipes" : "product_recipes";
    await supabase.from(table).delete().eq("id", row.id);
    loadAll();
  }

  const currentRows = selectedProduct
    ? recipesFor(selectedProduct.id)
    : selectedType
      ? typeRecipesFor(selectedType)
      : [];
  const modalTitle = selectedProduct
    ? selectedProduct.name
    : selectedType
      ? TIPOS_PEDIDO.find((t) => t.value === selectedType)?.label
      : "";
  const modalOpen = !!selectedProduct || !!selectedType;

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Recetas</p>
            <p style={s.sub}>{products.length} productos</p>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {loading ? (
          <p style={s.loadTxt}>Cargando recetas...</p>
        ) : (
          <>
            <p style={s.sectionLabel}>Consumo por tipo de pedido</p>
            <p style={s.sectionHint}>
              Cosas como la bolsa para llevar no dependen del producto, sino de
              si el pedido es para llevar o domicilio.
            </p>
            <div style={s.typeList}>
              {TIPOS_PEDIDO.map((t) => {
                const rows = typeRecipesFor(t.value);
                return (
                  <div key={t.value} style={s.typeRow} onClick={() => openType(t.value)}>
                    <span style={s.typeName}>{t.label}</span>
                    <span style={s.itemCount}>
                      {rows.length === 0
                        ? "Sin insumos"
                        : rows.map((r) => r.inventory_items?.name).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={s.divider} />

            <p style={s.sectionLabel}>Recetas por producto</p>
            <div style={s.filterRow}>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.value}
                  style={{
                    ...s.filterBtn,
                    backgroundColor: filtro === cat.value ? c.accentSoft : "#FFF",
                    borderColor: filtro === cat.value ? c.accent : c.border,
                    color: filtro === cat.value ? c.accent : c.inkSoft,
                    fontWeight: filtro === cat.value ? 600 : 400,
                  }}
                  onClick={() => setFiltro(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {filtered().length === 0 ? (
              <p style={s.loadTxt}>No hay productos en esta categoria</p>
            ) : (
              <div style={s.prodList}>
                {filtered().map((p) => {
                  const rows = recipesFor(p.id);
                  return (
                    <div key={p.id} style={s.prodRow} onClick={() => openProduct(p)}>
                      <span style={s.prodName}>{p.name}</span>
                      <span
                        style={{
                          ...s.itemCountPill,
                          backgroundColor: rows.length === 0 ? c.warnSoft : c.successSoft,
                          color: rows.length === 0 ? c.warn : c.success,
                        }}
                      >
                        {rows.length === 0
                          ? "Sin receta"
                          : `${rows.length} insumo${rows.length !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: editar receta de producto o tipo de pedido */}
      {modalOpen && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>{modalTitle}</p>
              <button style={s.closeBtn} onClick={closeModal}>
                ✕
              </button>
            </div>
            <div style={s.formBody}>
              {currentRows.length === 0 ? (
                <p style={s.helperTxt}>Todavia no tiene insumos asignados</p>
              ) : (
                <div style={s.rowList}>
                  {currentRows.map((r) => (
                    <div key={r.id} style={s.recipeRow}>
                      <div style={s.recipeInfo}>
                        <p style={s.recipeName}>{r.inventory_items?.name}</p>
                        <div style={s.recipeMeta}>
                          <span
                            style={{
                              ...s.tag,
                              backgroundColor: r.inventory_items?.is_estimated
                                ? c.warnSoft
                                : c.successSoft,
                              color: r.inventory_items?.is_estimated
                                ? c.warn
                                : c.success,
                            }}
                          >
                            {r.inventory_items?.is_estimated ? "Estimado" : "Exacto"}
                          </span>
                          <span style={s.qtyTxt}>
                            {Number(r.quantity).toLocaleString("es-CO")}{" "}
                            {r.inventory_items?.unit}
                          </span>
                        </div>
                      </div>
                      <button
                        style={s.removeBtn}
                        onClick={() => removeRow(r, !!selectedType)}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={s.divider} />
              <p style={s.label}>Agregar insumo</p>
              <select
                style={s.select}
                value={newItemId}
                onChange={(e) => setNewItemId(e.target.value)}
              >
                <option value="">Elige un insumo...</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
              <input
                style={s.input}
                type="number"
                placeholder="Cantidad por unidad vendida"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />

              {rowError && <p style={s.error}>{rowError}</p>}

              <button
                style={{ ...s.btnPrimary, opacity: savingRow ? 0.7 : 1 }}
                disabled={savingRow}
                onClick={addRow}
              >
                {savingRow ? "Agregando..." : "Agregar insumo"}
              </button>
              <button style={s.btnGhost} onClick={closeModal}>
                Cerrar
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
  body: { padding: 16 },
  loadTxt: { fontSize: 15, color: c.inkFaint, textAlign: "center", padding: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: c.inkSoft,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 13, color: c.inkFaint, margin: "0 0 10px" },
  typeList: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  typeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: `0.5px solid ${c.border}`,
    borderRadius: 8,
    cursor: "pointer",
    gap: 10,
  },
  typeName: { fontSize: 15, fontWeight: 600, color: c.ink, flexShrink: 0 },
  itemCount: {
    fontSize: 13,
    color: c.inkSoft,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  divider: { height: "0.5px", backgroundColor: c.border, margin: "12px 0" },
  filterRow: { display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" },
  filterBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  prodList: { display: "flex", flexDirection: "column", gap: 6 },
  prodRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: `0.5px solid ${c.border}`,
    borderRadius: 8,
    cursor: "pointer",
  },
  prodName: { fontSize: 15, fontWeight: 500, color: c.ink },
  itemCountPill: {
    fontSize: 12,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 20,
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
  helperTxt: { fontSize: 14, color: c.inkFaint, margin: "0 0 12px" },
  rowList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 },
  recipeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    backgroundColor: c.bgMuted,
    borderRadius: 8,
  },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 15, fontWeight: 500, color: c.ink, margin: "0 0 4px" },
  recipeMeta: { display: "flex", alignItems: "center", gap: 8 },
  tag: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  qtyTxt: { fontSize: 14, color: c.inkSoft },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    padding: "4px 6px",
  },
  label: { fontSize: 14, fontWeight: 500, color: c.inkSoft, margin: "0 0 4px" },
  select: {
    width: "100%",
    border: `0.5px solid ${c.inkFaint}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 16,
    color: c.ink,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    backgroundColor: c.bg,
    marginBottom: 12,
    boxSizing: "border-box",
  },
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
