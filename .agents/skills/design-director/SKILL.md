---
name: design-director
description: Expert graphic design and UI/UX specialist for this sports pick'em & sportsbook web app. Use whenever designing or reviewing visual styles, typography, font sizes, color palettes, dark/light contrast, sports team branding, card layouts, badge pills, or micro-interactions.
---

# Design Director Skill

Use this skill whenever the user asks for design feedback, font or color recommendations, visual polish, layout elevation, or aesthetic enhancements.

---

## 🎨 Visual Philosophy & Design System

This application is a **premium, modern sports pick'em & betting hub**. The visual design must feel sleek, bold, and energetic—similar to ESPN Bet, DraftKings, and Sleeper—while remaining ultra-clean and legible.

### 1. Color Palette Tokens (`css/styles.css`)
Always use the standardized CSS variables and Tailwind slate scales:
- **Primary Brand**: `#7C3AED` (`--brand-purple` / `purple-600`), hover: `#6D28D9` (`purple-700`).
- **Accent Win**: `#4DFFBC` (vibrant mint neon) with dark text `#059669` or `#064E3B`.
- **Accent Loss**: `#FF4D4D` (punchy crimson neon) with dark text `#DC2626` or `#7F1D1D`.
- **Push / Neutral**: `#94A3B8` (slate-400) or `#64748B` (slate-500).
- **Backgrounds**:
  - Light mode: Slate-50 (`#F8FAFC`) background with clean white cards (`#FFFFFF`).
  - Dark mode: Slate-900 / Slate-950 background with Slate-800 / Slate-800/90 cards and subtle borders (`border-slate-700/60`).

### 2. Typography & Hierarchy Guidelines
- **Header & Section Titles**: `font-black tracking-tight` (uppercase with `tracking-wider` for subheadings like "WEEK 9 MATCHUPS" or "CFP 12-TEAM BRACKET").
- **Team Names**: `font-extrabold text-sm md:text-base text-slate-900 dark:text-white truncate`.
- **Ranks & Records**:
  - Rank: `text-xs font-black text-purple-600 mr-1` (`#1`, `#4`).
  - Record: `text-[11px] font-semibold text-slate-500 leading-none mt-0.5` (`(8-0, 5-0 SEC)`).
- **Odds & Spreads**: Monospace-like numerical boldness `font-mono font-bold text-xs`.
- **Button Micro-copy**: `font-bold text-xs uppercase tracking-wider`.

---

## 🏷️ Reusable Component Standards (`js/components.js`)

Never invent ad-hoc HTML for standard elements. Always reuse or extend the helpers in [`js/components.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/components.js):

| Element | Helper Function | Visual Standard |
| :--- | :--- | :--- |
| **Team Logo** | `renderTeamLogo(team, sizeClass)` | ESPN CDN image with `.logo-shadow` pop filter or contrast circle fallback |
| **Team Badge** | `renderTeamBadge(team, options)` | Logo + Rank + Team Name + Record in aligned flex container |
| **Win/Loss Result** | `renderResultBadge(result)` | Pill badge with mint (`bg-emerald-500/10 text-emerald-600`) or red styling |
| **Odds / Spread Pill**| `renderOddsPill(odds, type)` | Subtle slate pill with bold text (`bg-slate-100 text-slate-700`) |
| **Card Result Stripe**| `.stripe-win`, `.stripe-loss`, `.stripe-push` | 8px thick left border with glowing ambient drop-shadow |
| **Game Summary / Info**| `renderGameInfoBtn()`, `renderGameSummaryBtn()` | Compact slate button with subtle hover animation and Lucide icon |

---

## 🔍 Design Review Checklist

When auditing or refining any UI screen:
1. **Logo Contrast**: Does the logo pop against both white cards and dark backgrounds? (Ensure `.logo-shadow` is applied).
2. **Dynamic Team Colors**: If rendering dynamic banners or headers, are we using `cfbColors[team]` from [`js/state.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/state.js) with contrast-guaranteed text?
3. **Card Padding & Rhythm**:
   - Outer card padding: `p-4 sm:p-5`.
   - Card radius: `rounded-2xl` for main cards, `rounded-xl` for inner interactive elements.
   - Gap spacing: `gap-3` on mobile, `gap-4` or `gap-5` on desktop.
4. **Visual Feedback States**:
   - Every clickable card/button must have active/focus states: `transition-all duration-150 active:scale-[0.98]`.
   - Focus ring: `outline-2 outline-purple-600 outline-offset-2`.
5. **No Visual Clutter**: Remove redundant borders. Prefer soft background contrasts (`bg-slate-50` vs `bg-white`) over multiple stacked 1px solid borders.
