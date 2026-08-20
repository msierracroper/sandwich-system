// ARCHIVO: src/pages/admin/Usuarios.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

const ROLE_BADGE = {
  admin: { label: "Admin", bg: "#E6F1FB", color: "#0C447C" },
  tomador: { label: "Tomador", bg: "#F1EFE8", color: "#444441" },
  preparador: { label: "Preparador", bg: "#FAEEDA", color: "#633806" },
  domiciliario: { label: "Domiciliario", bg: "#EAF3DE", color: "#3B6D11" },
};

const EMPTY_FORM = { email: "", name: "", password: "", role: "tomador" };

export default function Usuarios() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {  session } = useAuth();

  // eslint-disable-next-line
  useEffect(() => {
      if (!session) return;
    loadUsers();
  }, [session]);

  async function loadUsers() {
    console.log(
      "loadUsers ejecutando con token:",
      session?.access_token ? "existe" : "null",
    );
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?select=*&order=role,name`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );
      const data = await res.json();
      console.log("resultado:", data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("error:", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u) {
    await supabase.from("users").update({ active: !u.active }).eq("id", u.id);
    loadUsers();
  }

  async function createUser() {
    setError("");
    setSuccess("");
    if (!form.email.trim()) {
      setError("El email es obligatorio");
      return;
    }
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (form.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);

    const { error: fnError } = await supabase.rpc("create_user_by_admin", {
      p_email: form.email.trim(),
      p_name: form.name.trim(),
      p_role: form.role,
      p_password: form.password,
    });

    if (fnError) {
      setError(fnError.message);
      setSaving(false);
      return;
    }

    setSuccess(`Usuario ${form.name} creado correctamente`);
    setForm(EMPTY_FORM);
    setSaving(false);
    await loadUsers();
  }

  function initials(name) {
    return (
      name
        ?.split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() ?? "?"
    );
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Usuarios</p>
            <p style={s.sub}>{users.filter((u) => u.active).length} activos</p>
          </div>
        </div>
        <button
          style={s.newBtn}
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
        >
          {showForm ? "Cancelar" : "+ nuevo"}
        </button>
      </div>

      {showForm && (
        <div style={s.formCard}>
          <p style={s.formTitle}>Nuevo usuario</p>

          <p style={s.label}>Nombre</p>
          <input
            style={s.input}
            placeholder="Laura Perez"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <p style={s.label}>Email</p>
          <input
            style={s.input}
            type="email"
            placeholder="laura@tulocal.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />

          <p style={s.label}>Contrasena</p>
          <input
            style={s.input}
            type="password"
            placeholder="Min. 6 caracteres"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />

          <p style={s.label}>Rol</p>
          <div style={s.roleRow}>
            {["tomador", "preparador", "domiciliario", "admin"].map((r) => (
              <button
                key={r}
                style={{
                  ...s.roleBtn,
                  backgroundColor: form.role === r ? "#E6F1FB" : "#FFF",
                  borderColor: form.role === r ? "#378ADD" : "#DDDDCC",
                  color: form.role === r ? "#185FA5" : "#666660",
                  fontWeight: form.role === r ? 600 : 400,
                }}
                onClick={() => setForm((f) => ({ ...f, role: r }))}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {error && <p style={s.error}>{error}</p>}
          {success && <p style={s.successMsg}>{success}</p>}

          <button
            style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
            disabled={saving}
            onClick={createUser}
          >
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      )}

      <div style={s.body}>
        {loading && <p style={s.loadTxt}>Cargando usuarios...</p>}
        {users.map((u) => {
          const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.tomador;
          return (
            <div
              key={u.id}
              style={{ ...s.userRow, opacity: u.active ? 1 : 0.5 }}
            >
              <div style={s.avatar}>{initials(u.name)}</div>
              <div style={s.userInfo}>
                <p style={s.userName}>{u.name}</p>
                <p style={s.userEmail}>{u.email}</p>
              </div>
              <div style={s.userRight}>
                <span
                  style={{
                    ...s.roleBadge,
                    backgroundColor: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
                <div
                  style={{
                    ...s.toggle,
                    backgroundColor: u.active ? "#3B6D11" : "#B0AFA5",
                  }}
                  onClick={() => toggleActive(u)}
                >
                  <div style={{ ...s.toggleDot, left: u.active ? 12 : 2 }} />
                </div>
              </div>
            </div>
          );
        })}
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
  formCard: {
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
    padding: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1A1A1A",
    margin: "0 0 12px",
  },
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
  roleRow: { display: "flex", gap: 8, marginBottom: 12 },
  roleBtn: {
    flex: 1,
    border: "0.5px solid",
    borderRadius: 8,
    padding: "8px 4px",
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
  successMsg: {
    fontSize: 12,
    color: "#3B6D11",
    backgroundColor: "#EAF3DE",
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
    cursor: "pointer",
  },
  body: { padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  loadTxt: { fontSize: 13, color: "#888880", textAlign: "center", padding: 20 },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "#E6F1FB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    color: "#185FA5",
    flexShrink: 0,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  userEmail: { fontSize: 11, color: "#888880", margin: 0 },
  userRight: { display: "flex", alignItems: "center", gap: 10 },
  roleBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 20,
  },
  toggle: {
    width: 28,
    height: 16,
    borderRadius: 8,
    position: "relative",
    cursor: "pointer",
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
};
