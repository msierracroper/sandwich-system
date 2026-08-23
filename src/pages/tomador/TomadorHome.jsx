// ARCHIVO: src/pages/tomador/TomadorHome.jsx

import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

const STATUS_COLOR = {
  libre: {
    bg: "#FFFFFF",
    border: "#DDDDCC",
    dot: "#3B6D11",
    label: "Libre",
    labelColor: "#3B6D11",
  },
  ocupada: {
    bg: "#FAEEDA",
    border: "#EF9F27",
    dot: "#854F0B",
    label: "Ocupada",
    labelColor: "#854F0B",
  },
};

const OTHER_STATUS_COLOR = {
  abierto: { bg: "#EAF3DE", color: "#3B6D11", label: "abierto" },
  en_preparacion: { bg: "#FAEEDA", color: "#854F0B", label: "preparando" },
  listo: { bg: "#EAF3DE", color: "#3B6D11", label: "listo" },
  entregado: { bg: "#E6F1FB", color: "#185FA5", label: "entregado · falta cerrar" },
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
            <div style={{ ...s.dot, backgroundColor: "#3B6D11" }} />
            <span>Libre</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, backgroundColor: "#854F0B" }} />
            <span>Ocupada</span>
          </div>
        </div>

        {/* Grid de mesas */}
        <div style={s.grid}>
          {tables.map((table) => {
            const st = tableStatus(table.id);
            const c = STATUS_COLOR[st];
            const count = tableOrderCount(table.id);
            return (
              <div
                key={table.id}
                style={{
                  ...s.card,
                  backgroundColor: c.bg,
                  borderColor: c.border,
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
                  <div style={{ ...s.dot, backgroundColor: c.dot }} />
                  <span style={{ color: c.labelColor, fontSize: 12 }}>
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
              {otherOrders.map((order) => (
                <div
                  key={order.id}
                  style={s.otherCard}
                  onClick={() => navigate(`/tomador/pedido/${order.id}`)}
                >
                  <div>
                    <p style={s.otherTitle}>
                      {order.type === "para_llevar"
                        ? "Para llevar"
                        : "Domicilio"}{" "}
                      #{order.id.slice(-4).toUpperCase()}
                    </p>
                    {order.note && (
                      <p
                        style={{
                          ...s.otherMeta,
                          color: "#1A1A1A",
                          fontWeight: 500,
                        }}
                      >
                        {order.note}
                      </p>
                    )}
                    <p style={s.otherMeta}>{order.status}</p>
                  </div>
                  <div
                    style={{
                      ...s.pill,
                      backgroundColor: OTHER_STATUS_COLOR[order.status]?.bg ?? "#EAF3DE",
                      color: OTHER_STATUS_COLOR[order.status]?.color ?? "#3B6D11",
                    }}
                  >
                    {OTHER_STATUS_COLOR[order.status]?.label ?? order.status}
                  </div>
                </div>
              ))}
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
    backgroundColor: "#FAFAF8",
    fontFamily: "sans-serif",
  },
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  loadTxt: { fontSize: 14, color: "#666660" },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
  },
  title: { fontSize: 18, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: { fontSize: 11, color: "#666660", margin: 0 },
  topRight: { display: "flex", gap: 8, alignItems: "center" },
  newBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#185FA5",
    backgroundColor: "#E6F1FB",
    border: "0.5px solid #B5D4F4",
    borderRadius: 20,
    padding: "5px 12px",
    cursor: "pointer",
  },
  logoutBtn: {
    fontSize: 12,
    color: "#666660",
    background: "none",
    border: "0.5px solid #DDDDCC",
    borderRadius: 6,
    padding: "5px 10px",
    cursor: "pointer",
  },
  body: { padding: 16 },
  legend: { display: "flex", gap: 16, marginBottom: 12 },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#666660",
  },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  card: {
    borderRadius: 10,
    border: "0.5px solid",
    padding: "14px 12px",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
    margin: "0 0 6px",
  },
  cardStatus: { display: "flex", alignItems: "center", gap: 6 },
  divider: {
    height: "0.5px",
    backgroundColor: "#DDDDCC",
    margin: "4px 0 12px",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#666660",
    marginBottom: 8,
  },
  otherList: { display: "flex", flexDirection: "column", gap: 8 },
  otherCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    cursor: "pointer",
  },
  otherTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
  },
  otherMeta: { fontSize: 11, color: "#666660", margin: 0 },
  pill: {
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 10px",
    borderRadius: 20,
  },
};
