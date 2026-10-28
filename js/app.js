        // --- APP INITIALIZATION ---
        window.onload = () => {
            switchTab('weekly');
            document.getElementById('login-modal').classList.remove('hidden');
            for(let w = 1; w <= 15; w++) cfbGamesByWeek[w] = [];
            for(let w = 1; w <= 18; w++) nflGamesByWeek[w] = [];
            fetchLiveResults();
            setInterval(refreshTop25Week, 30000);
        };
        
        function startFirebaseListeners() {
            db.ref('leaderboard').on('value', (snapshot) => {
                cfbLeaderboardData = [];
                snapshot.forEach(child => { cfbLeaderboardData.push(child.val()); });
                if (currentUser && currentSport === 'CFB') {
                    renderLeaderboard();
                    calculateAccuracy();
                    renderHighlights();
                    const weeklySec = document.getElementById('section-weekly');
                    if (weeklySec && !weeklySec.classList.contains('hidden')) renderWeeklySchedule();
                }
            }, (error) => console.error('CFB leaderboard sync failed:', error));
            db.ref('nfl_leaderboard').on('value', (snapshot) => {
                nflLeaderboardData = [];
                snapshot.forEach(child => { nflLeaderboardData.push(child.val()); });
                if (currentUser && currentSport === 'NFL') {
                    renderLeaderboard();
                    calculateAccuracy();
                    renderHighlights();
                    const weeklySec = document.getElementById('section-weekly');
                    if (weeklySec && !weeklySec.classList.contains('hidden')) renderWeeklySchedule();
                }
            }, (error) => console.error('NFL leaderboard sync failed:', error));
            db.ref('top25/CFB').on('value', (snapshot) => {
                top25Submissions = snapshot.val() || {};
                if (currentUser) renderTop25();
            }, (error) => console.error('Top 25 sync failed:', error));
        }

        async function hashPassword(username, password) {
            const salt = "cfb_pickem_salt_v1_";
            const encoder = new TextEncoder();
            const data = encoder.encode(salt + username.toLowerCase() + ":" + password);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async function login() {
            const usernameInput = document.getElementById('username-input').value.trim();
            const passwordInput = document.getElementById('password-input').value.trim();
            const errorText = document.getElementById('login-error');
            
            if (!usernameInput || !passwordInput) {
                if(errorText) { errorText.innerText = "Please enter both a username and password."; errorText.classList.remove('hidden'); }
                return;
            }
            
            try {
                const hashedPassword = await hashPassword(usernameInput, passwordInput);
                const snapshot = await db.ref('users/' + usernameInput).once('value');
                
                if (snapshot.exists()) {
                    const stored = snapshot.val()?.password;
                    if (stored === hashedPassword) {
                        // Password verified with secure hash
                    } else if (stored === passwordInput) {
                        // Matches legacy plaintext password: automatically upgrade in database to secure hash
                        await db.ref('users/' + usernameInput).update({ password: hashedPassword });
                    } else {
                        if(errorText) { errorText.innerText = "Incorrect password. Please try again."; errorText.classList.remove('hidden'); }
                        return;
                    }
                } else {
                    // New user registration
                    await db.ref('users/' + usernameInput).set({ password: hashedPassword });
                }
                
                currentUser = usernameInput;
                startPickAutosave();
                document.getElementById('login-modal').classList.add('hidden');
                document.getElementById('current-username').innerText = currentUser;
                document.getElementById('user-display').classList.remove('hidden');
                
                db.ref('leaderboard/' + currentUser).once('value').then(snap => {
                    const dbData = snap.val();
                    cfbPicks = (dbData && dbData.picks) ? dbData.picks : (JSON.parse(localStorage.getItem('cfbPicks_2026_User_' + currentUser)) || {});
                    cfbWeeklyPicks = (dbData && dbData.weeklyPicks) ? dbData.weeklyPicks : (JSON.parse(localStorage.getItem('cfbPicks_2026_Weekly_' + currentUser)) || {});
                    cfbPlayoffPicks = (dbData && dbData.playoffPicks) ? dbData.playoffPicks : (JSON.parse(localStorage.getItem('cfbPlayoffPicks_2026_User_' + currentUser)) || {});
                    cfbBonusBets = (dbData && dbData.bonusBets) ? dbData.bonusBets : (JSON.parse(localStorage.getItem('cfbBonusBets_2026_User_' + currentUser)) || {});
                    refreshApp();
                });

                db.ref('nfl_leaderboard/' + currentUser).once('value').then(snap => {
                    const dbData = snap.val();
                    nflPicks = (dbData && dbData.picks) ? dbData.picks : (JSON.parse(localStorage.getItem('nflPicks_2026_User_' + currentUser)) || {});
                    nflWeeklyPicks = (dbData && dbData.weeklyPicks) ? dbData.weeklyPicks : (JSON.parse(localStorage.getItem('nflPicks_2026_Weekly_' + currentUser)) || {});
                    nflPlayoffPicks = (dbData && dbData.playoffPicks) ? dbData.playoffPicks : (JSON.parse(localStorage.getItem('nflPlayoffPicks_2026_User_' + currentUser)) || {});
                    nflBonusBets = (dbData && dbData.bonusBets) ? dbData.bonusBets : (JSON.parse(localStorage.getItem('nflBonusBets_2026_User_' + currentUser)) || {});
                    refreshApp();
                });
                db.ref('top25/CFB').once('value').then(snap => {
                    top25Submissions = snap.val() || {};
                    refreshApp();
                });
            } catch (error) {
                console.error('Login failed:', error);
                if (errorText) {
                    errorText.innerText = error && error.code === 'PERMISSION_DENIED'
                        ? 'Account access is currently blocked by the database rules. Please try again after the database is redeployed.'
                        : 'Unable to connect to the account service. Please try again.';
                    errorText.classList.remove('hidden');
                }
            }
        }

        function refreshApp() {
            checkPreseasonLockout();
            determineCurrentWeek();
            if (document.getElementById('team-select').value) {
                renderSchedule();
                updateProgressUI();
            }
            if (!document.getElementById('section-weekly').classList.contains('hidden')) renderWeeklySchedule();
            if (!document.getElementById('section-bonus').classList.contains('hidden')) renderBonusSchedule();
            renderLeaderboard();
            calculateAccuracy();
        }

        function checkPreseasonLockout() {
            const isLocked = isSeasonLocked();
            const lockoutBanner = document.getElementById('lockout-banner');
            const macroContainer = document.getElementById('macro-container');
            const submitBtn = document.getElementById('submit-btn');
            if (isLocked) {
                if(lockoutBanner) lockoutBanner.classList.remove('hidden');
                if(macroContainer) macroContainer.classList.add('hidden');
                if(submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.className = "bg-slate-400 text-white font-black text-lg py-4 px-12 rounded-full shadow-sm cursor-not-allowed w-full md:w-auto";
                    submitBtn.innerText = "Submissions Locked";
                }
            } else {
                if(lockoutBanner) lockoutBanner.classList.add('hidden');
                if(macroContainer) macroContainer.classList.remove('hidden');
                if(submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-4 px-12 rounded-full shadow-lg transition-all transform hover:scale-105 w-full md:w-auto";
                    submitBtn.innerText = "Save Picks to Global Leaderboard";
                }
            }
            return isLocked;
        }

        function showSaveToast(message = "Picks Saved Locally") {
            const toast = document.getElementById('save-toast');
            const toastText = document.getElementById('save-toast-text');
            if (toastText) toastText.innerText = message;
            if (toast) {
                toast.classList.remove('translate-y-20', 'opacity-0');
                setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 2500);
            }
        }

        function submitSeasonPicks() {
            if (isSeasonLocked()) return alert("The season has started. Submissions are locked.");
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            const p = getActivePicks();
            db.ref(path + currentUser).update({ username: currentUser, picks: p, timestamp: new Date().toISOString() })
            .then(() => { pickChangeVersions[currentSport].preseason = 0; alert(`Success! Picks submitted to Global Leaderboard.`); })
            .catch((error) => alert("Error saving picks."));
        }

        function submitWeeklyPicks() {
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            const wp = getActiveWeeklyPicks();
            db.ref(path + currentUser).update({ username: currentUser, weeklyPicks: wp, timestamp: new Date().toISOString() })
            .then(() => { pickChangeVersions[currentSport].weekly = 0; alert(`Success! Week's picks safely stored to Leaderboard.`); })
            .catch((error) => alert("Error saving picks."));
        }

        function submitBonusBets() {
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            const bonusBets = currentSport === 'CFB' ? cfbBonusBets : nflBonusBets;
            db.ref(path + currentUser).update({ username: currentUser, bonusBets, timestamp: new Date().toISOString() })
                .then(() => alert('Success! Bonus bets saved to the leaderboard.'))
                .catch(() => alert('Error saving bonus bets.'));
        }

