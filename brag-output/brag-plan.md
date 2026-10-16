# Brag Plan: Sandwich System

## What is this app?
A point-of-sale and operations system for a real sandwich-and-granizado shop with two locations — tables, kitchen, delivery and the cash register, all synced live across four different roles.

## The angle
This isn't a toy demo — it's a real family business tool, and the single most impressive thing about it is that the owner never has to be standing in the shop to know how the day is going. The video is a calm, confident 4-role tour, built around that one claim: the owner checks sales from the couch, from the other location, from anywhere — while the other three roles keep the floor running without him.

## Hook (first 2-3 seconds)
Full-screen wordmark "Sandwich System" on the warm ivory background, then the line locks in: **"Your shop, open in your pocket."** No UI yet — just the claim.

## Key moments (the middle)
- **Admin**, shown first and given the most time: a phone mockup of the real dashboard — "Total vendido" ticking up live, an "EN VIVO" pulse badge — while the copy makes the remote-access claim explicit: at home, at the other location, anywhere.
- **Tomador**: the real order screen — large tappable product rows with a quantity stepper, a cart bar totaling live.
- **Preparador**: the real kitchen ticket — a timer chip that changes from green to amber to red the longer an order waits.
- **Domiciliario**: the real delivery card — address with a one-tap copy, a "cobrar efectivo" badge, a full-width "Marcar como entregado" button.

## Outro / punchline
Wordmark returns. Final line: **"Un negocio. Cuatro roles. Un solo sistema."** Then a quiet beat of silence before the logo settles — no CTA, no URL (this is an internal/owner-shared tool, not a public app-store listing).

## User flow worth showing
The relay across roles, not one person's flow: Admin glances at today's numbers from outside the shop → Tomador rings up a table order → Preparador watches the ticket age and clears it → Domiciliario copies the address and marks it delivered. Four screens, one order, one day.

## Tone
- Preset: `app-store`
- Creative direction: an institutional, trustworthy feature tour for a real small-business POS — calm, warm, professional, nothing jokey. Title-case feature-card captions, one role per card.
- Interpretation: medium-weight type, slide/wipe transitions (0.35–0.45s), no aggressive motion. Pacing holds each role long enough to read its one claim; the Admin scene gets the longest hold since it carries the headline claim.

## Format: landscape — 1920x1080
## Duration: 20s

## Visual identity (from the project)
- Background: `#FAF7F2` (warm ivory)
- Accent: `#B5491F` (terracotta)
- Text: `#211F1C` (near-black ink)
- Secondary text: `#6F6A62`
- Role accents used in-screen: success `#2F6E4E`, warn `#9A6B12`, info `#2A5C8C`, domicilio `#6B4FA0`
- Display/caption font: Plus Jakarta Sans, 700–800 weight (the real app's own font — no separate display face, to keep the video feeling like the actual product, not a marketing skin)
- Body/UI font inside the phone mockups: Plus Jakarta Sans, 400–700 weight
- Strongest visual element: the phone mockup of the Admin dashboard with the pulsing "EN VIVO" badge and the live-counting KPI numbers

## Share copy (draft)
Sandwich System: toda tu sanduchería en el bolsillo — mesas, cocina, domicilios y la caja, en vivo, desde donde estés.

## Audio direction
- Role: warm bed, sparse professional accents
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120 BPM, calm/upbeat business mood, matches the "Business Moves" series name to the subject)
- Music treatment: starts at low volume under the hook, settles to a steady bed under the four role scenes, soft fade down under the outro's silent beat
- Music cue guidance: preset read from `happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.md`, tempo 120.19 BPM. Strong cues at 16.02s/17.02s/17.52s/18.52s/20.02s fall inside this video's first ~20s window; align the Preparador→Domiciliario and Domiciliario→Outro scene cuts near 16.0s and 20.0s if it doesn't fight the reading-time floor. Earlier scene cuts (Hook→Admin, Admin→Tomador, Tomador→Preparador) land before the strong-cue window starts, so just keep them on the steady beat grid (~0.5s spacing) rather than forcing a strong cue.
- Audio-reactive treatment: subtle — the phone mockup's drop shadow / ambient glow may breathe slightly with the music's RMS; no waveform or equalizer graphics
- SFX posture: sparse, professional. One soft UI "ping" when the Admin "EN VIVO" badge appears, one light tap sound on the Tomador quantity stepper, one soft click on the Preparador "Marcar listos" button, one confirm sound on the Domiciliario "Marcar como entregado" button
- Audio-coupled moments: the Admin KPI number counting up from 0 to its value; the Tomador quantity number popping from 0→2; the Preparador timer chip's color change; the Domiciliario copy-button tap feedback
- Restraint rule: no beat-mashing, no flashing, no sound on every single element — one clean accent per scene, nothing competing with the spoken claim in the Admin scene

## Storyboard

### Scene 1 — Hook — 2.5s
Full-screen ivory background. Wordmark "Sandwich System" centers, small bread-icon mark above it. Then the line locks under it: "Tu negocio, abierto en tu bolsillo."
Sequential/interaction: none
Audio intent: quiet confidence — music fades in under the wordmark
Audio-coupled idea: none
Music: bed fades in, low
Transition mood: clean slide → Scene 2

### Scene 2 — Admin — 5s
Feature-card layout: left, "Admin" eyebrow + headline "Mira tu negocio sin estar ahí." + supporting line "Desde la casa, la otra sede, o cualquier lugar." Right, the real dashboard in a phone mockup: "Total vendido" KPI counts up live with an "EN VIVO" pulse badge, three smaller KPI cards (Pedidos, Efectivo, Ticket promedio) sit static beside it.
Sequential/interaction: yes — the big KPI number counts up from $0 to $1.240k on entry; the "EN VIVO" badge pulses continuously
Audio intent: this is the claim the whole video is built on — let it breathe, no rush
Audio-coupled idea: soft ping synced to the "EN VIVO" badge's first pulse; count-up has a very light tick under the final digit settling
Music: steady bed, this scene gets the longest hold
Transition mood: soft slide → Scene 3

### Scene 3 — Tomador — 3.5s
Feature-card layout: left, "Tomador" eyebrow + headline "Toma el pedido en segundos." Right, the real order screen: a selected product row ("Sándwich Pollo Teriyaki") with a quantity stepper and a cart bar totaling at the bottom.
Sequential/interaction: yes — quantity pops from 0 to 2 on a single tap-simulated beat; cart bar total updates to match
Audio intent: brisk, capable
Audio-coupled idea: one light tap sound on the stepper tap; number pop synced to it
Music: bed continues
Transition mood: slide → Scene 4

### Scene 4 — Preparador — 3.5s
Feature-card layout: left, "Preparador" eyebrow + headline "La cocina nunca pierde un pedido." Right, the real kitchen ticket card with a timer chip.
Sequential/interaction: yes — timer chip and its "hace N min" label shift color green → amber over the scene, implying the urgency system
Audio intent: a small beat of tension, resolved by the next scene's delivery
Audio-coupled idea: one soft tick exactly as the chip changes color
Music: bed continues, may lean on a strong cue near 16-17s for the color shift if timing allows
Transition mood: slide → Scene 5

### Scene 5 — Domiciliario — 3.5s
Feature-card layout: left, "Domiciliario" eyebrow + headline "Directo a la puerta, sin perder tiempo." Right, the real delivery card: address row with a "Copiar" chip, a "Cobrar efectivo" badge, and a full-width "Marcar como entregado" button.
Sequential/interaction: yes — the "Copiar" chip taps and briefly shows "Copiado ✓"; the delivery button taps near the end of the scene
Audio intent: satisfying close to the relay
Audio-coupled idea: tap sound on "Copiar", confirm sound on "Marcar como entregado"
Music: bed, may land near the 20.02s strong cue for the delivery button tap
Transition mood: clean slide → Scene 6

### Scene 6 — Outro — 2s
Ivory background returns. Wordmark again, small. Line: "Un negocio. Cuatro roles. Un solo sistema." Then a half-second of near-silence before the final hold.
Sequential/interaction: none
Audio intent: confident, quiet landing — no new elements, let the claim sit
Audio-coupled idea: none
Music: fades down under the final hold
Transition mood: soft fade → end

**Music mood for this video:** upbeat but restrained — a steady, professional "business moves" bed, never loud enough to compete with the Admin scene's claim.
**Audio summary:** The track fades in under the hook, holds a calm steady bed through all four role scenes with one light, well-placed SFX accent per scene, and fades down under the outro's silent beat.
