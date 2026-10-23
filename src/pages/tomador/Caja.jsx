// ARCHIVO: src/pages/tomador/Caja.jsx
//
// Apertura y cierre de caja — fase de prueba, no es obligatorio. Un tomador
// puede operar normalmente sin abrir caja; esta pantalla solo existe para
// quien quiera llevar el control de con cuanto se empieza el dia, cuanto se
// le da de base al domiciliario, y cuanto cierra en ventas y efectivo.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";
import { theme } from "../../theme";

const c = theme.color;

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function todayBogota() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function formatPrice(n) {
  return "$" + (n ?? 0).toLocaleString("es-CO");
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Caja() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const todayStr = todayBogota();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // apertura
  const [openingCash, setOpeningCash] = useState("");
  const [domiciliarioBase, setDomiciliarioBase] = useState("");
  const [domiciliarioNote, setDomiciliarioNote] = useState("");
  const [openingNote, setOpeningNote] = useState("");

  // cierre
  const [showClosing, setShowClosing] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [sales, setSales] = useState(null);
  const [domiciliarioReturned, setDomiciliarioReturned] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closingNote, setClosingNote] = useState("");

  async function loadSession() {
    setLoading(true);
    const { data } = await supabase
      .from("cash_sessions")
      .select(
        "*, opened_by_user:users!cash_sessions_opened_by_fkey(name), closed_by_user:users!cash_sessions_closed_by_fkey(name)",
      )
      .eq("date", todayStr)
      .maybeSingle();
    setSession(data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadSession();
  }, []);

  function num(v) {
    return parseInt(String(v).replace(/\D/g, ""), 10) || 0;
  }

  async function abrirCaja() {
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("cash_sessions").insert({
      date: todayStr,
      status: "abierta",
      opened_by: profile.id,
      opening_cash: num(openingCash),
      domiciliario_base: num(domiciliarioBase),
      domiciliario_note: domiciliarioNote || null,
      opening_note: openingNote || null,
    });
    setSaving(false);
    if (err) {
      setError(
        err.code === "23505"
          ? "Ya se abrió caja hoy — recarga la página."
          : "Error al abrir caja",
      );
      return;
    }
    await loadSession();
  }

  // Calcula las ventas cerradas de hoy (mismo criterio que Admin > Reportes):
  // efectivo + porcion en efectivo de pagos mixtos + lo mismo para pedidos
  // con cuenta dividida, que guardan su desglose en order_payments. Ademas
  // separa cuanto de ese efectivo vino especificamente de domicilios, porque
  // ese dinero el domiciliario lo devuelve completo (base + lo cobrado) y
  // por eso NO se resta de la caja general — solo sale y vuelve.
  async function loadVentasHoy() {
    setLoadingSales(true);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, total, payment_method, cash_amount, transfer_amount, type")
      .eq("status", "cerrado")
      .gte("closed_at", todayStr + "T00:00:00")
      .lte("closed_at", todayStr + "T23:59:59");

    const orders = ordersData ?? [];
    const splitIds = orders
      .filter((o) => o.payment_method === "dividido")
      .map((o) => o.id);
    let splitPayments = [];
    if (splitIds.length > 0) {
      const { data } = await supabase
        .from("order_payments")
        .select("*")
        .in("order_id", splitIds);
      splitPayments = data ?? [];
    }

    function cashOf(orderList, paymentList) {
      return (
        orderList.reduce((a, o) => {
          if (o.payment_method === "efectivo") return a + (o.total ?? 0);
          if (o.payment_method === "mixto") return a + (o.cash_amount ?? 0);
          return a;
        }, 0) +
        paymentList.reduce((a, p) => {
          if (p.payment_method === "efectivo") return a + p.amount;
          if (p.payment_method === "mixto") return a + (p.cash_amount ?? 0);
          return a;
        }, 0)
      );
    }

    const cash = cashOf(orders, splitPayments);
    const transfer =
      orders.reduce((a, o) => {
        if (o.payment_method === "transferencia") return a + (o.total ?? 0);
        if (o.payment_method === "mixto") return a + (o.transfer_amount ?? 0);
        return a;
      }, 0) +
      splitPayments.reduce((a, p) => {
        if (p.payment_method === "transferencia") return a + p.amount;
        if (p.payment_method === "mixto") return a + (p.transfer_amount ?? 0);
        return a;
      }, 0);
    const total = orders.reduce((a, o) => a + (o.total ?? 0), 0);

    const domicilioOrders = orders.filter((o) => o.type === "domicilio");
    const domicilioIds = new Set(domicilioOrders.map((o) => o.id));
    const domicilioPayments = splitPayments.filter((p) =>
      domicilioIds.has(p.order_id),
    );
    const domicilioCash = cashOf(domicilioOrders, domicilioPayments);

    const result = { total, cash, transfer, count: orders.length, domicilioCash };
    setSales(result);
    setLoadingSales(false);
    // Sugerencia de cuanto deberia devolver el domiciliario — editable, por
    // si en la practica devolvio algo distinto.
    if (session && domiciliarioReturned === "") {
      setDomiciliarioReturned(
        String((session.domiciliario_base ?? 0) + result.domicilioCash),
      );
    }
    return result;
  }

  async function abrirCierre() {
    setShowClosing(true);
    if (!sales) await loadVentasHoy();
  }

  const domiciliarioShouldReturn =
    session && sales
      ? (session.domiciliario_base ?? 0) + sales.domicilioCash
      : 0;
  const domiciliarioDiff =
    domiciliarioReturned !== "" ? num(domiciliarioReturned) - domiciliarioShouldReturn : null;

  // La base SI se resta — ese dinero salio fisicamente de la caja apenas se
  // le entrego al domiciliario. Se vuelve a sumar solo cuando realmente lo
  // devuelve (campo "devuelto"), que puede ser $0 si todavia no ha vuelto,
  // parcial si le falto, o el esperado si devolvio todo. Por eso ya no se
  // puede "simplificar" cancelando base contra devuelto: hay que restar la
  // una y sumar la otra por separado, para que el momento en que aun no ha
  // devuelto nada quede reflejado como menos plata en caja, no como si nunca
  // hubiera salido.
  const expectedCash =
    session && sales
      ? (session.opening_cash ?? 0) -
        (session.domiciliario_base ?? 0) +
        (sales.cash - sales.domicilioCash) +
        num(domiciliarioReturned)
      : 0;
  const difference = countedCash !== "" ? num(countedCash) - expectedCash : null;

  async function cerrarCaja() {
    setError("");
    setSaving(true);
    const ventas = sales ?? (await loadVentasHoy());
    const debiaDevolver =
      (session.domiciliario_base ?? 0) + ventas.domicilioCash;
    const devuelto = num(domiciliarioReturned);
    const esperado =
      (session.opening_cash ?? 0) -
      (session.domiciliario_base ?? 0) +
      (ventas.cash - ventas.domicilioCash) +
      devuelto;
    const contado = num(countedCash);
    const { error: err } = await supabase
      .from("cash_sessions")
      .update({
        status: "cerrada",
        closed_by: profile.id,
        closed_at: new Date().toISOString(),
        counted_cash: contado,
        sales_total: ventas.total,
        sales_cash: ventas.cash,
        sales_transfer: ventas.transfer,
        orders_count: ventas.count,
        domiciliario_cash_sales: ventas.domicilioCash,
        domiciliario_should_return: debiaDevolver,
        domiciliario_returned: devuelto,
        domiciliario_difference: devuelto - debiaDevolver,
        expected_cash: esperado,
        cash_difference: contado - esperado,
        closing_note: closingNote || null,
      })
      .eq("id", session.id);
    setSaving(false);
    if (err) {
      setError("Error al cerrar caja");
      return;
    }
    await loadSession();
  }

  if (loading)
    return (
      <div style={s.loadWrap}>
        <p style={s.loadTxt}>Cargando caja...</p>
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={() => navigate("/tomador")} aria-label="Volver">
          <BackIcon />
        </button>
        <div>
          <p style={s.title}>Caja</p>
          <p style={s.sub}>
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.trialNote}>
          Esto está en fase de prueba — es opcional. Puedes seguir tomando
          pedidos normalmente aunque no abras ni cierres caja.
        </div>

        {error && <p style={s.error}>{error}</p>}

        {/* ── SIN SESION HOY: formulario de apertura ── */}
        {!session && (
          <>
            <p style={s.sectionLabel}>Apertura de caja</p>

            <label style={s.label}>¿Con cuánto dinero se inicia hoy?</label>
            <input
              style={s.input}
              type="number"
              placeholder="$0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />

            <label style={s.label}>Base entregada al domiciliario</label>
            <input
              style={s.input}
              type="number"
              placeholder="$0"
              value={domiciliarioBase}
              onChange={(e) => setDomiciliarioBase(e.target.value)}
            />
            <input
              style={s.input}
              placeholder="Nota (a quién, para qué...) — opcional"
              value={domiciliarioNote}
              onChange={(e) => setDomiciliarioNote(e.target.value)}
            />

            <label style={s.label}>Nota de apertura (opcional)</label>
            <textarea
              style={s.textarea}
              rows={2}
              placeholder="Observaciones..."
              value={openingNote}
              onChange={(e) => setOpeningNote(e.target.value)}
            />

            <button
              style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
              disabled={saving}
              onClick={abrirCaja}
            >
              {saving ? "Abriendo..." : "Abrir caja"}
            </button>
          </>
        )}

        {/* ── SESION ABIERTA ── */}
        {session && session.status === "abierta" && (
          <>
            <div style={s.statusCard}>
              <div style={s.statusRow}>
                <span style={s.statusDot} />
                <span style={s.statusLabel}>Caja abierta</span>
              </div>
              <p style={s.statusSub}>
                {formatTime(session.opened_at)} · {session.opened_by_user?.name ?? "—"}
              </p>
              <div style={s.divider} />
              <div style={s.kvRow}>
                <span>Dinero inicial</span>
                <span style={s.kvVal}>{formatPrice(session.opening_cash)}</span>
              </div>
              <div style={s.kvRow}>
                <span>Base domiciliario</span>
                <span style={s.kvVal}>{formatPrice(session.domiciliario_base)}</span>
              </div>
              {session.domiciliario_note && (
                <p style={s.noteTxt}>{session.domiciliario_note}</p>
              )}
              {session.opening_note && (
                <p style={s.noteTxt}>{session.opening_note}</p>
              )}
            </div>

            {!showClosing ? (
              <button style={s.btnPrimary} onClick={abrirCierre}>
                Cerrar caja
              </button>
            ) : (
              <>
                <p style={{ ...s.sectionLabel, marginTop: 16 }}>
                  Cierre de caja
                </p>

                {loadingSales ? (
                  <p style={s.loadTxt}>Calculando ventas de hoy...</p>
                ) : (
                  sales && (
                    <>
                      <div style={s.salesCard}>
                        <div style={s.kvRow}>
                          <span>Pedidos cerrados</span>
                          <span style={s.kvVal}>{sales.count}</span>
                        </div>
                        <div style={s.kvRow}>
                          <span>Ventas totales</span>
                          <span style={s.kvVal}>{formatPrice(sales.total)}</span>
                        </div>
                        <div style={s.kvRow}>
                          <span>— en efectivo</span>
                          <span style={s.kvVal}>{formatPrice(sales.cash)}</span>
                        </div>
                        <div style={s.kvRow}>
                          <span>— en transferencia</span>
                          <span style={s.kvVal}>{formatPrice(sales.transfer)}</span>
                        </div>
                      </div>

                      <p style={{ ...s.sectionLabel, marginTop: 14 }}>
                        Cuentas del domiciliario
                      </p>
                      <div style={s.salesCard}>
                        <div style={s.kvRow}>
                          <span>Base entregada</span>
                          <span style={s.kvVal}>
                            {formatPrice(session.domiciliario_base)}
                          </span>
                        </div>
                        <div style={s.kvRow}>
                          <span>+ cobrado en efectivo en domicilios</span>
                          <span style={s.kvVal}>
                            {formatPrice(sales.domicilioCash)}
                          </span>
                        </div>
                        <div style={{ ...s.kvRow, fontWeight: 700 }}>
                          <span>Debe devolver</span>
                          <span style={s.kvVal}>
                            {formatPrice(domiciliarioShouldReturn)}
                          </span>
                        </div>
                      </div>

                      <label style={s.label}>¿Cuánto devolvió el domiciliario?</label>
                      <p style={s.hintTxt}>
                        Viene sugerido con lo que debería ser — ajústalo a lo
                        que de verdad entregó. Si todavía no ha vuelto, pon $0.
                      </p>
                      <input
                        style={s.input}
                        type="number"
                        placeholder="$0"
                        value={domiciliarioReturned}
                        onChange={(e) => setDomiciliarioReturned(e.target.value)}
                      />

                      {domiciliarioReturned !== "" && domiciliarioDiff !== 0 && (
                        <div
                          style={{
                            ...s.diffBox,
                            backgroundColor:
                              domiciliarioDiff > 0 ? c.infoSoft : c.dangerSoft,
                          }}
                        >
                          <span
                            style={{
                              color: domiciliarioDiff > 0 ? c.info : c.danger,
                              fontWeight: 700,
                            }}
                          >
                            {domiciliarioDiff > 0
                              ? `Devolvió ${formatPrice(domiciliarioDiff)} de más`
                              : `Le faltan ${formatPrice(Math.abs(domiciliarioDiff))} por devolver`}
                          </span>
                        </div>
                      )}

                      <p style={{ ...s.sectionLabel, marginTop: 14 }}>
                        Caja general
                      </p>
                      <div style={s.salesCard}>
                        <div style={s.kvRow}>
                          <span>Dinero inicial</span>
                          <span style={s.kvVal}>
                            {formatPrice(session.opening_cash)}
                          </span>
                        </div>
                        <div style={s.kvRow}>
                          <span>− base entregada al domiciliario</span>
                          <span style={{ ...s.kvVal, color: c.danger }}>
                            −{formatPrice(session.domiciliario_base)}
                          </span>
                        </div>
                        <div style={s.kvRow}>
                          <span>+ ventas en efectivo (sin domicilios)</span>
                          <span style={s.kvVal}>
                            {formatPrice(sales.cash - sales.domicilioCash)}
                          </span>
                        </div>
                        <div style={s.kvRow}>
                          <span>+ devuelto por el domiciliario</span>
                          <span style={s.kvVal}>
                            {formatPrice(num(domiciliarioReturned))}
                          </span>
                        </div>
                        <div style={{ ...s.kvRow, fontWeight: 700 }}>
                          <span>Esperado en caja</span>
                          <span style={s.kvVal}>{formatPrice(expectedCash)}</span>
                        </div>
                      </div>
                    </>
                  )
                )}

                <label style={s.label}>Dinero contado en caja</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder="$0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                />

                {countedCash !== "" && (
                  <div
                    style={{
                      ...s.diffBox,
                      backgroundColor:
                        difference === 0
                          ? c.successSoft
                          : difference > 0
                            ? c.infoSoft
                            : c.dangerSoft,
                    }}
                  >
                    <span
                      style={{
                        color:
                          difference === 0
                            ? c.success
                            : difference > 0
                              ? c.info
                              : c.danger,
                        fontWeight: 700,
                      }}
                    >
                      {difference === 0
                        ? "Cuadra exacto"
                        : difference > 0
                          ? `Sobran ${formatPrice(difference)}`
                          : `Faltan ${formatPrice(Math.abs(difference))}`}
                    </span>
                  </div>
                )}

                <label style={s.label}>Nota de cierre (opcional)</label>
                <textarea
                  style={s.textarea}
                  rows={2}
                  placeholder="Observaciones..."
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                />

                <button
                  style={{
                    ...s.btnPrimary,
                    opacity: saving || countedCash === "" ? 0.6 : 1,
                  }}
                  disabled={saving || countedCash === ""}
                  onClick={cerrarCaja}
                >
                  {saving ? "Cerrando..." : "Cerrar caja"}
                </button>
              </>
            )}
          </>
        )}

        {/* ── SESION CERRADA HOY ── */}
        {session && session.status === "cerrada" && (
          <div style={s.statusCard}>
            <div style={s.statusRow}>
              <span style={{ ...s.statusDot, backgroundColor: c.inkFaint }} />
              <span style={s.statusLabel}>Caja cerrada</span>
            </div>
            <p style={s.statusSub}>
              Abierta {formatTime(session.opened_at)} por{" "}
              {session.opened_by_user?.name ?? "—"} · Cerrada{" "}
              {formatTime(session.closed_at)} por{" "}
              {session.closed_by_user?.name ?? "—"}
            </p>
            <div style={s.divider} />
            <div style={s.kvRow}>
              <span>Dinero inicial</span>
              <span style={s.kvVal}>{formatPrice(session.opening_cash)}</span>
            </div>
            <div style={s.kvRow}>
              <span>Base domiciliario</span>
              <span style={s.kvVal}>{formatPrice(session.domiciliario_base)}</span>
            </div>
            <div style={s.kvRow}>
              <span>Ventas totales</span>
              <span style={s.kvVal}>{formatPrice(session.sales_total)}</span>
            </div>
            <div style={s.kvRow}>
              <span>— en efectivo</span>
              <span style={s.kvVal}>{formatPrice(session.sales_cash)}</span>
            </div>
            <div style={s.kvRow}>
              <span>— en transferencia</span>
              <span style={s.kvVal}>{formatPrice(session.sales_transfer)}</span>
            </div>

            <div style={s.divider} />
            <p style={{ ...s.statusLabel, fontSize: 13 }}>Domiciliario</p>
            <div style={s.kvRow}>
              <span>Debía devolver</span>
              <span style={s.kvVal}>
                {formatPrice(session.domiciliario_should_return)}
              </span>
            </div>
            <div style={s.kvRow}>
              <span>Devolvió</span>
              <span style={s.kvVal}>
                {formatPrice(session.domiciliario_returned)}
              </span>
            </div>
            {session.domiciliario_difference !== 0 && (
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: session.domiciliario_difference > 0 ? c.info : c.danger,
                  margin: "4px 0 0",
                }}
              >
                {session.domiciliario_difference > 0
                  ? `Devolvió ${formatPrice(session.domiciliario_difference)} de más`
                  : `Le faltó ${formatPrice(Math.abs(session.domiciliario_difference))} por devolver`}
              </p>
            )}

            <div style={s.divider} />
            <div style={s.kvRow}>
              <span>Esperado en caja</span>
              <span style={s.kvVal}>{formatPrice(session.expected_cash)}</span>
            </div>
            <div style={s.kvRow}>
              <span>Contado en caja</span>
              <span style={s.kvVal}>{formatPrice(session.counted_cash)}</span>
            </div>
            <div
              style={{
                ...s.diffBox,
                marginTop: 8,
                backgroundColor:
                  session.cash_difference === 0
                    ? c.successSoft
                    : session.cash_difference > 0
                      ? c.infoSoft
                      : c.dangerSoft,
              }}
            >
              <span
                style={{
                  color:
                    session.cash_difference === 0
                      ? c.success
                      : session.cash_difference > 0
                        ? c.info
                        : c.danger,
                  fontWeight: 700,
                }}
              >
                {session.cash_difference === 0
                  ? "Cuadró exacto"
                  : session.cash_difference > 0
                    ? `Sobraron ${formatPrice(session.cash_difference)}`
                    : `Faltaron ${formatPrice(Math.abs(session.cash_difference))}`}
              </span>
            </div>
            {session.domiciliario_note && (
              <p style={s.noteTxt}>{session.domiciliario_note}</p>
            )}
            {session.opening_note && <p style={s.noteTxt}>{session.opening_note}</p>}
            {session.closing_note && <p style={s.noteTxt}>{session.closing_note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: c.bg, fontFamily: theme.font },
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
    gap: 12,
    padding: "14px 18px",
    backgroundColor: c.surface,
    borderBottom: `1px solid ${c.border}`,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: c.ink,
    flexShrink: 0,
    padding: 0,
  },
  title: { fontSize: 17, fontWeight: 700, color: c.ink, margin: "0 0 2px" },
  sub: { fontSize: 13, color: c.inkSoft, margin: 0, textTransform: "capitalize" },
  body: { padding: 18, maxWidth: 520 },
  trialNote: {
    fontSize: 13,
    color: c.warn,
    backgroundColor: c.warnSoft,
    borderRadius: 10,
    padding: "10px 13px",
    marginBottom: 18,
  },
  error: {
    fontSize: 13,
    color: c.danger,
    backgroundColor: c.dangerSoft,
    borderRadius: 8,
    padding: "9px 12px",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: c.inkSoft,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: c.inkSoft,
    marginBottom: 6,
  },
  hintTxt: {
    fontSize: 12,
    color: c.inkFaint,
    margin: "-2px 0 6px",
  },
  input: {
    width: "100%",
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 15,
    color: c.ink,
    fontFamily: theme.font,
    outline: "none",
    backgroundColor: c.surface,
    marginBottom: 14,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 14,
    color: c.ink,
    fontFamily: theme.font,
    backgroundColor: c.bgMuted,
    resize: "none",
    marginBottom: 14,
    boxSizing: "border-box",
  },
  btnPrimary: {
    width: "100%",
    padding: 14,
    backgroundColor: c.accent,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: theme.font,
    cursor: "pointer",
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: "16px 16px",
    marginBottom: 16,
    boxShadow: theme.shadow,
  },
  statusRow: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: "50%", backgroundColor: c.success },
  statusLabel: { fontSize: 15, fontWeight: 700, color: c.ink },
  statusSub: { fontSize: 13, color: c.inkSoft, margin: "4px 0 0", textTransform: "capitalize" },
  divider: { height: "1px", backgroundColor: c.border, margin: "12px 0" },
  kvRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: c.inkSoft,
    padding: "4px 0",
  },
  kvVal: { fontWeight: 600, color: c.ink },
  noteTxt: {
    fontSize: 13,
    color: c.inkSoft,
    fontStyle: "italic",
    marginTop: 8,
  },
  salesCard: {
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 16,
  },
  diffBox: {
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14,
    textAlign: "center",
  },
};
