# Design System Strategy: The Sovereign Lens

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sovereign Lens."** 

In the world of market intelligence, clarity is power, but raw data is noise. This system rejects the cluttered "dashboard-itis" of legacy platforms in favor of an authoritative, high-density editorial experience. We combine the brutalist efficiency of a Bloomberg Terminal with the fluid, breathing room of a modern data-journalism piece. 

The aesthetic moves beyond a "template" look by utilizing **intentional asymmetry** and **tonal depth**. We don't use lines to separate ideas; we use space and shifts in light. The layout feels less like a website and more like a high-performance instrument—stable, dense, and unapologetically professional.

---

## 2. Color Philosophy & Surface Architecture
This system utilizes a sophisticated palette to manage high-density information without visual fatigue.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. 
*   **Implementation:** Use a `surface-container-low` section sitting on a `surface` background to define a workspace.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use "Tonal Layering" to signify importance:
*   **Base Layer:** `surface` (#0c1322) — The vast, quiet background.
*   **Work Containers:** `surface-container-low` (#141b2b) — Primary content areas.
*   **Interactive Cards:** `surface-container-highest` (#2e3545) — Elements that demand immediate focus or action.

### The "Glass & Gradient" Rule
To elevate the system from "flat" to "premium," floating elements (like the sticky filter bar or dropdowns) must utilize **Glassmorphism**.
*   **Token:** `surface-container-high` at 80% opacity + 20px Backdrop Blur.
*   **Signature Texture:** Use a subtle linear gradient on primary CTAs, transitioning from `primary` (#b4c5ff) to `primary-container` (#1a52c7) at a 135-degree angle. This adds a "lithic" weight to buttons that flat colors lack.

---

## 3. Typography: The Editorial Edge
Our typography is designed to balance aggressive headlines with clinical data precision.

| Category | Token | Font Family | Weight | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Space Grotesk | Bold | High-impact market shifts. |
| **Headline** | `headline-md` | Space Grotesk | Medium | Section headers (Bloomberg-style). |
| **Data/Numeric**| N/A | JetBrains Mono | Medium | All pricing, tickers, and percentages. |
| **Body** | `body-md` | Inter | Regular | Analysis, tooltips, and descriptions. |
| **Label** | `label-sm` | Inter | SemiBold | Micro-metadata and table headers. |

**Scale & Rhythm:** Use `headline-sm` (1.5rem) for card titles to create a commanding presence. Numeric data in `JetBrains Mono` must always be tabular-lining to ensure columns of numbers align perfectly for rapid scanning.

---

## 4. Elevation & Depth: Tonal Stacking
Traditional drop shadows are largely discarded in favor of **Ambient Light**.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. An inner card should be `surface-container-lowest` placed upon a `surface-container-low` parent.
*   **Ambient Shadows:** For floating modals, use an extra-diffused shadow: `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow color should be a tinted version of `on-background` to feel like a natural occlusion of light.
*   **The Ghost Border:** If a boundary is required for accessibility, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a line rather than a hard barrier.

---

## 5. Components
Each component must feel like a custom-machined part of a larger machine.

### Data Tables (The Core)
*   **Style:** No horizontal or vertical grid lines. 
*   **Separation:** Use `surface-container-low` for the header and `surface` for the body. On hover, a row shifts to `surface-container-high`.
*   **Density:** Tight vertical padding (8px) to maximize data per screen.

### High-Density Cards
*   **Radius:** Always `0.75rem` (12px).
*   **Construction:** No borders. Use a `surface-container-low` fill.
*   **Header:** Card titles should be paired with a `primary` color accent (a 2px vertical "intent" bar on the far left) to signal status.

### Circular Urgency Gauges
*   **Visuals:** Thick stroke widths. Use `primary` for standard activity and `error` (#ffb4ab) for high-volatility alerts. 
*   **Detail:** Center the metric in `JetBrains Mono` for maximum legibility.

### Filter Bar (The Control Deck)
*   **Dimensions:** 56px height, sticky top.
*   **Style:** Glassmorphic (`surface-container-low` at 70% opacity). This allows data to "scroll under" the controls, maintaining a sense of depth.

### Navigation Sidebar
*   **Dimensions:** 240px fixed.
*   **Style:** `surface-container-lowest` (#070e1d). This darker tone "anchors" the screen, making the content area feel like the illuminated focal point.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `JetBrains Mono` for every single numerical value. It signals "Financial Intelligence."
*   **Do** use negative space as a separator. If you feel the urge to draw a line, add 16px of padding instead.
*   **Do** favor asymmetric layouts. A large 8-column chart paired with a 4-column insight list feels more "editorial" than two 6-column boxes.

### Don’t
*   **Don’t** use standard "drop shadows" on cards. Rely on color shifts.
*   **Don’t** use pure black (#000000). Use `surface` (#0c1322) to maintain the "ink-wash" premium feel.
*   **Don’t** use rounded buttons for primary actions. Use a subtle 4px (`sm`) radius to maintain a "serious" and "rectilinear" professional tone.