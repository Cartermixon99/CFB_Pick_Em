---
name: mobile-responsive-auditor
description: Mobile UX and responsive design specialist. Audits the website on 375px–430px smartphone viewports, checks touch target sizes (min 44px), verifies safe-area padding, prevents horizontal scrolling on tables and brackets, and ensures all components load smoothly on mobile devices.
---

# Mobile Responsive Auditor Skill

Use this skill whenever building or editing UI components to verify mobile layout integrity, touch responsiveness, and mobile-friendly usability.

---

## 📱 Mobile-First Requirements

Smartphones (iPhone 13–16 Pro, Samsung Galaxy, Pixel) represent the primary viewports for pick'em players on game days. Every page must function flawlessly at **375px–430px viewport width**.

### 1. Viewport & Touch Target Constraints
- **Minimum Tap Target**: Every interactive button, pill, checkbox, and pick card must have a clickable area of at least **44 × 44px** (or minimum `py-2.5 px-3` with sufficient surrounding margin).
- **No Accidental Double-Tap Zoom**: Ensure buttons have `-webkit-tap-highlight-color: transparent;` and touch-friendly paddings.
- **Font Sizes on Mobile**:
  - Never use smaller than `text-xs` (12px) for legible body text.
  - Form inputs must have at least `text-base` (16px) or explicit viewport zooming prevention so iOS Safari doesn't auto-zoom on input focus.
- **Safe Area Insets**:
  - Bottom navigation and sticky trays must honor `padding-bottom: env(safe-area-inset-bottom, 1rem);`.

---

## 📐 High-Risk Mobile Component Checklist

### A. Weekly Pick Cards (`js/weekly.js`)
- On mobile (`< 640px`):
  - Team vs Team should stack or fit cleanly side-by-side without truncating team names to fewer than 6 characters.
  - Spread and Moneyline selection buttons must be clearly separated so thumbs don't misclick the wrong team.
  - Live score pills and game status badges (`renderScorePill`, `renderGameStatusBadge`) must stay aligned without wrapping awkwardly onto multiple broken lines.

### B. 12-Team College Football Playoff & NFL Brackets (`js/playoffs.js`)
- **Horizontal Scroll Handling**:
  - Playoff brackets are naturally wide. On mobile, wrap bracket rounds in a smooth horizontal overflow container:
    ```html
    <div class="overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 scroll-smooth">
        <!-- Bracket columns -->
    </div>
    ```
  - Never allow an unwrapped bracket to stretch the entire `<body>` width or cause unintended global page side-scrolling.

### C. Sportsbook Bet Slip & Weekly Highlights (`js/sportsbook.js` & `js/leaderboard.js`)
- Mobile bet slips must either sit at the bottom as a collapsible floating drawer or fit into the flow with high-contrast submit buttons.
- Variance tables and dual leaderboards must use `overflow-x-auto` or card-view transformations on screens smaller than 640px.

### D. Modals & Popups (`js/modals.js`)
- On mobile devices, modals (Game Summary Boxscore, Matchup Compare, Insights) should expand to full-screen or slide up as a bottom sheet with `max-h-[90vh] overflow-y-auto`.
- The close button (`X`) must be anchored at the top right with at least a 44×44px tap zone (`p-2.5`).

---

## 🛠️ Step-by-Step Mobile Audit Routine

When auditing a feature or screen:
1. **Inspect CSS Media Queries**:
   - Verify `@media (max-width: 640px)` in [`css/styles.css`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/css/styles.css) covers margins, paddings, and header sizes.
2. **Check for Unwanted Horizontal Overflow**:
   - Check if any element has a hardcoded fixed pixel width (`w-[600px]`, `min-w-[700px]`) that lacks an `overflow-x-auto` wrapper.
3. **Verify DOM Sizing**:
   - Ensure `w-full max-w-7xl mx-auto` or `px-3 sm:px-6` is used on root containers.
4. **Test in Antigravity Built-In Browser**:
   - Check the local preview (`http://localhost:8000`) by resizing the panel to a phone-sized width to visually confirm alignment and spacing.
