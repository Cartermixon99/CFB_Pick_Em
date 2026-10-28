---
name: firebase-deploy
description: Deploys the sports pick'em web application to Firebase Hosting and Realtime Database. Use whenever the user asks to deploy to Firebase, publish updates live, push changes to production, deploy to a preview channel, or update database rules.
---

# Firebase Deployment Skill

Use this skill whenever deploying updates, bug fixes, or new features to Firebase Hosting and/or Realtime Database rules.

---

## 📋 Project Configuration Summary

- **Default Project ID**: `cfb-pick--em-d47c6` (configured in [`.firebaserc`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/.firebaserc))
- **Live Production URLs**:
  - 🌐 [https://cfb-pick--em-d47c6.web.app](https://cfb-pick--em-d47c6.web.app)
  - 🌐 [https://cfb-pick--em-d47c6.firebaseapp.com](https://cfb-pick--em-d47c6.firebaseapp.com)
- **Firebase Console**:
  - [Firebase Console: cfb-pick--em-d47c6](https://console.firebase.google.com/project/cfb-pick--em-d47c6/overview)
- **Key Configuration Files**:
  - [`firebase.json`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/firebase.json) — Hosting public folder (`.`) and ignore list
  - [`database.rules.json`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/database.rules.json) — Realtime Database security rules
  - [`.firebaserc`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/.firebaserc) — Project aliases

---

## 🛡️ Step 1: Pre-Deployment Safety Checks

Before deploying to live users, verify that the project is clean and free of syntax errors:

### Automated Validation Script
Run the built-in pre-deployment check:
```bash
./.agents/skills/firebase-deploy/scripts/pre_deploy_check.sh
```

### Manual Validation Checklist
1. **JavaScript Syntax Verification**:
   Ensure none of the modular scripts contain syntax errors:
   ```bash
   node -c js/*.js
   ```
2. **JSON Syntax Verification**:
   Verify configuration and database rules are valid JSON:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('firebase.json')); JSON.parse(require('fs').readFileSync('database.rules.json'))"
   ```
3. **Verify Ignored Files**:
   Confirm that backup scripts (`migrate_passwords.*`), user backups (`users_backup_*.json`), and temporary files (`*.bak`, `*.failed`) are listed in the `ignore` array of [`firebase.json`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/firebase.json) so sensitive data is never uploaded to Hosting.

---

## ⚡ Step 2: Deployment Execution

> [!IMPORTANT]
> **Sandbox Note**: `firebase deploy` commands require external network access and access to global credentials stored in `~/.config/configstore/firebase-tools.json`.
> - If executed by the agent via `run_command`, set **`BypassSandbox: true`** to request manual user permission.
> - Alternatively, the user can run the command directly in their terminal.

### 1. Hosting Deploy (Recommended for UI / JS Changes)
For standard front-end changes (HTML, CSS, JS modules, images):
```bash
firebase deploy --only hosting
```
*Tip: You can add an optional deploy message to track the release:*
```bash
firebase deploy --only hosting -m "Deploy weekly picks & UI updates"
```

### 2. Full Deploy (Hosting + Database Rules)
When changes touch both the frontend and database security rules:
```bash
firebase deploy
```

### 3. Database Rules Only
When modifying permissions in [`database.rules.json`](file:///Users/cartermixon/Library/CloudStorage/OneDrive-UniversityofGeorgia/Fun%20Projects/database.rules.json) (e.g. user authentication, leaderboards, top 25 ballot rules):
```bash
firebase deploy --only database
```

### 4. Preview Channel Deploy (Staging / Testing)
To test major changes on a temporary URL before impacting live users:
```bash
firebase hosting:channel:deploy preview
```
*Returns a unique preview URL (valid for 7 days by default) that can be shared with testers.*

---

## 🔍 Step 3: Post-Deployment Verification

1. **Provide the Live Production Link**:
   Always provide the direct clickable production URL in the chat response:
   - 👉 [https://cfb-pick--em-d47c6.web.app](https://cfb-pick--em-d47c6.web.app)

2. **Hard Refresh / Cache Busting**:
   Remind the user to hard refresh their browser to bypass local caching:
   - macOS: `Cmd + Shift + R`
   - Windows / Linux: `Ctrl + Shift + R`

3. **Rollback Procedure (If Needed)**:
   If an unintended regression reaches production:
   - View recent releases:
     ```bash
     firebase hosting:releases:list
     ```
   - Roll back to the previous deployment:
     ```bash
     firebase hosting:rollback
     ```
   - Or roll back with 1-click in the [Firebase Hosting Console](https://console.firebase.google.com/project/cfb-pick--em-d47c6/hosting/sites/cfb-pick--em-d47c6).
