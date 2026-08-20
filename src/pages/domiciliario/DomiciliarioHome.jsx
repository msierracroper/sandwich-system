// ARCHIVO: src/pages/domiciliario/DomiciliarioHome.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

function formatPrice(n) {
  return "$" + (n ?? 0).toLocaleString("es-CO");
}

function DeliveryCard({ order, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(order.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function marcarEntregado() {
    setSaving(true);
    await supabase
      .from("orders")
      .update({ status: "cerrado", closed_at: new Date().toISOString() })
      .eq("id", order.id);
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
            {copied ? "Copiado ✓" : "Copiar"}
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
              📞 {order.customer_phone}
            </a>
          )}
        </div>
      )}

      {order.payment_method && (
        <div
          style={{
            ...s.paymentBadge,
            backgroundColor:
              order.payment_method === "efectivo" ? "#FAEEDA" : "#EAF3DE",
            color:
              order.payment_method === "efectivo" ? "#854F0B" : "#3B6D11",
          }}
        >
          {order.payment_method === "efectivo"
            ? "💰 Cobrar efectivo"
            : "✓ Ya pagado (transferencia)"}
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
    backgroundColor: "#EAF3DE",
    color: "#3B6D11",
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
  ticketList: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  ticket: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    border: "0.5px solid #DDDDCC",
    padding: "10px 12px",
  },
  ticketTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  ticketId: { fontSize: 12, fontWeight: 600, color: "#1A1A1A" },
  ticketTime: { fontSize: 12, color: "#888880", marginLeft: "auto" },
  addressBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#E6F1FB",
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 8,
  },
  addressTxt: { fontSize: 13, fontWeight: 500, color: "#185FA5" },
  copyBtn: {
    fontSize: 11,
    fontWeight: 500,
    color: "#185FA5",
    backgroundColor: "#FFF",
    border: "0.5px solid #B5D4F4",
    borderRadius: 20,
    padding: "4px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  customerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  customerName: { fontSize: 13, fontWeight: 500, color: "#1A1A1A" },
  phoneLink: {
    fontSize: 13,
    fontWeight: 500,
    color: "#185FA5",
    textDecoration: "none",
  },
  paymentBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 6,
    marginBottom: 8,
  },
  ticketItems: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 8,
  },
  ticketItem: { display: "flex", alignItems: "center", gap: 8 },
  qtyBadge: {
    backgroundColor: "#F1EFE8",
    border: "0.5px solid #DDDDCC",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 13,
    fontWeight: 700,
    color: "#242121",
    flexShrink: 0,
  },
  itemName: { fontSize: 13, fontWeight: 500, color: "#1A1A1A", margin: 0 },
  noteBox: {
    fontSize: 12,
    color: "#666660",
    backgroundColor: "#F1EFE8",
    borderRadius: 6,
    padding: "6px 10px",
    marginBottom: 8,
    fontStyle: "italic",
  },
  noteLabel: { fontWeight: 500, fontStyle: "normal" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    fontWeight: 600,
    color: "#1A1A1A",
    padding: "4px 0 8px",
  },
  ticketBtn: {
    width: "100%",
    padding: "9px",
    border: "0.5px solid #B5D4F4",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "sans-serif",
    backgroundColor: "#E6F1FB",
    color: "#185FA5",
    cursor: "pointer",
  },
  emptySlot: {
    border: "1px dashed #DDDDCC",
    borderRadius: 8,
    padding: 24,
    textAlign: "center",
  },
  emptyTxt: { fontSize: 14, color: "#888880", margin: 0 },
};
