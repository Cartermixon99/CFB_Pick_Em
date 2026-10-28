---
name: qa-test-engineer
description: Quality assurance and regression testing specialist. Verifies that new and existing features work properly, tests game logic (picks, bankroll, brackets, ballots, leaderboards), inspects state mutations, checks modal triggers, and catches JavaScript errors before code is released.
---

# QA Test Engineer Skill

Use this skill whenever verifying new features, performing regression checks, validating complex calculations (picks, odds, standings, payouts), or debugging unexpected UI behavior.

---

## 🎯 Verification Scope by Feature

### 1. Weekly Picks & Auto-Pick (`js/weekly.js`)
- **Key Generation**: Verify `generateGameKey(awayTeam, homeTeam, date)` produces a consistent key across all modules.
- **Pick Selection**:
  - Clicking Spread or Moneyline updates `userPicks[gameKey]` correctly.
  - Toggling between Spread and Moneyline does not corrupt or overwrite other game picks.
  - Visual selection state updates immediately (`border-purple-600 bg-purple-50` or active styling).
- **Auto-Pick Functionality**:
  - `autoPick('favorites')`, `autoPick('underdogs')`, or `autoPick('random')` populates unselected games accurately.
  - Locked games (games already started/completed) are never overwritten by auto-pick.

### 2. Sportsbook Bets & Bankroll Math (`js/sportsbook.js`)
- **Bankroll Validation**:
  - Starting bankroll defaults correctly ($1,000 baseline).
  - Wagers are deducted correctly from available balance.
  - Over/Under and Spread odds correctly calculate potential payout:
    - Standard -110 juice calculation: `Risk $110 to win $100`.
    - Positive moneyline calculation (+150 on $100 = $150 profit).
- **Push Handling**:
  - Push outcome returns original stake without incrementing win or loss counters.
- **Duplicate Bet Prevention**:
  - Prevent users from placing duplicate bets on the same game line simultaneously.

### 3. CFP 12-Team & NFL Brackets (`js/playoffs.js`)
- **Bracket Progression**:
  - First-round winners (Seeds 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9) advance properly into the Quarterfinals to meet the top 4 bye seeds.
  - Changing an earlier round pick automatically clears or re-evaluates subsequent downstream rounds that depend on that team.
- **National Championship Winner**:
  - Crowned champion matches the final pick and saves to user state.

### 4. Community Top 25 Ballot (`js/top25.js`)
- **Points Weighting**:
  - #1 Rank = 25 points, #25 Rank = 1 point.
  - Adding or removing teams re-indexes the ballot cleanly without undefined slots or NaN points.
- **Ballot Submission**:
  - Saved ballot persists to Firebase/local storage and aggregates into the community consensus rankings.

### 5. Modals & In-Game Boxscores (`js/modals.js`)
- Clicking "Game Summary" (`renderGameSummaryBtn`) opens [`openGameSummary(gameKey)`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/modals.js) without throwing `undefined` errors.
- If live stats are unavailable or game hasn't started, graceful empty state (`renderEmptyState`) is shown instead of a broken spinner.
- Pressing `Escape` or clicking modal backdrop cleanly closes the modal and restores scrolling to `document.body`.

---

## 🧪 Quick Test Execution Plan

When testing any new feature:
1. **Console / Syntax Check**:
   - Check browser console or run quick node check on touched JS modules:
     ```bash
     node -c js/weekly.js js/components.js js/sportsbook.js
     ```
2. **State Mutation Audit**:
   - Inspect global state objects in [`js/state.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/state.js):
     - `currentUser`
     - `cfbPicks` / `nflPicks`
     - `cfbResults` / `nflResults`
3. **Local HTTP Verification**:
   - Ensure `http://localhost:8000` loads with no 404s in network requests (logos, fonts, scripts).
4. **Regression Gate**:
   - Ensure changing one sport (`setSport('NFL')`) does not erase or cross-contaminate college football picks.
