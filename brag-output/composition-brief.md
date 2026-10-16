# Hyperframes Composition Brief: Sandwich System

## Objective
Create a short, calm, trustworthy feature-tour brag video for Sandwich System — a real POS/operations app for a sandwich-and-granizado shop with two locations — touring its four roles.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `D:\sandwich soft\sandwich-system`
- Primary files read (by the requester, summarized here — not a static-site project, so there is no index.html/styles.css to read directly): `src/theme.js` (color tokens), `src/pages/admin/AdminHome.jsx`, `src/pages/tomador/NuevoPedido.jsx`, `src/pages/preparador/PreparadorHome.jsx`, `src/pages/domiciliario/DomiciliarioHome.jsx`
- Product name: Sandwich System
- Tagline / strongest claim: "Mira tu negocio sin estar ahí" — the owner (Admin) can see today's sales, cash vs. transfer, and order count from a phone, from home, from the other location, or anywhere.
- Key UI or visual moment to recreate: the Admin dashboard phone mockup — a "Total vendido" KPI counting up, an "EN VIVO" pulsing badge, three supporting KPI cards.
- Copy that must appear verbatim:
  - "Sandwich System"
  - "Mira tu negocio sin estar ahí."
  - "Toma el pedido en segundos."
  - "La cocina nunca pierde un pedido."
  - "Directo a la puerta, sin perder tiempo."
  - "Un negocio. Cuatro roles. Un solo sistema."

## Creative Direction
- Tone preset: `app-store`
- Creative direction: institutional, trustworthy feature tour for a real small-business POS — calm, warm, professional, no jokes, no hype language.
- Interpretation: title-case feature-card captions (role eyebrow + one headline + one supporting line), medium-weight type, clean slide/wipe transitions (0.35–0.45s), no aggressive motion. The Admin scene is the longest hold because it carries the video's one claim.
- Angle: the single most impressive thing about this app is that the owner never has to be standing in the shop to know how the day is going — the video is a 4-role relay (Admin → Tomador → Preparador → Domiciliario) built around that one claim, with the other three roles shown as proof the floor runs itself.
- Hook: full ivory screen, wordmark "Sandwich System", then "Tu negocio, abierto en tu bolsillo."
- Outro / punchline: wordmark returns, small. "Un negocio. Cuatro roles. Un solo sistema." Then a quiet half-second hold — no CTA, no URL (internal business tool, not an app-store listing).
- Avoid:
  - Generic SaaS language ("streamline", "all-in-one", "boost productivity")
  - Abstract filler visuals (no stock gradients, no generic motion graphics)
  - Any UI element, color, or layout not grounded in the real app's design tokens below

## Visual Identity
- Background: `#FAF7F2` (warm ivory)
- Text: `#211F1C` (near-black ink), secondary `#6F6A62`
- Accent: `#B5491F` (terracotta)
- Role accents (use exactly, only where that role's content appears): success `#2F6E4E` / success-soft `#E3F0E7`, warn `#9A6B12` / warn-soft `#FBEFD9`, danger `#A3302A` / danger-soft `#FBE8E6`, info `#2A5C8C` / info-soft `#E6EFF7`
- Display font: Plus Jakarta Sans, 700–800 weight (Google Fonts) — this is the real app's own font; do not substitute a separate marketing display face, the video should feel like the product, not a skin over it
- Body font: Plus Jakarta Sans, 400–700 weight
- Visual references from the project:
  - Phone-frame mockup, screen background `#FAF7F2`
  - KPI cards: `#F4F1E9` background, hot/primary KPI card `#F8E4D7` background with `#923B19` text
  - Product/order row: white card, `#E8E2D8` border, selected state `#F8E4D7` bg + `#B5491F` border
  - Kitchen ticket: white card with `#BCD4E6`-family border, timer chip that shifts `#E3F0E7`/`#2F6E4E` (fresh) → `#FBEFD9`/`#9A6B12` (waiting)
  - Delivery card: address row on `#E6EFF7`/`#2A5C8C`, "cobrar efectivo" badge on `#FBEFD9`/`#9A6B12`, full-width terracotta "Marcar como entregado" button

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract. Scene summary:

1. Hook — 2.5s — wordmark + bread-icon mark, then "Tu negocio, abierto en tu bolsillo." settles and holds.
2. Admin — 5s — "Admin" eyebrow, headline "Mira tu negocio sin estar ahí.", supporting line "Desde la casa, la otra sede, o cualquier lugar." Phone mockup: Total vendido counts 0→$1.240k, EN VIVO badge pulses, 3 smaller KPI cards static.
3. Tomador — 3.5s — "Tomador" eyebrow, headline "Toma el pedido en segundos." Phone mockup: selected product row, quantity pops 0→2, cart bar totals to $34.000.
4. Preparador — 3.5s — "Preparador" eyebrow, headline "La cocina nunca pierde un pedido." Phone mockup: kitchen ticket, timer chip shifts green→amber with its "hace N min" label.
5. Domiciliario — 3.5s — "Domiciliario" eyebrow, headline "Directo a la puerta, sin perder tiempo." Phone mockup: delivery card, "Copiar" taps to "Copiado ✓", "Marcar como entregado" button taps near scene end.
6. Outro — 2s — wordmark returns, "Un negocio. Cuatro roles. Un solo sistema.", quiet hold.

## Audio
- Audio role: warm bed, sparse professional accents
- Audio arc: music fades in under the hook, holds a steady bed through all four role scenes, fades down under the outro's quiet hold
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: low under hook (~0.4 of bed volume), full steady bed under the four role scenes, fade to ~0.15 under the outro hold
- Music cue guidance: preset read from `happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.md`, 120.19 BPM. Strong cues at 16.02/17.02/17.52/18.52/20.02s fall inside this video's window — prefer locking the Preparador color-shift or the Preparador→Domiciliario cut near 16–17s, and the Domiciliario delivery-button tap or Domiciliario→Outro cut near 20.0s, within ±0.15s. Earlier cuts (Hook→Admin, Admin→Tomador, Tomador→Preparador) land before the strong-cue window starts; keep those on the natural beat grid (~0.5s spacing) instead of forcing a cue.
- Audio-reactive treatment: subtle — the phone mockup's drop shadow / ambient presence may breathe slightly with the music's RMS. No waveform, no equalizer bars, no particle systems.
- Audio-coupled moments:
  - Admin — EN VIVO badge's first pulse — soft ping, synced
  - Admin — KPI count-up settling on its final digit — very light tick
  - Tomador — quantity stepper pop 0→2 — one light tap
  - Preparador — timer chip color shift — one soft tick
  - Domiciliario — "Copiar" tap — tap sound; "Marcar como entregado" tap — confirm sound
- SFX selection guidance: match motion, not decoration — one clean accent per scene, nothing competing with the Admin scene's claim. Candidates already copied into `assets/sfx/`:
  - `assets/sfx/interface/bong_001.ogg` — soft, warm, low HF risk — EN VIVO badge ping
  - `assets/sfx/interface/click_003.ogg` — low HF risk, button-press character — Tomador stepper tap / Preparador timer tick
  - `assets/sfx/ui/click2.ogg` — low HF risk alternate — pick whichever reads better against the music for the Preparador tick
  - `assets/sfx/impact/impactSoft_medium_001.ogg` — warm, low HF risk, 0.18s transient — Domiciliario "Marcar como entregado" confirm
- SFX analysis guidance: `C:\Users\maosi\.claude\skills\brag\assets\sfx\sfx-analysis.md` — prefer the low-HF-risk picks listed above; these were already chosen from that list.
- Exact SFX choice: the four files above are strong candidates; Hyperframes may swap for a better-matched low-risk file from the same library once the animation timing is implemented.
- Audio files: already copied to `brag-output/composition/assets/music/` and `brag-output/composition/assets/sfx/{interface,ui,impact}/`.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project in each of the four role scenes (Admin/Tomador/Preparador/Domiciliario).
- Keep all text readable in the final render — respect the reading-time floor from `brag-plan.md`.
- Keep the video within 15–25 seconds (target 20s).
- Include the planned music/SFX layer.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose exact SFX files/timestamps after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, pacing, or the product story.
- Use 1–3 strong-cue locks max (see guidance above), marked `// beat-locked`.
- Use SFX to support motion/interaction with restraint — the edit should never feel busy.
- Honor the planned fades (in under hook, out under outro).
- When implementing audio-reactive treatment, follow the `hyperframes-creative` skill's own extraction guidance; if extraction is unavailable, document that and skip audio-reactive rather than blocking the render.
- Use local assets already copied into `composition/assets/`.
- Run `hyperframes check` before render — it is `/brag`'s single gate.
- Keep creation and rendering local. No remote/publishing workflow was requested.
