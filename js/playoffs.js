        // --- PLAYOFF PREDICTIONS ---
        function playoffState() {
            const state = currentSport === 'CFB' ? cfbPlayoffPicks : nflPlayoffPicks;
            if (!state.games) state.games = {};
            return state;
        }

        function playoffKey(sport, round, gameNumber) {
            return `${sport}-PLAYOFF-${round}-${gameNumber}`;
        }

        function regularGameKey(team, opponent) {
            return [team, opponent].sort().join(' vs ');
        }

        function projectedCfbTeams() {
            const records = {};
            Object.values(cfbTeams).flat().forEach(team => records[team] = { team, wins: 0, games: 0, conferenceWins: 0, sos: fpiSosRank[team] || 85 });
            for (const conference in cfbScheduleData) {
                for (const team in cfbScheduleData[conference]) {
                    cfbScheduleData[conference][team].forEach(item => {
                        const opponent = parseScheduleItem(item).opponent;
                        const key = regularGameKey(team, opponent);
                        if (records[team] && records[opponent]) records[team].games++;
                        if (cfbPicks[key] === team) records[team].wins++;
                        if (cfbGameMeta[key] && cfbGameMeta[key].conference === conference && cfbPicks[key] === team) records[team].conferenceWins++;
                    });
                }
            }
            return Object.values(records).sort((a, b) => b.wins - a.wins || b.conferenceWins - a.conferenceWins || a.sos - b.sos || a.team.localeCompare(b.team));
        }

        function cfbChampionships() {
            const records = projectedCfbTeams();
            const champions = {};
            for (const conference of ['SEC', 'Big Ten', 'Big 12', 'ACC']) {
                const eligible = records.filter(r => cfbTeams[conference].includes(r.team) && r.team !== 'Notre Dame');
                champions[conference] = eligible.slice().sort((a, b) => b.conferenceWins - a.conferenceWins || a.sos - b.sos || b.wins - a.wins).slice(0, 2).map(r => r.team);
            }
            return champions;
        }

        function renderTeamOption(team, selected, disabled = false) {
            return `<option value="${team}" ${team === selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${team}</option>`;
        }

        function cfbBracketRounds(field, state) {
            const seeded = field.concat(['Group of 6 Champion']);
            const rounds = [[[{ team: seeded[7], seed: 8 }, { team: seeded[8], seed: 9 }], [{ team: seeded[6], seed: 7 }, { team: seeded[9], seed: 10 }], [{ team: seeded[5], seed: 6 }, { team: seeded[10], seed: 11 }], [{ team: seeded[4], seed: 5 }, { team: seeded[11], seed: 12 }]]];
            const priorWinner = (round, game) => {
                const picked = state.games[playoffKey('CFB', round, game)];
                return rounds[round][game].find(entry => entry.team === picked) || { team: null, seed: null };
            };
            rounds.push([[{ team: seeded[0], seed: 1 }, priorWinner(0, 0)], [{ team: seeded[3], seed: 4 }, priorWinner(0, 3)], [{ team: seeded[1], seed: 2 }, priorWinner(0, 1)], [{ team: seeded[2], seed: 3 }, priorWinner(0, 2)]]);
            rounds.push([[priorWinner(1, 0), priorWinner(1, 1)], [priorWinner(1, 2), priorWinner(1, 3)]]);
            rounds.push([[priorWinner(2, 0), priorWinner(2, 1)]]);
            return rounds;
        }

        function nflProjectedSeeds() {
            const records = {};
            nflTeams.NFL.forEach(team => records[team] = { team, wins: 0, sos: 0 });
            for (const team in nflScheduleData.NFL) {
                nflScheduleData.NFL[team].forEach(item => {
                    const parsed = parseScheduleItem(item);
                    const key = generateNflRegularKey(team, parsed.opponent, parsed.prefix);
                    if (nflPicks[key] === team) records[team].wins++;
                });
            }
            for (const team in nflScheduleData.NFL) {
                const opponents = nflScheduleData.NFL[team].map(item => parseScheduleItem(item).opponent).filter(opponent => records[opponent]);
                records[team].sos = opponents.length ? opponents.reduce((total, opponent) => total + records[opponent].wins, 0) / opponents.length : 0;
            }
            const divisionWinners = [];
            for (const division in nflDivisions) {
                divisionWinners.push(nflDivisions[division].map(team => records[team]).sort((a, b) => b.wins - a.wins || b.sos - a.sos || a.team.localeCompare(b.team))[0]);
            }
            const wildCards = Object.values(records).filter(r => !divisionWinners.some(w => w.team === r.team)).sort((a, b) => b.wins - a.wins || b.sos - a.sos || a.team.localeCompare(b.team));
            const afc = divisionWinners.filter(r => Object.keys(nflDivisions).find(d => nflDivisions[d].includes(r.team)).startsWith('AFC'));
            const nfc = divisionWinners.filter(r => { const d = Object.keys(nflDivisions).find(name => nflDivisions[name].includes(r.team)); return d.startsWith('NFC'); });
            const afcWildCards = wildCards.filter(r => Object.keys(nflDivisions).find(d => nflDivisions[d].includes(r.team)).startsWith('AFC'));
            const nfcWildCards = wildCards.filter(r => Object.keys(nflDivisions).find(d => nflDivisions[d].includes(r.team)).startsWith('NFC'));
            return { AFC: afc.sort((a, b) => b.wins - a.wins || b.sos - a.sos).concat(afcWildCards.slice(0, 3)).slice(0, 7), NFC: nfc.sort((a, b) => b.wins - a.wins || b.sos - a.sos).concat(nfcWildCards.slice(0, 3)).slice(0, 7) };
        }

        function generateNflRegularKey(team, opponent, prefix) {
            if (prefix === 'VS. (Neutral)') return [team, opponent].sort().join(' vs ') + ' (Neutral)';
            return prefix === 'at' ? `${team} at ${opponent}` : `${opponent} at ${team}`;
        }

        function gamesafeSeed(field, team) {
            const index = field.findIndex(entry => entry.team === team);
            return index >= 0 ? index + 1 : null;
        }

        function playoffPick(key, team) {
            if (isSeasonLocked()) {
                alert("Playoff predictions are locked for the season.");
                return;
            }
            if (!team) return;
            const state = playoffState();
            state.games[key] = team;
            if (key.includes('-CHAMPIONSHIP')) {
                state.champions[key.replace('CFB-', '').replace('-CHAMPIONSHIP', '')] = team;
                Object.keys(state.games).forEach(gameKey => { if (gameKey.startsWith('CFB-PLAYOFF-')) delete state.games[gameKey]; });
            }
            const roundMatch = key.match(/PLAYOFF-(\d+)-/);
            if (roundMatch) {
                const round = Number(roundMatch[1]);
                const bracketPrefix = key.split('-PLAYOFF-')[0] + '-PLAYOFF-';
                Object.keys(state.games).forEach(gameKey => {
                    const laterRound = gameKey.match(/PLAYOFF-(\d+)-/);
                    if (gameKey.startsWith(bracketPrefix) && laterRound && Number(laterRound[1]) > round) delete state.games[gameKey];
                });
                if (currentSport === 'NFL' && key.startsWith('NFL-AFC-PLAYOFF-') || currentSport === 'NFL' && key.startsWith('NFL-NFC-PLAYOFF-')) delete state.games[playoffKey('NFL', 3, 0)];
            }
            localStorage.setItem(`${currentSport.toLowerCase()}PlayoffPicks_2026_User_${currentUser}`, JSON.stringify(state));
            markPicksDirty('playoffs');
            savePickImmediately('playoffPicks', state);
            renderPlayoffs();
        }

        function savePlayoffPicks() {
            if (isSeasonLocked()) {
                alert("Playoff predictions are locked for the season.");
                return;
            }
            const state = playoffState();
            const path = currentSport === 'CFB' ? 'leaderboard/' : 'nfl_leaderboard/';
            localStorage.setItem(`${currentSport.toLowerCase()}PlayoffPicks_2026_User_${currentUser}`, JSON.stringify(state));
            db.ref(path + currentUser).update({ playoffPicks: state, timestamp: new Date().toISOString() }).then(() => { pickChangeVersions[currentSport].playoffs = 0; showSaveToast(); }).catch(() => alert('Error saving playoff predictions.'));
        }

        function renderMatchup(key, teamA, teamB, label, seedA = null, seedB = null) {
            const picked = playoffState().games[key];
            if (!teamA && !teamB) return `<div class="border border-dashed border-slate-300 rounded-md p-4 text-center text-slate-400 font-bold">${label}<br>Waiting for previous round</div>`;
            const options = [teamA, teamB].filter(Boolean);
            const locked = isSeasonLocked();
            return `<div class="border border-slate-200 rounded-md p-3 bg-white shadow-sm"><p class="text-xs uppercase tracking-widest text-slate-400 font-black mb-2">${label}</p><div class="grid gap-2">${options.map(team => playoffTeamButton(key, team, picked === team, team === teamA ? seedA : seedB, locked)).join('')}</div></div>`;
        }

        function playoffTeamButton(key, team, selected = false, seed = null, locked = false) {
            const colors = getActiveColors()[team] || { primary: '#E2E8F0', secondary: '#1E293B' };
            const logo = teamLogos[team] ? `<img src="${teamLogos[team]}" alt="${team} logo" class="w-7 h-7 object-contain logo-shadow shrink-0">` : '<span class="w-7 h-7 rounded bg-black/10 shrink-0"></span>';
            return `<button onclick="${locked ? '' : `playoffPick('${key}', '${team}')`}" class="flex items-center gap-3 text-left px-3 py-2 rounded font-black border transition-all ${selected ? 'ring-2 ring-purple-600 ring-offset-1 shadow-md' : 'hover:brightness-95'} ${locked ? 'opacity-60 cursor-not-allowed' : ''}" style="background-color:${colors.primary};color:${colors.secondary}" ${locked ? 'disabled' : ''}>${seed ? `<span class="text-xs font-black opacity-70">#${seed}</span>` : ''}${logo}<span class="truncate">${team}</span>${selected ? '<span class="ml-auto text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-white text-slate-900 shadow-sm">WINNER</span>' : ''}</button>`;
        }

        function renderCfbPlayoffs() {
            const state = playoffState();
            const champs = cfbChampionships();
            if (!state.champions) state.champions = {};
            const records = projectedCfbTeams();
            const top25 = records.slice(0, 25).map(r => r.team);
            const locks = [];
            let championshipHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
            Object.keys(champs).forEach(conference => {
                const teams = champs[conference];
                const selected = state.champions[conference] || '';
                if (selected && !locks.includes(selected)) locks.push(selected);
                championshipHTML += `<div class="border border-slate-200 rounded-md p-4 bg-white shadow-sm"><p class="font-black text-slate-900 mb-3">${conference} Championship</p><div class="grid gap-2">${teams.map(team => playoffTeamButton(`CFB-${conference}-CHAMPIONSHIP`, team, selected === team)).join('')}</div><p class="text-xs text-slate-500 mt-3">Projected finalists</p></div>`;
            });
            championshipHTML += '</div>';
            let candidateOrder = Array.isArray(state.candidateOrder) ? state.candidateOrder.filter(team => top25.includes(team)) : [];
            candidateOrder = candidateOrder.concat(top25.filter(team => !candidateOrder.includes(team)));
            candidateOrder = candidateOrder.filter(team => !Object.values(state.champions || {}).includes(team) || locks.includes(team));
            locks.forEach(team => {
                if (!candidateOrder.includes(team)) candidateOrder.splice(Math.min(10, candidateOrder.length), 0, team);
            });
            state.candidateOrder = candidateOrder.slice(0, 25);
            const field = state.candidateOrder.slice(0, 11);
            state.field = field;
            let fieldHTML = '<div class="space-y-2">';
            for (let index = 0; index < 25; index++) {
                const team = state.candidateOrder[index];
                const locked = locks.includes(team);
                const inField = index < 11;
                const colors = getActiveColors()[team] || { primary: '#E2E8F0', secondary: '#1E293B' };
                const logo = teamLogos[team] ? `<img src="${teamLogos[team]}" alt="${team} logo" class="w-8 h-8 object-contain logo-shadow shrink-0">` : '<span class="w-8 h-8 rounded bg-black/10 shrink-0"></span>';
                const record = records.find(item => item.team === team);
                fieldHTML += `<div class="flex flex-wrap items-center gap-2 p-2 rounded-md border ${inField ? 'border-blue-500 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 opacity-75'}" style="background-color:${colors.primary};color:${colors.secondary}"><span class="w-8 font-black">${index + 1}</span>${logo}<span class="flex-1 min-w-[8rem] font-black truncate">${team}</span><span class="text-xs font-black whitespace-nowrap">${record.wins}-${Math.max(0, 12 - record.wins)}</span><span class="text-xs font-black whitespace-nowrap">SOS #${record.sos}</span>${locked ? '<span class="text-xs font-black">LOCK</span>' : ''}<button onclick="moveCfbCandidate(${index}, -1)" class="px-2 py-1 rounded bg-black/15 hover:bg-black/25" title="Move up">↑</button><button onclick="moveCfbCandidate(${index}, 1)" class="px-2 py-1 rounded bg-black/15 hover:bg-black/25" title="Move down">↓</button><span class="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black/20">${inField ? 'CFP' : 'Bubble'}</span></div>`;
            }
            fieldHTML += '</div>';
            const rounds = cfbBracketRounds(field, state);
            let bracketHTML = '<div class="grid grid-cols-1 md:grid-cols-4 gap-4">';
            rounds.forEach((round, roundIndex) => { bracketHTML += `<div><h3 class="font-black text-slate-900 mb-3">${['First Round', 'Quarterfinals', 'Semifinals', 'National Championship'][roundIndex]}</h3><div class="space-y-3">`; round.forEach((match, matchIndex) => { const key = playoffKey('CFB', roundIndex, matchIndex); const a = match[0]; const b = match[1]; bracketHTML += renderMatchup(key, a && a.team, b && b.team, `Game ${matchIndex + 1}`, a && a.seed, b && b.seed); }); bracketHTML += '</div></div>'; });
            bracketHTML += '</div>';
            document.getElementById('playoff-summary').innerHTML = '<h3 class="text-lg font-black mb-3">Conference Championships</h3>' + championshipHTML;
            document.getElementById('playoff-content').innerHTML = `<div class="border-t border-slate-200 pt-5"><h3 class="text-lg font-black mb-2 text-slate-900">CFP Field</h3><p class="text-sm text-slate-500 mb-3">Top 25 candidates are shown in order. Only 1-11 qualify; spot 12 is reserved for the Group of 6 champion. Conference champions remain locked in the top 11.</p>${fieldHTML}</div><div class="border-t border-slate-200 pt-5"><h3 class="text-lg font-black mb-3 text-slate-900">CFP Bracket</h3>${bracketHTML}</div>`;
        }

        function changeCfbField(index, team) { const state = playoffState(); if (!state.field.includes(team)) { state.field[index] = team; savePickImmediately('playoffPicks', state); } renderPlayoffs(); }
        function moveCfbRank(index, direction) { const state = playoffState(); const target = index + direction; if (target < 0 || target >= state.field.length) return; [state.field[index], state.field[target]] = [state.field[target], state.field[index]]; savePickImmediately('playoffPicks', state); renderPlayoffs(); }
        function moveCfbCandidate(index, direction) {
            if (isSeasonLocked()) {
                alert("Playoff predictions are locked for the season.");
                return;
            }
            const state = playoffState(); const target = index + direction; if (target < 0 || target >= state.candidateOrder.length) return; const locks = locksForCfb(); if (target === 11 && index === 10 && locks.includes(state.candidateOrder[index])) return; if (target === 10 && index === 11 && locks.includes(state.candidateOrder[target])) return; [state.candidateOrder[index], state.candidateOrder[target]] = [state.candidateOrder[target], state.candidateOrder[index]]; localStorage.setItem(`cfbPlayoffPicks_2026_User_${currentUser}`, JSON.stringify(state)); markPicksDirty('playoffs'); savePickImmediately('playoffPicks', state); renderPlayoffs(); }
        function locksForCfb() { const state = playoffState(); return Object.values(state.champions || {}).filter(Boolean); }

        function renderNflPlayoffs() {
            const seeds = nflProjectedSeeds();
            const state = playoffState();
            let html = '<div class="grid grid-cols-1 gap-8">';
            ['AFC', 'NFC'].forEach(conference => {
                const field = seeds[conference];
                html += `<div class="border border-slate-200 rounded-md p-5 bg-white shadow-sm"><h3 class="text-xl font-black mb-3 text-slate-900">${conference} Playoff Seeds</h3><ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 mb-6">${field.map((r, i) => `<li class="flex justify-between bg-slate-50 border border-slate-200 rounded p-2.5 text-sm"><span><b>${i + 1}.</b> ${r.team}</span><span class="font-black text-blue-600 ml-2">${r.wins}-${Math.max(0, 17 - r.wins)}</span></li>`).join('')}</ol><div class="grid grid-cols-1 md:grid-cols-3 gap-4">`;
                const games = [[[{ team: field[1]?.team, seed: 2 }, { team: field[6]?.team, seed: 7 }], [{ team: field[2]?.team, seed: 3 }, { team: field[5]?.team, seed: 6 }], [{ team: field[3]?.team, seed: 4 }, { team: field[4]?.team, seed: 5 }]], [[{ team: field[0]?.team, seed: 1 }, null], [null, null]], [[null, null]]];
                games.forEach((round, roundIndex) => { html += `<div class="flex flex-col gap-3"><h4 class="font-black text-slate-700">${['Wild Card', 'Divisional', 'Conference Championship'][roundIndex]}</h4><div class="flex flex-col justify-around gap-3 flex-1">`; round.forEach((match, matchIndex) => { const key = playoffKey(`NFL-${conference}`, roundIndex, matchIndex); let a = match[0]; let b = match[1]; if (roundIndex === 1) { const wildCardWinners = [0, 1, 2].map(game => { const winner = state.games[playoffKey(`NFL-${conference}`, 0, game)]; return games[0][game].find(entry => entry && entry.team === winner); }).filter(Boolean).sort((left, right) => right.seed - left.seed); if (matchIndex === 0) { a = { team: field[0]?.team, seed: 1 }; b = wildCardWinners[0] || null; } else { a = wildCardWinners[1] || null; b = wildCardWinners[2] || null; } } if (roundIndex === 2) { const first = state.games[playoffKey(`NFL-${conference}`, 1, 0)]; const second = state.games[playoffKey(`NFL-${conference}`, 1, 1)]; a = first ? { team: first, seed: gamesafeSeed(field, first) } : null; b = second ? { team: second, seed: gamesafeSeed(field, second) } : null; } html += renderMatchup(key, a && a.team, b && b.team, `${conference} Game ${matchIndex + 1}`, a && a.seed, b && b.seed); }); html += '</div></div>'; });
                html += '</div></div>';
            });
            const afcChampion = state.games[playoffKey('NFL-AFC', 2, 0)];
            const nfcChampion = state.games[playoffKey('NFL-NFC', 2, 0)];
            const afcSeed = gamesafeSeed(seeds.AFC, afcChampion);
            const nfcSeed = gamesafeSeed(seeds.NFC, nfcChampion);
            html += `<div class="border-t border-slate-200 pt-5"><h3 class="text-xl font-black mb-3 text-slate-900">Super Bowl</h3>${renderMatchup(playoffKey('NFL', 3, 0), afcChampion, nfcChampion, 'NFL Championship', afcSeed, nfcSeed)}</div></div><p class="text-xs text-slate-500 mt-5">Division winners receive seeds 1-4; the next three teams are wild cards. Ties use projected win total, then the higher projected strength of schedule.</p>`;
            document.getElementById('playoff-summary').innerHTML = '<h3 class="text-lg font-black mb-3 text-slate-900">NFL Playoff Field</h3>';
            document.getElementById('playoff-content').innerHTML = html;
        }

        function renderPlayoffs() {
            if (!currentUser) return;
            if (currentSport === 'CFB') renderCfbPlayoffs(); else renderNflPlayoffs();
            renderIcons();
        }

