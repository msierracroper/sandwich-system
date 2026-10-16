// ARCHIVO: src/pages/admin/AdminHome.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";
import { theme } from "../../theme";

const c = theme.color;

function Icon({ path }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

const ICONS = {
  productos: <path d="M20.5 11.5L12.5 3.5H5a2 2 0 0 0-2 2v7.5l10 10a1.5 1.5 0 0 0 2 0l5.5-5.5a1.5 1.5 0 0 0 0-2z M8 8h.01" />,
  mesas: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16.5 7a3 3 0 0 1 0 5.8" /><path d="M19 14.3c1.8.6 3 2.1 3 4.2" /></>,
  reportes: <><path d="M4 19V10M11 19V5M18 19v-7" /><path d="M3 19h18" /></>,
  gastos: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16" cy="14" r="1.3" /></>,
  pedidos: <path d="M4 6h16M4 12h16M4 18h10" />,
  inventario: <><path d="M3 9l9-6 9 6-9 6-9-6z" /><path d="M3 9v8l9 6 9-6V9" /><path d="M12 15V9" /></>,
  recetas: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
};

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
      icon: ICONS.productos,
      title: "Productos",
      desc: "Crear, editar y activar productos",
      path: "/admin/productos",
    },
    {
      icon: ICONS.mesas,
      title: "Mesas",
      desc: "Agregar y activar mesas del local",
      path: "/admin/mesas",
    },
    {
      icon: ICONS.usuarios,
      title: "Usuarios",
      desc: "Crear tomadores y preparadores",
      path: "/admin/usuarios",
    },
    {
      icon: ICONS.reportes,
      title: "Reportes",
      desc: "Ver resumen del dia y exportar",
      path: "/admin/reportes",
    },
    {
      icon: ICONS.gastos,
      title: "Gastos",
      desc: "Registrar y controlar gastos del negocio",
      path: "/admin/gastos",
    },
    {
      icon: ICONS.pedidos,
      title: "Pedidos",
      desc: "Ver y editar los pedidos del dia",
      path: "/admin/pedidos",
    },
    {
      icon: ICONS.inventario,
      title: "Inventario",
      desc: "Controlar insumos y alertas de stock bajo",
      path: "/admin/inventario",
    },
    {
      icon: ICONS.recetas,
      title: "Recetas",
      desc: "Que insumos lleva cada producto",
      path: "/admin/recetas",
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
              <div style={s.cardIcon}>
                <Icon path={sc.icon} />
              </div>
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
            <div style={{ ...s.statCard, ...s.statCardAccent }}>
              <p style={{ ...s.statLabel, color: c.accentDark }}>Total vendido</p>
              <p style={{ ...s.statVal, color: c.accentDark }}>{formatPrice(stats.total)}</p>
              <p style={{ ...s.statSub, color: c.accentDark }}>
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
    backgroundColor: c.bg,
    fontFamily: theme.font,
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    backgroundColor: c.surface,
    borderBottom: `1px solid ${c.border}`,
  },
  title: { fontSize: 20, fontWeight: 800, color: c.ink, margin: "0 0 2px", letterSpacing: "-0.01em" },
  sub: {
    fontSize: 13,
    color: c.inkSoft,
    margin: 0,
    textTransform: "capitalize",
  },
  logoutBtn: {
    fontSize: 13,
    color: c.inkSoft,
    background: "none",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    fontFamily: theme.font,
  },
  body: { padding: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: c.inkSoft,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: "16px 14px",
    cursor: "pointer",
    boxShadow: theme.shadow,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.accentSoft,
    color: c.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: c.ink,
    margin: "0 0 4px",
  },
  cardDesc: { fontSize: 13, color: c.inkSoft, margin: 0, lineHeight: 1.5 },
  divider: {
    height: "1px",
    backgroundColor: c.border,
    margin: "6px 0 18px",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statCard: {
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    padding: "13px 14px",
  },
  statCardAccent: {
    backgroundColor: c.accentSoft,
  },
  statLabel: { fontSize: 12, fontWeight: 600, color: c.inkSoft, margin: "0 0 5px" },
  statVal: {
    fontSize: 20,
    fontWeight: 800,
    color: c.ink,
    margin: "0 0 2px",
  },
  statSub: { fontSize: 12, color: c.inkSoft, margin: 0 },
  loadTxt: { fontSize: 14, color: c.inkFaint },
};
