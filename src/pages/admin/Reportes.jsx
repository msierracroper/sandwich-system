// ARCHIVO: src/pages/admin/Reportes.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function Reportes() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("hoy"); // 'hoy' | 'historico'
  const [histTab, setHistTab] = useState("semana"); // 'semana' | 'mes'
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dayAlreadyClosed, setDayAlreadyClosed] = useState(false);

  async function loadToday() {
    setLoading(true);
    //const today = new Date().toISOString().split("T")[0];

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
    console.log("today:", today);

    const [{ data: ordersData, error: ordersError }, { data: summary }] =
      await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, tables(name), order_items(quantity, unit_price, products(name))",
          )
          .eq("status", "cerrado")
          .gte("closed_at", today + "T00:00:00")
          .lte("closed_at", today + "T23:59:59")
          .order("closed_at", { ascending: false }),
        supabase
          .from("daily_summaries")
          .select("*")
          .eq("date", today)
          .maybeSingle(),
      ]);
    console.log("ordersData:", ordersData, "error:", ordersError);

    setDayAlreadyClosed(!!summary?.exported);

    const data = ordersData ?? [];
    setOrders(data);

    const total = data.reduce((a, o) => a + (o.total ?? 0), 0);
    const cash = data
      .filter((o) => o.payment_method === "efectivo")
      .reduce((a, o) => a + (o.total ?? 0), 0);
    const transfer = data
      .filter((o) => o.payment_method === "transferencia")
      .reduce((a, o) => a + (o.total ?? 0), 0);

    setStats({
      total,
      orders: data.length,
      cash,
      transfer,
      avg: data.length > 0 ? Math.round(total / data.length) : 0,
    });

    // Top productos
    const prodMap = {};
    for (const order of data) {
      for (const item of order.order_items ?? []) {
        const name = item.products?.name ?? "Desconocido";
        prodMap[name] = (prodMap[name] ?? 0) + item.quantity;
      }
    }
    const sorted = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
    setTopProducts(sorted);
    setLoading(false);
  }
  useEffect(() => {
    // eslint-disable-next-line  react-hooks/set-state-in-effect
    loadToday();
  }, []);

  async function loadHistory() {
    const today = new Date();
    let from;
    if (histTab === "semana") {
      from = new Date(today);
      from.setDate(today.getDate() - 7);
    } else {
      from = new Date(today);
      from.setDate(1);
    }

    const { data } = await supabase
      .from("daily_summaries")
      .select("*")
      .gte("date", from.toISOString().split("T")[0])
      .order("date", { ascending: false });

    setHistory(data ?? []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "historico") loadHistory();
  }, [tab, histTab]);

  async function cerrarDia() {
    setClosing(true);
    const today = new Date().toISOString().split("T")[0];

    // Guardar resumen en daily_summaries
    const { error } = await supabase.from("daily_summaries").upsert(
      {
        date: today,
        total: stats.total,
        orders_count: stats.orders,
        cash_total: stats.cash,
        transfer_total: stats.transfer,
        exported: true,
        closed_at: new Date().toISOString(),
      },
      { onConflict: "date" },
    );

    if (error) {
      alert("Error al cerrar el dia");
      setClosing(false);
      return;
    }

    setDayAlreadyClosed(true);
    setShowConfirm(false);
    setClosing(false);
    alert(
      "Dia cerrado correctamente. Recuerda exportar el resumen a Google Sheets desde el panel de Supabase o cuando conectemos la Edge Function.",
    );
  }

  function formatPrice(n) {
    return "$" + (n ?? 0).toLocaleString("es-CO");
  }

  function formatDate(dateStr) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  const maxQty = topProducts[0]?.qty ?? 1;

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button style={s.backBtn} onClick={() => navigate("/admin")}>
            ←
          </button>
          <div>
            <p style={s.title}>Reportes</p>
            <p style={s.sub}>
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
        {dayAlreadyClosed && <span style={s.closedBadge}>Dia cerrado</span>}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          ["hoy", "Hoy"],
          ["historico", "Histórico"],
        ].map(([val, lbl]) => (
          <button
            key={val}
            style={{
              ...s.tab,
              backgroundColor: tab === val ? "#E6F1FB" : "#FFF",
              borderColor: tab === val ? "#378ADD" : "#DDDDCC",
              color: tab === val ? "#185FA5" : "#666660",
              fontWeight: tab === val ? 600 : 400,
            }}
            onClick={() => setTab(val)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── TAB HOY ── */}
      {tab === "hoy" && (
        <div style={s.body}>
          {loading ? (
            <p style={s.loadTxt}>Calculando...</p>
          ) : (
            <>
              {/* Stats grid */}
              <div style={s.statsGrid}>
                <div style={s.statCard}>
                  <p style={s.statLabel}>Total vendido</p>
                  <p style={s.statVal}>{formatPrice(stats.total)}</p>
                  <p style={s.statSub}>{stats.orders} pedidos</p>
                </div>
                <div style={s.statCard}>
                  <p style={s.statLabel}>Ticket promedio</p>
                  <p style={s.statVal}>{formatPrice(stats.avg)}</p>
                  <p style={s.statSub}>por pedido</p>
                </div>
                <div style={s.statCard}>
                  <p style={s.statLabel}>Efectivo</p>
                  <p style={s.statVal}>{formatPrice(stats.cash)}</p>
                  <p style={s.statSub}>
                    {stats.total > 0
                      ? Math.round((stats.cash / stats.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div style={s.statCard}>
                  <p style={s.statLabel}>Transferencia</p>
                  <p style={s.statVal}>{formatPrice(stats.transfer)}</p>
                  <p style={s.statSub}>
                    {stats.total > 0
                      ? Math.round((stats.transfer / stats.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Barra pagos */}
              {stats.total > 0 && (
                <div style={s.barWrap}>
                  <div style={s.barLabels}>
                    <span style={{ color: "#3B6D11", fontSize: 11 }}>
                      Efectivo {Math.round((stats.cash / stats.total) * 100)}%
                    </span>
                    <span style={{ color: "#185FA5", fontSize: 11 }}>
                      Transferencia{" "}
                      {Math.round((stats.transfer / stats.total) * 100)}%
                    </span>
                  </div>
                  <div style={s.barTrack}>
                    <div
                      style={{
                        ...s.barFill,
                        width: `${Math.round((stats.cash / stats.total) * 100)}%`,
                        backgroundColor: "#3B6D11",
                      }}
                    />
                    <div
                      style={{
                        ...s.barFill,
                        width: `${Math.round((stats.transfer / stats.total) * 100)}%`,
                        backgroundColor: "#378ADD",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Top productos */}
              {topProducts.length > 0 && (
                <>
                  <div style={s.divider} />
                  <p style={s.sectionLabel}>Más vendidos hoy</p>
                  <div style={s.rankList}>
                    {topProducts.map((p, i) => (
                      <div key={p.name} style={s.rankRow}>
                        <span style={s.rankNum}>{i + 1}</span>
                        <span style={s.rankName}>{p.name}</span>
                        <div style={s.rankBarWrap}>
                          <div
                            style={{
                              ...s.rankBar,
                              width: `${Math.round((p.qty / maxQty) * 100)}%`,
                            }}
                          />
                        </div>
                        <span style={s.rankQty}>{p.qty} uds</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pedidos del dia */}
              {orders.length > 0 && (
                <>
                  <div style={s.divider} />
                  <p style={s.sectionLabel}>Pedidos del día</p>
                  <div style={s.orderList}>
                    {orders.map((order) => (
                      <div key={order.id} style={s.orderRow}>
                        <div>
                          <p style={s.orderTitle}>
                            {order.type === "mesa"
                              ? order.tables?.name
                              : order.type === "para_llevar"
                                ? "Para llevar"
                                : "Domicilio"}
                            {" · #"}
                            {order.id.slice(-4).toUpperCase()}
                          </p>
                          <p style={s.orderMeta}>
                            {order.payment_method} ·{" "}
                            {order.order_items?.length ?? 0} items
                          </p>
                        </div>
                        <p style={s.orderTotal}>{formatPrice(order.total)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Boton cierre */}
              <div style={s.divider} />
              {dayAlreadyClosed ? (
                <div style={s.closedBox}>
                  <p style={s.closedTxt}>✓ Día cerrado correctamente</p>
                  <p style={s.closedSub}>
                    El resumen fue guardado. Próximamente se exportará a Google
                    Sheets automáticamente.
                  </p>
                </div>
              ) : (
                <button
                  style={s.btnCierre}
                  onClick={() => setShowConfirm(true)}
                >
                  Cerrar día y guardar resumen →
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB HISTORICO ── */}
      {tab === "historico" && (
        <div style={s.body}>
          <div style={s.histTabs}>
            {[
              ["semana", "Semana"],
              ["mes", "Mes"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                style={{
                  ...s.histTab,
                  backgroundColor: histTab === val ? "#E6F1FB" : "#FFF",
                  borderColor: histTab === val ? "#378ADD" : "#DDDDCC",
                  color: histTab === val ? "#185FA5" : "#666660",
                  fontWeight: histTab === val ? 600 : 400,
                }}
                onClick={() => setHistTab(val)}
              >
                {lbl}
              </button>
            ))}
          </div>

          {history.length === 0 ? (
            <p style={s.loadTxt}>No hay días cerrados en este período</p>
          ) : (
            <>
              {history.map((day) => (
                <div key={day.id} style={s.histRow}>
                  <div>
                    <p style={s.histDate}>{formatDate(day.date)}</p>
                    <p style={s.histMeta}>
                      {day.orders_count} pedidos · cerrado
                    </p>
                  </div>
                  <div style={s.histRight}>
                    <p style={s.histTotal}>{formatPrice(day.total)}</p>
                    <span style={s.histArrow}>›</span>
                  </div>
                </div>
              ))}

              <div style={s.divider} />
              <div style={s.summaryCard}>
                <p style={s.statLabel}>
                  Total {histTab === "semana" ? "semana" : "mes"}
                </p>
                <p style={{ ...s.statVal, fontSize: 22 }}>
                  {formatPrice(history.reduce((a, d) => a + d.total, 0))}
                </p>
                <p style={s.statSub}>
                  {history.reduce((a, d) => a + d.orders_count, 0)} pedidos ·{" "}
                  {history.length} días cerrados
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal confirmacion cierre */}
      {showConfirm && (
        <div style={s.overlay} onClick={() => setShowConfirm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Confirmar cierre del día</p>
              <button style={s.closeBtn} onClick={() => setShowConfirm(false)}>
                ✕
              </button>
            </div>
            <div style={s.modalBody}>
              <p style={s.modalDesc}>
                Se guardará el resumen del día. Esta acción no se puede
                deshacer.
              </p>
              <div style={s.confirmBox}>
                <div style={s.confirmRow}>
                  <span>Pedidos cerrados</span>
                  <span>{stats?.orders}</span>
                </div>
                <div style={s.confirmRow}>
                  <span>Efectivo</span>
                  <span>{formatPrice(stats?.cash)}</span>
                </div>
                <div style={s.confirmRow}>
                  <span>Transferencia</span>
                  <span>{formatPrice(stats?.transfer)}</span>
                </div>
                <div style={s.divider} />
                <div style={{ ...s.confirmRow, fontWeight: 600, fontSize: 15 }}>
                  <span>Total del día</span>
                  <span>{formatPrice(stats?.total)}</span>
                </div>
              </div>
              <button
                style={{ ...s.btnConfirm, opacity: closing ? 0.7 : 1 }}
                disabled={closing}
                onClick={cerrarDia}
              >
                {closing ? "Cerrando..." : "Confirmar y cerrar día"}
              </button>
              <button style={s.btnGhost} onClick={() => setShowConfirm(false)}>
                ← Volver sin cerrar
              </button>
            </div>
          </div>
        </div>
      )}
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
  sub: {
    fontSize: 11,
    color: "#666660",
    margin: 0,
    textTransform: "capitalize",
  },
  closedBadge: {
    fontSize: 11,
    fontWeight: 500,
    backgroundColor: "#EAF3DE",
    color: "#27500A",
    padding: "4px 10px",
    borderRadius: 20,
  },
  tabs: {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    backgroundColor: "#FFF",
    borderBottom: "0.5px solid #DDDDCC",
  },
  tab: {
    flex: 1,
    border: "0.5px solid",
    borderRadius: 8,
    padding: "8px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  body: { padding: 16 },
  loadTxt: { fontSize: 13, color: "#888880", textAlign: "center", padding: 20 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },
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
  barWrap: { marginBottom: 12 },
  barLabels: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#F1EFE8",
    borderRadius: 4,
    display: "flex",
    overflow: "hidden",
  },
  barFill: { height: "100%" },
  divider: { height: "0.5px", backgroundColor: "#DDDDCC", margin: "12px 0" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#666660",
    marginBottom: 8,
  },
  rankList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 4,
  },
  rankRow: { display: "flex", alignItems: "center", gap: 8 },
  rankNum: { fontSize: 11, color: "#888880", minWidth: 14, fontWeight: 500 },
  rankName: { fontSize: 12, color: "#1A1A1A", flex: 1 },
  rankBarWrap: {
    width: 60,
    height: 6,
    backgroundColor: "#F1EFE8",
    borderRadius: 3,
    overflow: "hidden",
  },
  rankBar: { height: "100%", backgroundColor: "#185FA5", borderRadius: 3 },
  rankQty: { fontSize: 11, color: "#888880", minWidth: 40, textAlign: "right" },
  orderList: { display: "flex", flexDirection: "column", gap: 6 },
  orderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
  },
  orderTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
    textTransform: "capitalize",
  },
  orderMeta: {
    fontSize: 11,
    color: "#888880",
    margin: 0,
    textTransform: "capitalize",
  },
  orderTotal: { fontSize: 13, fontWeight: 500, color: "#1A1A1A" },
  btnCierre: {
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
    marginTop: 4,
  },
  closedBox: {
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    padding: "12px 14px",
  },
  closedTxt: {
    fontSize: 13,
    fontWeight: 500,
    color: "#3B6D11",
    margin: "0 0 4px",
  },
  closedSub: { fontSize: 11, color: "#3B6D11", margin: 0, lineHeight: 1.5 },
  histTabs: { display: "flex", gap: 8, marginBottom: 12 },
  histTab: {
    flex: 1,
    border: "0.5px solid",
    borderRadius: 8,
    padding: "7px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "sans-serif",
  },
  histRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "#FFF",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    marginBottom: 6,
    cursor: "pointer",
  },
  histDate: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    margin: "0 0 2px",
    textTransform: "capitalize",
  },
  histMeta: { fontSize: 11, color: "#888880", margin: 0 },
  histRight: { display: "flex", alignItems: "center", gap: 4 },
  histTotal: { fontSize: 13, fontWeight: 500, color: "#1A1A1A" },
  histArrow: { fontSize: 16, color: "#888880" },
  summaryCard: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "12px 14px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: "16px 16px 0 0",
    width: "100%",
    maxWidth: 480,
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 0",
  },
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    color: "#666660",
  },
  modalBody: { padding: 16 },
  modalDesc: {
    fontSize: 13,
    color: "#666660",
    marginBottom: 12,
    lineHeight: 1.5,
  },
  confirmBox: {
    backgroundColor: "#F1EFE8",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 14,
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#666660",
    padding: "3px 0",
  },
  btnConfirm: {
    width: "100%",
    padding: 12,
    backgroundColor: "#3B6D11",
    color: "#EAF3DE",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "sans-serif",
    marginBottom: 8,
    cursor: "pointer",
  },
  btnGhost: {
    width: "100%",
    padding: 10,
    backgroundColor: "#FFF",
    color: "#1A1A1A",
    border: "0.5px solid #DDDDCC",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "sans-serif",
    cursor: "pointer",
  },
};
