// ARCHIVO: src/pages/admin/Gastos.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

const PALETTE = [
  { color: "#185FA5", bg: "#E6F1FB" },
  { color: "#0F6E56", bg: "#E1F5EE" },
  { color: "#854F0B", bg: "#FAEEDA" },
  { color: "#534AB7", bg: "#EEEDFE" },
  { color: "#3B6D11", bg: "#EAF3DE" },
  { color: "#A32D2D", bg: "#FCEBEB" },
  { color: "#444441", bg: "#F1EFE8" },
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
    return cat ? paletteFor(cat.color) : { color: "#888880", bg: "#F1EFE8" };
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
        <button style={s.newBtn} onClick={openNew}>
          + nuevo
        </button>
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
              backgroundColor: periodo === val ? "#E6F1FB" : "#FFF",
              borderColor: periodo === val ? "#378ADD" : "#DDDDCC",
              color: periodo === val ? "#185FA5" : "#666660",
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
                  backgroundColor: filterCat === "todos" ? "#F1EFE8" : "#FFF",
                  borderColor: filterCat === "todos" ? "#B0AFA5" : "#DDDDCC",
                  color: filterCat === "todos" ? "#444441" : "#888880",
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
                      borderColor: filterCat === name ? st.color : "#DDDDCC",
                      color: filterCat === name ? st.color : "#888880",
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
                            style={{ ...s.iconBtn, color: "#A32D2D" }}
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
                  Descripción <span style={{ color: "#A32D2D" }}>*</span>
                </p>
                <input
                  style={s.input}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
                <p style={s.label}>
                  Monto (COP) <span style={{ color: "#A32D2D" }}>*</span>
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
                <div style={s.catBtns}>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      style={{
                        ...s.catOptBtn,
                        backgroundColor:
                          form.categoryId === cat.id ? paletteFor(cat.color).bg : "#FFF",
                        borderColor:
                          form.categoryId === cat.id ? cat.color : "#DDDDCC",
                        color: form.categoryId === cat.id ? cat.color : "#666660",
                        fontWeight: form.categoryId === cat.id ? 600 : 400,
                      }}
                      onClick={() => pickCategory(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                  <button
                    style={s.addChipBtn}
                    onClick={() => setShowNewCategory(!showNewCategory)}
                  >
                    + nueva
                  </button>
                </div>
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
                    <div style={s.catBtns}>
                      {itemsForCategory(form.categoryId).map((item) => (
                        <button
                          key={item.id}
                          style={{
                            ...s.catOptBtn,
                            backgroundColor: form.itemId === item.id ? "#E6F1FB" : "#FFF",
                            borderColor: form.itemId === item.id ? "#378ADD" : "#DDDDCC",
                            color: form.itemId === item.id ? "#185FA5" : "#666660",
                            fontWeight: form.itemId === item.id ? 600 : 400,
                          }}
                          onClick={() => setForm((f) => ({ ...f, itemId: item.id }))}
                        >
                          {item.name}
                        </button>
                      ))}
                      <button
                        style={s.addChipBtn}
                        onClick={() => setShowNewItem(!showNewItem)}
                      >
                        + nuevo
                      </button>
                    </div>
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
                  Monto (COP) <span style={{ color: "#A32D2D" }}>*</span>
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
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#FAFAF8", fontFamily: "sans-serif" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#FFF", borderBottom: "0.5px solid #DDDDCC" },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: { fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#666660", padding: "0 4px" },
  title: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  newBtn: { fontSize: 12, fontWeight: 500, color: "#185FA5", backgroundColor: "#E6F1FB", border: "0.5px solid #B5D4F4", borderRadius: 20, padding: "6px 14px", cursor: "pointer" },
  filterRow: { display: "flex", gap: 6, padding: "10px 16px", backgroundColor: "#FFF", borderBottom: "0.5px solid #DDDDCC", overflowX: "auto" },
  filterBtn: { border: "0.5px solid", borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "sans-serif" },
  body: { padding: 16 },
  loadTxt: { fontSize: 13, color: "#888880", textAlign: "center", padding: 20 },
  catGrid: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
  catCard: { backgroundColor: "#FFF", border: "0.5px solid #DDDDCC", borderLeft: "3px solid", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 12, fontWeight: 500, margin: 0 },
  catTotal: { fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  totalCard: { backgroundColor: "#F1EFE8", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  totalLabel: { fontSize: 13, fontWeight: 500, color: "#1A1A1A" },
  totalVal: { fontSize: 18, fontWeight: 600, color: "#A32D2D" },
  divider: { height: "0.5px", backgroundColor: "#DDDDCC", margin: "10px 0" },
  expenseList: { display: "flex", flexDirection: "column", gap: 8 },
  expenseRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", backgroundColor: "#FFF", border: "0.5px solid #DDDDCC", borderRadius: 8 },
  catDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 13, fontWeight: 500, color: "#1A1A1A", margin: "0 0 4px" },
  expenseMeta: { display: "flex", alignItems: "center", gap: 6 },
  catPill: { fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 20 },
  expenseDate: { fontSize: 10, color: "#888880" },
  expenseRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  expenseAmount: { fontSize: 13, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  expenseActions: { display: "flex", gap: 4 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "2px 4px" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  modal: { backgroundColor: "#FFF", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 0" },
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#666660" },
  formBody: { padding: 16 },
  label: { fontSize: 12, fontWeight: 500, color: "#444441", margin: "0 0 4px" },
  input: { width: "100%", border: "0.5px solid #B0AFA5", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#1A1A1A", fontFamily: "sans-serif", outline: "none", backgroundColor: "#FAFAF8", marginBottom: 12, boxSizing: "border-box" },
  catBtns: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  catOptBtn: { border: "0.5px solid", borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "sans-serif" },
  addChipBtn: { border: "0.5px dashed #B0AFA5", borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "sans-serif", color: "#666660", backgroundColor: "#FFF" },
  inlineAdd: { display: "flex", gap: 6, marginBottom: 12 },
  inlineInput: { flex: 1, border: "0.5px solid #B0AFA5", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1A1A1A", fontFamily: "sans-serif", outline: "none", backgroundColor: "#FAFAF8", boxSizing: "border-box" },
  inlineBtn: { fontSize: 12, fontWeight: 500, color: "#185FA5", backgroundColor: "#E6F1FB", border: "0.5px solid #B5D4F4", borderRadius: 8, padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap" },
  error: { fontSize: 12, color: "#A32D2D", backgroundColor: "#FCEBEB", padding: "8px 12px", borderRadius: 6, marginBottom: 12 },
  btnPrimary: { width: "100%", padding: 12, backgroundColor: "#185FA5", color: "#E6F1FB", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: "sans-serif", marginBottom: 8, cursor: "pointer" },
  btnGhost: { width: "100%", padding: 10, backgroundColor: "#FFF", color: "#1A1A1A", border: "0.5px solid #DDDDCC", borderRadius: 8, fontSize: 13, fontFamily: "sans-serif", cursor: "pointer" },
};
