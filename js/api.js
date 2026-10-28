        // --- DIRECT FETCH PIPELINE ---
        async function fetchLiveResults() {
            for (let conf in cfbTeams) { cfbTeams[conf].forEach(t => { cfbScheduleData[conf][t] = []; }); }
            nflTeams["NFL"].forEach(t => { nflScheduleData["NFL"][t] = []; });
            cfbGameScores = {};
            nflGameScores = {};
            try {
                fetchRankingsData().catch(() => {});
                const cfbWks = Array.from({length: 15}, (_, i) => i + 1);
                const cfbPromises = cfbWks.map(week => fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&seasontype=2&week=${week}`).then(res => res.json()).catch(e => null));
                
                const nflWks = Array.from({length: 18}, (_, i) => i + 1);
                const nflPromises = nflWks.map(week => fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}`).then(res => res.json()).catch(e => null));

                const [cfbRes, nflRes] = await Promise.all([Promise.all(cfbPromises), Promise.all(nflPromises)]);
                
                cfbRes.forEach((data, index) => {
                    if (!data || !data.events) return;
                    const weekNum = index + 1;
                    data.events.forEach(event => {
                        try {
                            const match = event.competitions[0];
                            if (!match || match.status?.type?.name === 'STATUS_CANCELED') return;
                            if (!match.competitors || match.competitors.length < 2) return;
                            
                            const comp0 = match.competitors[0];
                            const comp1 = match.competitors[1];
                            const isHome0 = comp0.homeAway === 'home';
                            
                            let name0 = teamNameMapper[comp0.team.location] || comp0.team.location;
                            let name1 = teamNameMapper[comp1.team.location] || comp1.team.location;

                            const extractCompRecord = comp => {
                                if (!comp) return null;
                                if (Array.isArray(comp.records)) {
                                    const r = comp.records.find(x => x && (x.type === 'total' || x.name === 'overall')) || comp.records[0];
                                    if (r && typeof r.summary === 'string' && /^\d+-\d+(?:-\d+)?$/.test(r.summary.trim())) {
                                        return r.summary.trim();
                                    }
                                }
                                const sum = comp.team?.recordSummary;
                                if (sum && typeof sum === 'string' && /^\d+-\d+(?:-\d+)?$/.test(sum.trim())) {
                                    return sum.trim();
                                }
                                return null;
                            };
                            const extractCompRank = comp => {
                                if (!comp) return null;
                                const rankVal = comp.curatedRank?.current ?? comp.rank ?? comp.curatedRank ?? comp.team?.rank ?? comp.team?.curatedRank?.current;
                                const num = parseInt(rankVal, 10);
                                if (Number.isInteger(num) && num >= 1 && num <= 25) {
                                    return num;
                                }
                                const rawName = comp.team?.location || comp.team?.displayName || '';
                                const m = String(rawName).match(/^[#\(](\d+)[\)\s]/);
                                if (m) {
                                    const p = parseInt(m[1], 10);
                                    if (p >= 1 && p <= 25) return p;
                                }
                                return null;
                            };
                            const rank0 = extractCompRank(comp0);
                            const rank1 = extractCompRank(comp1);
                            const homeRank = isHome0 ? rank0 : rank1;
                            const awayRank = isHome0 ? rank1 : rank0;
                            updateEspnRecord('CFB', name0, extractCompRecord(comp0));
                            updateEspnRecord('CFB', name1, extractCompRecord(comp1));

                            // Dynamic Logo & ID Capture
                            if (comp0.team.logo) teamLogos[name0] = comp0.team.logo;
                            if (comp1.team.logo) teamLogos[name1] = comp1.team.logo;
                            if (comp0.team.id) { teamIds[name0] = comp0.team.id; if (comp0.team.location) teamIds[comp0.team.location] = comp0.team.id; if (comp0.team.displayName) teamIds[comp0.team.displayName] = comp0.team.id; }
                            if (comp1.team.id) { teamIds[name1] = comp1.team.id; if (comp1.team.location) teamIds[comp1.team.location] = comp1.team.id; if (comp1.team.displayName) teamIds[comp1.team.displayName] = comp1.team.id; }

                            // Dynamic Color Capture (FBS only)
                            [{ comp: comp0, name: name0 }, { comp: comp1, name: name1 }].forEach(({ comp, name }) => {
                                if (comp && comp.team && comp.team.color) {
                                    if (!fbsSchools.includes(name) && !fbsSchools.includes(comp.team.location)) return;
                                    registerTeamColor(name, comp.team.color, comp.team.alternateColor);
                                    if (comp.team.location && comp.team.location !== name) registerTeamColor(comp.team.location, comp.team.color, comp.team.alternateColor);
                                    if (comp.team.displayName && comp.team.displayName !== name) registerTeamColor(comp.team.displayName, comp.team.color, comp.team.alternateColor);
                                    if (comp.team.shortDisplayName && comp.team.shortDisplayName !== name) registerTeamColor(comp.team.shortDisplayName, comp.team.color, comp.team.alternateColor);
                                }
                            });
                            
                            const gameDate = new Date(event.date);
                            if (isNaN(gameDate.getTime())) return;
                            const dateDisplay = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
                            const timeDisplay = gameDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
                            
                            let conf0 = getTeamConference(name0, 'CFB');
                            let conf1 = getTeamConference(name1, 'CFB');
                            
                            const homeTeam = isHome0 ? name0 : name1;
                            const awayTeam = isHome0 ? name1 : name0;
                            
                            // Reverted to old alphabetical format for CFB
                            const gameKey = [name0, name1].sort().join(" vs ");
                            
                            if (fbsSchools.includes(name0) || fbsSchools.includes(name1)) {
                                const existingCfbGame = cfbGamesByWeek[weekNum].find(g => g.gameKey === gameKey);
                                if (!existingCfbGame) {
                                    cfbGamesByWeek[weekNum].push({
                                        gameId: event.id,
                                        homeId: isHome0 ? comp0.team.id : comp1.team.id,
                                        awayId: isHome0 ? comp1.team.id : comp0.team.id,
                                        gameKey: gameKey, home: homeTeam, away: awayTeam, dateObj: gameDate, dateStr: timeDisplay,
                                        homeRank: homeRank, awayRank: awayRank,
                                        isNeutral: match.neutralSite, winner: match.status.type.completed ? (comp0.winner ? name0 : comp1.winner ? name1 : null) : null,
                                        homeScore: isHome0 ? comp0.score : comp1.score,
                                        awayScore: isHome0 ? comp1.score : comp0.score,
                                        homeLinescores: isHome0 ? (comp0.linescores || []) : (comp1.linescores || []),
                                        awayLinescores: isHome0 ? (comp1.linescores || []) : (comp0.linescores || []),
                                        statusState: match.status?.type?.state || 'pre',
                                        isCompleted: match.status?.type?.completed || false,
                                        clock: match.status?.displayClock || event.status?.displayClock || '',
                                        period: match.status?.period || event.status?.period || 0,
                                        statusDetail: match.status?.type?.shortDetail || match.status?.type?.detail || event.status?.type?.shortDetail || ''
                                    });
                                } else {
                                    if (homeRank !== null) existingCfbGame.homeRank = homeRank;
                                    if (awayRank !== null) existingCfbGame.awayRank = awayRank;
                                    existingCfbGame.winner = match.status.type.completed ? (comp0.winner ? name0 : comp1.winner ? name1 : null) : null;
                                    existingCfbGame.homeScore = isHome0 ? comp0.score : comp1.score;
                                    existingCfbGame.awayScore = isHome0 ? comp1.score : comp0.score;
                                    existingCfbGame.homeLinescores = isHome0 ? (comp0.linescores || []) : (comp1.linescores || []);
                                    existingCfbGame.awayLinescores = isHome0 ? (comp1.linescores || []) : (comp0.linescores || []);
                                    existingCfbGame.statusState = match.status?.type?.state || 'pre';
                                    existingCfbGame.isCompleted = match.status?.type?.completed || false;
                                    existingCfbGame.clock = match.status?.displayClock || event.status?.displayClock || '';
                                    existingCfbGame.period = match.status?.period || event.status?.period || 0;
                                    existingCfbGame.statusDetail = match.status?.type?.shortDetail || match.status?.type?.detail || event.status?.type?.shortDetail || '';
                                }
                            }
                            if (conf0 && conf0 === conf1 && name0 !== 'Notre Dame' && name1 !== 'Notre Dame') {
                                cfbGameMeta[gameKey] = { conference: conf0, isConferenceGame: true };
                            }

                            if (conf0) {
                                const prefix = match.neutralSite ? "VS. (Neutral)" : (isHome0 ? "vs" : "at");
                                cfbScheduleData[conf0][name0].push(`${dateDisplay} | ${prefix} ${name1}`);
                            }
                            if (conf1) {
                                const prefix = match.neutralSite ? "VS. (Neutral)" : (!isHome0 ? "vs" : "at");
                                cfbScheduleData[conf1][name1].push(`${dateDisplay} | ${prefix} ${name0}`);
                            }
                            let cfbWinner = null;
                            if (match.status.type.completed) {
                                cfbWinner = comp0.winner ? name0 : comp1.winner ? name1 : null;
                                if (!cfbWinner && comp0.score !== undefined && comp1.score !== undefined) {
                                    const s0 = Number(comp0.score);
                                    const s1 = Number(comp1.score);
                                    if (!isNaN(s0) && !isNaN(s1) && s0 !== s1) {
                                        cfbWinner = s0 > s1 ? name0 : name1;
                                    }
                                }
                                if (cfbWinner) cfbActualResults[gameKey] = cfbWinner;
                            }
                            cfbGameScores[gameKey] = {
                                gameId: event.id,
                                home: homeTeam,
                                away: awayTeam,
                                homeScore: isHome0 ? comp0.score : comp1.score,
                                awayScore: isHome0 ? comp1.score : comp0.score,
                                winner: cfbWinner,
                                isCompleted: match.status?.type?.completed || false,
                                statusState: match.status?.type?.state || 'pre',
                                statusDetail: match.status?.type?.shortDetail || match.status?.type?.detail || '',
                                clock: match.status?.displayClock || event.status?.displayClock || '',
                                homeLinescores: isHome0 ? (comp0.linescores || []) : (comp1.linescores || []),
                                awayLinescores: isHome0 ? (comp1.linescores || []) : (comp0.linescores || [])
                            };
                        } catch(e) {}
                    });
                });

                nflRes.forEach((data, index) => {
                    if (!data || !data.events) return;
                    const weekNum = index + 1;
                    data.events.forEach(event => {
                         try {
                            const match = event.competitions[0];
                            if (!match || match.status?.type?.name === 'STATUS_CANCELED') return;
                            if (!match.competitors || match.competitors.length < 2) return;
                            const comp0 = match.competitors[0];
                            const comp1 = match.competitors[1];
                            const isHome0 = comp0.homeAway === 'home';
                            
                            let name0 = comp0.team.displayName;
                            let name1 = comp1.team.displayName;
                            updateEspnRecord('NFL', name0, extractCompRecord(comp0));
                            updateEspnRecord('NFL', name1, extractCompRecord(comp1));

                            // Dynamic Logo & ID Capture
                            if (comp0.team.logo) teamLogos[name0] = comp0.team.logo;
                            if (comp1.team.logo) teamLogos[name1] = comp1.team.logo;
                            if (comp0.team.id) { teamIds[name0] = comp0.team.id; if (comp0.team.location) teamIds[comp0.team.location] = comp0.team.id; if (comp0.team.displayName) teamIds[comp0.team.displayName] = comp0.team.id; }
                            if (comp1.team.id) { teamIds[name1] = comp1.team.id; if (comp1.team.location) teamIds[comp1.team.location] = comp1.team.id; if (comp1.team.displayName) teamIds[comp1.team.displayName] = comp1.team.id; }

                            // Dynamic Color Capture
                            [{ comp: comp0, name: name0 }, { comp: comp1, name: name1 }].forEach(({ comp, name }) => {
                                if (comp && comp.team && comp.team.color) {
                                    const clean = ensureContrast(comp.team.color, comp.team.alternateColor);
                                    if (!nflColors[name]) nflColors[name] = clean;
                                    if (comp.team.location && !nflColors[comp.team.location]) nflColors[comp.team.location] = clean;
                                }
                            });
                            
                            const gameDate = new Date(event.date);
                            if (isNaN(gameDate.getTime())) return;
                            const dateDisplay = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
                            const timeDisplay = gameDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
                            let conf0 = getTeamConference(name0, 'NFL');
                            let conf1 = getTeamConference(name1, 'NFL');
                            
                            const homeTeam = isHome0 ? name0 : name1;
                            const awayTeam = isHome0 ? name1 : name0;
                            
                            // Keeping the directional format for NFL
                            const gameKey = match.neutralSite ? [name0, name1].sort().join(" vs ") + " (Neutral)" : `${awayTeam} at ${homeTeam}`;

                            if (conf0 || conf1) {
                                const existingNflGame = nflGamesByWeek[weekNum].find(g => g.gameKey === gameKey);
                                if (!existingNflGame) {
                                    nflGamesByWeek[weekNum].push({
                                        gameId: event.id, 
                                        homeId: isHome0 ? comp0.team.id : comp1.team.id,
                                        awayId: isHome0 ? comp1.team.id : comp0.team.id,
                                        gameKey: gameKey, home: homeTeam, away: awayTeam, dateObj: gameDate, dateStr: timeDisplay,
                                        isNeutral: match.neutralSite, winner: match.status.type.completed ? (comp0.winner ? name0 : comp1.winner ? name1 : null) : null,
                                        homeScore: isHome0 ? comp0.score : comp1.score,
                                        awayScore: isHome0 ? comp1.score : comp0.score,
                                        homeLinescores: isHome0 ? (comp0.linescores || []) : (comp1.linescores || []),
                                        awayLinescores: isHome0 ? (comp1.linescores || []) : (comp0.linescores || []),
                                        statusState: match.status?.type?.state || 'pre',
                                        isCompleted: match.status?.type?.completed || false,
                                        clock: match.status?.displayClock || event.status?.displayClock || '',
                                        period: match.status?.period || event.status?.period || 0,
                                        statusDetail: match.status?.type?.shortDetail || match.status?.type?.detail || event.status?.type?.shortDetail || ''
                                    });
                                } else {
                                    existingNflGame.winner = match.status.type.completed ? (comp0.winner ? name0 : comp1.winner ? name1 : null) : null;
                                    existingNflGame.homeScore = isHome0 ? comp0.score : comp1.score;
                                    existingNflGame.awayScore = isHome0 ? comp1.score : comp0.score;
                                    existingNflGame.homeLinescores = isHome0 ? (comp0.linescores || []) : (comp1.linescores || []);
                                    existingNflGame.awayLinescores = isHome0 ? (comp1.linescores || []) : (comp0.linescores || []);
                                    existingNflGame.statusState = match.status?.type?.state || 'pre';
                                    existingNflGame.isCompleted = match.status?.type?.completed || false;
                                    existingNflGame.clock = match.status?.displayClock || event.status?.displayClock || '';
                                    existingNflGame.period = match.status?.period || event.status?.period || 0;
                                    existingNflGame.statusDetail = match.status?.type?.shortDetail || match.status?.type?.detail || event.status?.type?.shortDetail || '';
                                }
                            }

                            if (conf0) {
                                const prefix = match.neutralSite ? "VS. (Neutral)" : (isHome0 ? "vs" : "at");
                                nflScheduleData[conf0][name0].push(`${dateDisplay} | ${prefix} ${name1}`);
                            }
                            if (conf1) {
                                const prefix = match.neutralSite ? "VS. (Neutral)" : (!isHome0 ? "vs" : "at");
                                nflScheduleData[conf1][name1].push(`${dateDisplay} | ${prefix} ${name0}`);
                            }

                            let nflWinner = null;
                            if (match.status.type.completed) {
                                nflWinner = comp0.winner ? name0 : comp1.winner ? name1 : null;
                                if (!nflWinner && comp0.score !== undefined && comp1.score !== undefined) {
                                    const s0 = Number(comp0.score);
                                    const s1 = Number(comp1.score);
                                    if (!isNaN(s0) && !isNaN(s1) && s0 !== s1) {
                                        nflWinner = s0 > s1 ? name0 : name1;
                                    }
                                }
                                if (nflWinner) nflActualResults[gameKey] = nflWinner;
                            }
                            nflGameScores[gameKey] = {
                                gameId: event.id,
                                home: homeTeam,
                                away: awayTeam,
                                homeScore: isHome0 ? comp0.score : comp1.score,
                                awayScore: isHome0 ? comp1.score : comp0.score,
                                winner: nflWinner,
                                isCompleted: match.status?.type?.completed || false,
                                statusState: match.status?.type?.state || 'pre',
                                statusDetail: match.status?.type?.shortDetail || match.status?.type?.detail || '',
                                clock: match.status?.displayClock || event.status?.displayClock || '',
                                homeLinescores: isHome0 ? (comp0.linescores || []) : (comp1.linescores || []),
                                awayLinescores: isHome0 ? (comp1.linescores || []) : (comp0.linescores || [])
                            };
                        } catch(e) {}
                    });
                });

                [cfbScheduleData, nflScheduleData].forEach(sched => {
                    for (let conf in sched) {
                        for (let team in sched[conf]) {
                            const uniqueGames = [];
                            const seenMatches = new Set();
                            
                            sched[conf][team].sort((a, b) => {
                                const dStr1 = a.split("|")[0].trim();
                                const dStr2 = b.split("|")[0].trim();
                                const year1 = (dStr1.startsWith("Jan") || dStr1.startsWith("Feb")) ? " 2027" : " 2026";
                                const year2 = (dStr2.startsWith("Jan") || dStr2.startsWith("Feb")) ? " 2027" : " 2026";
                                const d1 = new Date(dStr1 + year1);
                                const d2 = new Date(dStr2 + year2);
                                return (isNaN(d1) ? 0 : d1) - (isNaN(d2) ? 0 : d2);
                            });

                            sched[conf][team].forEach(gameString => {
                                if (!gameString.includes("|")) return;
                                if (!seenMatches.has(gameString)) {
                                    seenMatches.add(gameString);
                                    uniqueGames.push(gameString);
                                }
                            });
                            sched[conf][team] = uniqueGames;
                        }
                    }
                });
                
                for(let w=1; w<=15; w++) cfbGamesByWeek[w].sort((a, b) => a.dateObj - b.dateObj);
                for(let w=1; w<=18; w++) nflGamesByWeek[w].sort((a, b) => a.dateObj - b.dateObj);
                
                const statusEl = document.getElementById('live-status');
                if(statusEl) statusEl.innerText = `Live sync complete.`;
            } catch (error) {
                console.error("Fetch Error", error);
            } finally {
                document.getElementById('schedule-container').innerHTML = '';
                document.getElementById('conference-select').disabled = false;
                document.getElementById('team-select').disabled = false;
                startFirebaseListeners();
                setSport('CFB');
            }
        }

        async function loadOddsForWeek(weekNum) {
            const activeGames = getGamesForPicks(weekNum);
            const needsOdds = activeGames.some(g => g.mlHome === undefined || g.spread === undefined || g.overUnder === undefined);
            if (!needsOdds) return true;

            const sportPath = currentSport === 'CFB' ? 'college-football' : 'nfl';
            const oddsPromises = activeGames.map(async (game) => {
                if (game.mlHome !== undefined && game.spread !== undefined && game.overUnder !== undefined) return;
                try {
                    const res = await fetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/${sportPath}/events/${game.gameId}/competitions/${game.gameId}/odds`);
                    if (!res.ok) throw new Error("No odds found");
                    const oddsData = await res.json();
                    
                    game.mlHome = ""; game.mlAway = "";
                    game.mlHomeNum = 0; game.mlAwayNum = 0;
                    game.spread = null; game.spreadHome = null; game.spreadAway = null; game.overUnder = null;
                    
                    if (oddsData && oddsData.items) {
                        for (let odds of oddsData.items) {
                            if (odds.homeTeamOdds && odds.homeTeamOdds.moneyLine !== undefined) {
                                game.mlHomeNum = odds.homeTeamOdds.moneyLine;
                                game.mlAwayNum = odds.awayTeamOdds && odds.awayTeamOdds.moneyLine !== undefined ? odds.awayTeamOdds.moneyLine : 0;
                                game.mlHome = (game.mlHomeNum > 0 ? "+" : "") + game.mlHomeNum;
                                game.mlAway = (game.mlAwayNum > 0 ? "+" : "") + game.mlAwayNum;
                            }
                            if (game.spread === null && odds.homeTeamOdds) {
                                const homePointSpread = odds.homeTeamOdds.current?.pointSpread?.alternateDisplayValue ?? odds.homeTeamOdds.current?.pointSpread?.american ?? odds.homeTeamOdds.spread ?? odds.spread;
                                const awayPointSpread = odds.awayTeamOdds?.current?.pointSpread?.alternateDisplayValue ?? odds.awayTeamOdds?.current?.pointSpread?.american ?? odds.awayTeamOdds?.spread;
                                if (homePointSpread !== undefined || awayPointSpread !== undefined) {
                                    game.spreadHome = Number.parseFloat(homePointSpread);
                                    game.spreadAway = Number.parseFloat(awayPointSpread);
                                    game.spread = Number.isFinite(game.spreadHome) ? game.spreadHome : (Number.isFinite(game.spreadAway) ? -game.spreadAway : null);
                                }
                            }
                            if (game.overUnder === null && odds.overUnder !== undefined) {
                                game.overUnder = Number.parseFloat(odds.overUnder);
                                game.overOdds = Number.parseFloat(odds.overOdds);
                                game.underOdds = Number.parseFloat(odds.underOdds);
                            }
                            if (game.mlHome !== '' && game.spread !== null && game.overUnder !== null) break;
                        }
                    }
                } catch(e) {
                    game.mlHome = ""; game.mlAway = "";
                    game.mlHomeNum = 0; game.mlAwayNum = 0;
                    game.spread = null; game.spreadHome = null; game.spreadAway = null; game.overUnder = null;
                }
            });
            await Promise.all(oddsPromises);
            return true;
        }

        // --- CFB FPI SYNTHETIC ENGINE ---
        function getCfbFPI(teamName) {
            const wins = cfbWinTotals[teamName] || 5.0; 
            const sos = fpiSosRank[teamName] || 85; 
            const sosAdjustment = (65 - sos) * 0.035;
            const adjustedWins = wins + sosAdjustment;
            return (adjustedWins - 5.5) * 4.2;
        }

        function getMatchupPredictor(team, opponent, isHome) {
            if (currentSport === 'NFL') return 50;
            let teamFPI = getCfbFPI(team);
            let oppFPI = getCfbFPI(opponent);
            
            if (isHome === true) teamFPI += 3.0;
            else if (isHome === false) oppFPI += 3.0;
            
            const teamElo = 1500 + (teamFPI * 25);
            const oppElo = 1500 + (oppFPI * 25);
            
            let teamProb = 1 / (1 + Math.pow(10, (oppElo - teamElo) / 400));
            teamProb = Math.max(0.01, Math.min(0.99, teamProb)); 
            
            return Math.round(teamProb * 100);
        }

        // --- RENDER LOGIC ---
        const parseScheduleItem = (item) => {
            const parts = item.split("|");
            const dateDisplay = parts.length > 1 ? parts[0].trim() : "TBD";
            const matchStr = parts.length > 1 ? parts[1].trim() : item.trim();
            if (matchStr.startsWith("VS. (Neutral) ")) return { dateDisplay, prefix: "VS. (Neutral)", opponent: matchStr.replace(/^VS\. \(Neutral\)\s+/, "") };
            if (matchStr.startsWith("at ")) return { dateDisplay, prefix: "at", opponent: matchStr.replace(/^at\s+/, "") };
            if (matchStr.startsWith("vs ")) return { dateDisplay, prefix: "vs", opponent: matchStr.replace(/^vs\s+/, "") };
            return { dateDisplay, prefix: "vs", opponent: matchStr };
        };

        let activePreseasonSubTab = 'picks';

        function switchPreseasonTab(subId) {
            activePreseasonSubTab = subId;
            ['picks', 'playoffs', 'variance'].forEach(t => {
                const el = document.getElementById(`section-${t}`);
                if (el) el.classList.toggle('hidden', t !== subId);
                const nav = document.getElementById(`subnav-${t}`);
                if (nav) {
                    if (t === subId) {
                        nav.className = 'px-3.5 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap bg-purple-600 text-white shadow-sm cursor-pointer';
                    } else {
                        nav.className = 'px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer';
                    }
                }
            });
            if (subId === 'picks') renderSchedule();
            if (subId === 'playoffs') renderPlayoffs();
            if (subId === 'variance') renderVariance();
            renderIcons();
        }

        function switchTab(tabId) {
            ['preseason', 'weekly', 'bonus', 'leaderboard', 'results', 'highlights', 'top25'].forEach(t => {
                const el = document.getElementById(`section-${t}`);
                if(el) el.classList.add('hidden');
                const navEl = document.getElementById(`nav-${t}`);
                if(navEl) navEl.className = "px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80";
            });
            const activeEl = document.getElementById(`section-${tabId}`);
            if(activeEl) activeEl.classList.remove('hidden');
            const activeNav = document.getElementById(`nav-${tabId}`);
            if(activeNav) {
                activeNav.className = "px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-purple-600 text-white shadow-sm";
                try {
                    activeNav.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                } catch(e) {}
            }
            
            if (tabId === 'results') calculateAccuracy();
            if (tabId === 'leaderboard') renderLeaderboard();
            if (tabId === 'weekly') renderWeeklySchedule();
            if (tabId === 'bonus') renderBonusSchedule();
            if (tabId === 'highlights') renderHighlights();
            if (tabId === 'preseason') switchPreseasonTab(activePreseasonSubTab);
            if (tabId === 'top25') {
                top25ViewedWeek = getTop25CurrentWeek();
                top25DraftWeek = 0;
                const top25Select = document.getElementById('top25-week-select');
                if (top25Select) top25Select.value = top25ViewedWeek;
                renderTop25();
            }
            renderIcons();
        }

