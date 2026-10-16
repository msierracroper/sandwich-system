// ARCHIVO: src/pages/admin/Gastos.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

// Paleta para distinguir categorias de gastos a simple vista — colores
// categoricos, no de estado, por eso usa teal/indigo ademas de los tonos
// semanticos.
const PALETTE = [
  { color: c.accent, bg: c.accentSoft },
  { color: c.teal, bg: c.tealSoft },
  { color: c.warn, bg: c.warnSoft },
  { color: c.indigo, bg: c.indigoSoft },
  { color: c.success, bg: c.successSoft },
  { color: c.danger, bg: c.dangerSoft },
  { color: c.inkSoft, bg: c.bgMuted },
];

function paletteFor(color) {
  return PALETTE.find((p) => p.color === color) ?? PALETTE[6];
}

const EMPTY_FORM = {
  date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }),
  categoryId: "",
  itemId: "",
  note: "",
  amount: "",
};

export default function Gastos() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null); // { date, description, amount }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showManageCategories, setShowManageCategories] = useState(false);

  const [filterCat, setFilterCat] = useState("todos");
  const [periodo, setPeriodo] = useState("semana"); // 'hoy' | 'semana' | 'mes'

  async function loadCatalog() {
    const [{ data: cats }, { data: itemsData }] = await Promise.all([
      supabase.from("expense_categories").select("*").eq("active", true).order("name"),
      supabase.from("expense_items").select("*").eq("active", true).order("name"),
    ]);
    setCategories(cats ?? []);
    setItems(itemsData ?? []);
  }

  async function loadExpenses() {
    const today = new Date();
    let from;
    if (periodo === "hoy") {
      from = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Bogota",
      });
    } else if (periodo === "semana") {
      const d = new Date(today);
      d.setDate(today.getDate() - 7);
      from = d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    } else {
      from = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    }

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", from)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setExpenses(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadCatalog();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    loadExpenses();
  }, [periodo]);

  function itemsForCategory(categoryId) {
    return items.filter((i) => i.category_id === categoryId);
  }

  function categoryStyle(name) {
    const cat = categories.find((c) => c.name === name);
    return cat ? paletteFor(cat.color) : { color: c.inkFaint, bg: c.bgMuted };
  }

  function filtered() {
    if (filterCat === "todos") return expenses;
    return expenses.filter((e) => e.category === filterCat);
  }

  function totalByCategory() {
    const map = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return map;
  }

  function formatPrice(n) {
    return "$" + (n ?? 0).toLocaleString("es-CO");
  }
  function formatDate(d) {
    return new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function openNew() {
    setForm({
      ...EMPTY_FORM,
      date: new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Bogota",
      }),
    });
    setEditingId(null);
    setEditForm(null);
    setShowNewCategory(false);
    setShowNewItem(false);
    setError("");
    setShowForm(true);
  }

  function openEdit(e) {
    setEditingId(e.id);
    setEditForm({ date: e.date, description: e.description, amount: String(e.amount) });
    setError("");
    setShowForm(true);
  }

  function pickCategory(categoryId) {
    setForm((f) => ({ ...f, categoryId, itemId: "" }));
    setShowNewItem(false);
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setError("");
    const palette = PALETTE[categories.length % PALETTE.length];
    const { data, error: err } = await supabase
      .from("expense_categories")
      .insert({ name: newCategoryName.trim(), color: palette.color })
      .select()
      .single();
    if (err) {
      setError("Error al crear categoria");
      return;
    }
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, categoryId: data.id, itemId: "" }));
    setNewCategoryName("");
    setShowNewCategory(false);
  }

  async function deleteCategory(cat) {
    if (
      !confirm(
        `¿Eliminar la categoria "${cat.name}"? Los insumos que tenga tambien se ocultaran. Los gastos ya registrados no se ven afectados.`,
      )
    )
      return;
    await supabase.from("expense_categories").update({ active: false }).eq("id", cat.id);
    await supabase.from("expense_items").update({ active: false }).eq("category_id", cat.id);
    if (form.categoryId === cat.id) {
      setForm((f) => ({ ...f, categoryId: "", itemId: "" }));
    }
    loadCatalog();
  }

  async function addItem() {
    if (!newItemName.trim() || !form.categoryId) return;
    setError("");
    const { data, error: err } = await supabase
      .from("expense_items")
      .insert({ category_id: form.categoryId, name: newItemName.trim() })
      .select()
      .single();
    if (err) {
      setError("Error al crear insumo");
      return;
    }
    setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, itemId: data.id }));
    setNewItemName("");
    setShowNewItem(false);
  }

  async function saveExpense() {
    setError("");
    if (!form.categoryId) {
      setError("Elige una categoria");
      return;
    }
    if (!form.itemId) {
      setError("Elige o crea un insumo");
      return;
    }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    const category = categories.find((c) => c.id === form.categoryId);
    const item = items.find((i) => i.id === form.itemId);
    const description = item.name + (form.note.trim() ? ` (${form.note.trim()})` : "");

    setSaving(true);
    const { error: err } = await supabase.from("expenses").insert({
      date: form.date,
      category: category.name,
      description,
      amount: Number(form.amount),
      expense_item_id: item.id,
      created_by: profile.id,
    });
    setSaving(false);
    if (err) {
      setError("Error al guardar gasto");
      return;
    }
    setShowForm(false);
    loadExpenses();
  }

  async function saveEditedExpense() {
    setError("");
    if (!editForm.description.trim()) {
      setError("La descripcion es obligatoria");
      return;
    }
    if (
      !editForm.amount ||
      isNaN(Number(editForm.amount)) ||
      Number(editForm.amount) <= 0
    ) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("expenses")
      .update({
        date: editForm.date,
        description: editForm.description.trim(),
        amount: Number(editForm.amount),
      })
      .eq("id", editingId);
    setSaving(false);
    if (err) {
      setError("Error al guardar cambios");
      return;
    }
    setShowForm(false);
    loadExpenses();
  }

  async function deleteExpense(id) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadExpenses();
  }

  const catTotals = totalByCategory();
  const grandTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const catNames = [...new Set([...categories.map((c) => c.name), ...expenses.map((e) => e.category)])];

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Gastos</p>
            <p style={s.sub}>{expenses.length} registros</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={s.manageBtn}
            onClick={() => setShowManageCategories(true)}
          >
            ⚙ Categorías
          </button>
          <button style={s.newBtn} onClick={openNew}>
            + nuevo
          </button>
        </div>
      </div>

      {/* Periodo */}
      <div style={s.filterRow}>
        {[
          ["hoy", "Hoy"],
          ["semana", "Semana"],
          ["mes", "Mes"],
        ].map(([val, lbl]) => (
          <button
            key={val}
            style={{
              ...s.filterBtn,
              backgroundColor: periodo === val ? c.accentSoft : "#FFF",
              borderColor: periodo === val ? c.accent : c.border,
              color: periodo === val ? c.accent : c.inkSoft,
              fontWeight: periodo === val ? 600 : 400,
            }}
            onClick={() => setPeriodo(val)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {loading ? (
          <p style={s.loadTxt}>Cargando gastos...</p>
        ) : (
          <>
            {/* Resumen por categoria */}
            <div style={s.catGrid}>
              {catNames.map((name) => {
                const total = catTotals[name] ?? 0;
                if (total === 0) return null;
                const st = categoryStyle(name);
                return (
                  <div key={name} style={{ ...s.catCard, borderLeftColor: st.color }}>
                    <p style={{ ...s.catLabel, color: st.color }}>{name}</p>
                    <p style={s.catTotal}>{formatPrice(total)}</p>
                  </div>
                );
              })}
            </div>

            {grandTotal > 0 && (
              <div style={s.totalCard}>
                <span style={s.totalLabel}>Total gastos</span>
                <span style={s.totalVal}>{formatPrice(grandTotal)}</span>
              </div>
            )}

            <div style={s.divider} />

            {/* Filtro por categoria */}
            <div
              style={{
                ...s.filterRow,
                padding: 0,
                marginBottom: 10,
                backgroundColor: "transparent",
                borderBottom: "none",
                overflowX: "auto",
              }}
            >
              <button
                style={{
                  ...s.filterBtn,
                  backgroundColor: filterCat === "todos" ? c.bgMuted : "#FFF",
                  borderColor: filterCat === "todos" ? c.inkFaint : c.border,
                  color: filterCat === "todos" ? c.inkSoft : c.inkFaint,
                }}
                onClick={() => setFilterCat("todos")}
              >
                Todos
              </button>
              {catNames.map((name) => {
                const st = categoryStyle(name);
                return (
                  <button
                    key={name}
                    style={{
                      ...s.filterBtn,
                      backgroundColor: filterCat === name ? st.bg : "#FFF",
                      borderColor: filterCat === name ? st.color : c.border,
                      color: filterCat === name ? st.color : c.inkFaint,
                    }}
                    onClick={() => setFilterCat(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Lista de gastos */}
            {filtered().length === 0 ? (
              <p style={s.loadTxt}>No hay gastos en este período</p>
            ) : (
              <div style={s.expenseList}>
                {filtered().map((e) => {
                  const st = categoryStyle(e.category);
                  return (
                    <div key={e.id} style={s.expenseRow}>
                      <div style={{ ...s.catDot, backgroundColor: st.color }} />
                      <div style={s.expenseInfo}>
                        <p style={s.expenseName}>{e.description}</p>
                        <div style={s.expenseMeta}>
                          <span style={{ ...s.catPill, backgroundColor: st.bg, color: st.color }}>
                            {e.category}
                          </span>
                          <span style={s.expenseDate}>{formatDate(e.date)}</span>
                        </div>
                      </div>
                      <div style={s.expenseRight}>
                        <p style={s.expenseAmount}>{formatPrice(e.amount)}</p>
                        <div style={s.expenseActions}>
                          <button style={s.iconBtn} onClick={() => openEdit(e)}>
                            ✏️
                          </button>
                          <button
                            style={{ ...s.iconBtn, color: c.danger }}
                            onClick={() => deleteExpense(e.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>{editingId ? "Editar gasto" : "Nuevo gasto"}</p>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            {editingId ? (
              <div style={s.formBody}>
                <p style={s.label}>Fecha</p>
                <input
                  style={s.input}
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
                <p style={s.label}>
                  Descripción <span style={{ color: c.danger }}>*</span>
                </p>
                <input
                  style={s.input}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
                <p style={s.label}>
                  Monto (COP) <span style={{ color: c.danger }}>*</span>
                </p>
                <input
                  style={s.input}
                  type="number"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />

                {error && <p style={s.error}>{error}</p>}

                <button
                  style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
                  disabled={saving}
                  onClick={saveEditedExpense}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button style={s.btnGhost} onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div style={s.formBody}>
                <p style={s.label}>Fecha</p>
                <input
                  style={s.input}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />

                <p style={s.label}>Categoría</p>
                <select
                  style={s.select}
                  value={showNewCategory ? "__new__" : form.categoryId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewCategory(true);
                    } else {
                      setShowNewCategory(false);
                      pickCategory(e.target.value);
                    }
                  }}
                >
                  <option value="">Elige una categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__new__">+ Crear categoria nueva...</option>
                </select>
                {showNewCategory && (
                  <div style={s.inlineAdd}>
                    <input
                      style={s.inlineInput}
                      placeholder="Nombre de la categoria"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button style={s.inlineBtn} onClick={addCategory}>
                      Agregar
                    </button>
                  </div>
                )}

                {form.categoryId && (
                  <>
                    <p style={s.label}>Insumo</p>
                    <select
                      style={s.select}
                      value={showNewItem ? "__new__" : form.itemId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setShowNewItem(true);
                        } else {
                          setShowNewItem(false);
                          setForm((f) => ({ ...f, itemId: e.target.value }));
                        }
                      }}
                    >
                      <option value="">Elige un insumo...</option>
                      {itemsForCategory(form.categoryId).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                      <option value="__new__">+ Crear insumo nuevo...</option>
                    </select>
                    {showNewItem && (
                      <div style={s.inlineAdd}>
                        <input
                          style={s.inlineInput}
                          placeholder="Ej: Jabon lavaloza"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                        />
                        <button style={s.inlineBtn} onClick={addItem}>
                          Agregar
                        </button>
                      </div>
                    )}
                  </>
                )}

                <p style={s.label}>Nota adicional (opcional)</p>
                <input
                  style={s.input}
                  placeholder="Ej: 2 unidades, marca X..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />

                <p style={s.label}>
                  Monto (COP) <span style={{ color: c.danger }}>*</span>
                </p>
                <input
                  style={s.input}
                  type="number"
                  placeholder="25000"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />

                {error && <p style={s.error}>{error}</p>}

                <button
                  style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
                  disabled={saving}
                  onClick={saveExpense}
                >
                  {saving ? "Guardando..." : "Guardar gasto"}
                </button>
                <button style={s.btnGhost} onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: administrar categorias */}
      {showManageCategories && (
        <div
          style={s.overlay}
          onClick={() => setShowManageCategories(false)}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Administrar categorías</p>
              <button
                style={s.closeBtn}
                onClick={() => setShowManageCategories(false)}
              >
                ✕
              </button>
            </div>
            <div style={s.formBody}>
              {categories.length === 0 ? (
                <p style={s.loadTxt}>No hay categorias creadas</p>
              ) : (
                <div style={s.manageList}>
                  {categories.map((cat) => (
                    <div key={cat.id} style={s.manageRow}>
                      <div
                        style={{
                          ...s.catDot,
                          backgroundColor: paletteFor(cat.color).color,
                        }}
                      />
                      <span style={s.manageName}>{cat.name}</span>
                      <span style={s.manageCount}>
                        {itemsForCategory(cat.id).length} insumo
                        {itemsForCategory(cat.id).length !== 1 ? "s" : ""}
                      </span>
                      <button
                        style={{ ...s.iconBtn, color: c.danger }}
                        onClick={() => deleteCategory(cat)}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                style={{ ...s.btnGhost, marginTop: 12 }}
                onClick={() => setShowManageCategories(false)}
              >
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
  page: { minHeight: "100vh", backgroundColor: c.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#FFF", borderBottom: `0.5px solid ${c.border}` },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: { fontSize: 20, background: "none", border: "none", cursor: "pointer", color: c.inkSoft, padding: "0 4px" },
  title: { fontSize: 18, fontWeight: 600, color: c.ink, margin: "0 0 2px" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0 },
  newBtn: { fontSize: 14, fontWeight: 500, color: c.accent, backgroundColor: c.accentSoft, border: `0.5px solid ${c.accentBorder}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer" },
  filterRow: { display: "flex", gap: 6, padding: "10px 16px", backgroundColor: "#FFF", borderBottom: `0.5px solid ${c.border}`, overflowX: "auto" },
  filterBtn: { border: "0.5px solid", borderRadius: 20, padding: "5px 12px", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  body: { padding: 16 },
  loadTxt: { fontSize: 15, color: c.inkFaint, textAlign: "center", padding: 20 },
  catGrid: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  catCard: { backgroundColor: "#FFF", border: `0.5px solid ${c.border}`, borderLeft: "3px solid", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 14, fontWeight: 500, margin: 0 },
  catTotal: { fontSize: 16, fontWeight: 600, color: c.ink, margin: 0 },
  totalCard: { backgroundColor: c.bgMuted, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  totalLabel: { fontSize: 15, fontWeight: 500, color: c.ink },
  totalVal: { fontSize: 20, fontWeight: 600, color: c.danger },
  divider: { height: "0.5px", backgroundColor: c.border, margin: "10px 0" },
  expenseList: { display: "flex", flexDirection: "column", gap: 8 },
  expenseRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", backgroundColor: "#FFF", border: `0.5px solid ${c.border}`, borderRadius: 8 },
  catDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 15, fontWeight: 500, color: c.ink, margin: "0 0 4px" },
  expenseMeta: { display: "flex", alignItems: "center", gap: 6 },
  catPill: { fontSize: 12, fontWeight: 500, padding: "2px 7px", borderRadius: 20 },
  expenseDate: { fontSize: 12, color: c.inkFaint },
  expenseRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  expenseAmount: { fontSize: 15, fontWeight: 600, color: c.ink, margin: 0 },
  expenseActions: { display: "flex", gap: 4 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  modal: { backgroundColor: "#FFF", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 0" },
  modalTitle: { fontSize: 18, fontWeight: 600, color: c.ink, margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: c.inkSoft },
  formBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: 500, color: c.inkSoft, margin: "0 0 4px" },
  input: { width: "100%", border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", backgroundColor: c.bg, marginBottom: 12, boxSizing: "border-box" },
  select: { width: "100%", border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: c.bg, marginBottom: 12, boxSizing: "border-box" },
  manageBtn: { fontSize: 14, fontWeight: 500, color: c.inkSoft, backgroundColor: c.bgMuted, border: `0.5px solid ${c.border}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  manageList: { display: "flex", flexDirection: "column", gap: 6 },
  manageRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", backgroundColor: c.bgMuted, borderRadius: 8 },
  manageName: { fontSize: 15, fontWeight: 500, color: c.ink, flex: 1 },
  manageCount: { fontSize: 13, color: c.inkFaint },
  inlineAdd: { display: "flex", gap: 6, marginBottom: 12 },
  inlineInput: { flex: 1, border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: "8px 10px", fontSize: 15, color: c.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", backgroundColor: c.bg, boxSizing: "border-box" },
  inlineBtn: { fontSize: 14, fontWeight: 500, color: c.accent, backgroundColor: c.accentSoft, border: `0.5px solid ${c.accentBorder}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap" },
  error: { fontSize: 14, color: c.danger, backgroundColor: c.dangerSoft, padding: "8px 12px", borderRadius: 6, marginBottom: 12 },
  btnPrimary: { width: "100%", padding: 12, backgroundColor: c.accent, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, cursor: "pointer" },
  btnGhost: { width: "100%", padding: 10, backgroundColor: "#FFF", color: c.ink, border: `0.5px solid ${c.border}`, borderRadius: 8, fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer" },
};
