#!/usr/bin/env bash
# Pre-Deployment Validation Script for Firebase Hosting & Database
set -e

echo "🔍 Running pre-deployment validation..."

# 1. Check JavaScript syntax
echo "➡️  Checking JS syntax in js/*.js..."
node -c js/*.js
echo "✅ All JavaScript modules passed syntax validation."

# 2. Check JSON configuration files
echo "➡️  Validating firebase.json & database.rules.json..."
node -e "
  JSON.parse(require('fs').readFileSync('firebase.json'));
  JSON.parse(require('fs').readFileSync('database.rules.json'));
  const rc = JSON.parse(require('fs').readFileSync('.firebaserc'));
  console.log('   Target Project: ' + (rc.projects && rc.projects.default ? rc.projects.default : 'unknown'));
"
echo "✅ Firebase configuration and database rules are valid JSON."

# 3. Check for unintended sensitive files
echo "➡️  Checking for stray backup / sensitive files..."
STRAY_FILES=$(find . -maxdepth 2 \( -name "*.bak" -o -name "*.failed" -o -name "users_backup_*.json" -o -name "migrate_passwords.*" \) 2>/dev/null || true)
if [ -n "$STRAY_FILES" ]; then
  echo "⚠️  Found local backup/migration files (ensure they are excluded in firebase.json ignore list):"
  echo "$STRAY_FILES"
else
  echo "✅ No stray backup files found in root."
fi

echo "🚀 Ready to deploy to Firebase!"
