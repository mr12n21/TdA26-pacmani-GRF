# TdA 26 — Brand Manual

## Palette
- Blue: #0070BB — primary accent (buttons, links, highlights)
- Blue Dark: #0257A5 — hover/active states
- Blue Mid: #2592B8 — secondary accent
- Teal: #49B3B4 — secondary color
- Green: #91F5AD — success, accents
- Green Light: #6DD4B1 — subtle highlights, text-secondary
- White: #FFFFFF — primary text on dark
- Black: #1A1A1A — app background

## Typography
- Family: Dosis (400, 500, 600, 700)
- Headings: 700-800; tight line-height
- Body: 400-500; use Green Light for secondary text, Teal for muted

## Spacing
- Scale: xs 4px, sm 8px, md 16px, lg 24px, xl 32px, 2xl 48px, 3xl 64px
- Component gaps: default `gap: var(--space-md)` for groups
- Page sections: `padding: var(--space-2xl)`

## Components
- Buttons:
  - Primary: solid `--brand-blue`, white text. NO gradients.
  - Secondary: solid `--brand-teal`, white text. NO gradients.
  - Outline: transparent background, green border, text `--brand-green`
  - Disabled: opacity 0.5, no shadow
  - No emojis; use plain labels (e.g., "Upravit", "Smazat")
- Cards:
  - Background: `--brand-black`, rounded 8-16px, border `--brand-blue-dark`
  - Headings: white, descriptions: `--brand-green-light`
  - Card image headers: solid `--brand-blue` (no gradient)
- Tabs:
  - No emojis; active tab underline `--brand-blue`

## Usage Guidelines
- Dark-first: black (#1A1A1A) background everywhere
- NO gradients on buttons or interactive elements
- Background accents (hero sections) may use subtle radial glows, kept minimal
- Contrast: ensure AA contrast for text vs background
- Links: use `--brand-blue`; hover `--brand-blue-dark`
- Status colors: green for success, teal for info, red for danger
- Icons/Emojis: avoid emojis in UI; use text or SVGs if needed

## Examples
- CTA group:
  - "Prohledat kurzy" (primary), "Zjistit vice" (outline)
- Tabs: "Materialy", "Kvizy", "Novinky"

This manual is reflected in `apps/web/src/assets/styles.css` and should guide any future UI changes.