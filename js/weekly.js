        // --- SECTION 2: WEEKLY TAB ---
        function determineCurrentWeek() {
            const now = new Date();
            const activeGames = getActiveGamesByWeek();
            const totalWeeks = currentSport === 'CFB' ? 15 : 18;
            let selectedWk = totalWeeks;
            for(let w=1; w<=totalWeeks; w++) {
                if (activeGames[w] && activeGames[w].some(g => now < g.dateObj)) {
                    selectedWk = w;
                    break;
                }
            }
            actualCurrentWeek = selectedWk;
            
            const weekSelect = document.getElementById('week-select');
            const lbWeekSelect = document.getElementById('lb-week-select');
            if(weekSelect) weekSelect.innerHTML = ''; 
            if(lbWeekSelect) lbWeekSelect.innerHTML = '';
            for(let w=1; w<=totalWeeks; w++) {
                const opt1 = document.createElement('option');
                opt1.value = w; opt1.innerText = `Week ${w}`; 
                if(weekSelect) weekSelect.appendChild(opt1);
                
                const opt2 = document.createElement('option'); opt2.value = w; opt2.innerText = `Week ${w}`;
                if(lbWeekSelect) lbWeekSelect.appendChild(opt2);
            }
            
            if (weekSelect) weekSelect.value = selectedWk;
            if (lbWeekSelect) lbWeekSelect.value = selectedWk;
        }


        function getGameQuarterTimeDisplay(game) {
            if (!game) return '';
            const detail = (game.statusDetail || '').trim();
            if (detail && !/^(Final|Scheduled|Pre-Game)/i.test(detail)) {
                return detail.replace(/\s+Quarter/i, '').replace(/\s+Qtr/i, '');
            }
            const period = Number(game.period) || 0;
            const clock = (game.clock || '').trim();
            if (!period && !clock) return 'LIVE';
            let pStr = '';
            if (period === 1) pStr = '1st';
            else if (period === 2) pStr = '2nd';
            else if (period === 3) pStr = '3rd';
            else if (period === 4) pStr = '4th';
            else if (period === 5) pStr = 'OT';
            else if (period > 5) pStr = `${period - 4}OT`;

            if (clock && pStr) return `${clock} - ${pStr}`;
            if (clock) return clock;
            if (pStr) return pStr;
            return 'LIVE';
        }

        async function renderWeeklySchedule() {
            const weekSelect = document.getElementById('week-select');
            if (!weekSelect) return;
            const weekNum = parseInt(weekSelect.value);
            const activeGames = getGamesForPicks(weekNum);
            const container = document.getElementById('weekly-schedule-container');
            const renderId = ++currentWeeklyRenderId;

            let pickedCount = 0;
            let actualUnits = 0;
            let potentialUnits = 0;
            const now = new Date();

            if (activeGames.length === 0) {
                container.innerHTML = renderEmptyState('No Games Scheduled', `There are no matchups scheduled for Week ${weekNum}.`, 'calendar');
                renderIcons();
                document.getElementById('weekly-progress').innerText = `0 / 0`;
                return;
            }

            const needsOdds = activeGames.some(g => g.mlHome === undefined || g.spread === undefined || g.overUnder === undefined);
            if (needsOdds) {
                container.innerHTML = `
                    <div class="text-center p-12 text-blue-600 font-bold flex flex-col items-center justify-center space-y-3">
                        <i data-lucide="refresh-cw" class="w-8 h-8 animate-spin text-blue-600"></i>
                        <span class="text-sm">Syncing Live Moneylines...</span>
                    </div>`;
                renderIcons();
                await loadOddsForWeek(weekNum);
            }
            
            if (renderId !== currentWeeklyRenderId) return;
            container.innerHTML = '';

            const activePicks = getActivePicks();
            const activeWeeklyPicks = getActiveWeeklyPicks();
            const activeColors = getActiveColors();

            let lastDayLabel = null;

            activeGames.forEach(game => {
                // --- Day-divider header ---
                const dayLabel = game.dateObj instanceof Date && !isNaN(game.dateObj)
                    ? game.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York' })
                    : null;
                if (dayLabel && dayLabel !== lastDayLabel) {
                    lastDayLabel = dayLabel;
                    const divider = document.createElement('div');
                    divider.className = 'flex items-center gap-3 mt-4 mb-1 first:mt-0';
                    divider.innerHTML = `
                        <span class="text-xs font-black uppercase tracking-widest text-white whitespace-nowrap">${dayLabel}</span>
                        <div class="flex-1 h-px bg-slate-200"></div>`;
                    container.appendChild(divider);
                }

                const effectivePick = activeWeeklyPicks[game.gameKey] || activePicks[game.gameKey];
                const isFinished = !!(game.isCompleted || game.winner || game.statusState === 'post');
                const isLive = !isFinished && game.statusState === 'in';
                const isLocked = now > game.dateObj || isLive || isFinished;
                const hasScores = (isLive || isFinished) && game.homeScore !== undefined && game.awayScore !== undefined && game.homeScore !== null && game.awayScore !== null && game.homeScore !== '';
                const homeScore = Number(game.homeScore) || 0;
                const awayScore = Number(game.awayScore) || 0;
                
                let mlNumForPick = 0;
                if (effectivePick === game.home) mlNumForPick = game.mlHomeNum;
                else if (effectivePick === game.away) mlNumForPick = game.mlAwayNum;

                if (effectivePick) {
                    pickedCount++;
                    if (mlNumForPick && mlNumForPick !== 0) {
                        if (isFinished) {
                            if (effectivePick === game.winner) actualUnits += calcUnitProfit(mlNumForPick);
                            else actualUnits -= 1;
                        } else {
                            potentialUnits += calcUnitProfit(mlNumForPick);
                        }
                    }
                }

                const team = game.home;
                const opponent = game.away;
                const teamRecord = getTeamCurrentRecord(team, currentSport);
                const oppRecord = getTeamCurrentRecord(opponent, currentSport);
                const teamRank = getGameTeamRank(game, team);
                const oppRank = getGameTeamRank(game, opponent);
                const teamRankPrefix = teamRank ? `#${teamRank} ` : '';
                const oppRankPrefix = oppRank ? `#${oppRank} ` : '';
                const teamColorsPrimary = activeColors[team] || { primary: "#334155", secondary: "#FFFFFF" };
                const teamColorsOpp = activeColors[opponent] || { primary: "#64748B", secondary: "#FFFFFF" };
                
                let teamProbText = game.mlHome ? `<span class="text-xs float-left mt-1 font-mono">${game.mlHome}</span>` : "";
                let oppProbText = game.mlAway ? `<span class="text-xs float-right mt-1 font-mono">${game.mlAway}</span>` : "";

                let statusTag = '';
                if (isFinished) statusTag = '<span class="inline-flex items-center gap-1 text-slate-500 font-bold text-[11px]"><i data-lucide="check" class="w-3.5 h-3.5 text-slate-400"></i> FINAL</span>';
                else if (isLive) statusTag = `<span class="inline-flex items-center gap-1.5 text-[#DC2626] bg-red-50 px-2 py-0.5 rounded border border-red-200 font-black text-[10px]"><span class="w-1.5 h-1.5 rounded-sm bg-[#FF4D4D] animate-pulse"></span> LIVE • ${getGameQuarterTimeDisplay(game)}</span>`;
                else if (isLocked) statusTag = '<span class="inline-flex items-center gap-1 text-[#DC2626] font-bold text-[11px]"><i data-lucide="lock" class="w-3 h-3 text-[#FF4D4D]"></i> LOCKED</span>';
                else statusTag = '<span class="inline-flex items-center gap-1 text-[#059669] font-bold text-[11px]"><i data-lucide="check-circle" class="w-3 h-3 text-[#4DFFBC]"></i> OPEN</span>';

                let rowBgClass = isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300';
                let resultBadge = '';
                if (isFinished && effectivePick) {
                    if (effectivePick === game.winner) {
                        rowBgClass = 'bg-white border-slate-200 stripe-win border-l-8 border-l-[#4DFFBC] shadow-sm';
                        resultBadge = '<span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#4DFFBC]/25 text-[#059669] flex items-center gap-1 shadow-sm"><i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i> WON</span>';
                    } else {
                        rowBgClass = 'bg-white border-slate-200 stripe-loss border-l-8 border-l-[#FF4D4D] shadow-sm';
                        resultBadge = '<span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF4D4D]/25 text-[#DC2626] flex items-center gap-1 shadow-sm"><i data-lucide="x" class="w-3.5 h-3.5 stroke-[3]"></i> LOST</span>';
                    }
                }

                const upsetInfo = (typeof checkUpsetAlert === 'function') ? checkUpsetAlert(game) : {};
                const upsetBadgeHTML = (typeof renderUpsetAlertBadge === 'function')
                    ? renderUpsetAlertBadge(game, { size: 'xs' })
                    : '';

                if (isLive && upsetInfo.isUpsetAlert) {
                    rowBgClass = upsetInfo.severity === 'critical'
                        ? 'bg-white border-rose-300 ring-2 ring-rose-400/40 shadow-md'
                        : 'bg-white border-amber-300 ring-2 ring-amber-400/30 shadow-md';
                }

                let teamLogoHTML = renderTeamLogo(team, 'w-7 h-7');
                let oppLogoHTML = renderTeamLogo(opponent, 'w-7 h-7');
                const isFutureWeek = weekNum > actualCurrentWeek;
                const consensusStats = (typeof getCommunityPickStats === 'function')
                    ? getCommunityPickStats(game.gameKey, opponent, team)
                    : { awayCount: 0, homeCount: 0, total: 0, awayPct: 0, homePct: 0 };
                const consensusBarHTML = (typeof renderConsensusBar === 'function')
                    ? renderConsensusBar(opponent, team, consensusStats)
                    : '';

                const row = document.createElement('div');
                row.className = `p-3 sm:p-4 rounded-xl shadow-sm border transition-all ${rowBgClass}`;

                row.innerHTML = `
                    <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5 border-b border-slate-200/80 pb-2">
                        <div class="flex space-x-2 sm:space-x-3 items-center flex-wrap gap-y-1">
                            <span class="font-bold text-slate-600">${game.dateStr}</span>
                            ${renderGameInfoBtn(game.gameKey, isFutureWeek, { size: 'xs' })}
                            ${isLocked ? renderGameSummaryBtn(game.gameKey, { size: 'xs' }) : ''}
                            ${resultBadge}
                            ${upsetBadgeHTML}
                        </div>
                        ${statusTag}
                    </div>
                    
                    <div class="flex flex-col gap-2">
                        <!-- Away Team Button Row -->
                        <button onclick="makeWeeklyPick('${game.gameKey}', '${opponent}', '${game.dateObj}', '${game.statusState}')" 
                            aria-label="Pick ${oppRankPrefix}${opponent} (${oppRecord}) to win"
                            class="w-full p-2.5 sm:p-3 rounded-lg font-black border transition-all flex items-center justify-between text-left ${isLocked ? 'cursor-not-allowed opacity-90' : 'hover:brightness-95 active:scale-[0.99]'} ${effectivePick === opponent ? 'ring-2 ring-purple-600 ring-offset-2 shadow-md' : 'border-black/10'}"
                            style="background-color: ${teamColorsOpp.primary}; color: ${teamColorsOpp.secondary}"
                            ${isLocked ? 'disabled' : ''}>
                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                ${oppLogoHTML}
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm sm:text-base font-black leading-tight">${oppRankPrefix}${opponent}</div>
                                    <div class="text-[11px] font-semibold opacity-85 leading-tight">${oppRecord}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0 ml-2">
                                ${isLive && hasScores ? renderScorePill(awayScore) : ''}
                                ${game.mlAway ? `<span class="font-mono text-xs font-bold px-2 py-1 rounded bg-black/20 text-current">${game.mlAway}</span>` : ''}
                                ${effectivePick === opponent ? `<span class="w-5 h-5 rounded-full bg-white text-purple-700 flex items-center justify-center font-black text-xs shadow-md shrink-0"><i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i></span>` : ''}
                            </div>
                        </button>

                        <!-- Middle Matchup Context Bar -->
                        <div class="flex items-center justify-between px-2 py-0.5 text-[11px] font-bold text-slate-500">
                            <span class="uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-1">
                                ${game.isNeutral ? '(Neutral)' : 'AT'}
                                ${isLive ? `<span class="text-[#DC2626] font-black">• ${getGameQuarterTimeDisplay(game)}</span>` : (isFinished ? (upsetInfo.isUpsetFinal ? '• Final (Upset)' : '• Final') : '')}
                            </span>
                            <div class="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-500">
                                ${game.spread ? `<span>Spread: <b class="text-slate-700">${game.spread}</b></span>` : ''}
                                ${game.overUnder ? `<span>O/U: <b class="text-slate-700">${game.overUnder}</b></span>` : ''}
                            </div>
                        </div>

                        <!-- Home Team Button Row -->
                        <button onclick="makeWeeklyPick('${game.gameKey}', '${team}', '${game.dateObj}', '${game.statusState}')" 
                            aria-label="Pick ${teamRankPrefix}${team} (${teamRecord}) to win"
                            class="w-full p-2.5 sm:p-3 rounded-lg font-black border transition-all flex items-center justify-between text-left ${isLocked ? 'cursor-not-allowed opacity-90' : 'hover:brightness-95 active:scale-[0.99]'} ${effectivePick === team ? 'ring-2 ring-purple-600 ring-offset-2 shadow-md' : 'border-black/10'}"
                            style="background-color: ${teamColorsPrimary.primary}; color: ${teamColorsPrimary.secondary}"
                            ${isLocked ? 'disabled' : ''}>
                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                ${teamLogoHTML}
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm sm:text-base font-black leading-tight">${teamRankPrefix}${team}</div>
                                    <div class="text-[11px] font-semibold opacity-85 leading-tight">${teamRecord}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0 ml-2">
                                ${isLive && hasScores ? renderScorePill(homeScore) : ''}
                                ${game.mlHome ? `<span class="font-mono text-xs font-bold px-2 py-1 rounded bg-black/20 text-current">${game.mlHome}</span>` : ''}
                                ${effectivePick === team ? `<span class="w-5 h-5 rounded-full bg-white text-purple-700 flex items-center justify-center font-black text-xs shadow-md shrink-0"><i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i></span>` : ''}
                            </div>
                        </button>
                    </div>

                    ${consensusBarHTML}
                `;
                container.appendChild(row);
            });

            document.getElementById('weekly-progress').innerText = `${pickedCount} / ${activeGames.length}`;
            
            const actualUnitsEl = document.getElementById('weekly-actual-units');
            if(actualUnitsEl) {
                actualUnitsEl.innerText = `${actualUnits > 0 ? '+' : ''}${actualUnits.toFixed(2)}`;
                actualUnitsEl.className = `text-2xl font-black font-mono ${actualUnits > 0 ? 'text-[#059669]' : (actualUnits < 0 ? 'text-[#DC2626]' : 'text-slate-800')}`;
            }

            const potentialUnitsEl = document.getElementById('weekly-potential-units');
            if(potentialUnitsEl) {
                potentialUnitsEl.innerText = `+${potentialUnits.toFixed(2)}`;
                potentialUnitsEl.className = `text-2xl font-black font-mono ${potentialUnits > 0 ? 'text-purple-600' : 'text-slate-400'}`;
            }
            renderIcons();
        }

        function makeWeeklyPick(gameKey, winner, dateString, statusState) {
            const gameDate = new Date(dateString);
            if (new Date() > gameDate || statusState === 'in' || statusState === 'post') {
                return alert("This game is locked or has already started.");
            }
            
            const activeWeeklyPicks = getActiveWeeklyPicks();
            activeWeeklyPicks[gameKey] = winner;
            
            const storageKey = currentSport === 'CFB' ? 'cfbPicks_2026_Weekly_' : 'nflPicks_2026_Weekly_';
            localStorage.setItem(storageKey + currentUser, JSON.stringify(activeWeeklyPicks));
            markPicksDirty('weekly');
            savePickImmediately('weeklyPicks', activeWeeklyPicks);
            renderWeeklySchedule();
            showSaveToast();
        }

