        // --- SECTION 4: STATS & VISUALIZATIONS ---
        function calculateAccuracy() {
            let correct = 0; let gradedGames = 0;
            const container = document.getElementById('results-container');
            if(!container) return;
            container.innerHTML = '';
            
            const confStats = {}; const teamStats = {};
            const activeResults = getActiveResults();
            const activeWeeklyPicks = getActiveWeeklyPicks();
            const activePicks = getActivePicks();

            Object.keys(activeResults).forEach(gameKey => {
                const effectivePick = activeWeeklyPicks[gameKey] || activePicks[gameKey];
                if (effectivePick) {
                    gradedGames++;
                    const isCorrect = effectivePick === activeResults[gameKey];
                    if (isCorrect) correct++;

                    const [teamA, teamB] = gameKey.includes(" at ") ? gameKey.split(" at ") : gameKey.replace(" (Neutral)", "").split(" vs ");
                    [teamA, teamB].forEach(t => {
                        if (!teamStats[t]) teamStats[t] = { correct: 0, total: 0 };
                        teamStats[t].total++;
                        if (isCorrect) teamStats[t].correct++;
                    });

                    const confA = getTeamConference(teamA, currentSport);
                    const confB = getTeamConference(teamB, currentSport);
                    if (confA) { if (!confStats[confA]) confStats[confA] = { correct: 0, total: 0 }; confStats[confA].total++; if (isCorrect) confStats[confA].correct++; }
                    if (confB && confB !== confA) { if (!confStats[confB]) confStats[confB] = { correct: 0, total: 0 }; confStats[confB].total++; if (isCorrect) confStats[confB].correct++; }

                    const displayKey = gameKey.includes(" at ") 
                        ? gameKey.replace(' at ', ' <span class="text-xs text-slate-400 font-normal">AT</span> ') 
                        : gameKey.replace(' vs ', ' <span class="text-xs text-slate-400 font-normal">AT</span> ');

                    const resultDiv = document.createElement('div');
                    const borderStripe = isCorrect ? 'stripe-win border-l-8 border-l-[#4DFFBC]' : 'stripe-loss border-l-8 border-l-[#FF4D4D]';
                    resultDiv.className = `p-3 rounded-md border border-slate-200 ${borderStripe} bg-white shadow-sm flex justify-between items-center`;
                    resultDiv.innerHTML = `
                        <span class="font-bold text-slate-800 text-sm">${displayKey}</span>
                        <div class="text-right">
                            <span class="inline-flex items-center gap-1 font-bold text-xs ${isCorrect ? 'text-[#059669]' : 'text-[#DC2626]'}">
                                <i data-lucide="${isCorrect ? 'check' : 'x'}" class="w-3.5 h-3.5"></i>
                                ${isCorrect ? 'Correct' : 'Missed'}
                            </span>
                        </div>
                    `;
                    container.appendChild(resultDiv);
                }
            });
            if (gradedGames === 0) container.innerHTML = '<p class="text-slate-500 italic p-2">Waiting for games to conclude...</p>';

            const accScore = document.getElementById('accuracy-score');
            const accFrac = document.getElementById('accuracy-fraction');
            let pct = gradedGames === 0 ? 0 : Math.round((correct / gradedGames) * 100);
            if(accScore) accScore.innerText = `${pct}%`;
            if(accFrac) accFrac.innerText = `${correct} / ${gradedGames} correct picks`;

            // CHART.JS Integration: Accuracy Donut Chart
            if(accChartInstance) accChartInstance.destroy();
            const ctxAcc = document.getElementById('accuracyChart');
            if(ctxAcc && gradedGames > 0) {
                accChartInstance = new Chart(ctxAcc, {
                    type: 'doughnut',
                    data: {
                        labels: ['Correct', 'Missed'],
                        datasets: [{
                            data: [correct, gradedGames - correct],
                            backgroundColor: ['#4DFFBC', '#FF4D4D'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });
            } else if (ctxAcc) {
                accChartInstance = new Chart(ctxAcc, {
                    type: 'doughnut',
                    data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#E2E8F0'], borderWidth: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
                });
            }

            const confContainer = document.getElementById('conf-accuracy-container');
            if(confContainer) {
                confContainer.innerHTML = '';
                Object.entries(confStats).forEach(([conf, stats]) => {
                    const perc = Math.round((stats.correct / stats.total) * 100);
                    confContainer.innerHTML += `
                        <div class="flex justify-between items-center mb-1 border-b border-slate-100 pb-1 last:border-0">
                            <span class="font-bold text-slate-700 text-sm">${conf}</span>
                            <span class="font-mono text-sm ${perc >= 50 ? 'text-[#059669]' : 'text-[#DC2626]'}">${stats.correct}/${stats.total} (${perc}%)</span>
                        </div>`;
                });
            }

            const teamContainer = document.getElementById('team-accuracy-container');
            if(teamContainer) {
                teamContainer.innerHTML = '';
                Object.entries(teamStats).sort((a, b) => b[1].total - a[1].total || (b[1].correct/b[1].total) - (a[1].correct/a[1].total)).slice(0, 10).forEach(([team, stats]) => {
                    const perc = Math.round((stats.correct / stats.total) * 100);
                    teamContainer.innerHTML += `
                        <div class="flex justify-between items-center mb-1 border-b border-slate-100 pb-1 last:border-0">
                            <div class="flex items-center">
                                ${teamLogos[team] ? `<img src="${teamLogos[team]}" alt="${team} logo" class="w-4 h-4 mr-2 logo-shadow object-contain">` : ''}
                                <span class="font-bold text-slate-700 text-sm">${team}</span>
                            </div>
                            <span class="font-mono text-xs ${perc >= 50 ? 'text-[#059669]' : 'text-[#DC2626]'}">${stats.correct}/${stats.total} (${perc}%)</span>
                        </div>`;
                });
            }
            renderIcons();
        }

        function renderVariance() {
            const container = document.getElementById('variance-container');
            if(!container) return;
            container.innerHTML = '';
            let teamVariances = [];
            
            const activeSchedule = getActiveSchedule();
            const activeWinTotals = getActiveWinTotals();
            const activePicks = getActivePicks();
            const activeWeeklyPicks = getActiveWeeklyPicks();
            const activeGamesByWeek = getActiveGamesByWeek();

            const getTeamRecord = team => Object.values(activeGamesByWeek).flat().reduce((record, game) => {
                if (game.home !== team && game.away !== team) return record;
                if (game.isCompleted) {
                    record.gamesPlayed++;
                    if (game.winner === team) record.actualWins++;
                }
                return record;
            }, { actualWins: 0, gamesPlayed: 0 });

            const getBetStatus = (actualWins, gamesPlayed, totalGames, line, side) => {
                const remainingGames = Math.max(0, totalGames - gamesPlayed);
                const canFinishOver = actualWins + remainingGames > line;
                const canFinishUnder = actualWins <= line;
                const hasHitOver = actualWins > line;
                const hasHitUnder = actualWins + remainingGames <= line;
                const isBust = side === 'OVER' ? !canFinishOver : !canFinishUnder;
                const isHit = side === 'OVER' ? hasHitOver : hasHitUnder;
                if (isBust) return 'BUST';
                if (isHit) return 'HIT';

                const distanceToLine = Math.abs(actualWins - line);
                const distanceToMax = Math.abs((actualWins + remainingGames) - line);
                if (distanceToLine <= 2 || distanceToMax <= 2) return 'BUBBLE';
                return 'LIVE';
            };

            Object.keys(activeWinTotals).forEach(team => {
                let pickedWins = 0;
                const teamConf = getTeamConference(team, currentSport);
                if (teamConf && activeSchedule[teamConf][team]) {
                    activeSchedule[teamConf][team].forEach(item => {
                        const matchStr = item.split("|")[1].trim();
                        let opponent = matchStr;
                        let prefix = "vs";
                        
                        if (matchStr.startsWith("VS. (Neutral) ")) { opponent = matchStr.replace("VS. (Neutral) ", ""); prefix = "VS. (Neutral)"; }
                        else if (matchStr.startsWith("at ")) { opponent = matchStr.replace("at ", ""); prefix = "at"; }
                        else if (matchStr.startsWith("vs ")) { opponent = matchStr.replace("vs ", ""); prefix = "vs"; }
                        
                        const gameKey = generateGameKey(team, opponent, prefix);
                        const effectivePick = activeWeeklyPicks[gameKey] || activePicks[gameKey];
                        if (effectivePick === team) pickedWins++;
                    });
                }
                const fdLine = activeWinTotals[team];
                const record = getTeamRecord(team);
                const side = pickedWins > fdLine ? 'OVER' : 'UNDER';
                const status = getBetStatus(record.actualWins, record.gamesPlayed, 12, fdLine, side);
                const diff = (pickedWins - fdLine).toFixed(1);
                teamVariances.push({ team, actualWins: record.actualWins, pickedWins, fdLine, side, status, diff: parseFloat(diff), absDiff: Math.abs(diff) });
            });
            
            teamVariances.sort((a, b) => b.absDiff - a.absDiff);

            // CHART.JS Integration: Variance Bar Chart
            if(varChartInstance) varChartInstance.destroy();
            const ctxVar = document.getElementById('varianceChart');
            if(ctxVar && teamVariances.length > 0) {
                const topTeams = teamVariances.slice(0, 15); // Show top 15 highest variance teams on chart
                varChartInstance = new Chart(ctxVar, {
                    type: 'bar',
                    data: {
                        labels: topTeams.map(t => t.team),
                        datasets: [
                            { label: 'Actual Wins', data: topTeams.map(t => t.actualWins), backgroundColor: '#4DFFBC', borderRadius: 4 },
                            { label: 'Picked Wins', data: topTeams.map(t => t.pickedWins), backgroundColor: '#7C3AED', borderRadius: 4 },
                            { label: 'FanDuel Line', data: topTeams.map(t => t.fdLine), backgroundColor: '#94A3B8', borderRadius: 4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'top' } } }
                });
            }

            teamVariances.forEach((tv, index) => {
                const statusStyles = {
                    LIVE: 'text-blue-600 bg-blue-50 border border-blue-200',
                    BUBBLE: 'text-amber-700 bg-amber-50 border border-amber-200',
                    HIT: 'text-[#059669] bg-[#4DFFBC]/20 border border-[#4DFFBC]/40',
                    BUST: 'text-[#DC2626] bg-[#FF4D4D]/20 border border-[#FF4D4D]/40'
                };
                const row = document.createElement('div');
                row.className = `flex justify-between items-center p-3 border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`;
                let logoHTML = teamLogos[tv.team] ? `<img src="${teamLogos[tv.team]}" alt="${tv.team} logo" class="w-5 h-5 mr-2 logo-shadow object-contain hidden md:inline-block">` : '';
                row.innerHTML = `
                    <div class="flex items-center w-1/5">
                        ${logoHTML}
                        <span class="font-bold text-slate-800 text-sm truncate">${tv.team}</span>
                    </div>
                    <span class="w-1/6 text-center font-mono font-bold text-sm text-slate-900">${tv.actualWins}</span>
                    <span class="w-1/6 text-center font-mono text-purple-600 font-bold text-sm">${tv.pickedWins}</span>
                    <span class="w-1/6 text-center font-black text-sm ${tv.side === 'OVER' ? 'text-[#059669]' : 'text-[#DC2626]'}">${tv.side}</span>
                    <span class="w-1/6 text-center font-mono text-sm text-slate-500">${tv.fdLine}</span>
                    <span class="w-1/6 text-right"><span class="inline-block rounded px-2 py-0.5 text-[10px] font-black tracking-wider ${statusStyles[tv.status]}">${tv.status}</span></span>
                `;
                container.appendChild(row);
            });
            renderIcons();
        }
