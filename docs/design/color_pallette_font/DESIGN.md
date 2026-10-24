---
name: Monochrome Academic Practicum
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2e1'
  on-secondary-container: '#656464'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
  background-canvas: '#F7F7F7'
  surface-card: '#FFFFFF'
  surface-muted: '#EEEEEE'
  border-subtle: '#D2D2D2'
  text-primary: '#171717'
  text-secondary: '#555555'
  action-primary: '#171717'
  action-secondary: '#FFFFFF'
  disabled-surface: '#E5E5E5'
  disabled-text: '#555555'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for academic rigor, operational discipline, and distraction-free utility. Built specifically for computer science and engineering laboratory environments, the UI acts as high-precision software: uncompromising, functional, and immediate. It deliberately rejects decorative flourishes, playful micro-interactions, gradients, and colorful status codings in favor of extreme clarity and high visual contrast.

The aesthetic fuses **Swiss Modernism (International Typographic Style)** with **Radical Minimalist Utility**. Hierarchy is communicated strictly through typographic scale, weight balance, structural lines, and grayscale value steps. By stripping color-coded affordances (such as green for success or red for alerts), status and critical states rely entirely on explicit semantic text paired with pure geometric outline indicators. The resulting interface feels authoritative, focused, and immune to ambient laboratory glare or rapid task switching during lab sessions.

## Colors

The color palette is strictly non-chromatic, employing an intentional value-contrast system rather than hue-based semantic signaling.

- **Primary (`#171717`)**: The dominant anchor across the system. Used for top-tier headings, high-priority interactive button fills, and primary data readouts.
- **Neutral (`#555555`)**: The core medium-contrast value. Applied to secondary body text, operational metadata (timestamps, room numbers, class groups), and helper text.
- **Canvas & Surface Architecture**:
  - `#F7F7F7` defines the outermost viewport substrate, providing subtle contrast against foreground elements.
  - `#FFFFFF` delivers crisp containment for task cards, dialogs, sheets, and active form controls.
  - `#EEEEEE` serves as a resting or low-emphasis ground for neutral chips, inactive segments, and grouped container heads.
- **Borders & Rules (`#D2D2D2`)**: Structural 1px hairline dividers and container outlines that separate components without heavy visual mass.

Status communication must never rely on chroma. Success, warnings, and pending states are articulated via explicit text copy (`Selesai`, `Berlangsung`, `Belum dibuka`) alongside geometric stroke symbols.

## Typography

The typographic engine uses **Inter** (representing native system sans-serif on Android and iOS). Type acts as the primary vehicle for hierarchy and visual navigation in the absence of color accents.

- **Tabular Numerals**: Formats handling timestamps, countdowns, student IDs (NIM), and session codes must enable `font-variant-numeric: tabular-nums` to maintain vertical grid alignment.
- **Scale Rules**: No critical academic data, form field, button, or status indicator may fall below `14px` (`body-md` / `label-lg`). The `12px` scale is reserved strictly for secondary auxiliary footnotes and timestamp metadata.
- **Weight Application**: Strict dual-weight implementation using Regular (400) for narrative and continuous data, and Semibold (600) for structural signposts, card headers, and button labels.

## Layout & Spacing

The layout is built for portrait-only mobile screens (targeting 360pt, 390pt, and 430pt viewports) using a single-column, fluid vertical stack.

- **Base Grid**: Spacing relies on a strict 4pt / 0.25rem rhythmic base (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- **Margins & Gutters**: Outer canvas margins remain locked at `1rem` (16px) across mobile views, maintaining uniform gutters between multi-column meta blocks.
- **Touch Ergonomics**: All interactive targets adhere to a minimum envelope of 48×48dp on Android and 44×44pt on iOS. Grouped buttons or selectable rows preserve a minimum gap of `0.5rem` (8px).
- **Flexbox Flow**: Elements expand horizontally across the safe viewport area. Horizontal scrolling is strictly banned except for deliberate tab strips or raw log tables.

## Elevation & Depth

This design system uses a strictly flat, non-skeuomorphic depth model. Dropshadows, colored glows, and blurred glassmorphism surfaces are prohibited.

Depth and spatial layering are established solely through value contrast and structural 1px boundaries:
- **Base Layer (Canvas)**: `#F7F7F7` creates the foundation for standard views.
- **Middle Layer (Containers)**: Cards, text fields, and action sheets rest on `#FFFFFF`, framed with a crisp `1px solid #D2D2D2` border.
- **Inset Layer (Sub-containers)**: Metadata wells, code output blocks, and disabled rows use `#EEEEEE` without borders to indicate recessed or passive context.
- **Overlays (Modals & Bottom Sheets)**: Confirmation dialogs and action sheets use `#FFFFFF` with a 1px border. They are elevated over an opaque scrim (`#171717` at 40% opacity), bringing immediate focus to critical interactions without decorative blur filters.

## Shapes

The shape system employs deliberate geometric restraint to communicate academic and operational precision.

- **Standard Containers (`12px` / `0.75rem`)**: Applied to all primary surface cards, modal dialogs, and detail sheet envelopes.
- **Controls & Metadata (`8px` / `0.5rem`)**: Applied to form inputs, buttons, and status badges, maintaining a tighter, tool-like profile.
- **Dividers & Outlines**: Hairline stroke width is fixed at `1px` across all containers and buttons, preventing visual heaviness while preserving clean boundary separation.

## Components

### Buttons
- **Primary Action**: Solid `#171717` fill, crisp white text (`#FFFFFF`), `8px` corner radius. Minimum touch height of 48px. Used for core tasks such as submitting lab attendance, confirming check-ins, or finalizing grades.
- **Secondary Action**: Background `#FFFFFF`, text `#171717`, encased in a `1px solid #D2D2D2` outline. Hover/press transitions into `#EEEEEE`.
- **Disabled State**: Background `#E5E5E5`, text `#555555`. No pointer events; must be accompanied by explicit helper text when an action is blocked.

### Status Badges (Monochrome Semantic Chips)
Status badges must never rely on color cues. They combine `8px` corner radiuses, `#EEEEEE` background fills, and `#171717` typography with geometric outline iconography:
- *Belum dibuka (Pending)*: Outline clock icon (`16px`) + text `Belum dibuka`.
- *Berlangsung (In Progress)*: Bold outline circle (`16px`) + text `Berlangsung`.
- *Selesai (Completed)*: Outline checkmark (`16px`) + text `Selesai`.
- *Dibatalkan / Terlambat (Overdue / Late)*: Outline square/slash (`16px`) + explicit contextual text label.

### Form Inputs & Text Fields
- Container: Surface `#FFFFFF`, border `1px solid #D2D2D2`, radius `8px`.
- Typography: `#171717` input text, `#555555` placeholder copy.
- Active/Focused: Border darkens to `#171717` with no glow or shadow.

### Cards
- Container: `#FFFFFF` fill with `1px solid #D2D2D2` border, `12px` radius, padded at `16px` (`space-lg`).
- Structure: Header row holds bold lab module title (`headline-md`) alongside status chip. Body row contains tabular metadata (Room, Assistant, Time slot) formatted in `#555555`.

### List Rows & Dividers
- Full-width tap targets with thin `1px solid #D2D2D2` bottom borders.
- Entire row area is clickable for identity selection, attendance marking, or session drill-downs.

### Modal Dialogs
- Floating `#FFFFFF` panels with `12px` corner radius, `24px` internal padding, and `1px solid #D2D2D2` border.
- Positioned directly over a 40% `#171717` scrim. Dialog CTAs are stacked vertically: primary solid button on top, secondary outline button underneath.