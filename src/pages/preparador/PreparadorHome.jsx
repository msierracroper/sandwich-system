// ARCHIVO: src/pages/preparador/PreparadorHome.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

const STATION_CONFIG = {
  frio: {
    label: "Granizados — Estación Fría",
    headerBg: "#EAF6FF",
    borderColor: "#B5D4F4",
    countBg: "#B5D4F4",
    countColor: "#0C447C",
    titleColor: "#0C447C",
  },
  caliente: {
    label: "Sándwiches — Estación Caliente",
    headerBg: "#FFF8EE",
    borderColor: "#FAC775",
    countBg: "#FAC775",
    countColor: "#633806",
    titleColor: "#633806",
  },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

function TicketCard({ ticket, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const isPreparing = ticket.items.some(
    (i) => i.prep_status === "en_preparacion",
  );
  const allPending = ticket.items.every((i) => i.prep_status === "pendiente");

  async function handleAction() {
    setSaving(true);
    if (allPending || !isPreparing) {
      // Marcar todos en preparacion
      await Promise.all(
        ticket.items.map((item) =>
          supabase
            .from("order_items")
            .update({
              prep_status: "en_preparacion",
              prep_started_at: new Date().toISOString(),
            })
            .eq("id", item.id),
        ),
      );
      // Actualizar estado del pedido
      await supabase
        .from("orders")
        .update({ status: "en_preparacion" })
        .eq("id", ticket.orderId);
    } else {
      // Marcar todos listos
      await Promise.all(
        ticket.items.map((item) =>
          supabase
            .from("order_items")
            .update({ prep_status: "listo" })
            .eq("id", item.id),
        ),
      );
      // Si ya no quedan items pendientes en ninguna estacion, el pedido pasa a listo
      const { data: allItems } = await supabase
        .from("order_items")
        .select("prep_status")
        .eq("order_id", ticket.orderId);
      const allReady = allItems?.every((i) => i.prep_status === "listo");
      if (allReady) {
        await supabase
          .from("orders")
          .update({ status: "listo" })
          .eq("id", ticket.orderId);
      }
    }
    setSaving(false);
    onUpdate();
  }

  const isPreparing2 = ticket.items.some(
    (i) => i.prep_status === "en_preparacion",
  );

  return (
    <div
      style={{
        ...s.ticket,
        borderColor: isPreparing2 ? "#EF9F27" : "#DDDDCC",
        borderWidth: isPreparing2 ? 1.5 : 0.5,
      }}
    >
      <div style={s.ticketTop}>
        <span
          style={{ ...s.ticketId, color: isPreparing2 ? "#854F0B" : "#1A1A1A" }}
        >
          Pedido #{ticket.orderId.slice(-4).toUpperCase()}
        </span>
        <div
          style={{
            ...s.mesaPill,
            backgroundColor: ticket.type === "mesa" ? "#E6F1FB" : "#F1EFE8",
          }}
        >
          <span
            style={{
              color: ticket.type === "mesa" ? "#185FA5" : "#444441",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {ticket.tableName ??
              (ticket.type === "para_llevar" ? "Para llevar" : "Domicilio")}
          </span>
        </div>
        <span style={s.ticketTime}>{timeAgo(ticket.createdAt)}</span>
      </div>

      <div style={s.ticketItems}>
        {ticket.items.map((item) => (
          <div key={item.id} style={s.ticketItem}>
            <div style={s.qtyBadge}>{item.quantity}x</div>
            <div>
              <p style={s.itemName}>{item.productName}</p>
              {item.note && <p style={s.itemNote}>{item.note}</p>}
            </div>
          </div>
        ))}
      </div>

      {isPreparing2 && ticket.items[0]?.prep_started_at && (
        <div style={s.timerBox}>
          ⏱{" "}
          {Math.floor(
            (Date.now() - new Date(ticket.items[0].prep_started_at)) / 60000,
          )}{" "}
          min en preparación
        </div>
      )}

      <button
        style={{
          ...s.ticketBtn,
          backgroundColor: isPreparing2 ? "#FAEEDA" : "#E6F1FB",
          borderColor: isPreparing2 ? "#FAC775" : "#B5D4F4",
          color: isPreparing2 ? "#854F0B" : "#185FA5",
          opacity: saving ? 0.6 : 1,
          cursor: saving ? "not-allowed" : "pointer",
        }}
        disabled={saving}
        onClick={handleAction}
      >
        {saving
          ? "..."
          : isPreparing2
            ? "Marcar como listo"
            : "Iniciar preparación"}
      </button>
    </div>
  );
}

function StationColumn({ station, tickets, onUpdate }) {
  const cfg = STATION_CONFIG[station];
  return (
    <div
      style={{
        ...s.station,
        backgroundColor: cfg.headerBg,
        borderRight:
          station === "frio" ? `1px solid ${cfg.borderColor}` : "none",
      }}
    >
      <div style={s.stationHeader}>
        <span style={{ ...s.stationTitle, color: cfg.titleColor }}>
          {cfg.label}
        </span>
        <span
          style={{
            ...s.stationCount,
            backgroundColor: cfg.countBg,
            color: cfg.countColor,
          }}
        >
          {tickets.length} en cola
        </span>
      </div>
      <div style={s.ticketList}>
        {tickets.length === 0 && (
          <div style={s.emptySlot}>
            <p style={s.emptyTxt}>Sin pedidos pendientes</p>
          </div>
        )}
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.orderId + station}
            ticket={ticket}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreparadorHome() {
  const { signOut } = useAuth();
  const [tickets, setTickets] = useState({ frio: [], caliente: [] });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Reloj para actualizar tiempos cada minuto
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel("prep-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadTickets(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadTickets(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadTickets() {
    // Traer items pendientes y en preparacion con su info de pedido
    const { data } = await supabase
      .from("order_items")
      .select(
        `
        id, quantity, unit_price, station, prep_status, note, prep_started_at,
        order_id,
        products(name),
        orders!inner(id, type, status, created_at, tables(name))
      `,
      )
      .in("prep_status", ["pendiente", "en_preparacion"])
      .in("orders.status", ["abierto", "en_preparacion"])
      .order("created_at", { ascending: true });

    if (!data) {
      setLoading(false);
      return;
    }

    // Agrupar por pedido y estacion
    const grouped = { frio: {}, caliente: {} };
    for (const item of data) {
      const st = item.station;
      const orderId = item.order_id;
      const order = item.orders;

      if (!grouped[st]) continue;
      if (!grouped[st][orderId]) {
        grouped[st][orderId] = {
          orderId,
          type: order.type,
          tableName: order.tables?.name ?? null,
          createdAt: order.created_at,
          items: [],
        };
      }
      grouped[st][orderId].items.push({
        id: item.id,
        quantity: item.quantity,
        productName: item.products?.name,
        prep_status: item.prep_status,
        note: item.note,
        prep_started_at: item.prep_started_at,
      });
    }

    setTickets({
      frio: Object.values(grouped.frio),
      caliente: Object.values(grouped.caliente),
    });
    setLoading(false);
  }

  const today = new Date().toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Cargando cola...</p>
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div>
          <p style={s.title}>Estaciones de preparación</p>
          <p style={s.sub}>{today}</p>
        </div>
        <div style={s.topRight}>
          <div
            style={{
              ...s.statPill,
              backgroundColor: "#E6F1FB",
              color: "#0C447C",
            }}
          >
            Fríos: {tickets.frio.length}
          </div>
          <div
            style={{
              ...s.statPill,
              backgroundColor: "#FAEEDA",
              color: "#633806",
            }}
          >
            Calientes: {tickets.caliente.length}
          </div>
          <button style={s.logoutBtn} onClick={signOut}>
            Salir
          </button>
        </div>
      </div>

      <div style={s.splitScreen}>
        <StationColumn
          station="caliente"
          tickets={tickets.caliente}
          onUpdate={loadTickets}
        />
        <StationColumn
          station="frio"
          tickets={tickets.frio}
          onUpdate={loadTickets}
        />
      </div>
    </div>
  );
}

const s = {
  page: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#FAFAF8",
    fontFamily: "sans-serif",
    overflow: "hidden",
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
    padding: "10px 20px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" },
  sub: {
    fontSize: 11,
    color: "#666660",
    margin: 0,
    textTransform: "capitalize",
  },
  topRight: { display: "flex", alignItems: "center", gap: 10 },
  statPill: {
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 20,
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
  splitScreen: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    flex: 1,
    overflow: "hidden",
  },
  station: { display: "flex", flexDirection: "column", overflow: "hidden" },
  stationHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "0.5px solid #DDDDCC",
    flexShrink: 0,
  },
  stationTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  stationCount: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 10px",
    borderRadius: 20,
  },
  ticketList: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  ticket: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    border: "0.5px solid",
    padding: "10px 12px",
  },
  ticketTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  ticketId: { fontSize: 12, fontWeight: 600 },
  mesaPill: { padding: "2px 8px", borderRadius: 20 },
  ticketTime: { fontSize: 12, color: "#888880", marginLeft: "auto" },
  ticketItems: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
  },
  ticketItem: { display: "flex", alignItems: "flex-start", gap: 8 },
  qtyBadge: {
    backgroundColor: "#F1EFE8",
    border: "0.5px solid #DDDDCC",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 18,
    fontWeight: 700,
    color: "#242121",
    flexShrink: 0,
  },
  itemName: { fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  itemNote: {
    fontSize: 13,
    color: "#A32D2D",
    margin: 0,
    fontStyle: "italic",
    fontWeight: 600,
  },
  ticketBtn: {
    width: "100%",
    padding: "7px",
    border: "0.5px solid",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "sans-serif",
  },
  emptySlot: {
    border: "1px dashed #DDDDCC",
    borderRadius: 8,
    padding: 24,
    textAlign: "center",
  },
  emptyTxt: { fontSize: 14, color: "#888880", margin: 0 },
  timerBox: {
    fontSize: 1,
    color: "#854F0B",
    backgroundColor: "#FAEEDA",
    borderRadius: 6,
    padding: "4px 8px",
    marginBottom: 8,
    textAlign: "center",
    borderLeft: "2px solid #EF9F27",
  },
};
