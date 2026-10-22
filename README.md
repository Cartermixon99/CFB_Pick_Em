# Carter's Pick 'Em (CFB & NFL)

A full-featured, real-time sports prediction, odds analysis, and leaderboard tracking web application for **College Football (CFB)** and the **NFL**. Built with responsive vanilla JavaScript, Tailwind CSS, Chart.js, and Firebase.

---

## 🌟 Key Features

* **🏈 Comprehensive Pick 'Em Tracking:**
  * **Preseason Predictions:** Predict season win totals and conference champions before kickoff.
  * **Weekly Matchups:** Pick weekly winners across Power 4 CFB matchups and the full NFL slate.
  * **Postseason Playoff Brackets:** Interactive brackets for the College Football Playoff (12-team format) and NFL Playoffs.
  * **Bonus Bets:** Over/Under win total tracking with live FanDuel benchmark comparisons.

* **📊 Live Sports Data & Odds (ESPN Integration):**
  * Real-time live scores, game clocks, and event statuses via ESPN APIs.
  * Live sportsbook lines including moneylines, point spreads, and over/under totals.
  * AP Top 25 rankings, ESPN Football Power Index (FPI), and strength-of-record metrics.

* **🏆 Real-Time Leaderboards & Community Polls:**
  * Live user standings with automatic score synchronization via Firebase Realtime Database.
  * **Top 25 Community Ballot:** Submit weekly ballots and view aggregated consensus top 25 rankings.
  * Visual variance charts powered by Chart.js to compare picked wins against actual performance and betting lines.

* **🔒 Security & Authentication:**
  * Client-side salted SHA-256 password hashing via the Web Crypto API.
  * Granular Firebase Realtime Database security rules preventing unauthorized data modification or account scraping.

---

## 🛠️ Tech Stack

* **Frontend:** Vanilla JavaScript (ES6+), HTML5
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Modern dark UI, responsive mobile-first layout)
* **Data Visualizations:** [Chart.js](https://www.chartjs.org/) (Variance and accuracy charts)
* **Icons:** [Lucide Icons](https://lucide.dev/)
* **Backend & Hosting:** [Google Firebase](https://firebase.google.com/) (Realtime Database & Firebase Hosting)
* **Data Sources:** Public ESPN Scoreboard & Core Sports APIs

---

## 📁 Project Structure

```text
├── index.html            # Main single-page application & UI logic
├── 404.html               # Custom 404 fallback page
├── database.rules.json    # Firebase Realtime Database security rules
├── firebase.json          # Firebase Hosting configuration
├── .firebaserc            # Firebase project target definition
├── js/
│   └── cache.js           # Client-side LocalStorage cache utilities
├── data/
│   ├── teamsData.js       # Sports teams metadata, colors, and schedules
│   └── fallbackStats.js   # Offline rankings & ESPN statistics fallbacks
├── public/                # Firebase public static assets
└── .github/workflows/     # Automated GitHub Actions deployment workflows
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Cartermixon99/CFB_Pick_Em.git
cd CFB_Pick_Em
```

### 2. Run Locally
Because the project uses standard web technologies without a complex bundling step, you can serve it with any local static HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node.js / npx
npx serve .
```

Open `http://localhost:8000` in your web browser.

---

## ☁️ Deployment

This project is pre-configured for automated deployment to **Firebase Hosting**.

### Deploy via Firebase CLI:
```bash
# Install Firebase tools (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy hosting and database rules
firebase deploy
```

---

## ⚖️ Disclaimer

This project is created for entertainment and friendly competition purposes only. All team names, logos, rankings, and game data are property of their respective owners and leagues (NCAA / NFL / ESPN).
