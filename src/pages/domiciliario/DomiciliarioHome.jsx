// ARCHIVO: src/pages/domiciliario/DomiciliarioHome.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

function formatPrice(n) {
  return "$" + (n ?? 0).toLocaleString("es-CO");
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DeliveryCard({ order, onUpdate }) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(order.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function marcarEntregado() {
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "entregado", delivered_by: profile.id })
      .eq("id", order.id);
    if (error) {
      alert("Error al marcar como entregado");
      setSaving(false);
      return;
    }
    setSaving(false);
    onUpdate();
  }

  return (
    <div style={s.ticket}>
      <div style={s.ticketTop}>
        <span style={s.ticketId}>
          Pedido #{order.id.slice(-4).toUpperCase()}
        </span>
        <span style={s.ticketTime}>{timeAgo(order.created_at)}</span>
      </div>

      {order.address && (
        <div style={s.addressBox}>
          <span style={s.addressTxt}>{order.address}</span>
          <button style={s.copyBtn} onClick={copyAddress}>
            {copied ? "Copiado ✓" : <><CopyIcon /> Copiar</>}
          </button>
        </div>
      )}

      {(order.customer_name || order.customer_phone) && (
        <div style={s.customerRow}>
          {order.customer_name && (
            <span style={s.customerName}>{order.customer_name}</span>
          )}
          {order.customer_phone && (
            <a style={s.phoneLink} href={`tel:${order.customer_phone}`}>
              <PhoneIcon /> {order.customer_phone}
            </a>
          )}
        </div>
      )}

      {order.payment_method && (
        <div
          style={{
            ...s.paymentBadge,
            backgroundColor:
              order.payment_method === "efectivo" ? c.warnSoft : c.successSoft,
            color:
              order.payment_method === "efectivo" ? c.warn : c.success,
          }}
        >
          {order.payment_method === "efectivo" ? (
            <><CashIcon /> Cobrar efectivo</>
          ) : (
            "✓ Ya pagado (transferencia)"
          )}
        </div>
      )}

      <div style={s.ticketItems}>
        {order.items.map((item) => (
          <div key={item.id} style={s.ticketItem}>
            <div style={s.qtyBadge}>{item.quantity}x</div>
            <p style={s.itemName}>{item.productName}</p>
          </div>
        ))}
      </div>

      {order.note && (
        <div style={s.noteBox}>
          <span style={s.noteLabel}>Nota: </span>
          {order.note}
        </div>
      )}

      <div style={s.totalRow}>
        <span>Total</span>
        <span>{formatPrice(order.total)}</span>
      </div>

      <button
        style={{ ...s.ticketBtn, opacity: saving ? 0.6 : 1 }}
        disabled={saving}
        onClick={marcarEntregado}
      >
        {saving ? "..." : "Marcar como entregado"}
      </button>
    </div>
  );
}

export default function DomiciliarioHome() {
  const { signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("domiciliario-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadOrders(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from("orders")
      .select(
        `
        id, address, customer_name, customer_phone, payment_method, note, total, created_at,
        order_items(id, quantity, products(name))
      `,
      )
      .eq("type", "domicilio")
      .eq("status", "listo")
      .order("created_at", { ascending: true });

    const mapped = (data ?? []).map((order) => ({
      ...order,
      items: (order.order_items ?? []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        productName: item.products?.name,
      })),
    }));

    setOrders(mapped);
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
        <p style={s.loadTxt}>Cargando pedidos...</p>
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div>
          <p style={s.title}>Pedidos para entregar</p>
          <p style={s.sub}>{today}</p>
        </div>
        <div style={s.topRight}>
          <div style={s.statPill}>{orders.length} en cola</div>
          <button style={s.logoutBtn} onClick={signOut}>
            Salir
          </button>
        </div>
      </div>

      <div style={s.ticketList}>
        {orders.length === 0 && (
          <div style={s.emptySlot}>
            <p style={s.emptyTxt}>No hay pedidos listos para entregar</p>
          </div>
        )}
        {orders.map((order) => (
          <DeliveryCard key={order.id} order={order} onUpdate={loadOrders} />
        ))}
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
  title: { fontSize: 18, fontWeight: 700, color: c.ink, margin: "0 0 2px" },
  sub: {
    fontSize: 13,
    color: c.inkSoft,
    margin: 0,
    textTransform: "capitalize",
  },
  topRight: { display: "flex", alignItems: "center", gap: 10 },
  statPill: {
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 13px",
    borderRadius: 20,
    backgroundColor: c.successSoft,
    color: c.success,
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
  ticketList: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  ticket: {
    backgroundColor: c.surface,
    borderRadius: 14,
    border: `1px solid ${c.border}`,
    padding: "14px 16px",
    boxShadow: theme.shadow,
  },
  ticketTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  ticketId: { fontSize: 15, fontWeight: 700, color: c.ink },
  ticketTime: { fontSize: 13, color: c.inkFaint, marginLeft: "auto" },
  addressBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: c.infoSoft,
    borderRadius: 9,
    padding: "10px 12px",
    marginBottom: 10,
  },
  addressTxt: { fontSize: 15, fontWeight: 600, color: c.info },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 13,
    fontWeight: 700,
    color: c.info,
    backgroundColor: c.surface,
    border: `1px solid ${c.infoBorder}`,
    borderRadius: 20,
    padding: "7px 13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    fontFamily: theme.font,
  },
  customerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  customerName: { fontSize: 15, fontWeight: 600, color: c.ink },
  phoneLink: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 15,
    fontWeight: 600,
    color: c.accent,
    textDecoration: "none",
  },
  paymentBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 14,
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 8,
    marginBottom: 10,
  },
  ticketItems: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 10,
  },
  ticketItem: { display: "flex", alignItems: "center", gap: 9 },
  qtyBadge: {
    backgroundColor: c.bgMuted,
    border: `1px solid ${c.border}`,
    borderRadius: 5,
    padding: "2px 7px",
    fontSize: 14,
    fontWeight: 700,
    color: c.ink,
    flexShrink: 0,
  },
  itemName: { fontSize: 15, fontWeight: 600, color: c.ink, margin: 0 },
  noteBox: {
    fontSize: 14,
    color: c.inkSoft,
    backgroundColor: c.bgMuted,
    borderRadius: 8,
    padding: "8px 12px",
    marginBottom: 10,
    fontStyle: "italic",
  },
  noteLabel: { fontWeight: 600, fontStyle: "normal" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 17,
    fontWeight: 700,
    color: c.ink,
    padding: "4px 0 10px",
  },
  ticketBtn: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: theme.font,
    backgroundColor: c.accent,
    color: "#FFFFFF",
    cursor: "pointer",
    minHeight: 48,
  },
  emptySlot: {
    border: `1.5px dashed ${c.border}`,
    borderRadius: 12,
    padding: 28,
    textAlign: "center",
  },
  emptyTxt: { fontSize: 15, color: c.inkFaint, margin: 0 },
};
