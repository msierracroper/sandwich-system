// ARCHIVO: src/theme.js
//
// Tokens de diseño compartidos (paleta + tipografia). Fase 1 de la
// migracion visual: por ahora solo lo usan las pantallas del tomador
// (TomadorHome, NuevoPedido, PedidoActivo). El resto de la app sigue
// con sus colores sueltos hasta que se migren en una fase siguiente —
// al tocarlos, importar este archivo en vez de repetir hex sueltos.

export const theme = {
  font: "'Plus Jakarta Sans', system-ui, sans-serif",
  color: {
    bg: "#FAF7F2",
    surface: "#FFFFFF",
    bgMuted: "#F4F1E9",
    border: "#E8E2D8",
    borderStrong: "#D9D1C2",

    ink: "#211F1C",
    inkSoft: "#6F6A62",
    inkFaint: "#A49C8F",

    accent: "#B5491F",
    accentDark: "#923B19",
    accentSoft: "#F8E4D7",
    accentBorder: "#E8C2A6",

    success: "#2F6E4E",
    successSoft: "#E3F0E7",

    warn: "#9A6B12",
    warnSoft: "#FBEFD9",
    warnBorder: "#F0D9A0",

    info: "#2A5C8C",
    infoSoft: "#E6EFF7",
    infoBorder: "#BCD4E6",

    danger: "#A3302A",
    dangerSoft: "#FBE8E6",
    dangerBorder: "#F0B3AE",

    // Morado reservado para "domicilio" como tipo de pedido — no es un
    // color de estado, es una etiqueta de categoria, por eso vive aparte
    // de success/warn/info/danger.
    domicilio: "#6B4FA0",
    domicilioSoft: "#ECE6F6",

    // teal e indigo solo se usan como colores "categoricos" (paleta de
    // categorias de gastos, graficas) — nunca como color de estado.
    teal: "#0F766E",
    tealSoft: "#DCEEEC",
    indigo: "#5B4FBF",
    indigoSoft: "#ECE9FA",
  },
  shadow: "0 1px 2px rgba(33,31,28,.04), 0 8px 20px -6px rgba(33,31,28,.08)",
};
