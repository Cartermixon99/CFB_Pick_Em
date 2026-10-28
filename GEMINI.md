# Project Instructions & Workspace Guidelines

## Trigger Shortcut: "web"

Whenever the user says **"web"** (or asks to open/preview the web page):
1. Check if the preview server is already running on port 8000 (`lsof -i :8000`). If not, start it as a daemon process: `python3 -m http.server 8000`.
2. Do **NOT** run the shell command `open http://localhost:8000` (which causes macOS to launch Google Chrome externally).
3. Provide the clickable link `http://localhost:8000` in the chat response so the user can open and preview it directly in the Antigravity built-in side-panel browser.

---

## Previewing `index.html` and Web Applications

When the user wants to preview or display `index.html` (or test web pages in this project) as a website:

1. **Run a Local Web Server**:
   - Start a lightweight local server if one is not already running (for example: `python3 -m http.server 8000` running in the background with `IsDaemon: true`).
2. **Provide a Clickable Link**:
   - Include the explicit `http://` link in the response (e.g., [http://localhost:8000](http://localhost:8000) or [http://localhost:8000/index.html](http://localhost:8000/index.html)).
   - Clicking this web link in the agent response automatically opens the preview inside the Built-in Browser in Antigravity's side panel.

---

## Built-In Browser Guidelines

- **Opening Pages**:
  - **In Built-in Side Panel**: Click any web link in an agent response.
  - **In External Browser**: Hold `Cmd` (macOS) or `Ctrl` (Windows/Linux) while clicking the link, or click **Open in external browser** from the toolbar.
  - **New Tab**: Press `Cmd+T` (macOS) or `Ctrl+T` (Windows/Linux), or click `+` in the side panel and choose **Browser**.
- **Address Bar**:
  - For local servers without HTTPS, always include `http://` (e.g., `http://localhost:8000`).
- **Toolbar & Navigation**:
  - Use Back, Forward, and Reload in the toolbar.
  - Right-click any link to open in a new tab or an external browser.
- **Cookies & Authentication**:
  - The built-in browser keeps separate cookies and sign-ins from external browser profiles.
- **User Feedback & Quoting**:
  - Select text on a page and click **Comment** (`C`) to leave feedback, or **Quote** (`Cmd+L` on macOS / `Ctrl+L` on Windows/Linux) to insert the text directly into the chat. The agent receives both the page URL and the selected snippet.
- **Autonomous Agent Browsing**:
  - Use or recommend the `/browser` command when the agent needs to browse, click, and test web pages autonomously using the browser subagent in Google Chrome.

---

## Modular Codebase Map & Fast Editing Rules

The project has been modularized from a 6,292-line monolith into dedicated files. **Always edit the specific module directly instead of searching or modifying `index.html` unless adding a new `<script>` tag or top-level container.**

### Architecture Map

| File | Primary Responsibility | Key Functions / State |
| :--- | :--- | :--- |
| [`index.html`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/index.html) | Root HTML skeleton & module scripts | Container DOM IDs, modals, script imports |
| [`css/styles.css`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/css/styles.css) | Custom styles, animations, responsive layout | `:root`, `.stripe-win`, `.stripe-loss`, `.logo-shadow` |
| [`js/firebase-config.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/firebase-config.js) | Firebase initialization & Lucide helper | `firebaseConfig`, `db`, `renderIcons()` |
| [`js/state.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/state.js) | Global state, team dictionaries & colors | `currentSport`, `currentUser`, `cfbPicks`, `rawCfbColors`, `cfbColors` |
| [`js/utils.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/utils.js) | Sport getters, helpers, password hashing & auth | `getActivePicks()`, `generateGameKey()`, `hashPassword()`, `setSport()` |
| [`js/components.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/components.js) | Reusable UI rendering helpers | `renderTeamLogo()`, `renderTeamBadge()`, `renderOddsPill()`, `renderResultBadge()`, `renderGameInfoBtn()`, `renderGameSummaryBtn()`, `renderScorePill()`, `renderGameStatusBadge()`, `renderMatchupPredictorBar()`, `renderEmptyState()`, `renderProgressBar()` |
| [`js/api.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/api.js) | ESPN Scoreboard APIs, AP rankings & FPI | `fetchLiveResults()`, `fetchApRankings()`, `switchTab()` |
| [`js/season.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/season.js) | Season predictions & conference picks | `renderSchedule()`, `renderTeamBanner()`, `loadTeams()` |
| [`js/playoffs.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/playoffs.js) | CFP 12-team & NFL playoff brackets | `renderCfpBracket()`, `renderNflBracket()`, `playoffPick()` |
| [`js/top25.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/top25.js) | Top 25 Community Ballot & drag-and-drop | `renderTop25()`, `addTop25Team()`, `saveTop25()` |
| [`js/weekly.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/weekly.js) | Weekly matchups, spread/moneyline picks | `renderWeeklySchedule()`, `makeWeeklyPick()`, `autoPick()` |
| [`js/sportsbook.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/sportsbook.js) | Bonus bets, bankroll, over/under tracking | `renderBonusSchedule()`, `calculateBankroll()`, `submitBonusBets()` |
| [`js/modals.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/modals.js) | ESPN in-game boxscore, insights & compare | `openGameSummary()`, `generateInsights()`, `openCompareModal()` |
| [`js/leaderboard.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/leaderboard.js) | Dual leaderboards & weekly highlights | `renderLeaderboard()`, `renderHighlights()`, `setLeaderboardMode()` |
| [`js/visualizations.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/visualizations.js) | Chart.js variance charts & accuracy metrics | `calculateAccuracy()`, `renderVarianceTable()` |
| [`js/app.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/app.js) | Main initialization & Firebase live sync | `window.onload`, `login()`, `startFirebaseListeners()` |

### Quick UI Rendering Rules
- Whenever rendering a team logo, call `renderTeamLogo(teamName, sizeClass)` from `js/components.js`.
- Whenever rendering a win/loss/push badge, call `renderResultBadge(result)`.
- Whenever adding Game Info (Insights) or Game Summary (Boxscore) buttons, call `renderGameInfoBtn(gameKey, isFutureWeek)` or `renderGameSummaryBtn(gameKey)`.
- Whenever displaying live game scores, call `renderScorePill(score)`.
- Whenever displaying an empty container or no results, call `renderEmptyState(title, subtitle, icon)`.
- Never duplicate 40-line card HTML blocks across files; extract and reuse components in `js/components.js`.

---

## Deployment & Firebase Skill

Whenever deploying to Firebase or publishing changes:
- Refer to the dedicated skill: [`.agents/skills/firebase-deploy/SKILL.md`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/.agents/skills/firebase-deploy/SKILL.md).
- Run pre-deploy validation: `./.agents/skills/firebase-deploy/scripts/pre_deploy_check.sh` (or `node -c js/*.js`).
- Deploy hosting updates: `firebase deploy --only hosting`.
- Deploy database rules: `firebase deploy --only database`.
- Live production link: [https://cfb-pick--em-d47c6.web.app](https://cfb-pick--em-d47c6.web.app).

