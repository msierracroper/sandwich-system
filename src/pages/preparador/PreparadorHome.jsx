// ARCHIVO: src/pages/preparador/PreparadorHome.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

const STATION_CONFIG = {
  frio: {
    label: "Granizados — Estación Fría",
    headerBg: c.infoSoft,
    borderColor: c.infoBorder,
    countBg: c.infoBorder,
    countColor: c.info,
    titleColor: c.info,
  },
  caliente: {
    label: "Sándwiches — Estación Caliente",
    headerBg: c.accentSoft,
    borderColor: c.accentBorder,
    countBg: c.accentBorder,
    countColor: c.accentDark,
    titleColor: c.accentDark,
  },
};

// Pildora de tipo de pedido en cada ticket — categoria, no estado.
const TYPE_PILL_COLOR = {
  mesa: { bg: c.infoSoft, color: c.info },
  domicilio: { bg: c.domicilioSoft, color: c.domicilio },
  para_llevar: { bg: c.accentSoft, color: c.accentDark },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

// Semaforo de urgencia para el tiempo en preparacion: verde al empezar,
// ambar cuando se demora, rojo cuando ya es mucho tiempo esperando.
function urgencyColor(minutes) {
  if (minutes < 5) return { color: c.success, bg: c.successSoft };
  if (minutes < 10) return { color: c.warn, bg: c.warnSoft };
  return { color: c.danger, bg: c.dangerSoft };
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
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
  const typeColor = TYPE_PILL_COLOR[ticket.type] ?? {
    bg: "#FFF",
    color: c.border,
  };

  const minutesPreparing = ticket.items[0]?.prep_started_at
    ? Math.floor((Date.now() - new Date(ticket.items[0].prep_started_at)) / 60000)
    : 0;
  const urgency = urgencyColor(minutesPreparing);

  return (
    <div
      style={{
        ...s.ticket,
        borderColor: isPreparing2 ? c.accent : typeColor.color,
        borderWidth: isPreparing2 ? 1.5 : 1,
      }}
    >
      <div style={s.ticketTop}>
        <span
          style={{ ...s.ticketId, color: isPreparing2 ? c.accentDark : c.ink }}
        >
          Pedido #{ticket.orderId.slice(-4).toUpperCase()}
        </span>
        <div
          style={{
            ...s.mesaPill,
            backgroundColor: TYPE_PILL_COLOR[ticket.type]?.bg ?? c.bgMuted,
          }}
        >
          <span
            style={{
              color: TYPE_PILL_COLOR[ticket.type]?.color ?? c.inkSoft,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {ticket.tableName ??
              (ticket.type === "para_llevar" ? "Para llevar" : "Domicilio")}
          </span>
        </div>
        <span style={s.ticketTime}>{timeAgo(ticket.createdAt)}</span>
      </div>

      {ticket.combined && (
        <div style={s.combinedBadge}>⇄ También tiene items en la otra estación</div>
      )}

      {ticket.note && (
        <div style={s.orderNoteBox}>
          <span style={s.orderNoteLabel}>Nota del pedido: </span>
          {ticket.note}
        </div>
      )}

      <div style={s.ticketItems}>
        {ticket.items.map((item) => (
          <div key={item.id} style={s.ticketItem}>
            <div style={s.qtyBadge}>{item.quantity}x</div>
            <div>
              <p style={s.itemName}>
                {item.productName}
                {item.subcuenta && (
                  <span style={s.subcuentaTag}> · {item.subcuenta}</span>
                )}
              </p>
              {item.note && <p style={s.itemNote}>{item.note}</p>}
            </div>
          </div>
        ))}
      </div>

      {isPreparing2 && ticket.items[0]?.prep_started_at && (
        <div style={{ ...s.timerBox, color: urgency.color, backgroundColor: urgency.bg }}>
          <ClockIcon /> {minutesPreparing} min en preparación
        </div>
      )}

      <button
        style={{
          ...s.ticketBtn,
          backgroundColor: isPreparing2 ? c.successSoft : c.accentSoft,
          borderColor: isPreparing2 ? c.success : c.accent,
          color: isPreparing2 ? c.success : c.accentDark,
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

function StationColumn({ station, tickets, onUpdate, wide }) {
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
      <div
        style={{
          ...s.ticketList,
          ...(wide
            ? {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                alignContent: "start",
              }
            : {}),
        }}
      >
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

const VIEW_MODE_KEY = "preparador_view_mode";

export default function PreparadorHome() {
  const { signOut } = useAuth();
  const [tickets, setTickets] = useState({ frio: [], caliente: [] });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) ?? "ambas";
    } catch {
      return "ambas";
    }
  });

  function changeViewMode(mode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // almacenamiento no disponible en este dispositivo, no pasa nada
    }
  }

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
        id, quantity, unit_price, station, prep_status, note, prep_started_at, subcuenta,
        order_id,
        products(name),
        orders!inner(id, type, status, created_at, note, tables(name))
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
          note: order.note,
          items: [],
        };
      }
      grouped[st][orderId].items.push({
        id: item.id,
        quantity: item.quantity,
        productName: item.products?.name,
        prep_status: item.prep_status,
        note: item.note,
        subcuenta: item.subcuenta,
        prep_started_at: item.prep_started_at,
      });
    }

    // Marcar pedidos que tienen items en ambas estaciones — util para que
    // cada tablet sepa que ese pedido tambien esta esperando en la otra
    const frioIds = new Set(Object.keys(grouped.frio));
    const calienteIds = new Set(Object.keys(grouped.caliente));
    for (const id of Object.keys(grouped.frio)) {
      grouped.frio[id].combined = calienteIds.has(id);
    }
    for (const id of Object.keys(grouped.caliente)) {
      grouped.caliente[id].combined = frioIds.has(id);
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
              backgroundColor: c.infoSoft,
              color: c.info,
            }}
          >
            Fríos: {tickets.frio.length}
          </div>
          <div
            style={{
              ...s.statPill,
              backgroundColor: c.accentSoft,
              color: c.accentDark,
            }}
          >
            Calientes: {tickets.caliente.length}
          </div>
          <div style={s.viewModeRow}>
            {[
              ["ambas", "Ambas"],
              ["caliente", "Solo caliente"],
              ["frio", "Solo fría"],
            ].map(([val, lbl], i) => (
              <button
                key={val}
                style={{
                  ...s.viewModeBtn,
                  borderTop: i === 0 ? "none" : s.viewModeBtn.borderTop,
                  backgroundColor: viewMode === val ? c.ink : c.surface,
                  color: viewMode === val ? c.surface : c.inkSoft,
                }}
                onClick={() => changeViewMode(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
          <button style={s.logoutBtn} onClick={signOut}>
            Salir
          </button>
        </div>
      </div>

      <div
        style={{
          ...s.splitScreen,
          gridTemplateColumns: viewMode === "ambas" ? "1fr 1fr" : "1fr",
        }}
      >
        {(viewMode === "ambas" || viewMode === "caliente") && (
          <StationColumn
            station="caliente"
            tickets={tickets.caliente}
            onUpdate={loadTickets}
            wide={viewMode === "caliente"}
          />
        )}
        {(viewMode === "ambas" || viewMode === "frio") && (
          <StationColumn
            station="frio"
            tickets={tickets.frio}
            onUpdate={loadTickets}
            wide={viewMode === "frio"}
          />
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: c.bg,
    fontFamily: theme.font,
    overflow: "hidden",
  },
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  loadTxt: { fontSize: 16, color: c.inkSoft },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    backgroundColor: c.surface,
    borderBottom: `1px solid ${c.border}`,
    flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 700, color: c.ink, margin: "0 0 2px" },
  sub: {
    fontSize: 13,
    color: c.inkSoft,
    margin: 0,
    textTransform: "capitalize",
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  statPill: {
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 13px",
    borderRadius: 20,
  },
  viewModeRow: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${c.border}`,
    borderRadius: 9,
    overflow: "hidden",
  },
  viewModeBtn: {
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    borderTop: `1px solid ${c.border}`,
    padding: "8px 12px",
    cursor: "pointer",
    fontFamily: theme.font,
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  logoutBtn: {
    fontSize: 13,
    color: c.inkSoft,
    background: "none",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "7px 13px",
    cursor: "pointer",
    fontFamily: theme.font,
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
    padding: "11px 16px",
    borderBottom: `1px solid ${c.border}`,
    flexShrink: 0,
  },
  stationTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  stationCount: {
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 11px",
    borderRadius: 20,
  },
  ticketList: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  ticket: {
    backgroundColor: c.surface,
    borderRadius: 12,
    border: "1px solid",
    padding: "12px 14px",
    boxShadow: theme.shadow,
  },
  ticketTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 9 },
  ticketId: { fontSize: 14, fontWeight: 700 },
  mesaPill: { padding: "3px 10px", borderRadius: 20 },
  ticketTime: { fontSize: 13, color: c.inkFaint, marginLeft: "auto" },
  combinedBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: c.domicilio,
    backgroundColor: c.domicilioSoft,
    borderRadius: 7,
    padding: "5px 9px",
    marginBottom: 9,
  },
  orderNoteBox: {
    fontSize: 13,
    color: c.accentDark,
    backgroundColor: c.accentSoft,
    borderRadius: 7,
    padding: "7px 9px",
    marginBottom: 9,
    borderLeft: `3px solid ${c.accent}`,
  },
  orderNoteLabel: { fontWeight: 700 },
  ticketItems: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 11,
  },
  ticketItem: { display: "flex", alignItems: "flex-start", gap: 9 },
  qtyBadge: {
    backgroundColor: c.bgMuted,
    border: `1px solid ${c.border}`,
    borderRadius: 5,
    padding: "2px 7px",
    fontSize: 19,
    fontWeight: 700,
    color: c.ink,
    flexShrink: 0,
  },
  itemName: { fontSize: 15, fontWeight: 700, color: c.ink, margin: 0 },
  subcuentaTag: { fontSize: 13, fontWeight: 600, color: c.info },
  itemNote: {
    fontSize: 14,
    color: c.danger,
    margin: 0,
    fontStyle: "italic",
    fontWeight: 600,
  },
  ticketBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "11px",
    border: "1.5px solid",
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: theme.font,
    cursor: "pointer",
    minHeight: 44,
  },
  emptySlot: {
    border: `1.5px dashed ${c.border}`,
    borderRadius: 10,
    padding: 26,
    textAlign: "center",
  },
  emptyTxt: { fontSize: 15, color: c.inkFaint, margin: 0 },
  timerBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 7,
    padding: "5px 9px",
    marginBottom: 9,
    justifyContent: "center",
  },
};
