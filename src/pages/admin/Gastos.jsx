// ARCHIVO: src/pages/admin/Gastos.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

const CATEGORIAS = [
  {
    value: "materia_prima",
    label: "Materia prima",
    color: "#185FA5",
    bg: "#E6F1FB",
  },
  { value: "servicios", label: "Servicios", color: "#0F6E56", bg: "#E1F5EE" },
  { value: "arriendo", label: "Arriendo", color: "#854F0B", bg: "#FAEEDA" },
  { value: "nomina", label: "Nómina", color: "#534AB7", bg: "#EEEDFE" },
  { value: "otro", label: "Otro", color: "#444441", bg: "#F1EFE8" },
];

const EMPTY_FORM = {
  date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }),
  category: "materia_prima",
  description: "",
  amount: "",
};

function getCat(value) {
  return CATEGORIAS.find((c) => c.value === value) ?? CATEGORIAS[4];
}

export default function Gastos() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterCat, setFilterCat] = useState("todos");
  const [periodo, setPeriodo] = useState("semana"); // 'hoy' | 'semana' | 'mes'

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
    loadExpenses();
  }, [periodo]);

  function filtered() {
    if (filterCat === "todos") return expenses;
    return expenses.filter((e) => e.category === filterCat);
  }

  function totalFiltered() {
    return filtered().reduce((a, e) => a + (e.amount ?? 0), 0);
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
    setError("");
    setShowForm(true);
  }

  function openEdit(e) {
    setForm({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
    });
    setEditingId(e.id);
    setError("");
    setShowForm(true);
  }

  async function saveExpense() {
    setError("");
    if (!form.description.trim()) {
      setError("La descripcion es obligatoria");
      return;
    }
    if (
      !form.amount ||
      isNaN(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    const payload = {
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      created_by: profile.id,
    };

    if (editingId) {
      await supabase.from("expenses").update(payload).eq("id", editingId);
    } else {
      await supabase.from("expenses").insert(payload);
    }

    setSaving(false);
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
              {CATEGORIAS.map((cat) => {
                const total = catTotals[cat.value] ?? 0;
                if (total === 0) return null;
                return (
                  <div
                    key={cat.value}
                    style={{ ...s.catCard, borderLeftColor: cat.color }}
                  >
                    <p style={{ ...s.catLabel, color: cat.color }}>
                      {cat.label}
                    </p>
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
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.value}
                  style={{
                    ...s.filterBtn,
                    backgroundColor: filterCat === cat.value ? cat.bg : "#FFF",
                    borderColor:
                      filterCat === cat.value ? cat.color : "#DDDDCC",
                    color: filterCat === cat.value ? cat.color : "#888880",
                  }}
                  onClick={() => setFilterCat(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Lista de gastos */}
            {filtered().length === 0 ? (
              <p style={s.loadTxt}>No hay gastos en este período</p>
            ) : (
              <div style={s.expenseList}>
                {filtered().map((e) => {
                  const cat = getCat(e.category);
                  return (
                    <div key={e.id} style={s.expenseRow}>
                      <div
                        style={{ ...s.catDot, backgroundColor: cat.color }}
                      />
                      <div style={s.expenseInfo}>
                        <p style={s.expenseName}>{e.description}</p>
                        <div style={s.expenseMeta}>
                          <span
                            style={{
                              ...s.catPill,
                              backgroundColor: cat.bg,
                              color: cat.color,
                            }}
                          >
                            {cat.label}
                          </span>
                          <span style={s.expenseDate}>
                            {formatDate(e.date)}
                          </span>
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
              <p style={s.modalTitle}>
                {editingId ? "Editar gasto" : "Nuevo gasto"}
              </p>
              <button style={s.closeBtn} onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <div style={s.formBody}>
              <p style={s.label}>Fecha</p>
              <input
                style={s.input}
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />

              <p style={s.label}>Categoría</p>
              <div style={s.catBtns}>
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat.value}
                    style={{
                      ...s.catOptBtn,
                      backgroundColor:
                        form.category === cat.value ? cat.bg : "#FFF",
                      borderColor:
                        form.category === cat.value ? cat.color : "#DDDDCC",
                      color:
                        form.category === cat.value ? cat.color : "#666660",
                      fontWeight: form.category === cat.value ? 600 : 400,
                    }}
                    onClick={() =>
                      setForm((f) => ({ ...f, category: cat.value }))
                    }
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <p style={s.label}>
                Descripción <span style={{ color: "#A32D2D" }}>*</span>
              </p>
              <input
                style={s.input}
                placeholder="Ej: Compra de pan para sandwiches"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />

              <p style={s.label}>
                Monto (COP) <span style={{ color: "#A32D2D" }}>*</span>
              </p>
              <input
                style={s.input}
                type="number"
                placeholder="25000"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
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
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#FAFAF8",
    fontFamily: "sans-serif",
  },
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
  title: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  newBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#185FA5",
    backgroundColor: "#E6F1FB",
    border: "0.5px solid #B5D4F4",
    borderRadius: 20,
    padding: "6px 14px",
    cursor: "pointer",
  },
  filterRow: {
    display: "flex",
    gap: 6,
    padding: "10px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
    overflowX: "auto",
  },
  filterBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "sans-serif",
  },
  body: { padding: 16 },
  loadTxt: { fontSize: 13, color: "#888880", textAlign: "center", padding: 20 },
  catGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
  },
  catCard: {
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderLeft: "3px solid",
    borderRadius: 8,
    padding: "8px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catLabel: { fontSize: 12, fontWeight: 500, margin: 0 },
  catTotal: { fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  totalCard: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: 500, color: "#1A1A1A" },
  totalVal: { fontSize: 18, fontWeight: 600, color: "#A32D2D" },
  divider: { height: "0.5px", backgroundColor: "#DDDDCC", margin: "10px 0" },
  expenseList: { display: "flex", flexDirection: "column", gap: 8 },
  expenseRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
  },
  catDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  expenseInfo: { flex: 1 },
  expenseName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 4px",
  },
  expenseMeta: { display: "flex", alignItems: "center", gap: 6 },
  catPill: {
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 7px",
    borderRadius: 20,
  },
  expenseDate: { fontSize: 10, color: "#888880" },
  expenseRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  expenseAmount: { fontSize: 13, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  expenseActions: { display: "flex", gap: 4 },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    padding: "2px 4px",
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
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    color: "#666660",
  },
  formBody: { padding: 16 },
  label: { fontSize: 12, fontWeight: 500, color: "#444441", margin: "0 0 4px" },
  input: {
    width: "100%",
    border: "0.5px solid #B0AFA5",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: "sans-serif",
    outline: "none",
    backgroundColor: "#FAFAF8",
    marginBottom: 12,
    boxSizing: "border-box",
  },
  catBtns: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  catOptBtn: {
    border: "0.5px solid",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  error: {
    fontSize: 12,
    color: "#A32D2D",
    backgroundColor: "#FCEBEB",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 12,
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
    cursor: "pointer",
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
};
