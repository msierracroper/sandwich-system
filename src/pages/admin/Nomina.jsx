// ARCHIVO: src/pages/admin/Nomina.jsx
//
// "Nomina" por obra labor (no es nomina legal colombiana): un libro de
// movimientos por empleado (devengado, comision, pago, anticipo, prestamo,
// cuota de prestamo). Los saldos se calculan en el cliente a partir de los
// movimientos, igual de simple que Gastos.jsx.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

const TYPE_META = {
  devengado: { label: "Día trabajado", color: c.success, bg: c.successSoft },
  comision: { label: "Comisión", color: c.teal, bg: c.tealSoft },
  pago: { label: "Pago entregado", color: c.accent, bg: c.accentSoft },
  anticipo: { label: "Anticipo", color: c.warn, bg: c.warnSoft },
  prestamo: { label: "Préstamo otorgado", color: c.indigo, bg: c.indigoSoft },
  cuota_prestamo: { label: "Cuota de préstamo", color: c.info, bg: c.infoSoft },
};

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function formatShort(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Rango de 7 dias que termina en el proximo "corte" (o hoy, si hoy es el
// corte) — asi el saldo de la semana se puede ir viendo acumular dia a dia
// y, llegado el dia de pago, ya esta listo.
function currentPeriod(cutoffWeekday) {
  const now = new Date(today() + "T12:00:00");
  const diff = (cutoffWeekday - now.getDay() + 7) % 7;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const fmt = (d) => d.toLocaleDateString("en-CA");
  return { start: fmt(start), end: fmt(end) };
}

const EMPTY_EMPLOYEE = {
  name: "",
  role: "",
  pay_schedule: "diario",
  daily_rate: "",
  pay_cutoff_weekday: "5",
};
const EMPTY_MOVEMENT = { type: "devengado", date: today(), amount: "", note: "" };

export default function Nomina() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const [empError, setEmpError] = useState("");

  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState(EMPTY_MOVEMENT);
  const [editingMovId, setEditingMovId] = useState(null);
  const [savingMov, setSavingMov] = useState(false);
  const [movError, setMovError] = useState("");

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name");
    setEmployees(data ?? []);
    setLoading(false);
  }

  async function loadMovements() {
    const { data } = await supabase
      .from("employee_movements")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setMovements(data ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadEmployees();
    loadMovements();
  }, []);

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

  function sumType(movs, type) {
    return movs.filter((m) => m.type === type).reduce((a, m) => a + m.amount, 0);
  }

  function balancesFor(employeeId) {
    const movs = movements.filter((m) => m.employee_id === employeeId);
    const devengado = sumType(movs, "devengado") + sumType(movs, "comision");
    const pagado = sumType(movs, "pago") + sumType(movs, "anticipo");
    const prestamo = sumType(movs, "prestamo") - sumType(movs, "cuota_prestamo");
    return { porPagar: devengado - pagado, prestamo };
  }

  // Igual que balancesFor, pero solo con los movimientos dentro de la semana
  // actual (segun el dia de corte del empleado) — para ver cuanto se ha ido
  // acumulando sin mezclar semanas anteriores ya pagadas.
  function weekBalanceFor(employeeId, cutoffWeekday) {
    const period = currentPeriod(cutoffWeekday);
    const movs = movements.filter(
      (m) =>
        m.employee_id === employeeId &&
        m.date >= period.start &&
        m.date <= period.end,
    );
    const devengado = sumType(movs, "devengado") + sumType(movs, "comision");
    const pagado = sumType(movs, "pago") + sumType(movs, "anticipo");
    return { period, saldo: devengado - pagado };
  }

  const selectedEmployee = employees.find((e) => e.id === selectedId) ?? null;

  function openNewEmployee() {
    setEmpForm(EMPTY_EMPLOYEE);
    setEditingEmpId(null);
    setEmpError("");
    setShowEmpForm(true);
  }

  function openEditEmployee(emp) {
    setEmpForm({
      name: emp.name,
      role: emp.role ?? "",
      pay_schedule: emp.pay_schedule,
      daily_rate: emp.daily_rate != null ? String(emp.daily_rate) : "",
      pay_cutoff_weekday:
        emp.pay_cutoff_weekday != null ? String(emp.pay_cutoff_weekday) : "5",
    });
    setEditingEmpId(emp.id);
    setEmpError("");
    setShowEmpForm(true);
  }

  async function saveEmployee() {
    if (!empForm.name.trim()) {
      setEmpError("El nombre es obligatorio");
      return;
    }
    setEmpError("");
    setSavingEmp(true);
    const payload = {
      name: empForm.name.trim(),
      role: empForm.role.trim() || null,
      pay_schedule: empForm.pay_schedule,
      daily_rate: empForm.daily_rate ? Number(empForm.daily_rate) : null,
      pay_cutoff_weekday:
        empForm.pay_schedule === "semanal" ? Number(empForm.pay_cutoff_weekday) : null,
    };
    const { error: err } = editingEmpId
      ? await supabase.from("employees").update(payload).eq("id", editingEmpId)
      : await supabase.from("employees").insert(payload);
    setSavingEmp(false);
    if (err) {
      setEmpError("Error al guardar empleado");
      return;
    }
    setShowEmpForm(false);
    loadEmployees();
  }

  async function deactivateEmployee(emp) {
    if (!confirm(`¿Desactivar a "${emp.name}"? Su historial de movimientos se conserva.`)) return;
    await supabase.from("employees").update({ active: false }).eq("id", emp.id);
    setSelectedId(null);
    loadEmployees();
  }

  function openMovement(type) {
    setMovForm({ ...EMPTY_MOVEMENT, type });
    setEditingMovId(null);
    setMovError("");
    setShowMovForm(true);
  }

  function openEditMovement(m) {
    setMovForm({ type: m.type, date: m.date, amount: String(m.amount), note: m.note ?? "" });
    setEditingMovId(m.id);
    setMovError("");
    setShowMovForm(true);
  }

  function quickDiaTrabajado(emp) {
    if (!emp.daily_rate) return;
    registerMovement({
      employee_id: emp.id,
      date: today(),
      type: "devengado",
      amount: emp.daily_rate,
      note: null,
    });
  }

  // "Pago" y "anticipo" son plata que de verdad sale del negocio para el
  // empleado, asi que cuentan como gasto en Admin > Reportes. Prestamo y
  // cuota_prestamo NO — un prestamo se espera recuperar, no es una perdida.
  // Devengado/comision tampoco, porque todavia no se ha pagado esa plata.
  function esGastoReal(type) {
    return type === "pago" || type === "anticipo";
  }

  async function getNominaItemId() {
    const { data: cat } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("name", "Nómina")
      .maybeSingle();
    if (!cat) return null;
    const { data: item } = await supabase
      .from("expense_items")
      .select("id")
      .eq("category_id", cat.id)
      .eq("name", "Pago empleado")
      .maybeSingle();
    return item?.id ?? null;
  }

  function expenseDescription(employeeName, type, note) {
    return (
      employeeName +
      (note ? ` — ${note}` : "") +
      (type === "anticipo" ? " (anticipo)" : "")
    );
  }

  async function registerMovement(payload) {
    setMovError("");
    const { data: inserted, error: err } = await supabase
      .from("employee_movements")
      .insert({ ...payload, created_by: profile.id })
      .select()
      .single();
    if (err) {
      setMovError("Error al registrar el movimiento");
      return false;
    }
    if (esGastoReal(payload.type)) {
      const employeeName = employees.find((e) => e.id === payload.employee_id)?.name ?? "Empleado";
      const itemId = await getNominaItemId();
      const { data: exp } = await supabase
        .from("expenses")
        .insert({
          date: payload.date,
          category: "Nómina",
          description: expenseDescription(employeeName, payload.type, payload.note),
          amount: payload.amount,
          expense_item_id: itemId,
          created_by: profile.id,
        })
        .select()
        .single();
      if (exp) {
        await supabase.from("employee_movements").update({ expense_id: exp.id }).eq("id", inserted.id);
      }
    }
    loadMovements();
    return true;
  }

  async function saveMovement() {
    if (!movForm.amount || isNaN(Number(movForm.amount)) || Number(movForm.amount) <= 0) {
      setMovError("El monto debe ser mayor a 0");
      return;
    }
    setMovError("");
    setSavingMov(true);
    const date = movForm.date;
    const type = movForm.type;
    const amount = Number(movForm.amount);
    const note = movForm.note.trim() || null;

    if (editingMovId) {
      const origMov = movements.find((m) => m.id === editingMovId);
      const { error: err } = await supabase
        .from("employee_movements")
        .update({ date, type, amount, note })
        .eq("id", editingMovId);
      if (err) {
        setSavingMov(false);
        setMovError("Error al guardar cambios");
        return;
      }
      if (esGastoReal(type)) {
        const description = expenseDescription(selectedEmployee.name, type, note);
        if (origMov?.expense_id) {
          await supabase
            .from("expenses")
            .update({ date, amount, description })
            .eq("id", origMov.expense_id);
        } else {
          const itemId = await getNominaItemId();
          const { data: exp } = await supabase
            .from("expenses")
            .insert({
              date,
              category: "Nómina",
              description,
              amount,
              expense_item_id: itemId,
              created_by: profile.id,
            })
            .select()
            .single();
          if (exp) {
            await supabase.from("employee_movements").update({ expense_id: exp.id }).eq("id", editingMovId);
          }
        }
      } else if (origMov?.expense_id) {
        await supabase.from("expenses").delete().eq("id", origMov.expense_id);
        await supabase.from("employee_movements").update({ expense_id: null }).eq("id", editingMovId);
      }
      setSavingMov(false);
      setShowMovForm(false);
      loadMovements();
      return;
    }

    const ok = await registerMovement({
      employee_id: selectedEmployee.id,
      date,
      type,
      amount,
      note,
    });
    setSavingMov(false);
    if (ok) setShowMovForm(false);
  }

  async function deleteMovement(id) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    const mov = movements.find((m) => m.id === id);
    if (mov?.expense_id) {
      await supabase.from("expenses").delete().eq("id", mov.expense_id);
    }
    await supabase.from("employee_movements").delete().eq("id", id);
    loadMovements();
  }

  // ---------- Vista detalle de un empleado ----------
  if (selectedEmployee) {
    const bal = balancesFor(selectedEmployee.id);
    const movs = movements.filter((m) => m.employee_id === selectedEmployee.id);
    const week =
      selectedEmployee.pay_schedule === "semanal" &&
      selectedEmployee.pay_cutoff_weekday != null
        ? weekBalanceFor(selectedEmployee.id, selectedEmployee.pay_cutoff_weekday)
        : null;

    return (
      <div style={s.page}>
        <div style={s.topbar}>
          <div style={s.topLeft}>
            <button style={s.backBtn} onClick={() => setSelectedId(null)}>
              ←
            </button>
            <div>
              <p style={s.title}>{selectedEmployee.name}</p>
              <p style={s.sub}>
                {selectedEmployee.role ?? "Sin rol"} ·{" "}
                {selectedEmployee.pay_schedule === "diario" ? "Pago diario" : "Pago semanal"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={s.manageBtn} onClick={() => openEditEmployee(selectedEmployee)}>
              ✏️ Editar
            </button>
            <button
              style={{ ...s.manageBtn, color: c.danger }}
              onClick={() => deactivateEmployee(selectedEmployee)}
            >
              Desactivar
            </button>
          </div>
        </div>

        <div style={s.body}>
          {week && (
            <div style={s.weekCard}>
              <div style={s.weekHeader}>
                <span style={s.weekLabel}>Semana actual</span>
                <span style={s.weekRange}>
                  {formatShort(week.period.start)} – {formatShort(week.period.end)}
                </span>
              </div>
              <p style={s.weekVal}>{formatPrice(week.saldo)}</p>
              <p style={s.weekHint}>
                Se paga el {WEEKDAYS[selectedEmployee.pay_cutoff_weekday]}
              </p>
            </div>
          )}

          <div style={s.balGrid}>
            <div style={{ ...s.balCard, backgroundColor: c.accentSoft }}>
              <p style={{ ...s.balLabel, color: c.accentDark }}>Saldo por pagar</p>
              <p style={{ ...s.balVal, color: c.accentDark }}>{formatPrice(bal.porPagar)}</p>
            </div>
            {bal.prestamo !== 0 && (
              <div style={{ ...s.balCard, backgroundColor: c.indigoSoft }}>
                <p style={{ ...s.balLabel, color: c.indigo }}>Préstamo pendiente</p>
                <p style={{ ...s.balVal, color: c.indigo }}>{formatPrice(bal.prestamo)}</p>
              </div>
            )}
          </div>

          <div style={s.quickRow}>
            {selectedEmployee.daily_rate ? (
              <button style={s.quickBtn} onClick={() => quickDiaTrabajado(selectedEmployee)}>
                + Día trabajado ({formatPrice(selectedEmployee.daily_rate)})
              </button>
            ) : null}
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <button
                key={type}
                style={{ ...s.quickBtn, color: meta.color, backgroundColor: meta.bg, borderColor: "transparent" }}
                onClick={() => openMovement(type)}
              >
                + {meta.label}
              </button>
            ))}
          </div>

          <div style={s.divider} />

          {movs.length === 0 ? (
            <p style={s.loadTxt}>Sin movimientos registrados</p>
          ) : (
            <div style={s.expenseList}>
              {movs.map((m) => {
                const meta = TYPE_META[m.type];
                return (
                  <div key={m.id} style={s.expenseRow}>
                    <div style={{ ...s.catDot, backgroundColor: meta.color }} />
                    <div style={s.expenseInfo}>
                      <p style={s.expenseName}>{m.note || meta.label}</p>
                      <div style={s.expenseMeta}>
                        <span style={{ ...s.catPill, backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span style={s.expenseDate}>{formatDate(m.date)}</span>
                      </div>
                    </div>
                    <div style={s.expenseRight}>
                      <p style={s.expenseAmount}>{formatPrice(m.amount)}</p>
                      <div style={s.expenseActions}>
                        <button style={s.iconBtn} onClick={() => openEditMovement(m)}>
                          ✏️
                        </button>
                        <button
                          style={{ ...s.iconBtn, color: c.danger }}
                          onClick={() => deleteMovement(m.id)}
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
        </div>

        {showMovForm && (
          <div style={s.overlay} onClick={() => setShowMovForm(false)}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <p style={s.modalTitle}>
                  {editingMovId ? "Editar movimiento" : "Nuevo movimiento"}
                </p>
                <button style={s.closeBtn} onClick={() => setShowMovForm(false)}>
                  ✕
                </button>
              </div>
              <div style={s.formBody}>
                <p style={s.label}>Tipo</p>
                <select
                  style={s.select}
                  value={movForm.type}
                  onChange={(e) => setMovForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(TYPE_META).map(([type, meta]) => (
                    <option key={type} value={type}>
                      {meta.label}
                    </option>
                  ))}
                </select>

                <p style={s.label}>Fecha</p>
                <input
                  style={s.input}
                  type="date"
                  value={movForm.date}
                  onChange={(e) => setMovForm((f) => ({ ...f, date: e.target.value }))}
                />

                <p style={s.label}>
                  Monto (COP) <span style={{ color: c.danger }}>*</span>
                </p>
                <input
                  style={s.input}
                  type="number"
                  placeholder="70000"
                  value={movForm.amount}
                  onChange={(e) => setMovForm((f) => ({ ...f, amount: e.target.value }))}
                />

                <p style={s.label}>Nota (opcional)</p>
                <input
                  style={s.input}
                  placeholder="Ej: cuota 2 de 4"
                  value={movForm.note}
                  onChange={(e) => setMovForm((f) => ({ ...f, note: e.target.value }))}
                />

                {movError && <p style={s.error}>{movError}</p>}

                <button
                  style={{ ...s.btnPrimary, opacity: savingMov ? 0.7 : 1 }}
                  disabled={savingMov}
                  onClick={saveMovement}
                >
                  {savingMov
                    ? "Guardando..."
                    : editingMovId
                      ? "Guardar cambios"
                      : "Guardar movimiento"}
                </button>
                <button style={s.btnGhost} onClick={() => setShowMovForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showEmpForm && (
          <EmployeeFormModal
            form={empForm}
            setForm={setEmpForm}
            error={empError}
            saving={savingEmp}
            editing={!!editingEmpId}
            onSave={saveEmployee}
            onClose={() => setShowEmpForm(false)}
          />
        )}
      </div>
    );
  }

  // ---------- Lista de empleados ----------
  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Nómina</p>
            <p style={s.sub}>{employees.length} empleados</p>
          </div>
        </div>
        <button style={s.newBtn} onClick={openNewEmployee}>
          + nuevo
        </button>
      </div>

      <div style={s.body}>
        {loading ? (
          <p style={s.loadTxt}>Cargando empleados...</p>
        ) : employees.length === 0 ? (
          <p style={s.loadTxt}>No hay empleados registrados</p>
        ) : (
          <div style={s.expenseList}>
            {employees.map((emp) => {
              const bal = balancesFor(emp.id);
              const week =
                emp.pay_schedule === "semanal" && emp.pay_cutoff_weekday != null
                  ? weekBalanceFor(emp.id, emp.pay_cutoff_weekday)
                  : null;
              return (
                <div key={emp.id} style={s.empRow} onClick={() => setSelectedId(emp.id)}>
                  <div style={s.empInfo}>
                    <p style={s.expenseName}>{emp.name}</p>
                    <div style={s.expenseMeta}>
                      {emp.role && (
                        <span style={{ ...s.catPill, backgroundColor: c.bgMuted, color: c.inkSoft }}>
                          {emp.role}
                        </span>
                      )}
                      <span style={s.expenseDate}>
                        {emp.pay_schedule === "diario"
                          ? "Pago diario"
                          : `Pago ${WEEKDAYS[emp.pay_cutoff_weekday]?.toLowerCase() ?? "semanal"}`}
                      </span>
                    </div>
                    {week && (
                      <p style={{ ...s.expenseDate, color: c.success, marginTop: 4 }}>
                        Esta semana: {formatPrice(week.saldo)}
                      </p>
                    )}
                  </div>
                  <div style={s.expenseRight}>
                    <p style={s.expenseAmount}>{formatPrice(bal.porPagar)}</p>
                    {bal.prestamo !== 0 && (
                      <p style={{ ...s.expenseDate, color: c.indigo }}>
                        Préstamo: {formatPrice(bal.prestamo)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEmpForm && (
        <EmployeeFormModal
          form={empForm}
          setForm={setEmpForm}
          error={empError}
          saving={savingEmp}
          editing={!!editingEmpId}
          onSave={saveEmployee}
          onClose={() => setShowEmpForm(false)}
        />
      )}
    </div>
  );
}

function EmployeeFormModal({ form, setForm, error, saving, editing, onSave, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <p style={s.modalTitle}>{editing ? "Editar empleado" : "Nuevo empleado"}</p>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={s.formBody}>
          <p style={s.label}>
            Nombre <span style={{ color: c.danger }}>*</span>
          </p>
          <input
            style={s.input}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <p style={s.label}>Rol (opcional)</p>
          <input
            style={s.input}
            placeholder="Ej: parrillero, domiciliario..."
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />

          <p style={s.label}>Se le paga</p>
          <select
            style={s.select}
            value={form.pay_schedule}
            onChange={(e) => setForm((f) => ({ ...f, pay_schedule: e.target.value }))}
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
          </select>

          {form.pay_schedule === "semanal" && (
            <>
              <p style={s.label}>Día de pago (corte de la semana)</p>
              <select
                style={s.select}
                value={form.pay_cutoff_weekday}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pay_cutoff_weekday: e.target.value }))
                }
              >
                {WEEKDAYS.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}

          <p style={s.label}>Tarifa fija por día (opcional)</p>
          <input
            style={s.input}
            type="number"
            placeholder="70000"
            value={form.daily_rate}
            onChange={(e) => setForm((f) => ({ ...f, daily_rate: e.target.value }))}
          />

          {error && <p style={s.error}>{error}</p>}

          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={onSave}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button style={s.btnGhost} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: c.bg, fontFamily: theme.font },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#FFF", borderBottom: `0.5px solid ${c.border}` },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: { fontSize: 20, background: "none", border: "none", cursor: "pointer", color: c.inkSoft, padding: "0 4px" },
  title: { fontSize: 18, fontWeight: 600, color: c.ink, margin: "0 0 2px" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0 },
  newBtn: { fontSize: 14, fontWeight: 500, color: c.accent, backgroundColor: c.accentSoft, border: `0.5px solid ${c.accentBorder}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer" },
  manageBtn: { fontSize: 13, fontWeight: 500, color: c.inkSoft, backgroundColor: c.bgMuted, border: `0.5px solid ${c.border}`, borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontFamily: theme.font },
  body: { padding: 16 },
  loadTxt: { fontSize: 15, color: c.inkFaint, textAlign: "center", padding: 20 },
  divider: { height: "0.5px", backgroundColor: c.border, margin: "10px 0" },

  weekCard: { backgroundColor: c.successSoft, borderRadius: 12, padding: "12px 14px", marginBottom: 14 },
  weekHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  weekLabel: { fontSize: 12, fontWeight: 700, color: c.success, textTransform: "uppercase", letterSpacing: "0.02em" },
  weekRange: { fontSize: 12, color: c.success },
  weekVal: { fontSize: 24, fontWeight: 800, color: c.success, margin: "0 0 2px" },
  weekHint: { fontSize: 12, color: c.success, margin: 0, opacity: 0.85 },

  balGrid: { display: "flex", gap: 10, marginBottom: 14 },
  balCard: { flex: 1, borderRadius: 12, padding: "12px 14px" },
  balLabel: { fontSize: 12, fontWeight: 600, margin: "0 0 4px" },
  balVal: { fontSize: 20, fontWeight: 800, margin: 0 },

  quickRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 },
  quickBtn: { fontSize: 13, fontWeight: 500, border: `0.5px solid ${c.border}`, backgroundColor: "#FFF", color: c.inkSoft, borderRadius: 20, padding: "7px 12px", cursor: "pointer", fontFamily: theme.font, whiteSpace: "nowrap" },

  empRow: { display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", backgroundColor: "#FFF", border: `0.5px solid ${c.border}`, borderRadius: 10, cursor: "pointer" },
  empInfo: { flex: 1 },

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
  input: { width: "100%", border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, color: c.ink, fontFamily: theme.font, outline: "none", backgroundColor: c.bg, marginBottom: 12, boxSizing: "border-box" },
  select: { width: "100%", border: `0.5px solid ${c.inkFaint}`, borderRadius: 8, padding: "10px 12px", fontSize: 16, color: c.ink, fontFamily: theme.font, backgroundColor: c.bg, marginBottom: 12, boxSizing: "border-box" },
  error: { fontSize: 14, color: c.danger, backgroundColor: c.dangerSoft, padding: "8px 12px", borderRadius: 6, marginBottom: 12 },
  btnPrimary: { width: "100%", padding: 12, backgroundColor: c.accent, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: theme.font, marginBottom: 8, cursor: "pointer" },
  btnGhost: { width: "100%", padding: 10, backgroundColor: "#FFF", color: c.ink, border: `0.5px solid ${c.border}`, borderRadius: 8, fontSize: 15, fontFamily: theme.font, cursor: "pointer" },
};
