        // --- SECTION 1: SEASON TAB ---
        function updateProgressUI() {
            const uniqueGames = getActiveSeasonGameKeys();
            let pickedCount = 0;
            const activeSchedule = getActiveSchedule();
            const activePicks = getActivePicks();

            const totalGames = uniqueGames.size;
            uniqueGames.forEach(gameKey => { if (activePicks[gameKey]) pickedCount++; });
            const progressEl = document.getElementById('overall-progress');
            if (progressEl) progressEl.innerText = `${pickedCount} / ${totalGames}`;
            const confSelect = document.getElementById('conference-select');
            const conf = confSelect ? confSelect.value : null;
            const teamSelect = document.getElementById('team-select');
            if (teamSelect && conf && activeSchedule[conf]) {
                Array.from(teamSelect.options).forEach(opt => {
                    const t = opt.value;
                    let isComplete = true;
                    if (activeSchedule[conf][t]) {
                        activeSchedule[conf][t].forEach(item => {
                            const parsed = parseScheduleItem(item);
                            if (!activePicks[generateGameKey(t, parsed.opponent, parsed.prefix)]) isComplete = false;
                        });
                    }
                    opt.innerText = isComplete ? t : `• ${t}`;
                });
            }
        }

        function autoPick(strategy) {
            if (isSeasonLocked()) return alert("Picks are locked for the season!");
            const confSelect = document.getElementById('conference-select');
            const teamSelect = document.getElementById('team-select');
            if(!confSelect || !teamSelect) return;
            const conf = confSelect.value;
            const team = teamSelect.value;
            const activeSchedule = getActiveSchedule();
            const activePicks = getActivePicks();
            
            if(!activeSchedule[conf] || !activeSchedule[conf][team]) return;
            activeSchedule[conf][team].forEach(item => {
                const parsed = parseScheduleItem(item);
                const opponent = parsed.opponent;
                const isHome = parsed.prefix === "vs";
                const isNeutral = parsed.prefix === "VS. (Neutral)";
                const gameKey = generateGameKey(team, opponent, parsed.prefix);
                
                let pickedWinner = "";
                if (strategy === 'home') {
                    pickedWinner = isHome || isNeutral ? team : opponent;
                } else if (strategy === 'chalk') {
                    const prob = getMatchupPredictor(team, opponent, isNeutral ? null : isHome);
                    pickedWinner = prob >= 50 ? team : opponent;
                }
                activePicks[gameKey] = pickedWinner;
            });
            
            const storageKey = currentSport === 'CFB' ? 'cfbPicks_2026_User_' : 'nflPicks_2026_User_';
            localStorage.setItem(storageKey + currentUser, JSON.stringify(activePicks));
            markPicksDirty('preseason');
            savePickImmediately('picks', activePicks);
            renderSchedule();
            showSaveToast();
        }

        function loadTeams() {
            const confSelect = document.getElementById('conference-select');
            const teamSelect = document.getElementById('team-select');
            if(!confSelect || !teamSelect) return;
            const conf = confSelect.value;
            teamSelect.innerHTML = '';
            
            const activeSchedule = getActiveSchedule();
            if (activeSchedule[conf]) {
                const teams = Object.keys(activeSchedule[conf]).sort();
                teams.forEach(team => {
                    let opt = document.createElement('option'); 
                    opt.value = team; 
                    opt.innerText = team; 
                    teamSelect.appendChild(opt);
                });
                
                if (conf === 'SEC' && activeSchedule['SEC']['Georgia']) teamSelect.value = 'Georgia';
                else if (conf === 'NFL' && activeSchedule['NFL']['Kansas City Chiefs']) teamSelect.value = 'Kansas City Chiefs';
                else teamSelect.value = teams[0];
            }
            if (currentUser) renderSchedule();
        }

        function getCompletedGameResult(gameKey) {
            const activeGameScores = getActiveGameScores();
            let gameData = activeGameScores ? activeGameScores[gameKey] : null;
            if (!gameData) {
                const activeGames = getActiveGamesByWeek();
                if (activeGames) {
                    for (const w in activeGames) {
                        const found = activeGames[w]?.find(g => g.gameKey === gameKey);
                        if (found) { gameData = found; break; }
                    }
                }
            }
            if (!gameData) {
                const allScores = [cfbGameScores, nflGameScores];
                for (const s of allScores) {
                    if (s && s[gameKey]) { gameData = s[gameKey]; break; }
                }
            }
            if (!gameData) {
                const allDicts = [cfbGamesByWeek, nflGamesByWeek];
                for (const dict of allDicts) {
                    if (!dict) continue;
                    for (const w in dict) {
                        const found = dict[w]?.find(g => g.gameKey === gameKey);
                        if (found) { gameData = found; break; }
                    }
                    if (gameData) break;
                }
            }

            const activeResults = getActiveResults();
            if (gameData) {
                const isDone = !!(gameData.isCompleted || gameData.winner || gameData.statusState === 'post');
                let win = gameData.winner || (activeResults ? activeResults[gameKey] : null);
                if (!win && gameData.homeScore !== undefined && gameData.awayScore !== undefined && gameData.homeScore !== '' && gameData.awayScore !== '') {
                    const hs = Number(gameData.homeScore);
                    const as = Number(gameData.awayScore);
                    if (!isNaN(hs) && !isNaN(as) && hs !== as) {
                        win = hs > as ? gameData.home : gameData.away;
                    }
                }
                if (win && activeResults) activeResults[gameKey] = win;
                return { isCompleted: isDone, winner: win, game: gameData };
            }

            if (activeResults && activeResults[gameKey]) {
                return { isCompleted: true, winner: activeResults[gameKey], game: null };
            }

            return { isCompleted: false, winner: null, game: null };
        }

        function renderSchedule() {
            const confSelect = document.getElementById('conference-select');
            const teamSelect = document.getElementById('team-select');
            const container = document.getElementById('schedule-container');
            if(!confSelect || !teamSelect || !container) return;
            
            const conf = confSelect.value;
            const team = teamSelect.value;
            container.innerHTML = '';

            const activeSchedule = getActiveSchedule();
            if(!activeSchedule[conf] || !activeSchedule[conf][team]) return;

            const activeColors = getActiveColors();
            const activeWinTotals = getActiveWinTotals();
            const activePicks = getActivePicks();
            const activeResults = getActiveResults();

            const colors = activeColors[team] || { primary: "#E2E8F0", secondary: "#1E293B" };
            const bannerName = document.getElementById('banner-team-name');
            if(bannerName) bannerName.innerText = team;
            
            const bannerLogo = document.getElementById('banner-team-logo');
            if(bannerLogo) {
                if(teamLogos[team]) {
                    bannerLogo.src = teamLogos[team];
                    bannerLogo.classList.remove('hidden');
                } else {
                    bannerLogo.classList.add('hidden');
                }
            }

            if (currentSport === 'CFB') {
                const sosRankNum = fpiSosRank[team] ? `#${fpiSosRank[team]}` : "Top 60";
                const sosMetric = document.getElementById('sos-metric');
                if(sosMetric) sosMetric.innerHTML = `${sosRankNum}<span class="text-[10px] text-slate-400 font-normal ml-1">in FBS</span>`;
                const fpiValue = getCfbFPI(team);
                const pwrMetric = document.getElementById('power-metric');
                if(pwrMetric) pwrMetric.innerText = (fpiValue >= 0 ? "+" : "") + fpiValue.toFixed(1);
            }

            let pickedWins = 0;
            const isLocked = isSeasonLocked();
            if (activeSchedule[conf][team].length === 0) {
                 container.innerHTML = renderEmptyState('No Games Found', 'The season schedule for this team may not be released yet.', 'calendar');
                 renderIcons();
                 const pickCount = document.getElementById('picked-wins-count');
                 if(pickCount) pickCount.innerText = "0";
                 updateProgressUI();
                 return;
            }

            activeSchedule[conf][team].forEach((item) => {
                const parsed = parseScheduleItem(item);
                const opponent = parsed.opponent;
                const prefix = parsed.prefix;
                const dateDisplay = parsed.dateDisplay;
          
                const gameKey = generateGameKey(team, opponent, prefix);
                const currentPickWinner = activePicks[gameKey];

                if (currentPickWinner === team) pickedWins++;

                const isHome = prefix === "vs";
                const isNeutral = prefix === "VS. (Neutral)";

                // Evaluate outcome & pick grading
                const gameResult = getCompletedGameResult(gameKey);
                const isFinished = gameResult.isCompleted;
                const actualWinner = gameResult.winner;
                const gameData = gameResult.game;

                let rowBoxClass = "bg-white border-slate-200 hover:border-slate-300";
                let dividerBorderClass = "border-slate-100";

                if (isFinished && currentPickWinner) {
                    if (actualWinner && currentPickWinner === actualWinner) {
                        // Correct pick: light green shading
                        rowBoxClass = "bg-emerald-50 border-emerald-300 border-l-4 border-l-emerald-500 hover:border-emerald-400";
                        dividerBorderClass = "border-emerald-200/80";
                    } else {
                        // Incorrect pick: light red shading
                        rowBoxClass = "bg-rose-50 border-rose-300 border-l-4 border-l-rose-500 hover:border-rose-400";
                        dividerBorderClass = "border-rose-200/80";
                    }
                }

                // Stats Button
                const statsButtonHTML = renderGameSummaryBtn(gameKey, { label: 'Stats' });
        
                let visualBarHTML = "";
                const oppColors = activeColors[opponent] || { primary: "#64748B", secondary: "#FFFFFF" }; 
                if (currentSport === 'CFB') {
                    const teamProb = getMatchupPredictor(team, opponent, isNeutral ? null : isHome);
                    const oppProb = 100 - teamProb;
                    const oppBarColor = (oppColors.primary && oppColors.primary.toLowerCase() !== colors.primary.toLowerCase()) 
                        ? oppColors.primary 
                        : (oppColors.secondary === '#FFFFFF' ? '#000000' : oppColors.secondary);
                    visualBarHTML = `
                        <div class="w-full mt-2 pt-2 border-t ${dividerBorderClass}">
                            <div class="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1 text-slate-500">
                                <span>${teamProb}% ${team}</span>
                                <span class="flex items-center gap-1"><i data-lucide="bar-chart-2" class="w-3 h-3 text-blue-600"></i> FPI Predictor</span>
                                <span>${oppProb}% ${opponent}</span>
                            </div>
                            <div class="w-full h-1.5 rounded-sm flex overflow-hidden bg-slate-100 shadow-inner">
                                <div style="width: ${teamProb}%; background-color: ${colors.primary}" class="h-full"></div>
                                <div style="width: ${oppProb}%; background-color: ${oppBarColor}" class="h-full opacity-60"></div>
                            </div>
                        </div>
                    `;
                }

                // Bottom Section: Box Score & Final Score
                let bottomScoreHTML = "";
                const hasScores = gameData && (gameData.homeScore !== undefined && gameData.awayScore !== undefined && gameData.homeScore !== null && gameData.awayScore !== null && gameData.homeScore !== '');
                if (hasScores) {
                    const homeTeam = gameData.home;
                    const awayTeam = gameData.away;
                    const homeScore = Number(gameData.homeScore) || 0;
                    const awayScore = Number(gameData.awayScore) || 0;
                    const homeWon = (actualWinner === homeTeam) || (homeScore > awayScore);
                    const awayWon = (actualWinner === awayTeam) || (awayScore > homeScore);
                    const homeLinescores = gameData.homeLinescores || [];
                    const awayLinescores = gameData.awayLinescores || [];
                    const numPeriods = Math.max(homeLinescores.length, awayLinescores.length);

                    if (numPeriods > 0) {
                        const periodHeadersHTML = Array.from({ length: numPeriods }, (_, i) => {
                            const qLabel = i < 4 ? `Q${i + 1}` : (numPeriods === 5 ? 'OT' : `OT${i - 3}`);
                            return `<th class="py-1 px-2 text-center font-bold">${qLabel}</th>`;
                        }).join('');

                        const awayPeriodScoresHTML = Array.from({ length: numPeriods }, (_, i) => {
                            const val = awayLinescores[i]?.displayValue ?? awayLinescores[i]?.value ?? '—';
                            return `<td class="py-1 px-2 text-center">${val}</td>`;
                        }).join('');

                        const homePeriodScoresHTML = Array.from({ length: numPeriods }, (_, i) => {
                            const val = homeLinescores[i]?.displayValue ?? homeLinescores[i]?.value ?? '—';
                            return `<td class="py-1 px-2 text-center">${val}</td>`;
                        }).join('');

                        const awayLogoSmall = teamLogos[awayTeam] ? `<img src="${teamLogos[awayTeam]}" alt="${awayTeam}" class="w-3.5 h-3.5 object-contain shrink-0">` : '';
                        const homeLogoSmall = teamLogos[homeTeam] ? `<img src="${teamLogos[homeTeam]}" alt="${homeTeam}" class="w-3.5 h-3.5 object-contain shrink-0">` : '';

                        bottomScoreHTML = `
                            <div class="w-full mt-2.5 pt-2.5 border-t ${dividerBorderClass}">
                                <div class="overflow-x-auto rounded border border-slate-200/90 bg-white/95 shadow-2xs">
                                    <table class="w-full text-[11px] font-mono border-collapse">
                                        <thead>
                                            <tr class="bg-slate-100/90 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                                                <th class="py-1 px-2.5 text-left font-bold text-slate-600">Team</th>
                                                ${periodHeadersHTML}
                                                <th class="py-1 px-2.5 text-center font-black text-slate-900 bg-slate-200/60">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 text-slate-700">
                                            <tr class="${awayWon ? 'bg-slate-50/70 font-black text-slate-950' : 'font-medium'}">
                                                <td class="py-1 px-2.5 text-left truncate max-w-[130px] flex items-center gap-1.5">
                                                    ${awayLogoSmall}
                                                    <span class="truncate ${awayWon ? 'font-black text-slate-900' : 'text-slate-700'}">${awayTeam}</span>
                                                </td>
                                                ${awayPeriodScoresHTML}
                                                <td class="py-1 px-2.5 text-center font-black ${awayWon ? 'text-slate-950 bg-slate-200/70' : 'text-slate-700 bg-slate-100/50'}">${awayScore}</td>
                                            </tr>
                                            <tr class="${homeWon ? 'bg-slate-50/70 font-black text-slate-950' : 'font-medium'}">
                                                <td class="py-1 px-2.5 text-left truncate max-w-[130px] flex items-center gap-1.5">
                                                    ${homeLogoSmall}
                                                    <span class="truncate ${homeWon ? 'font-black text-slate-900' : 'text-slate-700'}">${homeTeam}</span>
                                                </td>
                                                ${homePeriodScoresHTML}
                                                <td class="py-1 px-2.5 text-center font-black ${homeWon ? 'text-slate-950 bg-slate-200/70' : 'text-slate-700 bg-slate-100/50'}">${homeScore}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }
                }

                const row = document.createElement('div');
                row.className = `p-3.5 rounded-md shadow-sm border ${rowBoxClass} text-slate-800 flex flex-col transition-all`;

                let oppLogoHTML = renderTeamLogo(opponent, 'w-6 h-6', 'mr-2');

                row.innerHTML = `
                    <div class="flex items-center justify-between gap-2 sm:gap-3">
                        <div class="flex items-center space-x-2 min-w-0">
                            <span class="font-extrabold w-12 text-xs text-slate-400 uppercase tracking-wider shrink-0">${dateDisplay}</span>
                            <div class="flex items-center min-w-0">
                                <span class="font-bold text-xs uppercase tracking-wider text-slate-400 mr-2 shrink-0">${prefix}</span>
                                ${oppLogoHTML}
                                <span class="font-black text-sm sm:text-base text-slate-900 truncate">${opponent}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 shrink-0">
                            ${statsButtonHTML}
                            <div class="flex space-x-1.5 shrink-0">
                                <button onclick="makePick('${gameKey}', '${team}')"
                                    aria-label="Pick ${team} to win"
                                    title="Pick ${team} to win"
                                    class="w-8 h-8 rounded font-black transition-all text-xs flex items-center justify-center ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} ${currentPickWinner === team ? 'bg-[#4DFFBC] text-slate-950 font-black shadow-sm ring-1 ring-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                                    ${isLocked ? 'disabled' : ''}>W</button>
                                <button onclick="makePick('${gameKey}', '${opponent}')"
                                    aria-label="Pick ${opponent} to win"
                                    title="Pick ${opponent} to win"
                                    class="w-8 h-8 rounded font-black transition-all text-xs flex items-center justify-center ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} ${currentPickWinner === opponent ? 'bg-[#FF4D4D] text-white font-black shadow-sm ring-1 ring-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                                    ${isLocked ? 'disabled' : ''}>L</button>
                            </div>
                        </div>
                    </div>
                    ${visualBarHTML}
                    ${bottomScoreHTML}
                `;
                container.appendChild(row);
            });

            const pWinsEl = document.getElementById('picked-wins-count');
            if(pWinsEl) pWinsEl.innerText = pickedWins;
          
            const fdLineEl = document.getElementById('fanduel-line');
            if(fdLineEl) fdLineEl.innerText = activeWinTotals[team] !== undefined ? activeWinTotals[team] : 'N/A';
            
            updateProgressUI();
            renderIcons();
        }

        function makePick(gameKey, winnerTeamName) {
            if (isSeasonLocked()) return alert("Season picks are firmly locked!");
            const activePicks = getActivePicks();
            activePicks[gameKey] = winnerTeamName;
            
            const storageKey = currentSport === 'CFB' ? 'cfbPicks_2026_User_' : 'nflPicks_2026_User_';
            localStorage.setItem(storageKey + currentUser, JSON.stringify(activePicks));
            markPicksDirty('preseason');
            savePickImmediately('picks', activePicks);
            renderSchedule();
            showSaveToast();
        }

