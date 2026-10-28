        // --- WRAPPER FUNCTIONS ---
        const getActivePicks = () => currentSport === 'CFB' ? cfbPicks : nflPicks;
        const getActiveWeeklyPicks = () => currentSport === 'CFB' ? cfbWeeklyPicks : nflWeeklyPicks;
        const getActiveResults = () => currentSport === 'CFB' ? cfbActualResults : nflActualResults;
        const getActiveGameScores = () => currentSport === 'CFB' ? cfbGameScores : nflGameScores;
        const getActiveSchedule = () => currentSport === 'CFB' ? cfbScheduleData : nflScheduleData;
        const getActiveGamesByWeek = () => currentSport === 'CFB' ? cfbGamesByWeek : nflGamesByWeek;
        const getActiveColors = () => currentSport === 'CFB' ? cfbColors : nflColors;
        const getActiveWinTotals = () => currentSport === 'CFB' ? cfbWinTotals : nflWinTotals;
        const getActiveTeams = () => currentSport === 'CFB' ? cfbTeams : nflTeams;
        const getActiveLeaderboard = () => currentSport === 'CFB' ? cfbLeaderboardData : nflLeaderboardData;
        const isP4Game = game => currentSport !== 'CFB' || (p4CfbSchools.has(game.home) || p4CfbSchools.has(game.away));
        const getGamesForPicks = weekNum => (getActiveGamesByWeek()[weekNum] || []).filter(isP4Game);

        function updateEspnRecord(sport, team, rec) {
            if (!rec || !team) return;
            const clean = cleanTeamName(team);
            if (!espnTeamRecords[sport]) espnTeamRecords[sport] = {};
            const existing = espnTeamRecords[sport][clean];
            if (!existing) {
                espnTeamRecords[sport][clean] = rec;
                return;
            }
            const exTotal = existing.split('-').map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
            const newTotal = rec.split('-').map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
            if (newTotal >= exTotal) {
                espnTeamRecords[sport][clean] = rec;
            }
        }

        function getTeamCurrentRecord(team, sport = currentSport) {
            if (!team) return '0-0';
            const clean = cleanTeamName(team);
            const mapped = teamNameMapper[clean] || clean;
            let resolvedSport = sport;
            if (!resolvedSport) {
                if (typeof fbsSchools !== 'undefined' && fbsSchools.includes(clean)) resolvedSport = 'CFB';
                else if (typeof nflTeams !== 'undefined' && nflTeams?.NFL?.includes(clean)) resolvedSport = 'NFL';
                else resolvedSport = 'CFB';
            }

            const gamesByWeek = resolvedSport === 'CFB' ? cfbGamesByWeek : nflGamesByWeek;
            let wins = 0;
            let losses = 0;
            let ties = 0;

            if (gamesByWeek) {
                const seen = new Set();
                Object.values(gamesByWeek).flat().forEach(game => {
                    if (!game) return;
                    const key = game.gameId || game.gameKey || `${game.home}_${game.away}_${game.dateStr}`;
                    if (seen.has(key)) return;

                    const homeClean = cleanTeamName(game.home);
                    const awayClean = cleanTeamName(game.away);
                    const isHome = (homeClean === clean || homeClean === mapped);
                    const isAway = (awayClean === clean || awayClean === mapped);
                    if (!isHome && !isAway) return;

                    if (game.statusState === 'in') return;
                    const isFinished = !!(game.isCompleted || game.statusState === 'post' || (game.winner && (isHome || isAway)));
                    if (!isFinished) return;

                    const hScore = Number(game.homeScore);
                    const aScore = Number(game.awayScore);
                    const hasScores = Number.isFinite(hScore) && Number.isFinite(aScore);

                    seen.add(key);

                    if (game.winner) {
                        const winClean = cleanTeamName(game.winner);
                        if (winClean === clean || winClean === mapped) wins++;
                        else losses++;
                    } else if (hasScores) {
                        const teamScore = isHome ? hScore : aScore;
                        const oppScore = isHome ? aScore : hScore;
                        if (teamScore > oppScore) wins++;
                        else if (oppScore > teamScore) losses++;
                        else ties++;
                    }
                });
            }

            const calcTotal = wins + losses + ties;
            const espnRec = espnTeamRecords?.[resolvedSport]?.[clean] || espnTeamRecords?.[resolvedSport]?.[mapped];
            if (espnRec) {
                const espnParts = espnRec.split('-').map(Number);
                const espnTotal = espnParts.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
                if (espnTotal > calcTotal) {
                    const cleanedEspn = espnRec.replace(/-0$/, '');
                    const [w, l] = cleanedEspn.split('-');
                    if (w !== undefined && l !== undefined) {
                        return `${w}-${l}`;
                    }
                    return cleanedEspn;
                }
            }

            return `${wins}-${losses}`;
        }

        function getGameTeamRank(game, team) {
            if (!game || currentSport !== 'CFB' || !team) return null;
            const clean = cleanTeamName(team);
            const homeClean = cleanTeamName(game.home);
            const awayClean = cleanTeamName(game.away);
            const mapped = teamNameMapper[clean] || clean;

            let rank = null;
            if (homeClean === clean || homeClean === mapped) {
                rank = game.homeRank;
            } else if (awayClean === clean || awayClean === mapped) {
                rank = game.awayRank;
            }

            let num = parseInt(rank, 10);
            if (Number.isInteger(num) && num >= 1 && num <= 25) {
                return num;
            }

            if (typeof apRankingsCache !== 'undefined' && apRankingsCache) {
                const ap = apRankingsCache[clean] || apRankingsCache[mapped] || apRankingsCache[team] || 
                           (game.homeId && (homeClean === clean || homeClean === mapped) ? apRankingsCache[game.homeId] : null) || 
                           (game.awayId && (awayClean === clean || awayClean === mapped) ? apRankingsCache[game.awayId] : null);
                num = parseInt(ap, 10);
                if (Number.isInteger(num) && num >= 1 && num <= 25) {
                    return num;
                }
            }

            return null;
        }
        function markPicksDirty(phase) {
            if (currentUser) pickChangeVersions[currentSport][phase]++;
        }

        function savePendingPicks() {
            if (!currentUser) return;

            const saves = ['CFB', 'NFL'].map(sport => {
                const versions = { ...pickChangeVersions[sport] };
                const pending = {};
                const leaderboardPath = sport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
                const seasonPicks = sport === 'CFB' ? cfbPicks : nflPicks;
                const weeklyPicks = sport === 'CFB' ? cfbWeeklyPicks : nflWeeklyPicks;
                const playoffPicks = sport === 'CFB' ? cfbPlayoffPicks : nflPlayoffPicks;
                const savedVersions = { ...versions };

                if (versions.preseason) pending.picks = seasonPicks;
                if (versions.weekly) pending.weeklyPicks = weeklyPicks;
                if (versions.playoffs) pending.playoffPicks = playoffPicks;
                if (!Object.keys(pending).length) return Promise.resolve();

                pending.username = currentUser;
                pending.timestamp = new Date().toISOString();
                return db.ref(leaderboardPath + currentUser).update(pending).then(() => {
                    Object.keys(savedVersions).forEach(phase => {
                        if (pickChangeVersions[sport][phase] === savedVersions[phase]) {
                            pickChangeVersions[sport][phase] = 0;
                        }
                    });
                    showSaveToast();
                }).catch(error => console.error(`${sport} autosave failed:`, error));
            });

            return Promise.all(saves);
        }

        function startPickAutosave() {
            if (autosaveIntervalId) return;
            autosaveIntervalId = setInterval(savePendingPicks, 60000);
        }

        function savePickImmediately(field, value) {
            if (!currentUser) return Promise.resolve();
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            pickChangeVersions[currentSport][field === 'picks' ? 'preseason' : field === 'weeklyPicks' ? 'weekly' : 'playoffs'] = 0;
            return db.ref(path + currentUser).update({ username: currentUser, [field]: value, timestamp: new Date().toISOString() })
                .then(() => showSaveToast())
                .catch(error => console.error(`Immediate ${field} save failed:`, error));
        }

        function saveBonusBetsImmediately(value) {
            if (!currentUser) return Promise.resolve();
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            return db.ref(path + currentUser).update({ username: currentUser, bonusBets: value, timestamp: new Date().toISOString() })
                .then(() => showSaveToast())
                .catch(error => console.error('Immediate bonus bets save failed:', error));
        }
        function getActiveSeasonGameKeys() {
            const gameKeys = new Set();
            const activeSchedule = getActiveSchedule();
            for (const conference in activeSchedule) {
                for (const team in activeSchedule[conference]) {
                    activeSchedule[conference][team].forEach(item => {
                        const parsed = parseScheduleItem(item);
                        gameKeys.add(generateGameKey(team, parsed.opponent, parsed.prefix));
                    });
                }
            }
            return gameKeys;
        }
        function isSeasonLocked() {
            const cutoff = currentSport === 'CFB' ? LOCKOUT_CFB : LOCKOUT_NFL;
            return new Date() > cutoff;
        }

        const getTeamConference = (teamName, sportOverride = null) => {
            const sport = sportOverride || currentSport;
            const activeDb = sport === 'CFB' ? cfbTeams : nflTeams;
            for (let conf in activeDb) {
                if (activeDb[conf].includes(teamName)) return conf;
            }
            return null;
        };

        function calcUnitProfit(mlNum) {
            if (!mlNum) return 0;
            let val = parseFloat(mlNum);
            if (isNaN(val) || val === 0) return 0;
            if (val > 0) return val / 100;
            if (val < 0) return 100 / Math.abs(val);
            return 0;
        }

        // --- UNIQUE GAME ID GENERATOR ---
        // Reverts CFB to old alphabetical format to save existing data. NFL keeps directional 'at' format.
        const generateGameKey = (team, opponent, prefix) => {
            if (currentSport === 'CFB') {
                return [team, opponent].sort().join(" vs ");
            } else {
                if (prefix === "VS. (Neutral)") return [team, opponent].sort().join(" vs ") + " (Neutral)";
                if (prefix === "at") return `${team} at ${opponent}`;
                return `${opponent} at ${team}`; // "vs" prefix implies `team` is Home
            }
        };

        // --- TOGGLE LOGIC ---
        function setSport(sport) {
            currentSport = sport;
            const btnCfb = document.getElementById('toggle-cfb');
            const btnNfl = document.getElementById('toggle-nfl');
            if(btnCfb) btnCfb.className = sport === 'CFB' ? "px-2.5 sm:px-3 py-1 font-black uppercase text-xs transition-all bg-purple-600 text-white rounded shadow-sm flex items-center gap-1.5 cursor-pointer" : "px-2.5 sm:px-3 py-1 font-black uppercase text-xs transition-all text-slate-400 hover:text-white rounded flex items-center gap-1.5 cursor-pointer";
            if(btnNfl) btnNfl.className = sport === 'NFL' ? "px-2.5 sm:px-3 py-1 font-black uppercase text-xs transition-all bg-purple-600 text-white rounded shadow-sm flex items-center gap-1.5 cursor-pointer" : "px-2.5 sm:px-3 py-1 font-black uppercase text-xs transition-all text-slate-400 hover:text-white rounded flex items-center gap-1.5 cursor-pointer";
            const brandIcon = document.getElementById('header-brand-icon');
            if(brandIcon) {
                brandIcon.setAttribute('data-lucide', sport === 'CFB' ? 'trophy' : 'shield');
            }
            const navPicks = document.getElementById('nav-picks');
            if(navPicks) navPicks.innerText = sport === 'CFB' ? "Preseason Picks" : "Season Picks";
            
            const progLabel = document.getElementById('progress-label');
            if(progLabel) progLabel.innerText = sport === 'CFB' ? "Preseason Progress" : "Season Progress";
            
            const lockoutText = sport === 'CFB' ? "CFB preseason and playoff picks lock at 12:00 PM ET on September 5, 2026" : "NFL preseason and playoff picks lock at 12:00 PM ET on September 13, 2026";
            const lockoutEl = document.getElementById('lockout-text');
            if(lockoutEl) lockoutEl.innerText = lockoutText;

            const cfbElements = document.querySelectorAll('.cfb-only-stats');
            cfbElements.forEach(el => sport === 'CFB' ? el.classList.remove('hidden') : el.classList.add('hidden'));
            
            const chalkBtn = document.getElementById('macro-chalk');
            const homeBtn = document.getElementById('macro-home');
            const fdBlock = document.getElementById('fanduel-block');
            
            if (sport === 'NFL') {
                if(chalkBtn) chalkBtn.classList.add('hidden');
                if(homeBtn) homeBtn.className = "text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md shadow transition-colors w-full flex items-center justify-center";
                if(fdBlock) fdBlock.classList.remove('border-l', 'border-slate-700', 'pl-5');
            } else {
                if(chalkBtn) chalkBtn.classList.remove('hidden');
                if(homeBtn) homeBtn.className = "text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md shadow transition-colors w-1/2 flex items-center justify-center";
                if(fdBlock) fdBlock.classList.add('border-l', 'border-slate-700', 'pl-5');
            }

            const confSelect = document.getElementById('conference-select');
            if (confSelect) {
                if (sport === 'NFL') {
                    confSelect.innerHTML = '<option value="NFL">NFL</option>';
                } else {
                    confSelect.innerHTML = '<option value="SEC">SEC</option><option value="Big Ten">Big Ten</option><option value="Big 12">Big 12</option><option value="ACC">ACC</option>';
                }
            }

            checkPreseasonLockout();
            determineCurrentWeek();
            loadTeams();
            
            if (!document.getElementById('section-weekly').classList.contains('hidden')) renderWeeklySchedule();
            if (!document.getElementById('section-bonus').classList.contains('hidden')) renderBonusSchedule();
            if (!document.getElementById('section-playoffs').classList.contains('hidden')) renderPlayoffs();
            if (!document.getElementById('section-leaderboard').classList.contains('hidden')) renderLeaderboard();
            if (!document.getElementById('section-results').classList.contains('hidden')) calculateAccuracy();
            if (!document.getElementById('section-variance').classList.contains('hidden')) renderVariance();
            if (!document.getElementById('section-highlights').classList.contains('hidden')) renderHighlights();
            if (sport === 'CFB' && !document.getElementById('section-top25').classList.contains('hidden')) renderTop25();
            renderIcons();
        }

        /**
         * HTML entity escaping helper for user-generated strings and team names.
         */
        function highlightEscape(value) {
            return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
        }

        /**
         * Calculates live community pick split statistics for a given game.
         */
        function getCommunityPickStats(gameKey, awayTeam, homeTeam) {
            const leaderboard = (typeof getActiveLeaderboard === 'function') ? getActiveLeaderboard() : [];
            let awayCount = 0;
            let homeCount = 0;
            const activeWeeklyPicks = (typeof getActiveWeeklyPicks === 'function') ? getActiveWeeklyPicks() : {};
            const activePicks = (typeof getActivePicks === 'function') ? getActivePicks() : {};
            const myCurrentPick = activeWeeklyPicks[gameKey] || activePicks[gameKey];

            const countedUsers = new Set();

            (leaderboard || []).forEach(player => {
                if (!player || !player.username) return;
                countedUsers.add(player.username);
                const pick = (player.username === currentUser && myCurrentPick)
                    ? myCurrentPick
                    : ((player.weeklyPicks && player.weeklyPicks[gameKey]) || (player.picks && player.picks[gameKey]));

                if (pick === awayTeam) awayCount++;
                else if (pick === homeTeam) homeCount++;
            });

            if (currentUser && !countedUsers.has(currentUser) && myCurrentPick) {
                if (myCurrentPick === awayTeam) awayCount++;
                else if (myCurrentPick === homeTeam) homeCount++;
            }

            const total = awayCount + homeCount;
            const awayPct = total > 0 ? Math.round((awayCount / total) * 100) : 0;
            const homePct = total > 0 ? 100 - awayPct : 0;

            return { awayCount, homeCount, total, awayPct, homePct };
        }

        /**
         * Evaluates whether a game currently qualifies for an Live Upset Alert or Upset Final.
         */
        function checkUpsetAlert(game) {
            const fallback = { isUpsetAlert: false, isUpsetFinal: false, underdog: null, favorite: null, dogLead: 0, severity: '' };
            if (!game) return fallback;

            const home = game.home;
            const away = game.away;
            const isFinished = !!(game.isCompleted || game.winner || game.statusState === 'post');
            const isLive = !isFinished && game.statusState === 'in';

            if (!isLive && !isFinished) return fallback;

            const homeScore = Number(game.homeScore);
            const awayScore = Number(game.awayScore);
            if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return fallback;

            // Determine Favorite & Underdog
            let favorite = null;
            let underdog = null;
            let spreadDiff = null;

            const sHome = Number.isFinite(Number(game.spreadHome)) ? Number(game.spreadHome) : (Number.isFinite(Number(game.spread)) ? Number(game.spread) : null);
            const sAway = Number.isFinite(Number(game.spreadAway)) ? Number(game.spreadAway) : (sHome !== null ? -sHome : null);

            if (sHome !== null && sAway !== null && Math.abs(sHome - sAway) >= 1.5) {
                if (sHome < sAway) {
                    favorite = home;
                    underdog = away;
                    spreadDiff = sAway;
                } else {
                    favorite = away;
                    underdog = home;
                    spreadDiff = sHome;
                }
            } else if (Number.isFinite(Number(game.mlHomeNum)) && Number.isFinite(Number(game.mlAwayNum)) && game.mlHomeNum !== 0 && game.mlAwayNum !== 0 && game.mlHomeNum !== game.mlAwayNum) {
                if (game.mlHomeNum < game.mlAwayNum) {
                    favorite = home;
                    underdog = away;
                } else {
                    favorite = away;
                    underdog = home;
                }
            } else if (currentSport === 'CFB') {
                const homeRank = (typeof getGameTeamRank === 'function') ? getGameTeamRank(game, home) : null;
                const awayRank = (typeof getGameTeamRank === 'function') ? getGameTeamRank(game, away) : null;

                if (homeRank && !awayRank) {
                    favorite = home;
                    underdog = away;
                } else if (awayRank && !homeRank) {
                    favorite = away;
                    underdog = home;
                } else if (homeRank && awayRank && Math.abs(homeRank - awayRank) >= 4) {
                    if (homeRank < awayRank) {
                        favorite = home;
                        underdog = away;
                    } else {
                        favorite = away;
                        underdog = home;
                    }
                }
            }

            if (!favorite || !underdog) return fallback;

            const dogScore = underdog === home ? homeScore : awayScore;
            const favScore = favorite === home ? homeScore : awayScore;
            const dogLead = dogScore - favScore;

            const period = Number(game.period) || 0;
            const statusDetail = String(game.statusDetail || '').toLowerCase();
            const isLateGame = period >= 3 || statusDetail.includes('3rd') || statusDetail.includes('4th') || statusDetail.includes('ot') || statusDetail.includes('half');

            let isUpsetAlert = false;
            let severity = 'alert';

            if (isLive && dogLead > 0) {
                if (isLateGame) {
                    isUpsetAlert = true;
                    severity = (period >= 4 || statusDetail.includes('4th') || statusDetail.includes('ot')) ? 'critical' : 'alert';
                } else if (period >= 2 || statusDetail.includes('2nd')) {
                    if (dogLead >= 7 || (spreadDiff !== null && spreadDiff >= 10)) {
                        isUpsetAlert = true;
                        severity = 'watch';
                    }
                }
            }

            const winner = game.winner || (isFinished ? (dogLead > 0 ? underdog : (dogLead < 0 ? favorite : null)) : null);
            const isUpsetFinal = isFinished && winner === underdog;

            return {
                isUpsetAlert,
                isUpsetFinal,
                underdog,
                favorite,
                dogLead,
                dogScore,
                favScore,
                period,
                severity
            };
        }

        // ==========================================
        // SOCIAL SHARE & BET SLIP EXPORT
        // ==========================================

        /**
         * Formats the active user's weekly picks into an emoji-rich text slip for SMS/group chats.
         */
        function generateWeeklyShareText(weekNum) {
            const weekSelect = document.getElementById('week-select');
            const week = Number(weekNum) || (weekSelect ? parseInt(weekSelect.value, 10) : 1) || 1;
            const games = (typeof getGamesForPicks === 'function') ? getGamesForPicks(week) : [];
            const activeWeeklyPicks = (typeof getActiveWeeklyPicks === 'function') ? getActiveWeeklyPicks() : {};
            const activePicks = (typeof getActivePicks === 'function') ? getActivePicks() : {};
            const myName = currentUser || 'Player';
            const sportEmoji = currentSport === 'CFB' ? '🏈' : '🛡️';

            const lines = [];
            lines.push(`${sportEmoji} ${myName}'s ${currentSport} Week ${week} Picks`);
            lines.push('━━━━━━━━━━━━━━━━━━━━━');

            let pickedCount = 0;
            let wonCount = 0;
            let lostCount = 0;

            games.forEach(game => {
                const pick = activeWeeklyPicks[game.gameKey] || activePicks[game.gameKey];
                if (!pick) return;
                pickedCount++;

                const isFinished = !!(game.isCompleted || game.winner || game.statusState === 'post');
                const isLive = !isFinished && game.statusState === 'in';

                let icon = '⏳';
                if (isFinished) {
                    if (pick === game.winner) {
                        icon = '✅';
                        wonCount++;
                    } else {
                        icon = '❌';
                        lostCount++;
                    }
                } else if (isLive) {
                    icon = '🔴';
                }

                const isHome = (pick === game.home);
                const opp = isHome ? game.away : game.home;
                const vsSymbol = isHome ? 'vs' : '@';
                
                let oddsStr = '';
                if (isHome && game.mlHome) oddsStr = ` (${game.mlHome})`;
                else if (!isHome && game.mlAway) oddsStr = ` (${game.mlAway})`;
                else if (game.spread) {
                    const sp = isHome ? (game.spreadHome ?? game.spread) : (game.spreadAway ?? -game.spread);
                    oddsStr = (Number.isFinite(sp)) ? ` (${sp > 0 ? '+' : ''}${sp})` : '';
                }

                lines.push(`${icon} ${pick}${oddsStr} ${vsSymbol} ${opp}`);
            });

            if (pickedCount === 0) {
                lines.push(`(No picks locked in for Week ${week} yet)`);
            } else {
                lines.push('━━━━━━━━━━━━━━━━━━━━━');
                const finalized = wonCount + lostCount;
                if (finalized > 0) {
                    const acc = Math.round((wonCount / finalized) * 100);
                    lines.push(`Record: ${wonCount}-${lostCount} (${acc}%) | Total: ${pickedCount}/${games.length} Picked`);
                } else {
                    lines.push(`Picks: ${pickedCount} of ${games.length} Matchups Selected`);
                }
            }
            lines.push(`Shared via ${currentSport} Pick'em`);

            return lines.join('\n');
        }

        /**
         * Formats the active user's sportsbook bet slip for SMS/group chats.
         * For finished games, computes whether the wager won or lost, and the exact profit.
         */
        function generateBonusBetsShareText(weekNum) {
            const weekSelect = document.getElementById('bonus-week-select');
            const week = Number(weekNum) || (weekSelect ? parseInt(weekSelect.value, 10) : 1) || 1;
            const games = (typeof getGamesForPicks === 'function') ? getGamesForPicks(week) : [];
            const bonusBets = (typeof getBonusBets === 'function')
                ? getBonusBets()
                : ((currentSport === 'CFB' ? cfbBonusBets : nflBonusBets) || {});
            const myName = currentUser || 'Bettor';
            const bankroll = (typeof calculateBankroll === 'function') ? calculateBankroll(bonusBets) : { total: 0 };

            const lines = [];
            lines.push(`💰 ${myName}'s ${currentSport} Week ${week} Bet Slip`);
            lines.push('━━━━━━━━━━━━━━━━━━━━━');

            let wagersFound = 0;
            let wonCount = 0;
            let lostCount = 0;
            let pushCount = 0;
            let pendingCount = 0;
            let totalSettledProfit = 0;

            games.forEach(game => {
                const gameWagers = bonusBets[game.gameKey] || {};
                ['moneyline', 'spread', 'total'].forEach(market => {
                    const w = gameWagers[market];
                    const amt = parseFloat(w?.amount);
                    if (!w || !w.side || !Number.isFinite(amt) || amt <= 0) return;
                    wagersFound++;

                    let marketIcon = '🎯';
                    if (market === 'moneyline') marketIcon = '💵';
                    else if (market === 'total') marketIcon = '🔥';

                    const lineStr = (w.line !== undefined && w.line !== null && w.line !== '') ? ` (${w.line})` : '';
                    const oddsStr = (w.odds !== undefined && w.odds !== null && w.odds !== '') ? ` [${w.odds > 0 ? '+' : ''}${w.odds}]` : '';

                    const isFinished = !!(game.isCompleted || game.winner || game.statusState === 'post');
                    const isLive = !isFinished && game.statusState === 'in';
                    const homeScore = Number(game.homeScore);
                    const awayScore = Number(game.awayScore);
                    const hasScores = Number.isFinite(homeScore) && Number.isFinite(awayScore);

                    let statusStr = '';
                    if (isFinished) {
                        let result = null;
                        if (market === 'moneyline') {
                            result = game.winner ? (w.side === game.winner ? 'win' : 'loss') : 'push';
                        } else if (hasScores) {
                            if (market === 'spread') {
                                const line = (w.line !== undefined && w.line !== null && w.line !== '' && Number.isFinite(Number(w.line)))
                                    ? Number(w.line)
                                    : Number(w.side === game.home ? game.spreadHome : game.spreadAway);
                                if (Number.isFinite(line)) {
                                    const margin = w.side === game.home ? homeScore + line - awayScore : awayScore + line - homeScore;
                                    result = margin > 0 ? 'win' : (margin < 0 ? 'loss' : 'push');
                                }
                            } else if (market === 'total') {
                                const line = (w.line !== undefined && w.line !== null && w.line !== '' && Number.isFinite(Number(w.line)))
                                    ? Number(w.line)
                                    : Number(game.overUnder);
                                if (Number.isFinite(line)) {
                                    const diff = homeScore + awayScore - line;
                                    result = diff === 0 ? 'push' : ((w.side === 'Over') === (diff > 0) ? 'win' : 'loss');
                                }
                            }
                        }

                        if (result === 'win') {
                            wonCount++;
                            const odds = (w.odds !== undefined && w.odds !== null && w.odds !== '' && Number.isFinite(Number(w.odds)))
                                ? Number(w.odds)
                                : Number(w.side === game.home ? game.mlHomeNum : game.mlAwayNum);
                            const profit = market === 'moneyline' 
                                ? (typeof calculateAmericanProfit === 'function' ? calculateAmericanProfit(amt, odds) : (odds > 0 ? amt * odds / 100 : amt * 100 / Math.abs(odds)))
                                : amt * 0.9091;
                            totalSettledProfit += profit;
                            statusStr = ` ✅ WON (+$${profit.toFixed(2)})`;
                        } else if (result === 'loss') {
                            lostCount++;
                            totalSettledProfit -= amt;
                            statusStr = ` ❌ LOST (-$${amt.toFixed(2)})`;
                        } else if (result === 'push') {
                            pushCount++;
                            statusStr = ` ➖ PUSH ($0.00)`;
                        } else {
                            pendingCount++;
                            statusStr = ` ⏳ PENDING`;
                        }
                    } else if (isLive) {
                        pendingCount++;
                        const qtr = (typeof getGameQuarterTimeDisplay === 'function') ? ` • ${getGameQuarterTimeDisplay(game)}` : '';
                        statusStr = ` 🔴 LIVE${qtr}`;
                    } else {
                        pendingCount++;
                        statusStr = ` ⏳ SCHEDULED`;
                    }

                    lines.push(`${marketIcon} ${w.side}${lineStr}${oddsStr} - $${amt.toFixed(2)} [${market.toUpperCase()}]${statusStr}`);
                    lines.push(`   Matchup: ${game.away} @ ${game.home}`);
                });
            });

            if (wagersFound === 0) {
                lines.push(`(No wagers placed for Week ${week} yet)`);
            } else {
                lines.push('━━━━━━━━━━━━━━━━━━━━━');
                const finalized = wonCount + lostCount + pushCount;
                if (finalized > 0) {
                    const profitStr = totalSettledProfit >= 0
                        ? `+$${totalSettledProfit.toFixed(2)}`
                        : `-$${Math.abs(totalSettledProfit).toFixed(2)}`;
                    lines.push(`Results: ${wonCount}-${lostCount}${pushCount > 0 ? `-${pushCount}` : ''} | Net: ${profitStr}`);
                    if (pendingCount > 0) {
                        lines.push(`Pending Wagers: ${pendingCount}`);
                    }
                }
                lines.push(`Total Bankroll: $${bankroll.total.toFixed(2)}`);
            }
            lines.push(`Shared via ${currentSport} Sportsbook`);

            return lines.join('\n');
        }

        /**
         * Formats the active user's Top 25 ballot with official mascot emojis.
         */
        function generateTop25ShareText(weekNum) {
            const weekSelect = document.getElementById('top25-week-select');
            const week = Number(weekNum) || (weekSelect ? parseInt(weekSelect.value, 10) : 1) || 1;
            const myName = currentUser || 'Player';

            let teams = [];
            if (typeof top25Draft !== 'undefined' && top25Draft.length > 0 && typeof top25ViewedWeek !== 'undefined' && top25ViewedWeek === week) {
                teams = top25Draft;
            } else if (typeof top25Submissions !== 'undefined' && top25Submissions[week]?.[currentUser]?.teams) {
                teams = top25Submissions[week][currentUser].teams;
            } else if (typeof getTop25DefaultTeams === 'function') {
                teams = getTop25DefaultTeams(week);
            }

            const lines = [];
            lines.push(`🏆 ${myName}'s CFB Week ${week} Top 25 Ballot`);
            lines.push('━━━━━━━━━━━━━━━━━━━━━');

            if (!teams || teams.length === 0) {
                lines.push('(No Top 25 ranking submitted for this week yet)');
            } else {
                teams.slice(0, 25).forEach((team, idx) => {
                    const emoji = (typeof getTeamMascotEmoji === 'function') ? getTeamMascotEmoji(team) : '🏈';
                    const rank = idx + 1;
                    const padRank = rank < 10 ? ` ${rank}` : `${rank}`;
                    lines.push(`${padRank}. ${emoji} ${team}`);
                });
            }

            lines.push('━━━━━━━━━━━━━━━━━━━━━');
            lines.push('Submitted via CFB Top 25 Community Ballot');

            return lines.join('\n');
        }

        function shareTop25(weekNum) {
            const title = 'CFB Top 25 Ballot';
            const text = generateTop25ShareText(weekNum);
            copyOrShareText(title, text);
        }


        /**
         * Shares text via native Web Share API (mobile) or writes to clipboard with visual toast fallback.
         */
        async function copyOrShareText(title, text) {
            if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent || '')) {
                try {
                    await navigator.share({ title, text });
                    return;
                } catch (e) {
                    // Fall through to clipboard copy if user dismissed or cancelled
                }
            }

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    if (typeof showSaveToast === 'function') {
                        showSaveToast("Copied to clipboard! Ready to paste into group chat.");
                    }
                    return;
                }
            } catch (err) {
                // Clipboard blocked by permission or non-HTTPS environment
            }

            // Display fallback modal with selectable text
            openShareModal(title, text);
        }

        function shareWeeklyPicks(weekNum) {
            const title = `${currentSport} Week Picks`;
            const text = generateWeeklyShareText(weekNum);
            copyOrShareText(title, text);
        }

        function shareBonusBets(weekNum) {
            const title = `${currentSport} Bet Slip`;
            const text = generateBonusBetsShareText(weekNum);
            copyOrShareText(title, text);
        }

        function openShareModal(title, text) {
            const modal = document.getElementById('share-modal');
            const titleEl = document.getElementById('share-modal-title');
            const textarea = document.getElementById('share-modal-textarea');
            const indicator = document.getElementById('share-modal-copied-indicator');
            if (!modal || !textarea) return;

            if (titleEl) titleEl.innerText = title || 'Share Slip';
            textarea.value = text || '';
            if (indicator) indicator.classList.add('hidden');
            modal.classList.remove('hidden');
            textarea.focus();
            textarea.select();
        }

        function closeShareModal() {
            const modal = document.getElementById('share-modal');
            if (modal) modal.classList.add('hidden');
        }

        async function copyShareModalText() {
            const textarea = document.getElementById('share-modal-textarea');
            const indicator = document.getElementById('share-modal-copied-indicator');
            if (!textarea) return;

            try {
                textarea.select();
                document.execCommand('copy');
                if (indicator) indicator.classList.remove('hidden');
                if (typeof showSaveToast === 'function') {
                    showSaveToast("Copied to clipboard! Ready to paste.");
                }
            } catch (e) {
                alert("Please press Cmd+C / Ctrl+C to copy the text.");
            }
        }



