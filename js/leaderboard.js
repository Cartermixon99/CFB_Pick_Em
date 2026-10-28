        // --- SECTION 3: DUAL LEADERBOARDS ---
        function setLeaderboardMode(mode) {
            lbMode = mode;
            ['season', 'weekly', 'bonus'].forEach(item => {
                const button = document.getElementById(`btn-lb-${item}`);
                if (button) button.className = mode === item ? "w-1/3 py-2 rounded font-bold text-sm transition-all bg-white text-slate-900 shadow" : "w-1/3 py-2 rounded font-bold text-sm transition-all text-slate-300 hover:text-white";
            });
            const lbFilter = document.getElementById('lb-week-filter');
            if(lbFilter) {
                if (mode === 'weekly') lbFilter.classList.remove('hidden');
                else lbFilter.classList.add('hidden');
            }
            renderLeaderboard();
        }

        function renderLeaderboard() {
            const container = document.getElementById('leaderboard-container');
            const header = document.getElementById('leaderboard-header');
            if(!container || !header) return;
            container.innerHTML = '';
            
            const activeLeaderboard = getActiveLeaderboard();
            const activeResults = getActiveResults();
            const seasonGameKeys = getActiveSeasonGameKeys();
            if (activeLeaderboard.length === 0) {
                container.innerHTML = '<div class="p-6 text-center text-slate-500 italic font-bold">No players have submitted picks yet.</div>';
                return;
            }
            
            if (lbMode === 'bonus') {
                header.innerHTML = '<span class="w-16 text-center">Rank</span><span class="w-1/3">Player</span><span class="w-1/4 text-center">Allocated</span><span class="w-1/4 text-right">Total Bankroll</span>';
                const bonusPlayers = activeLeaderboard.map(player => ({ ...player, bankroll: calculateBankroll(player.bonusBets || {}) }));
                bonusPlayers.sort((a, b) => b.bankroll.total - a.bankroll.total || b.bankroll.available - a.bankroll.available);
                bonusPlayers.forEach((player, index) => {
                    const isMe = player.username === currentUser;
                    const rivalryBtn = (!isMe && currentUser) ? `
                        <button type="button" 
                            onclick="event.stopPropagation(); openRivalryModal('${highlightEscape(player.username)}')" 
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors shadow-2xs cursor-pointer shrink-0" 
                            title="Head-to-head rivalry vs ${highlightEscape(player.username)}">
                            <i data-lucide="swords" class="w-3 h-3 text-purple-600"></i>
                            <span class="hidden sm:inline">Rivalry</span>
                        </button>
                    ` : '';

                    const row = document.createElement('div');
                    row.className = `flex justify-between items-center p-4 border-b ${isMe ? 'bg-purple-50 border-l-4 border-purple-600' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50')} ${!isMe && currentUser ? 'hover:bg-purple-50/50 cursor-pointer transition-colors group' : ''}`;
                    if (!isMe && currentUser) {
                        row.onclick = () => openRivalryModal(player.username);
                    }
                    row.innerHTML = `<span class="w-16 text-center font-black text-slate-400 text-lg">#${index + 1}</span><span class="w-1/3 font-black text-base sm:text-lg flex items-center flex-wrap gap-1 ${isMe ? 'text-purple-700' : 'text-slate-800'}"><span class="truncate">${highlightEscape(player.username)}</span>${isMe ? ' <span class="text-xs text-purple-500 uppercase tracking-widest">(You)</span>' : ''}${rivalryBtn}</span><span class="w-1/4 text-center font-mono font-black text-lg text-amber-600">${player.bankroll.allocated.toFixed(2)}</span><span class="w-1/4 text-right font-mono font-black text-lg text-emerald-600">${player.bankroll.total.toFixed(2)}</span>`;
                    container.appendChild(row);
                });
                renderIcons();
            } else if (lbMode === 'season') {
                header.innerHTML = `
                    <span class="w-16 text-center">Rank</span>
                    <span class="w-1/3">Player</span>
                    <span class="w-1/5 text-center">Picks</span>
                    <span class="w-1/5 text-center">Score</span>
                    <span class="w-1/5 text-right">Accuracy</span>
                `;
                let gradedPlayers = activeLeaderboard.map(player => {
                    let correct = 0; let graded = 0;
                    Object.keys(activeResults).forEach(gameKey => {
                        if (player.picks && player.picks[gameKey]) {
                            graded++;
                            if (player.picks[gameKey] === activeResults[gameKey]) correct++;
                        }
                    });
                    const selectedSeasonGames = [...seasonGameKeys].filter(gameKey => player.picks && player.picks[gameKey]).length;
                    const pickCount = Object.values(player.picks || {}).filter(Boolean).length;
                    return { ...player, correct, graded, pickCount, pct: graded === 0 ? 0 : (correct / graded) * 100, hasCompleteSeasonPicks: seasonGameKeys.size > 0 && selectedSeasonGames === seasonGameKeys.size };
                });
                gradedPlayers.sort((a, b) => b.pct - a.pct || b.correct - a.correct);
                renderLeaderboardRows(gradedPlayers, container, false);
            } else {
                header.innerHTML = `
                    <span class="w-12 text-center">Rank</span>
                    <span class="w-1/3">Player</span>
                    <span class="w-1/5 text-center hidden md:inline-block">Score</span>
                    <span class="w-1/5 text-center">Acc</span>
                    <span class="w-1/5 text-right text-indigo-600">Units</span>
                `;
                const lbWeekSel = document.getElementById('lb-week-select');
                const selectedWk = lbWeekSel ? (parseInt(lbWeekSel.value) || 1) : 1;
                container.innerHTML = '<div class="p-6 text-center text-slate-500 font-bold animate-pulse">Calculating Live Units...</div>';
                loadOddsForWeek(selectedWk).then(() => {
                    container.innerHTML = '';
                    const weekGames = getActiveGamesByWeek()[selectedWk] || [];
                    
                    let gradedPlayers = activeLeaderboard.map(player => {
                        let correct = 0; let graded = 0; let units = 0;
                        weekGames.forEach(game => {
                            const effectivePick = (player.weeklyPicks && player.weeklyPicks[game.gameKey]) ? player.weeklyPicks[game.gameKey] : (player.picks && player.picks[game.gameKey]);
                            if (game.isCompleted && effectivePick) {
                                graded++;
                                let mlPickNum = effectivePick === game.home ? game.mlHomeNum : game.mlAwayNum;
                                if (effectivePick === game.winner) {
                                    correct++;
                                    if (mlPickNum && mlPickNum !== 0) units += calcUnitProfit(mlPickNum);
                                } else {
                                    if (mlPickNum && mlPickNum !== 0) units -= 1;
                                }
                            }
                        });
                        const selectedSeasonGames = [...seasonGameKeys].filter(gameKey => player.picks && player.picks[gameKey]).length;
                        const pickCount = Object.values(player.weeklyPicks || {}).filter(Boolean).length;
                        return { ...player, correct, graded, pickCount, pct: graded === 0 ? 0 : (correct / graded) * 100, units, hasCompleteSeasonPicks: seasonGameKeys.size > 0 && selectedSeasonGames === seasonGameKeys.size };
                    });
                    gradedPlayers.sort((a, b) => b.units - a.units || b.pct - a.pct || b.correct - a.correct);
                    renderLeaderboardRows(gradedPlayers, container, true);
                });
            }
        }
        
        function renderLeaderboardRows(gradedPlayers, container, isWeekly) {
            gradedPlayers.forEach((player, index) => {
                const isMe = player.username === currentUser;
                const completePickBadge = player.hasCompleteSeasonPicks ? '<span class="complete-pick-badge">ALL SEASON</span>' : '';
                const rivalryBtn = (!isMe && currentUser) ? `
                    <button type="button" 
                        onclick="event.stopPropagation(); openRivalryModal('${highlightEscape(player.username)}')" 
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors shadow-2xs cursor-pointer shrink-0" 
                        title="Head-to-head rivalry vs ${highlightEscape(player.username)}">
                        <i data-lucide="swords" class="w-3 h-3 text-purple-600"></i>
                        <span class="hidden sm:inline">Rivalry</span>
                    </button>
                ` : '';

                const row = document.createElement('div');
                row.className = `flex justify-between items-center p-4 border-b ${isMe ? 'bg-purple-50 border-l-4 border-purple-600' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50')} ${!isMe && currentUser ? 'hover:bg-purple-50/40 cursor-pointer transition-colors group' : ''}`;
                if (!isMe && currentUser) {
                    row.onclick = () => openRivalryModal(player.username);
                }
                
                if (isWeekly) {
                    const unitColor = player.units > 0 ? 'text-emerald-600' : (player.units < 0 ? 'text-red-600' : 'text-slate-600');
                    const unitSign = player.units > 0 ? '+' : '';
                    row.innerHTML = `
                        <span class="w-12 text-center font-black text-slate-400 text-lg">#${index + 1}</span>
                        <span class="w-1/3 font-black text-base sm:text-lg flex items-center flex-wrap gap-1 ${isMe ? 'text-purple-700' : 'text-slate-800'}">
                            <span class="truncate">${highlightEscape(player.username)}</span>
                            ${completePickBadge}
                            ${isMe ? '<span class="text-xs text-purple-500 uppercase tracking-widest block ml-1">(You)</span>' : ''}
                            ${rivalryBtn}
                        </span>
                        <span class="w-1/5 text-center font-mono font-bold text-slate-600 hidden md:inline-block">${player.correct}/${player.graded}</span>
                        <span class="w-1/5 text-center font-mono font-black text-lg ${player.pct >= 50 || player.graded === 0 ? 'text-emerald-600' : 'text-red-600'}">${player.pct.toFixed(1)}%</span>
                        <span class="w-1/5 text-right font-mono font-black text-lg ${unitColor}">${unitSign}${player.units.toFixed(2)}</span>
                    `;
                } else {
                    row.innerHTML = `
                        <span class="w-16 text-center font-black text-slate-400 text-lg">#${index + 1}</span>
                        <span class="w-1/3 font-black text-base sm:text-lg flex items-center flex-wrap gap-1 ${isMe ? 'text-purple-700' : 'text-slate-800'}">
                            <span class="truncate">${highlightEscape(player.username)}</span>
                            ${completePickBadge}
                            ${isMe ? '<span class="text-xs text-purple-500 uppercase tracking-widest block ml-1">(You)</span>' : ''}
                            ${rivalryBtn}
                        </span>
                        <span class="w-1/5 text-center font-mono font-black text-slate-600">${player.pickCount}</span>
                        <span class="w-1/5 text-center font-mono font-bold text-slate-600">${player.correct} / ${player.graded}</span>
                        <span class="w-1/5 text-right font-mono font-black text-lg ${player.pct >= 50 || player.graded === 0 ? 'text-emerald-600' : 'text-red-600'}">${player.pct.toFixed(1)}%</span>
                    `;
                }
                container.appendChild(row);
            });
            renderIcons();
        }

        function setHighlightsScope(scope) {
            highlightsScope = scope;
            const weekButton = document.getElementById('highlight-week-btn');
            const yearButton = document.getElementById('highlight-year-btn');
            const weekFilter = document.getElementById('highlight-week-filter');
            if (weekButton) weekButton.className = scope === 'week' ? 'px-4 py-2 rounded font-black text-sm bg-white text-slate-950 shadow' : 'px-4 py-2 rounded font-black text-sm text-slate-300 hover:text-white';
            if (yearButton) yearButton.className = scope === 'year' ? 'px-4 py-2 rounded font-black text-sm bg-white text-slate-950 shadow' : 'px-4 py-2 rounded font-black text-sm text-slate-300 hover:text-white';
            if (weekFilter) weekFilter.classList.toggle('hidden', scope === 'year');
            renderHighlights();
        }

        function highlightEscape(value) {
            return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
        }

        function highlightPickText(entry) {
            const matchup = entry.game.away === entry.game.home ? entry.game.home : `${entry.game.away} at ${entry.game.home}`;
            const result = entry.result && entry.result !== 'pending' ? `Result: ${entry.result}` : (entry.game.winner ? `Result: ${entry.game.winner}` : 'Result pending');
            const selection = entry.market ? `${entry.market}: ${entry.side}` : `Pick: ${entry.pick}`;
            return `${matchup} | ${selection} | ${result}`;
        }

        function getBonusWagerResult(game, market, wager) {
            if (!game || (!game.isCompleted && game.statusState !== 'post' && !game.winner) || !wager || !wager.side) return null;
            if (market === 'moneyline') return game.winner ? (wager.side === game.winner ? 'win' : 'loss') : 'push';
            if (!Number.isFinite(Number(game.homeScore)) || !Number.isFinite(Number(game.awayScore))) return null;
            const homeScore = Number(game.homeScore);
            const awayScore = Number(game.awayScore);
            if (market === 'spread') {
                const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
                const line = hasWagerLine ? Number(wager.line) : Number(wager.side === game.home ? game.spreadHome : game.spreadAway);
                if (!Number.isFinite(line)) return null;
                const margin = wager.side === game.home ? homeScore + line - awayScore : awayScore + line - homeScore;
                return margin > 0 ? 'win' : (margin < 0 ? 'loss' : 'push');
            }
            const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
            const line = hasWagerLine ? Number(wager.line) : Number(game.overUnder);
            if (!Number.isFinite(line)) return null;
            const difference = homeScore + awayScore - line;
            return difference === 0 ? 'push' : ((wager.side === 'Over') === (difference > 0) ? 'win' : 'loss');
        }

        function highlightMetricCard(metric, record, tone) {
            if (!record) return `<article class="highlight-card rounded-md border border-slate-200 bg-white p-4 flex flex-col justify-center"><p class="text-xs font-black uppercase tracking-widest text-slate-400">${metric.label}</p><p class="mt-3 text-sm font-bold text-slate-500">No qualifying picks yet</p></article>`;
            const valueColor = tone === 'good' ? 'text-[#059669]' : 'text-[#DC2626]';
            const borderStripe = tone === 'good' ? 'stripe-win border-l-8 border-l-[#4DFFBC]' : 'stripe-loss border-l-8 border-l-[#FF4D4D]';
            return `<article class="highlight-card rounded-md border border-slate-200 ${borderStripe} bg-white shadow-sm p-4 flex flex-col">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">${metric.label}</p>
                <p class="mt-2 text-2xl font-black font-mono ${valueColor}">${highlightEscape(metric.format(record.value))}</p>
                <p class="mt-1 font-black text-slate-900 truncate">${highlightEscape(record.username)}</p>
                <p class="mt-2 text-xs leading-5 font-bold text-slate-600">${highlightEscape(metric.detail(record))}</p>
                ${metric.showEntry && record.entry ? `<p class="mt-auto pt-3 border-t border-slate-100 text-[11px] leading-4 font-bold text-slate-500">${highlightEscape(highlightPickText(record.entry))}</p>` : ''}
            </article>`;
        }

        function renderFinalizedUserPicks() {
            const select = document.getElementById('highlight-user-select');
            const container = document.getElementById('finalized-user-picks-container');
            if (!select || !container) return;
            const usernames = highlightsFinalizedRecords
                .filter(record => record.finalizedEntries.length)
                .map(record => record.username)
                .sort((first, second) => {
                    if (currentUser) {
                        if (first === currentUser) return -1;
                        if (second === currentUser) return 1;
                    }
                    return first.localeCompare(second);
                });
            const selectedUser = usernames.includes(select.value)
                ? select.value
                : (currentUser && usernames.includes(currentUser) ? currentUser : usernames[0]);
            select.innerHTML = usernames.length
                ? usernames.map(username => `<option value="${highlightEscape(username)}">${highlightEscape(username)}${username === currentUser ? ' (You)' : ''}</option>`).join('')
                : '<option value="">No finalized picks yet</option>';
            select.value = selectedUser || '';
            const record = highlightsFinalizedRecords.find(item => item.username === selectedUser);
            if (!record) {
                container.innerHTML = '<div class="md:col-span-2 rounded-md border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">No finalized picks found for this period.</div>';
                return;
            }
            container.innerHTML = record.finalizedEntries.slice().sort((first, second) => second.game.dateObj - first.game.dateObj).map(entry => {
                const borderStripe = entry.result === 'win' ? 'stripe-win border-l-8 border-l-[#4DFFBC]' : entry.result === 'loss' ? 'stripe-loss border-l-8 border-l-[#FF4D4D]' : 'stripe-push border-l-8 border-l-slate-400';
                const resultBadge = entry.result === 'win' 
                    ? `<span class="rounded px-2 py-0.5 text-[10px] font-black uppercase bg-[#4DFFBC]/20 text-[#059669] flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Win +${entry.profit.toFixed(2)}</span>`
                    : entry.result === 'loss'
                    ? `<span class="rounded px-2 py-0.5 text-[10px] font-black uppercase bg-[#FF4D4D]/20 text-[#DC2626] flex items-center gap-1"><i data-lucide="x" class="w-3 h-3"></i> Loss -${entry.amount.toFixed(2)}</span>`
                    : `<span class="rounded px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 text-slate-700">Push</span>`;
                return `<article class="rounded-md border border-slate-200 ${borderStripe} bg-white shadow-sm p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-xs font-black uppercase tracking-widest text-slate-400">${highlightEscape(entry.game.dateStr || 'Finalized')}</p><h4 class="mt-1 font-black text-slate-900">${highlightEscape(entry.game.away)} at ${highlightEscape(entry.game.home)}</h4></div>${resultBadge}</div><p class="mt-3 text-sm font-bold text-slate-700">${highlightEscape(`${entry.market}: ${entry.side}`)}</p><p class="mt-1 text-xs font-bold text-slate-400">Stake: ${entry.amount.toFixed(2)}</p></article>`;
            }).join('');
            renderIcons();
        }

        async function renderHighlights() {
            const weekSelect = document.getElementById('highlight-week-select');
            const status = document.getElementById('highlights-status');
            const knowers = document.getElementById('ball-knowers-container');
            const busts = document.getElementById('busts-container');
            if (!weekSelect || !status || !knowers || !busts) return;

            const totalWeeks = currentSport === 'CFB' ? 15 : 18;
            if (weekSelect.options.length !== totalWeeks) {
                weekSelect.innerHTML = '';
                for (let week = 1; week <= totalWeeks; week++) weekSelect.add(new Option(`Week ${week}`, week));
                weekSelect.value = actualCurrentWeek;
            }
            const selectedWeek = parseInt(weekSelect.value, 10) || actualCurrentWeek;
            const weeks = highlightsScope === 'year' ? Array.from({ length: totalWeeks }, (_, index) => index + 1) : [selectedWeek];
            const renderId = ++highlightsRenderId;
            status.classList.remove('hidden');
            status.innerText = `Loading ${highlightsScope === 'year' ? 'season' : `Week ${selectedWeek}`} records...`;
            knowers.innerHTML = '';
            busts.innerHTML = '';
            await Promise.all(weeks.map(week => loadOddsForWeek(week)));
            if (renderId !== highlightsRenderId) return;

            const rawPlayers = getActiveLeaderboard();
            const players = [...rawPlayers];
            if (currentUser) {
                const userIndex = players.findIndex(p => p.username === currentUser);
                const currentPlayerData = {
                    username: currentUser,
                    picks: getActivePicks(),
                    weeklyPicks: getActiveWeeklyPicks(),
                    bonusBets: getBonusBets()
                };
                if (userIndex >= 0) {
                    players[userIndex] = {
                        ...players[userIndex],
                        picks: currentPlayerData.picks || players[userIndex].picks,
                        weeklyPicks: currentPlayerData.weeklyPicks || players[userIndex].weeklyPicks,
                        bonusBets: currentPlayerData.bonusBets || players[userIndex].bonusBets
                    };
                } else {
                    players.push(currentPlayerData);
                }
            }
            const gamesByWeek = getActiveGamesByWeek();
            const records = players.map(player => {
                const pickEntries = [];
                const bonusEntries = [];
                weeks.forEach(week => {
                    (gamesByWeek[week] || []).forEach(game => {
                        const pick = player.weeklyPicks?.[game.gameKey] || player.picks?.[game.gameKey];
                        if (pick) pickEntries.push({ game, pick, graded: Boolean(game.isCompleted && game.winner), correct: game.winner === pick });
                        const wagers = player.bonusBets?.[game.gameKey] || {};
                        ['moneyline', 'spread', 'total'].forEach(market => {
                            const wager = wagers[market];
                            const amount = parseFloat(wager && wager.amount);
                            if (!wager || !wager.side || !Number.isFinite(amount) || amount <= 0) return;
                            const result = getBonusWagerResult(game, market, wager);
                            const profitIfWin = getBonusPotentialPayout(wager, market, game) - amount;
                            bonusEntries.push({ game, market, side: wager.side, amount, result, profitIfWin, settled: Boolean(result), won: result === 'win', profit: result === 'win' ? profitIfWin : (result === 'loss' ? -amount : 0) });
                        });
                    });
                });
                const graded = pickEntries.filter(entry => entry.graded);
                const wins = graded.filter(entry => entry.correct);
                const losses = graded.filter(entry => !entry.correct);
                const settledBonus = bonusEntries.filter(entry => entry.settled);
                const bonusWins = settledBonus.filter(entry => entry.won);
                const bonusLosses = settledBonus.filter(entry => entry.result === 'loss');
                return {
                    username: player.username || 'Anonymous player',
                    entries: bonusEntries,
                    finalizedEntries: settledBonus,
                    graded, wins, losses, bonusWins, bonusLosses, settledBonus,
                    accuracy: graded.length ? wins.length / graded.length * 100 : null,
                    units: settledBonus.reduce((total, entry) => total + entry.profit, 0),
                    maxProfit: bonusEntries.reduce((total, entry) => total + entry.profitIfWin, 0),
                    bestWin: bonusWins.length ? bonusWins.reduce((best, entry) => entry.profit > best.profit ? entry : best) : null,
                    worstLoss: bonusLosses.length ? bonusLosses.reduce((worst, entry) => entry.profit < worst.profit ? entry : worst) : null,
                    bestReturn: bonusWins.length ? bonusWins.reduce((best, entry) => entry.profitIfWin / entry.amount > best.profitIfWin / best.amount ? entry : best) : null,
                    worstReturn: bonusWins.length ? bonusWins.reduce((worst, entry) => entry.profitIfWin / entry.amount < worst.profitIfWin / worst.amount ? entry : worst) : null
                };
            });
            const eligible = (field, requireEntries = false) => records.filter(record => (requireEntries ? record.entries.length : record.graded.length) && record[field] !== null);
            const best = (field, compare, requireEntries = false) => {
                const candidates = eligible(field, requireEntries);
                if (!candidates.length) return null;
                const winner = candidates.reduce((current, record) => compare(record[field], current[field]) ? record : current);
                return { ...winner, value: winner[field], entry: field === 'accuracy' ? winner.graded[0] : winner.entries[0] };
            };
            const accuracyByPickCount = (pickType, tieBreaker) => {
                const candidates = records.filter(record => record.graded.length);
                if (!candidates.length) return null;
                const winner = candidates.reduce((current, record) => {
                    const currentCount = current[pickType].length;
                    const recordCount = record[pickType].length;
                    return recordCount > currentCount || (recordCount === currentCount && tieBreaker(record.accuracy, current.accuracy)) ? record : current;
                });
                return { ...winner, value: winner.accuracy, entry: winner.graded[0] };
            };
            const entryRecord = (field, entryField, compare, valueTransform = entry => entry[field], compareValue = valueTransform) => {
                const candidates = records.filter(record => record[entryField]);
                if (!candidates.length) return null;
                const winner = candidates.reduce((current, record) => compare(compareValue(record[entryField]), compareValue(current[entryField])) ? record : current);
                return { username: winner.username, value: valueTransform(winner[entryField]), entry: winner[entryField] };
            };
            const period = highlightsScope === 'year' ? 'Full-year' : `Week ${selectedWeek}`;
            const metrics = [
                { label: 'Highest Accuracy', value: accuracyByPickCount('wins', (a, b) => a > b), format: value => `${value.toFixed(1)}%`, detail: record => `${record.wins.length} correct from ${record.graded.length} graded picks` },
                { label: 'Most profit', value: best('units', (a, b) => a > b), format: value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}u`, detail: record => `${record.bonusWins.length} wins from ${record.settledBonus?.length || 0} settled bets` },
                { label: 'Most units on a win', showEntry: true, value: entryRecord('profit', 'bestWin', (a, b) => a > b), format: value => `+${value.toFixed(2)}u`, detail: record => `Successful ${record.entry.market} bet` },
                { label: 'Highest successful return', showEntry: true, value: entryRecord('profitIfWin', 'bestReturn', (a, b) => a > b, entry => entry.profitIfWin / entry.amount, entry => entry.profitIfWin / entry.amount), format: value => `+${(value * 100).toFixed(0)}%`, detail: record => `Best ${record.entry.market} price captured` },
                { label: 'Highest max profit', value: best('maxProfit', (a, b) => a > b, true), format: value => `+${value.toFixed(2)}u`, detail: record => `${record.entries.length} picks in the period` }
            ];
            const bustMetrics = [
                { label: 'Lowest Accuracy', value: accuracyByPickCount('losses', (a, b) => a < b), format: value => `${value.toFixed(1)}%`, detail: record => `${record.losses.length} incorrect from ${record.graded.length} graded picks` },
                { label: 'Worst profit', value: best('units', (a, b) => a < b), format: value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}u`, detail: record => `${record.bonusWins.length} wins from ${record.settledBonus?.length || 0} settled bets` },
                { label: 'Most units on a loss', showEntry: true, value: entryRecord('profit', 'worstLoss', (a, b) => a < b), format: value => `${value.toFixed(2)}u`, detail: record => `Unsuccessful ${record.entry.market} bet` },
                { label: 'Lowest successful return', showEntry: true, value: entryRecord('profitIfWin', 'worstReturn', (a, b) => a < b, entry => entry.profitIfWin / entry.amount, entry => entry.profitIfWin / entry.amount), format: value => `+${(value * 100).toFixed(0)}%`, detail: record => `Smallest winning ${record.entry.market} price` },
                { label: 'Lowest max profit', value: best('maxProfit', (a, b) => a < b, true), format: value => `+${value.toFixed(2)}u`, detail: record => `${record.entries.length} picks in the period` }
            ];
            const renderMetrics = (definitions, tone) => definitions.map(metric => highlightMetricCard(metric, metric.value, tone)).join('');
            knowers.innerHTML = renderMetrics(metrics, 'good');
            busts.innerHTML = renderMetrics(bustMetrics, 'bad');
            highlightsFinalizedRecords = records;
            renderFinalizedUserPicks();
            const gradedCount = records.reduce((total, record) => total + record.graded.length, 0);
            status.innerText = gradedCount ? `${period} rankings from ${records.length} submitted players and ${gradedCount} graded picks.` : `No completed picks are available for ${period} yet.`;
            status.classList.toggle('hidden', !records.length);
            renderIcons();
        }

