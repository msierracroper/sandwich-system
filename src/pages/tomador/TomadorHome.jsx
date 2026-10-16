// ARCHIVO: src/pages/tomador/TomadorHome.jsx

import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { theme } from "../../theme";

const c = theme.color;

const STATUS_COLOR = {
  libre: {
    bg: c.surface,
    border: c.border,
    dot: c.success,
    label: "Libre",
    labelColor: c.success,
  },
  ocupada: {
    bg: c.warnSoft,
    border: "#EAD39A",
    dot: c.warn,
    label: "Ocupada",
    labelColor: c.warn,
  },
};

// "abierto"/"listo" son avance normal del pedido (verde); "en_preparacion"
// es el unico estado que requiere espera (ambar); "entregado" es el unico
// que de verdad necesita accion del tomador (cerrar la cuenta), por eso
// usa el color de info, distinto del resto.
const OTHER_STATUS_COLOR = {
  abierto: { bg: c.successSoft, color: c.success, label: "abierto" },
  en_preparacion: { bg: c.warnSoft, color: c.warn, label: "preparando" },
  listo: { bg: c.successSoft, color: c.success, label: "listo" },
  entregado: { bg: c.infoSoft, color: c.info, label: "entregado · falta cerrar" },
};

const ORDER_ICON = {
  para_llevar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l8-6 8 6" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  domicilio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h13l5 5v5a1 1 0 0 1-1 1h-1" />
      <path d="M3 7v9a1 1 0 0 0 1 1h1" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </svg>
  ),
};

export default function TomadorHome() {
  const { signOut } = useAuth();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]); // pedidos activos
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadData() {
    const [{ data: tablesData }, { data: ordersData }] = await Promise.all([
      supabase.from("tables").select("*").eq("active", true).order("name"),
      supabase
        .from("orders")
        .select("*, tables(name)")
        .in("status", ["abierto", "en_preparacion", "listo", "entregado"]),
    ]);
    setTables(tablesData ?? []);
    setOrders(ordersData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadData();

    // Suscripcion en tiempo real a pedidos abiertos
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "status=in.(abierto,en_preparacion,listo,entregado)",
        },
        () => loadData(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Determina si una mesa tiene pedidos activos
  function tableStatus(tableId) {
    const active = orders.filter((o) => o.table_id === tableId);
    return active.length > 0 ? "ocupada" : "libre";
  }

  function tableOrderCount(tableId) {
    return orders.filter((o) => o.table_id === tableId).length;
  }

  // Pedidos para llevar y domicilio activos
  const otherOrders = orders.filter((o) => o.type !== "mesa");

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  if (loading)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Cargando mesas...</p>
      </div>
    );

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.title}>Mesas</h1>
          <p style={s.sub}>
            {today} · {orders.length} pedido{orders.length !== 1 ? "s" : ""}{" "}
            activo{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={s.topRight}>
          <button style={s.newBtn} onClick={() => navigate("/tomador/nuevo")}>
            + nuevo
          </button>
          <button style={s.logoutBtn} onClick={signOut}>
            Salir
          </button>
        </div>
      </div>

      <div style={s.body}>
        {/* Leyenda */}
        <div style={s.legend}>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, backgroundColor: c.success }} />
            <span>Libre</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, backgroundColor: c.warn }} />
            <span>Ocupada</span>
          </div>
        </div>

        {/* Grid de mesas */}
        <div style={s.grid}>
          {tables.map((table) => {
            const st = tableStatus(table.id);
            const info = STATUS_COLOR[st];
            const count = tableOrderCount(table.id);
            return (
              <div
                key={table.id}
                style={{
                  ...s.card,
                  backgroundColor: info.bg,
                  borderColor: info.border,
                }}
                onClick={() => {
                  const st = tableStatus(table.id);
                  if (st === "libre") {
                    navigate(
                      `/tomador/nuevo?mesa=${table.id}&nombre=${table.name}`,
                    );
                  } else {
                    const activeOrder = orders.find(
                      (o) => o.table_id === table.id,
                    );
                    navigate(`/tomador/pedido/${activeOrder.id}`);
                  }
                }}
              >
                <p style={s.cardName}>{table.name}</p>
                <div style={s.cardStatus}>
                  <div style={{ ...s.dot, backgroundColor: info.dot }} />
                  <span style={{ color: info.labelColor, fontSize: 14, fontWeight: 600 }}>
                    {st === "libre"
                      ? "Libre"
                      : `${count} pedido${count !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Para llevar y domicilios */}
        {otherOrders.length > 0 && (
          <>
            <div style={s.divider} />
            <p style={s.sectionLabel}>Para llevar y domicilios activos</p>
            <div style={s.otherList}>
              {otherOrders.map((order) => {
                const statusInfo =
                  OTHER_STATUS_COLOR[order.status] ?? OTHER_STATUS_COLOR.abierto;
                return (
                  <div
                    key={order.id}
                    style={s.otherCard}
                    onClick={() => navigate(`/tomador/pedido/${order.id}`)}
                  >
                    <div style={s.otherLeft}>
                      <div
                        style={{
                          ...s.otherIcon,
                          backgroundColor:
                            order.type === "domicilio" ? c.domicilioSoft : c.accentSoft,
                          color: order.type === "domicilio" ? c.domicilio : c.accent,
                        }}
                      >
                        {ORDER_ICON[order.type]}
                      </div>
                      <div>
                        <p style={s.otherTitle}>
                          {order.type === "para_llevar"
                            ? "Para llevar"
                            : "Domicilio"}{" "}
                          #{order.id.slice(-4).toUpperCase()}
                          {order.prepaid && (
                            <span style={s.prepaidBadge}>
                              {order.payment_method === "efectivo"
                                ? "✓ Efectivo"
                                : order.payment_method === "mixto"
                                  ? "✓ Mixto"
                                  : "✓ Transferencia"}
                            </span>
                          )}
                        </p>
                        {order.note && (
                          <p style={s.otherNoteTxt}>{order.note}</p>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        ...s.pill,
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  loadTxt: { fontSize: 15, color: c.inkSoft },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    backgroundColor: c.surface,
    borderBottom: `1px solid ${c.border}`,
  },
  title: { fontSize: 21, fontWeight: 800, color: c.ink, margin: "0 0 2px", letterSpacing: "-0.01em" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0 },
  topRight: { display: "flex", gap: 8, alignItems: "center" },
  newBtn: {
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: c.accent,
    border: "none",
    borderRadius: 20,
    padding: "9px 16px",
    cursor: "pointer",
    fontFamily: theme.font,
  },
  logoutBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: c.inkSoft,
    background: "none",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    cursor: "pointer",
    fontFamily: theme.font,
  },
  body: { padding: 18 },
  legend: { display: "flex", gap: 16, marginBottom: 14 },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: c.inkSoft,
  },
  dot: { width: 9, height: 9, borderRadius: "50%" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    marginBottom: 18,
  },
  card: {
    borderRadius: 14,
    border: "1px solid",
    padding: "16px 14px",
    cursor: "pointer",
    boxShadow: theme.shadow,
    transition: "opacity 0.15s",
  },
  cardName: {
    fontSize: 17,
    fontWeight: 700,
    color: c.ink,
    margin: "0 0 8px",
  },
  cardStatus: { display: "flex", alignItems: "center", gap: 7 },
  divider: {
    height: "1px",
    backgroundColor: c.border,
    margin: "6px 0 14px",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: c.inkSoft,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: 10,
  },
  otherList: { display: "flex", flexDirection: "column", gap: 9 },
  otherCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 14px",
    backgroundColor: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    boxShadow: theme.shadow,
    cursor: "pointer",
  },
  otherLeft: { display: "flex", alignItems: "center", gap: 11 },
  otherIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  otherTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: c.ink,
    margin: "0 0 2px",
  },
  otherNoteTxt: { fontSize: 13, color: c.ink, margin: 0, fontWeight: 500 },
  prepaidBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: c.success,
    backgroundColor: c.successSoft,
    padding: "2px 8px",
    borderRadius: 20,
    marginLeft: 6,
  },
  pill: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 11px",
    borderRadius: 20,
    flexShrink: 0,
  },
};
