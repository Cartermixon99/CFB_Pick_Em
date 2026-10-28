        function getBonusBets() {
            return currentSport === 'CFB' ? cfbBonusBets : nflBonusBets;
        }

        function findBonusGame(gameKey) {
            const gamesByWeek = getActiveGamesByWeek();
            for (const week in gamesByWeek) {
                const game = (gamesByWeek[week] || []).find(item => item.gameKey === gameKey);
                if (game) return game;
            }
            return null;
        }

        function calculateAmericanProfit(wager, odds) {
            const number = parseFloat(odds);
            if (!Number.isFinite(number) || number === 0) return wager * 0.9091;
            return number > 0 ? wager * number / 100 : wager * 100 / Math.abs(number);
        }

        function hasBonusBetInWeek(bonusObj, weekNum) {
            const games = getGamesForPicks(weekNum);
            return games.some(game => {
                return hasBonusBetOnGame(bonusObj, game);
            });
        }

        function hasBonusBetOnGame(bonusObj, game) {
            const wagers = bonusObj?.[game.gameKey] || {};
            return ['moneyline', 'spread', 'total'].some(market => {
                const wager = wagers[market] || {};
                const amount = parseFloat(wager.amount);
                return Boolean(wager.side) && Number.isFinite(amount) && amount > 0;
            });
        }

        function calculateBankroll(bonusObj) {
            let base = 10;
            for (let week = 1; week < actualCurrentWeek; week++) {
                if (hasBonusBetInWeek(bonusObj, week)) base += 5;
            }
            let allocatedCredits = 0;
            let settledProfit = 0;
            Object.keys(bonusObj || {}).forEach(gameKey => {
                const game = findBonusGame(gameKey);
                const wagers = bonusObj[gameKey] || {};
                ['moneyline', 'spread', 'total'].forEach(market => {
                    const wager = wagers[market];
                    const amount = parseFloat(wager && wager.amount);
                    if (!wager || !Number.isFinite(amount) || amount <= 0) return;
                    if (!game || (!game.isCompleted && game.statusState !== 'post' && !game.winner)) {
                        allocatedCredits += amount;
                        return;
                    }

                    let result = null;
                    if (market === 'moneyline') {
                        result = game.winner ? (wager.side === game.winner ? 'win' : 'loss') : 'push';
                    } else if (Number.isFinite(Number(game.homeScore)) && Number.isFinite(Number(game.awayScore))) {
                        const homeScore = Number(game.homeScore);
                        const awayScore = Number(game.awayScore);
                        if (market === 'spread') {
                            const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
                            const line = hasWagerLine ? Number(wager.line) : Number(wager.side === game.home ? game.spreadHome : game.spreadAway);
                            if (Number.isFinite(line)) {
                                const margin = wager.side === game.home ? homeScore + line - awayScore : awayScore + line - homeScore;
                                result = margin > 0 ? 'win' : (margin < 0 ? 'loss' : 'push');
                            }
                        } else {
                            const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
                            const line = hasWagerLine ? Number(wager.line) : Number(game.overUnder);
                            if (Number.isFinite(line)) {
                                const difference = homeScore + awayScore - line;
                                result = difference === 0 ? 'push' : ((wager.side === 'Over') === (difference > 0) ? 'win' : 'loss');
                            }
                        }
                    }
                    if (!result) {
                        allocatedCredits += amount;
                        return;
                    }
                    if (result === 'win') {
                        const hasWagerOdds = wager.odds !== undefined && wager.odds !== null && wager.odds !== '' && Number.isFinite(Number(wager.odds)) && Number(wager.odds) !== 0;
                        const odds = hasWagerOdds ? Number(wager.odds) : Number(wager.side === game.home ? game.mlHomeNum : game.mlAwayNum);
                        settledProfit += market === 'moneyline' ? calculateAmericanProfit(amount, odds) : amount * 0.9091;
                    }
                    if (result === 'loss') settledProfit -= amount;
                });
            });
            const total = Math.max(0, base + settledProfit);
            return { total, allocated: allocatedCredits, available: Math.max(0, total - allocatedCredits) };
        }

        function updateBonusBet(gameKey, market, side, amount, line, odds) {
            const game = findBonusGame(gameKey);
            if (!game || new Date() > game.dateObj) return;
            const bonusBets = getBonusBets();
            const existingWager = bonusBets[gameKey]?.[market];
            const currentAmount = parseFloat(existingWager?.amount) || 0;
            const requestedAmount = parseFloat(amount);

            if (requestedAmount > 0 && currentAmount <= 0 && calculateBankroll(bonusBets).available <= 0) {
                alert('No available bonus credits remaining in your bankroll.');
                return;
            }

            const value = Number.isFinite(requestedAmount) ? Math.min(requestedAmount, currentAmount + calculateBankroll(bonusBets).available) : requestedAmount;
            if (!Number.isFinite(value) || value <= 0) {
                if (bonusBets[gameKey]) {
                    delete bonusBets[gameKey][market];
                    if (Object.keys(bonusBets[gameKey]).length === 0) {
                        delete bonusBets[gameKey];
                    }
                }
            } else {
                if (!bonusBets[gameKey]) bonusBets[gameKey] = {};

                let finalLine = null;
                let finalOdds = null;

                if (existingWager && existingWager.side === side) {
                    finalLine = (existingWager.line !== undefined && existingWager.line !== null && !isNaN(Number(existingWager.line)))
                        ? Number(existingWager.line)
                        : (line !== undefined && line !== null && !isNaN(Number(line)) ? Number(line) : null);
                    finalOdds = (existingWager.odds !== undefined && existingWager.odds !== null && !isNaN(Number(existingWager.odds)))
                        ? Number(existingWager.odds)
                        : (odds !== undefined && odds !== null && !isNaN(Number(odds)) ? Number(odds) : null);
                } else {
                    finalLine = line !== undefined && line !== null && !isNaN(Number(line)) ? Number(line) : null;
                    finalOdds = odds !== undefined && odds !== null && !isNaN(Number(odds)) ? Number(odds) : null;
                }

                if (market === 'spread' && finalLine === null) {
                    finalLine = Number(side === game.home ? game.spreadHome : game.spreadAway);
                } else if (market === 'total' && finalLine === null) {
                    finalLine = Number(game.overUnder);
                } else if (market === 'moneyline' && finalOdds === null) {
                    finalOdds = Number(side === game.home ? game.mlHomeNum : game.mlAwayNum);
                }

                bonusBets[gameKey][market] = {
                    side,
                    amount: value,
                    line: Number.isFinite(finalLine) ? finalLine : null,
                    odds: Number.isFinite(finalOdds) ? finalOdds : null
                };
            }
            localStorage.setItem(`${currentSport.toLowerCase()}BonusBets_2026_User_${currentUser}`, JSON.stringify(bonusBets));
            saveBonusBetsImmediately(bonusBets);
            renderBonusSchedule();
            showSaveToast();
        }

        function bonusValue(value) {
            return encodeURIComponent(value == null ? '' : String(value));
        }

        function updateBonusBetEncoded(gameKey, market, side, amount, line, odds) {
            updateBonusBet(decodeURIComponent(gameKey), decodeURIComponent(market), decodeURIComponent(side), amount, line, odds);
        }

        function adjustBonusBetEncoded(gameKey, market, amountDelta) {
            adjustBonusBet(decodeURIComponent(gameKey), decodeURIComponent(market), amountDelta);
        }

        function getBonusPotentialPayout(wager, market, game) {
            const amount = parseFloat(wager && wager.amount);
            if (!Number.isFinite(amount) || amount <= 0) return 0;
            if (market === 'moneyline') {
                const hasWagerOdds = wager && wager.odds !== undefined && wager.odds !== null && wager.odds !== '' && Number.isFinite(Number(wager.odds)) && Number(wager.odds) !== 0;
                const odds = hasWagerOdds ? Number(wager.odds) : (game ? Number(wager.side === game.home ? game.mlHomeNum : game.mlAwayNum) : null);
                return amount + calculateAmericanProfit(amount, odds);
            }
            return amount + amount * 0.9091;
        }

        function getBonusSettlementMarkup(game, market, wager) {
            const result = getBonusWagerResult(game, market, wager);
            if (!result) return '';
            const amount = parseFloat(wager.amount) || 0;
            const profit = getBonusPotentialPayout(wager, market, game) - amount;
            if (result === 'win') return `<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800 border border-emerald-300 whitespace-nowrap">Win +${profit.toFixed(2)}</span>`;
            if (result === 'loss') return `<span class="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black uppercase text-rose-800 border border-rose-300 whitespace-nowrap">Loss -${amount.toFixed(2)}</span>`;
            return `<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-700 border border-slate-300 whitespace-nowrap">Push</span>`;
        }

        function getBonusLiveTracking(game, marketKey, wager) {
            if (!game || !wager || !wager.side) return null;
            const hasScores = game.homeScore !== undefined && game.homeScore !== null && game.homeScore !== '' && 
                              game.awayScore !== undefined && game.awayScore !== null && game.awayScore !== '';
            if (!hasScores) return null;

            const isFinished = !!(game.winner || game.isCompleted || game.statusState === 'post');
            const isLive = !isFinished && game.statusState === 'in';
            if (!isLive && !isFinished) return null;

            const homeScore = Number(game.homeScore) || 0;
            const awayScore = Number(game.awayScore) || 0;
            const totalPoints = homeScore + awayScore;

            if (marketKey === 'spread') {
                const isHome = wager.side === game.home;
                const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
                const line = hasWagerLine ? Number(wager.line) : Number(isHome ? game.spreadHome : game.spreadAway);
                if (!Number.isFinite(line)) return null;

                const margin = isHome ? (homeScore + line - awayScore) : (awayScore + line - homeScore);
                const marginFormatted = Math.abs(margin).toFixed(1);

                if (isLive) {
                    if (margin > 0) {
                        return {
                            status: 'winning',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>Covering by +${marginFormatted} pts</span>`
                        };
                    } else if (margin < 0) {
                        return {
                            status: 'losing',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-rose-600"></span>Trailing by -${marginFormatted} pts (Needs +${marginFormatted} to cover)</span>`
                        };
                    } else {
                        return {
                            status: 'push',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">Pushing (on spread)</span>`
                        };
                    }
                } else {
                    if (margin > 0) {
                        return {
                            status: 'win',
                            badge: `<span class="text-[11px] font-bold text-emerald-700 whitespace-nowrap">Covered by +${marginFormatted} pts</span>`
                        };
                    } else if (margin < 0) {
                        return {
                            status: 'loss',
                            badge: `<span class="text-[11px] font-bold text-rose-700 whitespace-nowrap">Missed cover by -${marginFormatted} pts</span>`
                        };
                    } else {
                        return {
                            status: 'push',
                            badge: `<span class="text-[11px] font-bold text-slate-600 whitespace-nowrap">Pushed at spread</span>`
                        };
                    }
                }
            }

            if (marketKey === 'total') {
                const hasWagerLine = wager.line !== undefined && wager.line !== null && wager.line !== '' && Number.isFinite(Number(wager.line));
                const line = hasWagerLine ? Number(wager.line) : Number(game.overUnder);
                if (!Number.isFinite(line)) return null;

                const diffFromLine = totalPoints - line;
                const isOver = wager.side === 'Over';

                if (isLive) {
                    if (isOver) {
                        if (diffFromLine > 0) {
                            return {
                                status: 'winning',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>Hitting Over: ${totalPoints} / ${line.toFixed(1)} (+${diffFromLine.toFixed(1)} pts)</span>`
                            };
                        } else if (diffFromLine === 0) {
                            return {
                                status: 'push',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">At line: ${totalPoints} / ${line.toFixed(1)}</span>`
                            };
                        } else {
                            const needed = (line - totalPoints).toFixed(1);
                            return {
                                status: 'losing',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-amber-500"></span>${totalPoints} / ${line.toFixed(1)} pts (${needed} more to Over)</span>`
                            };
                        }
                    } else {
                        if (diffFromLine < 0) {
                            const cushion = (line - totalPoints).toFixed(1);
                            return {
                                status: 'winning',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>Under safe: ${totalPoints} / ${line.toFixed(1)} (${cushion} cushion)</span>`
                            };
                        } else if (diffFromLine === 0) {
                            return {
                                status: 'push',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">At line: ${totalPoints} / ${line.toFixed(1)}</span>`
                            };
                        } else {
                            return {
                                status: 'losing',
                                badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-rose-600"></span>Busted Under: ${totalPoints} / ${line.toFixed(1)} (+${diffFromLine.toFixed(1)} over)</span>`
                            };
                        }
                    }
                } else {
                    if (isOver) {
                        if (diffFromLine > 0) {
                            return {
                                status: 'win',
                                badge: `<span class="text-[11px] font-bold text-emerald-700 whitespace-nowrap">Hit Over by +${diffFromLine.toFixed(1)} pts (${totalPoints} total)</span>`
                            };
                        } else if (diffFromLine < 0) {
                            return {
                                status: 'loss',
                                badge: `<span class="text-[11px] font-bold text-rose-700 whitespace-nowrap">Missed Over by ${(line - totalPoints).toFixed(1)} pts (${totalPoints}/${line.toFixed(1)})</span>`
                            };
                        } else {
                            return {
                                status: 'push',
                                badge: `<span class="text-[11px] font-bold text-slate-600 whitespace-nowrap">Pushed at ${totalPoints} pts</span>`
                            };
                        }
                    } else {
                        if (diffFromLine < 0) {
                            return {
                                status: 'win',
                                badge: `<span class="text-[11px] font-bold text-emerald-700 whitespace-nowrap">Stayed Under by ${(line - totalPoints).toFixed(1)} pts (${totalPoints} total)</span>`
                            };
                        } else if (diffFromLine > 0) {
                            return {
                                status: 'loss',
                                badge: `<span class="text-[11px] font-bold text-rose-700 whitespace-nowrap">Went Over by +${diffFromLine.toFixed(1)} pts (${totalPoints}/${line.toFixed(1)})</span>`
                            };
                        } else {
                            return {
                                status: 'push',
                                badge: `<span class="text-[11px] font-bold text-slate-600 whitespace-nowrap">Pushed at ${totalPoints} pts</span>`
                            };
                        }
                    }
                }
            }

            if (marketKey === 'moneyline') {
                const isHome = wager.side === game.home;
                const myScore = isHome ? homeScore : awayScore;
                const oppScore = isHome ? awayScore : homeScore;
                const lead = myScore - oppScore;

                if (isLive) {
                    if (lead > 0) {
                        return {
                            status: 'winning',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>Leading by +${lead} pts</span>`
                        };
                    } else if (lead < 0) {
                        return {
                            status: 'losing',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-rose-600"></span>Trailing by -${Math.abs(lead)} pts</span>`
                        };
                    } else {
                        return {
                            status: 'push',
                            badge: `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">Tied at ${myScore}-${oppScore}</span>`
                        };
                    }
                } else {
                    if (lead > 0) {
                        return {
                            status: 'win',
                            badge: `<span class="text-[11px] font-bold text-emerald-700 whitespace-nowrap">Won by +${lead} pts</span>`
                        };
                    } else if (lead < 0) {
                        return {
                            status: 'loss',
                            badge: `<span class="text-[11px] font-bold text-rose-700 whitespace-nowrap">Lost by -${Math.abs(lead)} pts</span>`
                        };
                    } else {
                        return {
                            status: 'push',
                            badge: `<span class="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tied game</span>`
                        };
                    }
                }
            }

            return null;
        }

        function calculateBonusWeekMaxProfit(bonusObj, weekNum) {
            let maxProfit = 0;
            const games = getGamesForPicks(weekNum);
            games.forEach(game => {
                const wagers = bonusObj[game.gameKey] || {};
                ['moneyline', 'spread', 'total'].forEach(market => {
                    const wager = wagers[market];
                    const amount = parseFloat(wager && wager.amount);
                    if (!wager || !wager.side || !Number.isFinite(amount) || amount <= 0) return;
                    maxProfit += getBonusPotentialPayout(wager, market, game) - amount;
                });
            });
            return maxProfit;
        }

        function adjustBonusBet(gameKey, market, amountDelta) {
            const wager = getBonusBets()[gameKey]?.[market] || { amount: 0 };
            const bankroll = calculateBankroll(getBonusBets());
            if (amountDelta > 0 && bankroll.available <= 0) return;
            updateBonusBet(gameKey, market, wager.side, Math.max(0, (parseFloat(wager.amount) || 0) + amountDelta), wager.line, wager.odds);
        }

        function refundUnselectedLockedBonusBets() {
            const bonusBets = getBonusBets();
            let changed = false;
            Object.keys(bonusBets || {}).forEach(gameKey => {
                const game = findBonusGame(gameKey);
                if (!game || new Date() <= game.dateObj) return;
                const wagers = bonusBets[gameKey] || {};
                ['moneyline', 'spread', 'total'].forEach(market => {
                    const wager = wagers[market];
                    const amount = parseFloat(wager && wager.amount);
                    if (!wager || !Number.isFinite(amount) || amount <= 0 || wager.side) return;
                    delete wagers[market];
                    changed = true;
                });
                if (!Object.keys(wagers).length) delete bonusBets[gameKey];
            });
            if (changed) {
                localStorage.setItem(`${currentSport.toLowerCase()}BonusBets_2026_User_${currentUser}`, JSON.stringify(bonusBets));
                saveBonusBetsImmediately(bonusBets);
            }
            return changed;
        }

        async function renderBonusSchedule() {
            const select = document.getElementById('bonus-week-select');
            const container = document.getElementById('bonus-schedule-container');
            if (!select || !container) return;
            const totalWeeks = currentSport === 'CFB' ? 15 : 18;
            if (!select.options.length) {
                for (let week = 1; week <= totalWeeks; week++) select.add(new Option(`Week ${week}`, week));
                select.value = actualCurrentWeek;
            }
            const weekNum = parseInt(select.value) || actualCurrentWeek;
            refundUnselectedLockedBonusBets();
            const bonusBets = getBonusBets();
            const games = [...getGamesForPicks(weekNum)].sort((firstGame, secondGame) => {
                const firstHasBet = hasBonusBetOnGame(bonusBets, firstGame);
                const secondHasBet = hasBonusBetOnGame(bonusBets, secondGame);
                return Number(secondHasBet) - Number(firstHasBet) || firstGame.dateObj - secondGame.dateObj;
            });
            const bankroll = calculateBankroll(getBonusBets());
            if (!games.length) {
                document.getElementById('bonus-bankroll-header').innerHTML = `<div><p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</p><p class="text-2xl font-black font-mono text-[#4DFFBC]">${bankroll.available.toFixed(2)}</p></div><div><p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Allocated</p><p class="text-2xl font-black font-mono text-white">${bankroll.allocated.toFixed(2)}</p></div><div><p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p><p class="text-2xl font-black font-mono text-white">${bankroll.total.toFixed(2)}</p></div><div><p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Profit</p><p class="text-2xl font-black font-mono text-purple-400">+0.00</p></div>`;
                container.innerHTML = renderEmptyState('No Games Scheduled', `There are no bonus betting markets scheduled for Week ${weekNum}.`, 'dollar-sign');
                renderIcons();
                return;
            }
            if (games.some(game => game.mlHome === undefined || game.spread === undefined || game.overUnder === undefined)) await loadOddsForWeek(weekNum);
            const maxProfit = calculateBonusWeekMaxProfit(bonusBets, weekNum);
            document.getElementById('bonus-bankroll-header').innerHTML = [
                ['Available', bankroll.available, 'text-[#4DFFBC]'],
                ['Allocated', bankroll.allocated, 'text-white'],
                ['Total', bankroll.total, 'text-white'],
                ['Max Profit', maxProfit, 'text-purple-400']
            ].map(([label, value, color]) => `<div><p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${label}</p><p class="text-2xl font-black font-mono ${color}">${label === 'Max Profit' ? '+' : ''}${value.toFixed(2)}</p></div>`).join('');
            const now = new Date();
            container.innerHTML = games.map(game => {
                const awayRank = getGameTeamRank(game, game.away);
                const homeRank = getGameTeamRank(game, game.home);
                const awayRankPrefix = awayRank ? `#${awayRank} ` : '';
                const homeRankPrefix = homeRank ? `#${homeRank} ` : '';
                const isFinished = !!(game.winner || game.isCompleted || game.statusState === 'post');
                const isLive = !isFinished && game.statusState === 'in';
                const locked = now > game.dateObj || isLive || isFinished;
                const hasScores = (isLive || isFinished) && game.homeScore !== undefined && game.awayScore !== undefined && game.homeScore !== null && game.awayScore !== null && game.homeScore !== '';
                const homeScore = Number(game.homeScore) || 0;
                const awayScore = Number(game.awayScore) || 0;
                const totalPoints = homeScore + awayScore;
                const diff = Math.abs(awayScore - homeScore);
                const diffText = awayScore > homeScore ? `${game.away} by ${diff}` : (homeScore > awayScore ? `${game.home} by ${diff}` : 'Tied');

                let statusLabel = 'Open';
                let statusColor = 'text-[#059669] font-bold';
                if (isFinished) {
                    statusLabel = '<span class="inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5 text-slate-400"></i> Final</span>';
                    statusColor = 'text-slate-500 font-bold';
                } else if (isLive) {
                    statusLabel = '<span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-sm bg-[#FF4D4D] animate-pulse"></span> Live</span>';
                    statusColor = 'text-[#DC2626] font-black';
                } else if (locked) {
                    statusLabel = '<span class="inline-flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3 text-[#FF4D4D]"></i> Locked</span>';
                    statusColor = 'text-[#DC2626] font-bold';
                }

                let liveScoreboardHTML = '';
                if (hasScores) {
                    liveScoreboardHTML = `
                        <div class="mb-3 p-3 rounded-md bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-800">
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <div class="flex items-center gap-1.5">
                                    <span class="font-bold text-slate-200 text-xs">${awayRankPrefix}${game.away}</span>
                                    <span class="font-mono font-black text-base text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shadow-inner">${awayScore}</span>
                                </div>
                                <span class="text-slate-500 font-black text-xs">@</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="font-mono font-black text-base text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shadow-inner">${homeScore}</span>
                                    <span class="font-bold text-slate-200 text-xs">${homeRankPrefix}${game.home}</span>
                                </div>
                                ${isLive ? `
                                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                        <span class="w-1.5 h-1.5 rounded-sm bg-[#FF4D4D] animate-pulse"></span>
                                        LIVE • ${getGameQuarterTimeDisplay(game)}
                                    </span>
                                    ${(typeof renderUpsetAlertBadge === 'function') ? renderUpsetAlertBadge(game, { size: 'xs' }) : ''}
                                ` : `
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 tracking-wider">FINAL</span>
                                    ${(typeof renderUpsetAlertBadge === 'function') ? renderUpsetAlertBadge(game, { size: 'xs' }) : ''}
                                `}
                            </div>

                            <div class="flex items-center gap-2 text-xs flex-wrap">
                                <div class="bg-slate-800/90 px-3 py-1 rounded border border-slate-700 flex items-center gap-1.5 shadow-sm">
                                    <span class="text-slate-400 uppercase text-[9px] font-black tracking-widest">Diff:</span>
                                    <span class="font-bold text-blue-400 font-mono">${diffText}</span>
                                </div>
                                <div class="bg-slate-800/90 px-3 py-1 rounded border border-slate-700 flex items-center gap-1.5 shadow-sm">
                                    <span class="text-slate-400 uppercase text-[9px] font-black tracking-widest">Total:</span>
                                    <span class="font-mono font-bold text-white">${totalPoints} pts</span>
                                </div>
                            </div>
                        </div>
                    `;
                }

                const markets = [
                    { key: 'moneyline', label: 'Moneyline', options: [{ side: game.away, odds: game.mlAwayNum }, { side: game.home, odds: game.mlHomeNum }] },
                    { key: 'spread', label: 'Spread', options: [{ side: game.away, line: game.spreadAway }, { side: game.home, line: game.spreadHome }] },
                    { key: 'total', label: 'Total', options: [{ side: 'Over', line: game.overUnder }, { side: 'Under', line: game.overUnder }] }
                ].filter(market => market.options.some(option => market.key === 'moneyline' ? Number.isFinite(Number(option.odds)) && Number(option.odds) !== 0 : Number.isFinite(Number(option.line))));
                if (!markets.length) return '';
                const homeColors = getActiveColors()[game.home] || { primary: '#E2E8F0', secondary: '#1E293B' };
                const awayColors = getActiveColors()[game.away] || { primary: '#CBD5E1', secondary: '#1E293B' };
                const homeLogo = teamLogos[game.home] ? `<img src="${teamLogos[game.home]}" alt="${game.home} logo" class="w-8 h-8 logo-shadow object-contain">` : '';
                const awayLogo = teamLogos[game.away] ? `<img src="${teamLogos[game.away]}" alt="${game.away} logo" class="w-8 h-8 logo-shadow object-contain">` : '';
                const rows = markets.map(market => {
                    const wager = bonusBets[game.gameKey]?.[market.key] || {};
                    const selected = wager.side || '';
                    const currentWagerAmount = parseFloat(wager.amount) || 0;
                    const choices = market.options.map((option, optionIndex) => {
                        const chosen = selected === option.side;
                        const hasLine = Number.isFinite(Number(option.line));
                        const hasOdds = Number.isFinite(Number(option.odds)) && Number(option.odds) !== 0;

                        let detail = '';
                        if (chosen) {
                            if (market.key === 'moneyline') {
                                const lockedOdds = (wager.odds !== undefined && wager.odds !== null && Number.isFinite(Number(wager.odds)) && Number(wager.odds) !== 0)
                                    ? Number(wager.odds)
                                    : (hasOdds ? Number(option.odds) : null);
                                if (lockedOdds !== null) {
                                    const lockedStr = `${lockedOdds > 0 ? '+' : ''}${lockedOdds} (locked)`;
                                    const currentStr = hasOdds && Number(option.odds) !== lockedOdds ? ` <span class="text-[9px] font-normal opacity-70">(Now: ${Number(option.odds) > 0 ? '+' : ''}${option.odds})</span>` : '';
                                    detail = `${lockedStr}${currentStr}`;
                                } else {
                                    detail = 'N/A';
                                }
                            } else if (market.key === 'spread') {
                                const lockedLine = (wager.line !== undefined && wager.line !== null && Number.isFinite(Number(wager.line)))
                                    ? Number(wager.line)
                                    : (hasLine ? Number(option.line) : null);
                                if (lockedLine !== null) {
                                    const lockedStr = `${lockedLine > 0 ? '+' : ''}${lockedLine} (locked)`;
                                    const currentStr = hasLine && Number(option.line) !== lockedLine ? ` <span class="text-[9px] font-normal opacity-70">(Now: ${Number(option.line) > 0 ? '+' : ''}${option.line})</span>` : '';
                                    detail = `${lockedStr}${currentStr}`;
                                } else {
                                    detail = 'N/A';
                                }
                            } else if (market.key === 'total') {
                                const lockedLine = (wager.line !== undefined && wager.line !== null && Number.isFinite(Number(wager.line)))
                                    ? Number(wager.line)
                                    : (hasLine ? Number(option.line) : null);
                                if (lockedLine !== null) {
                                    const lockedStr = `${Number(lockedLine).toFixed(1)} (locked)`;
                                    const currentStr = hasLine && Number(option.line) !== lockedLine ? ` <span class="text-[9px] font-normal opacity-70">(Now: ${Number(option.line).toFixed(1)})</span>` : '';
                                    detail = `${lockedStr}${currentStr}`;
                                } else {
                                    detail = 'N/A';
                                }
                            }
                        } else {
                            if (market.key === 'moneyline') {
                                detail = hasOdds ? `${Number(option.odds) > 0 ? '+' : ''}${option.odds}` : 'N/A';
                            } else if (market.key === 'spread') {
                                detail = hasLine ? `${Number(option.line) > 0 ? '+' : ''}${option.line}` : 'N/A';
                            } else if (market.key === 'total') {
                                detail = '';
                            }
                        }

                        const lineDivider = market.key === 'total' && optionIndex === 1 ? `<span class="self-center px-2 text-sm font-black text-slate-500 whitespace-nowrap">${Number(game.overUnder).toFixed(1)}</span>` : '';
                        const clickAmount = currentWagerAmount > 0 ? currentWagerAmount : (bankroll.available >= 1 ? 1 : (bankroll.available > 0 ? bankroll.available : 0));
                        const clickLine = chosen ? (Number.isFinite(Number(wager.line)) ? Number(wager.line) : (hasLine ? Number(option.line) : 'null')) : (hasLine ? Number(option.line) : 'null');
                        const clickOdds = chosen ? (Number.isFinite(Number(wager.odds)) ? Number(wager.odds) : (hasOdds ? Number(option.odds) : 'null')) : (hasOdds ? Number(option.odds) : 'null');
                        return `${lineDivider}<button type="button" onclick="updateBonusBetEncoded('${bonusValue(game.gameKey)}', '${bonusValue(market.key)}', '${bonusValue(option.side)}', ${clickAmount}, ${clickLine}, ${clickOdds})" class="flex-1 p-2 rounded border text-xs font-black transition-all ${chosen ? 'ring-2 ring-blue-600 shadow-sm' : 'border-slate-200'}" style="background-color:${chosen ? '#EFF6FF' : (option.side === game.home ? homeColors.primary : option.side === game.away ? awayColors.primary : '#FFFFFF')};color:${chosen ? '#1E40AF' : (option.side === game.home ? homeColors.secondary : option.side === game.away ? awayColors.secondary : '#1E293B')}" ${locked ? 'disabled' : ''}>${option.side}<span class="block text-[10px] opacity-80 font-bold">${detail}</span></button>`;
                    }).join('');
                    const payout = getBonusPotentialPayout(wager, market.key, game);
                    const settlement = getBonusSettlementMarkup(game, market.key, wager);
                    const result = getBonusWagerResult(game, market.key, wager);
                    const liveTracking = getBonusLiveTracking(game, market.key, wager);

                    let settledClass = '';
                    if (result === 'win') settledClass = 'stripe-win border-l-8 border-l-[#4DFFBC] pl-3';
                    else if (result === 'loss') settledClass = 'stripe-loss border-l-8 border-l-[#FF4D4D] pl-3';
                    else if (result === 'push') settledClass = 'stripe-push border-l-8 border-l-slate-400 pl-3';
                    else if (isLive && liveTracking) {
                        if (liveTracking.status === 'winning') settledClass = 'stripe-win border-l-8 border-l-[#4DFFBC] pl-3';
                        else if (liveTracking.status === 'losing') settledClass = 'stripe-loss border-l-8 border-l-[#FF4D4D] pl-3';
                        else if (liveTracking.status === 'push') settledClass = 'stripe-push border-l-8 border-l-slate-400 pl-3';
                    }

                    let trackingMarkup = '';
                    if (settlement) {
                        trackingMarkup = `<div class="flex flex-col items-start justify-center gap-1 shrink-0">${settlement}${liveTracking?.badge ? `<span class="opacity-95 leading-tight">${liveTracking.badge}</span>` : ''}</div>`;
                    } else if (isLive && liveTracking?.badge) {
                        trackingMarkup = `<div class="flex items-center gap-1.5 flex-wrap">${liveTracking.badge}</div>`;
                    }

                    return `<div class="flex flex-col md:flex-row md:items-center gap-2 border-t border-slate-100 pt-3 ${settledClass}"><span class="w-24 text-xs font-black uppercase text-slate-500">${market.label}</span><div class="flex flex-1 gap-2">${choices}</div><div class="flex items-center gap-1"><button type="button" onclick="adjustBonusBetEncoded('${bonusValue(game.gameKey)}', '${bonusValue(market.key)}', -1)" class="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-black" ${locked ? 'disabled' : ''}>-</button><input type="number" min="0" step="0.1" value="${wager.amount || ''}" onchange="updateBonusBetEncoded('${bonusValue(game.gameKey)}', '${bonusValue(market.key)}', '${bonusValue(selected)}', this.value, ${Number.isFinite(Number(wager.line)) ? Number(wager.line) : 'null'}, ${Number.isFinite(Number(wager.odds)) ? Number(wager.odds) : 'null'})" class="w-20 h-8 rounded border border-slate-300 text-center font-black" ${locked ? 'disabled' : ''}><button type="button" onclick="adjustBonusBetEncoded('${bonusValue(game.gameKey)}', '${bonusValue(market.key)}', 1)" class="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 font-black" ${locked || bankroll.available <= 0 ? 'disabled' : ''}>+</button></div>${!isFinished && payout ? `<span class="text-xs font-black text-blue-600 whitespace-nowrap">Potential: ${payout.toFixed(2)}</span>` : ''}${trackingMarkup}</div>`;
                }).join('');
                const awayRecord = getTeamCurrentRecord(game.away, currentSport);
                const homeRecord = getTeamCurrentRecord(game.home, currentSport);
                return `<div class="p-4 rounded-md border border-slate-200 bg-white shadow-sm"><div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3 mb-3"><div class="flex items-center gap-3 min-w-0"><div class="flex items-center gap-1.5 shrink-0">${awayLogo}${homeLogo}</div><div class="min-w-0"><h3 class="font-black text-slate-900 truncate">${awayRankPrefix}${game.away} (${awayRecord}) ${game.isNeutral ? 'vs' : 'at'} ${homeRankPrefix}${game.home} (${homeRecord})</h3><p class="text-xs font-bold text-slate-500">${game.dateStr}</p></div></div><div class="flex items-center gap-2 shrink-0">${renderGameInfoBtn(game.gameKey, weekNum > actualCurrentWeek, { label: 'Game Info' })}${locked ? renderGameSummaryBtn(game.gameKey, { label: 'Game Summary' }) : ''}<span class="text-xs font-black uppercase ${statusColor}">${statusLabel}</span></div></div>${liveScoreboardHTML}${rows}</div>`;
            }).join('');
            renderIcons();
        }

