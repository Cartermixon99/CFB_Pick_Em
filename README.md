# 🏆 Carter's Pick 'Em (CFB & NFL)

[![Firebase Hosting](https://img.shields.io/badge/Hosted_With-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://cfb-pick--em-d47c6.web.app)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Chart.js](https://img.shields.io/badge/Visualizations-Chart.js-FF6384?style=flat-square&logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![Live Production App](https://img.shields.io/badge/Live_App-cfb--pick----em--d47c6.web.app-4DFFBC?style=flat-square)](https://cfb-pick--em-d47c6.web.app)

A modern, real-time sports prediction, odds analysis, and community competition web application for **College Football (CFB)** and the **National Football League (NFL)**. Powered by vanilla JavaScript ES6+ modules, ESPN Scoreboard APIs, Tailwind CSS, Chart.js visualizations, and Google Firebase Realtime Database.

🌐 **Live Application:** [https://cfb-pick--em-d47c6.web.app](https://cfb-pick--em-d47c6.web.app)

---

## 📑 Table of Contents

- [🌟 Features & Capabilities](#-features--capabilities)
  - [🏈 Weekly Matchup Board & Auto-Pick](#-weekly-matchup-board--auto-pick)
  - [💰 Sportsbook Win Totals](#-sportsbook-win-totals)
  - [📊 Live Boxscores & Matchup Insights](#-live-boxscores--matchup-insights)
  - [🗳️ Community Top 25 Ballot](#️-community-top-25-ballot)
  - [🏅 Postseason Playoff Brackets](#-postseason-playoff-brackets)
  - [📈 Dual Leaderboards, Highlights & Audits](#-dual-leaderboards-highlights--audits)
- [🏗️ Architecture & Modular Codebase](#️-architecture--modular-codebase)
  - [Directory Tree](#directory-tree)
  - [Module Responsibility Matrix](#module-responsibility-matrix)
- [🎨 UI/UX & Responsive Design System](#-uiux--responsive-design-system)
- [🔒 Security & Authentication](#-security--authentication)
- [🛠️ Getting Started Locally](#️-getting-started-locally)
- [☁️ Pre-Deployment Verification & Publishing](#️-pre-deployment-verification--publishing)
- [🤖 Agentic Skills & Autonomous Tooling](#-agentic-skills--autonomous-tooling)
- [⚖️ Disclaimer](#️-disclaimer)

---

## 🌟 Features & Capabilities

### 🏈 Weekly Matchup Board & Auto-Pick
* **Power 4 CFB & Full NFL Slates:** Dynamic filtering across Power 4 conferences, AP Top 25 ranked matchups, or entire league schedules.
* **Smart Pick Mechanics:** Choose straight-up moneyline winners or point spreads with real-time odds indicators.
* **Auto-Pick Assistant:** One-click automated pick generator that leverages ESPN Football Power Index (FPI) and AP ranking differential to fill unselected picks before lock time.
* **Kickoff Lock Protection:** Picks lock automatically at scheduled game start times with clear countdowns and live status indicators.

### 💰 Sportsbook Win Totals
* **Sportsbook Benchmark Comparisons:** Preseason and in-season over/under regular season win total tracking with live book lines.
* **Bonus Bet Wagering:** Virtual bankroll allocation allowing users to place units on high-confidence regular season win totals and conference champions.
* **Automated Bankroll & ROI Calculations:** Real-time grading that calculates net units won, current exposure, and projected payouts as games settle.

### 📊 Live Boxscores & Matchup Insights
* **Live In-Game Boxscores (`openGameSummary`):** Modal displaying live score progression, quarter-by-quarter scoring lines, team stats (first downs, passing/rushing yards, turnovers), and game clock.
* **Matchup Insights (`generateInsights`):** Deep analytical previews featuring ESPN FPI win probability meters, strength of record (SOR), AP rankings, and season records.
* **Head-to-Head Comparison (`openCompareModal`):** Side-by-side team comparison tool analyzing offensive and defensive metrics, scoring trends, and recent schedules.

### 🗳️ Community Top 25 Ballot
* **Weekly Community Polling:** Interactive drag-and-drop ballot interface allowing users to submit their personal Top 25 rankings each week.
* **Automated Voting Windows:** Sunday morning voting opens with scheduled weekly lockouts matching official AP poll releases.
* **Consensus Poll Aggregation:** Calculates collective community rankings with voting share, average rank, and rank change metrics.

### 🏅 Postseason Playoff Brackets
* **12-Team College Football Playoff Simulator:** Automatically seeds conference champions (by order of ranking) into first-round byes (#1–#4), pairs at-large contenders (#5–#12) for campus-site games, and allows interactive advancement through the National Championship.
* **NFL Playoff Bracket:** Full AFC/NFC bracket with Wild Card, Divisional, Conference Championships, and Super Bowl pick paths.

### 📈 Dual Leaderboards, Highlights & Audits
* **Dual Leaderboard Modes:** Toggle between **Weekly Standings** (identifying week-by-week victors) and **Overall Cumulative Standings**.
* **Ball Knowers & Busts:** Algorithmic weekly highlight cards showcasing the top sharp picks ("Ball Knowers") and the week's biggest upsets ("Busts").
* **Transparent Audit Log ("Browse Finalized Picks"):** Public community ledger where any user can review past settled picks and historical performance across all competitors.
* **Chart.js Visualizations:** Accuracy distributions by conference and team, alongside scatter/variance plots comparing predicted wins against actual ESPN results.

---

## 🏗️ Architecture & Modular Codebase

The platform was refactored from a monolithic 6,292-line file into a clean, modular ES6+ architecture. Global state, DOM manipulation, external data ingestion, and component rendering are cleanly separated into dedicated modules.

### Directory Tree

```text
CFB_Pick_Em/
├── index.html                                    # Application root & HTML skeleton
├── 404.html                                      # Custom 404 fallback page
├── GEMINI.md                                     # AI workspace rules & developer guidelines
├── firebase.json                                 # Firebase Hosting & deployment configuration
├── database.rules.json                           # Firebase Realtime Database security rules
├── .firebaserc                                   # Firebase target project mapping
├── css/
│   └── styles.css                                # Tailwind additions, animations & custom styles
├── js/
│   ├── firebase-config.js                        # Firebase SDK initialization & Lucide helper
│   ├── state.js                                  # Global state, team dictionaries, colors & logos
│   ├── utils.js                                  # Sport wrappers, date helpers & crypto auth
│   ├── components.js                             # DRY UI components (badges, logos, pills, bars)
│   ├── api.js                                    # ESPN Scoreboard API pipelines & rankings
│   ├── season.js                                 # Preseason predictions & conference champions
│   ├── playoffs.js                               # 12-team CFP & NFL playoff bracket simulators
│   ├── top25.js                                  # Community Top 25 ballot & drag-and-drop poll
│   ├── weekly.js                                 # Weekly matchup pick board & game cards
│   ├── sportsbook.js                             # Bonus bets, bankroll & FanDuel win totals
│   ├── modals.js                                 # ESPN live boxscores, insights & team compare
│   ├── leaderboard.js                            # Dual leaderboards, highlights & user audit
│   ├── visualizations.js                         # Chart.js accuracy charts & variance tables
│   ├── app.js                                    # Lifecycle bootstrapping & Firebase listeners
│   └── cache.js                                  # Client-side LocalStorage cache with TTL
├── data/
│   ├── teamsData.js                              # Team metadata and conference structures
│   └── fallbackStats.js                          # Static fallback statistics for offline resiliency
└── .agents/                                      # Specialized agent capabilities & skills
    ├── agents/
    │   └── product-optimizer.md                  # Continuous optimization & product roadmap subagent
    └── skills/
        ├── firebase-deploy/                      # Deployment automation & pre-deploy checks
        │   ├── SKILL.md                          # Firebase deployment procedures
        │   └── scripts/pre_deploy_check.sh       # Node syntax & security pre-deploy script
        ├── web-preview/                          # Local preview server launcher (port 8000)
        ├── design-director/                      # Visual hierarchy & branding guidelines
        ├── mobile-responsive-auditor/            # Touch target & viewport audit protocols
        └── qa-test-engineer/                     # Regression testing & state verification suites
```

### Module Responsibility Matrix

| Module | Primary Responsibility | Key Functions & State |
| :--- | :--- | :--- |
| [`index.html`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/index.html) | Root HTML skeleton & module scripts | Container DOM IDs, modal markup, script imports |
| [`css/styles.css`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/css/styles.css) | Custom styling, animations & theme | `:root`, `.stripe-win`, `.stripe-loss`, `.logo-shadow` |
| [`js/firebase-config.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/firebase-config.js) | Firebase initialization & Lucide helper | `firebaseConfig`, `db`, `renderIcons()` |
| [`js/state.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/state.js) | Global state, team dictionaries & colors | `currentSport`, `currentUser`, `cfbPicks`, `rawCfbColors`, `cfbColors` |
| [`js/utils.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/utils.js) | Sport getters, helpers, password hashing | `getActivePicks()`, `generateGameKey()`, `hashPassword()`, `setSport()` |
| [`js/components.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/components.js) | Reusable UI rendering helpers | `renderTeamLogo()`, `renderTeamBadge()`, `renderOddsPill()`, `renderResultBadge()` |
| [`js/api.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/api.js) | ESPN Scoreboard APIs, AP rankings & FPI | `fetchLiveResults()`, `fetchApRankings()`, `switchTab()` |
| [`js/season.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/season.js) | Season predictions & conference picks | `renderSchedule()`, `renderTeamBanner()`, `loadTeams()` |
| [`js/playoffs.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/playoffs.js) | CFP 12-team & NFL playoff brackets | `renderCfpBracket()`, `renderNflBracket()`, `playoffPick()` |
| [`js/top25.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/top25.js) | Top 25 Community Ballot & consensus | `renderTop25()`, `addTop25Team()`, `saveTop25()` |
| [`js/weekly.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/weekly.js) | Weekly matchups, spread/moneyline picks | `renderWeeklySchedule()`, `makeWeeklyPick()`, `autoPick()` |
| [`js/sportsbook.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/sportsbook.js) | Bonus bets, bankroll, over/under tracking | `renderBonusSchedule()`, `calculateBankroll()`, `submitBonusBets()` |
| [`js/modals.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/modals.js) | ESPN boxscore, insights & team compare | `openGameSummary()`, `generateInsights()`, `openCompareModal()` |
| [`js/leaderboard.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/leaderboard.js) | Dual leaderboards & weekly highlights | `renderLeaderboard()`, `renderHighlights()`, `setLeaderboardMode()` |
| [`js/visualizations.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/visualizations.js) | Chart.js variance charts & accuracy metrics | `calculateAccuracy()`, `renderVarianceTable()` |
| [`js/app.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/app.js) | Main initialization & Firebase live sync | `window.onload`, `login()`, `startFirebaseListeners()` |
| [`js/cache.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/cache.js) | Local storage cache with TTL validation | `PickEmCache.get()`, `PickEmCache.set()` |

---

## 🎨 UI/UX & Responsive Design System

* **Dark-Slate Visual Theme:** High-contrast, sports-bar aesthetic featuring a `slate-900` canvas, emerald accents (`#4DFFBC`), crimson alert states (`#FF4D4D`), and electric purple highlights (`#9333EA`).
* **Dynamic WCAG Luminance Engine:** Uses WCAG 2.1 relative luminance and YIQ contrast formulas (`getContrastRatio` and `getContrastYIQ` in [`js/state.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/state.js)) to automatically calculate whether white or dark text is required over any team's official hex color.
* **Pop-Shadow Team Logos:** Subtle CSS drop-shadow filters (`.logo-shadow`) applied across all 130+ FBS and 32 NFL team logos for maximum readability against light or dark cards.
* **Mobile-First Responsive Design:** Validated across compact phone screens (375px–430px) through 4K displays:
  - Touch targets maintain a minimum 44px height for touch ergonomics.
  - Sticky header with segmented sport switcher and active username pill.
  - Safe-area bottom padding prevents mobile browser toolbar clipping.
  - Horizontal scroll protection on brackets and tables.

---

## 🔒 Security & Authentication

* **Web Crypto API Password Hashing:** Client-side SHA-256 hashing using the browser's native `crypto.subtle.digest` API with a localized salt prefix (`hashPassword()` in [`js/utils.js`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/js/utils.js)). Plaintext passwords are never transmitted across the network or stored in Firebase.
* **Firebase Realtime Database Security Rules:** Production rules defined in [`database.rules.json`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/database.rules.json):
  - Enforces authenticated read/write privileges scoped to `auth != null` or verified user paths.
  - Users are restricted from mutating or overwriting competing players' picks or profiles.
  - Protects the `/users` node from unauthorized scraping of user registries or password hashes.

---

## 🛠️ Getting Started Locally

Because the project uses standard ES6+ modules and browser-native web APIs, **no Node.js build step, bundler, or heavy toolchain is required.**

### 1. Clone the Repository
```bash
git clone https://github.com/Cartermixon99/CFB_Pick_Em.git
cd CFB_Pick_Em
```

### 2. Launch Local HTTP Preview Server
Run a lightweight HTTP server on port 8000:

```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js npx
npx serve . -p 8000
```

Open `http://localhost:8000` in your web browser (or preview directly in Antigravity's built-in side-panel browser by typing `web`).

---

## ☁️ Pre-Deployment Verification & Publishing

The repository includes a dedicated pre-deployment validation pipeline to guarantee zero syntax regressions, schema errors, or sensitive file leaks before shipping to production.

### 1. Run Pre-Deployment Verification
```bash
# Execute the automated pre-deploy check script
./.agents/skills/firebase-deploy/scripts/pre_deploy_check.sh
```

The script automatically executes:
1. **JavaScript Syntax Verification:** Runs `node -c js/*.js` across all modules.
2. **Configuration Validation:** Validates `firebase.json`, `database.rules.json`, and `.firebaserc`.
3. **Sensitive File Audit:** Confirms no temporary migration scripts (`migrate_passwords.*`), database dumps (`users_backup_*.json`), or backup files are exposed.

### 2. Deploy to Firebase

Deploy to Google Firebase Hosting and Realtime Database using the Firebase CLI:

```bash
# Deploy both hosting assets and database rules
firebase deploy

# Or deploy hosting changes only
firebase deploy --only hosting

# Or deploy database security rules only
firebase deploy --only database
```

Live Production URL: **[https://cfb-pick--em-d47c6.web.app](https://cfb-pick--em-d47c6.web.app)**

---

## 🤖 Agentic Skills & Autonomous Tooling

This project integrates specialized agentic skills and subagent configurations located in `.agents/`:

* **`firebase-deploy`:** Automated pre-flight checks, rules deployment, and hosting sync.
* **`web-preview`:** Fast trigger (`web`) to boot and connect the local HTTP daemon on port 8000 without opening external windows.
* **`design-director`:** UI/UX standards, design system review, color contrast enforcement, and sports typography.
* **`mobile-responsive-auditor`:** Viewport verification on 375px–430px smartphone viewports, checking touch targets and layout stability.
* **`qa-test-engineer`:** Regression testing protocols for pick state mutations, bankroll math, and bracket logic.
* **`product-optimizer`:** Subagent continuously analyzing feature engagement, consensus metrics, and code reuse across modules.

---

## ⚖️ Disclaimer

*Carter's Pick 'Em* is an independent project created solely for entertainment, casual competition, and sports analytics tracking among friends and colleagues. 

All team names, logos, mascot trademarks, AP poll data, and game statistics are property of their respective owners and organizations (including the NCAA, CFP Committee, NFL, ESPN, and FanDuel). No affiliation, sponsorship, or commercial endorsement is claimed or implied.
