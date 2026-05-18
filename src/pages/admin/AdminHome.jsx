// ARCHIVO: src/pages/admin/AdminHome.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";

export default function AdminHome() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    orders: 0,
    cash: 0,
    transfer: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  async function loadStats() {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });

    try {
      const { data } = await supabase
        .from("orders")
        .select("total, payment_method")
        .eq("status", "cerrado")
        .gte("closed_at", today + "T00:00:00")
        .lte("closed_at", today + "T23:59:59");

      if (data) {
        const total = data.reduce((a, o) => a + (o.total ?? 0), 0);
        const cash = data
          .filter((o) => o.payment_method === "efectivo")
          .reduce((a, o) => a + (o.total ?? 0), 0);
        const transfer = data
          .filter((o) => o.payment_method === "transferencia")
          .reduce((a, o) => a + (o.total ?? 0), 0);
        setStats({ total, orders: data.length, cash, transfer });
      }
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  function formatPrice(n) {
    return "$" + (n ?? 0).toLocaleString("es-CO");
  }

  const shortcuts = [
    {
      icon: "🧾",
      title: "Productos",
      desc: "Crear, editar y activar productos",
      path: "/admin/productos",
    },
    {
      icon: "🪑",
      title: "Mesas",
      desc: "Agregar y activar mesas del local",
      path: "/admin/mesas",
    },
    {
      icon: "👥",
      title: "Usuarios",
      desc: "Crear tomadores y preparadores",
      path: "/admin/usuarios",
    },
    {
      icon: "📊",
      title: "Reportes",
      desc: "Ver resumen del dia y exportar",
      path: "/admin/reportes",
    },
  ];

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div>
          <p style={s.title}>Admin</p>
          <p style={s.sub}>
            Hola, {profile?.name} · {today}
          </p>
        </div>
        <button style={s.logoutBtn} onClick={signOut}>
          Salir
        </button>
      </div>

      <div style={s.body}>
        <p style={s.sectionLabel}>Configuracion</p>
        <div style={s.grid}>
          {shortcuts.map((sc) => (
            <div key={sc.path} style={s.card} onClick={() => navigate(sc.path)}>
              <div style={s.cardIcon}>{sc.icon}</div>
              <p style={s.cardTitle}>{sc.title}</p>
              <p style={s.cardDesc}>{sc.desc}</p>
            </div>
          ))}
        </div>

        <div style={s.divider} />
        <p style={s.sectionLabel}>Hoy en el local</p>

        {loadingStats ? (
          <p style={s.loadTxt}>Calculando...</p>
        ) : (
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <p style={s.statLabel}>Total vendido</p>
              <p style={s.statVal}>{formatPrice(stats.total)}</p>
              <p style={s.statSub}>
                {stats.orders} pedido{stats.orders !== 1 ? "s" : ""} cerrado
                {stats.orders !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={s.statCard}>
              <p style={s.statLabel}>Efectivo</p>
              <p style={s.statVal}>{formatPrice(stats.cash)}</p>
              <p style={s.statSub}>
                {stats.total > 0
                  ? Math.round((stats.cash / stats.total) * 100)
                  : 0}
                % del total
              </p>
            </div>
            <div style={s.statCard}>
              <p style={s.statLabel}>Transferencia</p>
              <p style={s.statVal}>{formatPrice(stats.transfer)}</p>
              <p style={s.statSub}>
                {stats.total > 0
                  ? Math.round((stats.transfer / stats.total) * 100)
                  : 0}
                % del total
              </p>
            </div>
            <div style={s.statCard}>
              <p style={s.statLabel}>Ticket promedio</p>
              <p style={s.statVal}>
                {formatPrice(
                  stats.orders > 0 ? Math.round(stats.total / stats.orders) : 0,
                )}
              </p>
              <p style={s.statSub}>por pedido</p>
            </div>
          </div>
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
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
  },
  title: { fontSize: 18, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: {
    fontSize: 11,
    color: "#666660",
    margin: 0,
    textTransform: "capitalize",
  },
  logoutBtn: {
    fontSize: 12,
    color: "#666660",
    background: "none",
    border: "0.5px solid #DDDDCC",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
  body: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#666660",
    marginBottom: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 10,
    padding: "14px 12px",
    cursor: "pointer",
  },
  cardIcon: { fontSize: 20, marginBottom: 6 },
  cardTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 4px",
  },
  cardDesc: { fontSize: 11, color: "#666660", margin: 0, lineHeight: 1.5 },
  divider: {
    height: "0.5px",
    backgroundColor: "#DDDDCC",
    margin: "4px 0 16px",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  statCard: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "10px 12px",
  },
  statLabel: { fontSize: 10, color: "#666660", margin: "0 0 4px" },
  statVal: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  statSub: { fontSize: 10, color: "#666660", margin: 0 },
  loadTxt: { fontSize: 13, color: "#888880" },
};
