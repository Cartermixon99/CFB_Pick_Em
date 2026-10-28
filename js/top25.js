        function getTop25CurrentWeek() {
            let currentWeek = 1;
            for (let week = 1; week <= TOP25_TOTAL_WEEKS; week++) {
                const opening = getTop25WeekOpening(week);
                if (Date.now() >= opening.getTime()) currentWeek = week;
            }
            return currentWeek;
        }

        function refreshTop25Week() {
            const section = document.getElementById('section-top25');
            if (!currentUser || !section || section.classList.contains('hidden')) return;
            const currentWeek = getTop25CurrentWeek();
            if (currentWeek === top25ViewedWeek) return;
            top25ViewedWeek = currentWeek;
            top25DraftWeek = 0;
            const select = document.getElementById('top25-week-select');
            if (select) select.value = currentWeek;
            renderTop25();
        }

        function getTop25WeekOpening(week) {
            const calendarDay = new Date(Date.UTC(TOP25_FIRST_SUNDAY.year, TOP25_FIRST_SUNDAY.month, TOP25_FIRST_SUNDAY.day + (week - 1) * 7, 6));
            const easternParts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                hourCycle: 'h23'
            }).formatToParts(calendarDay).reduce((parts, part) => {
                if (part.type !== 'literal') parts[part.type] = Number(part.value);
                return parts;
            }, {});
            const easternAsUtc = Date.UTC(easternParts.year, easternParts.month - 1, easternParts.day, easternParts.hour);
            const offset = calendarDay.getTime() - easternAsUtc;
            return new Date(Date.UTC(calendarDay.getUTCFullYear(), calendarDay.getUTCMonth(), calendarDay.getUTCDate(), 6) + offset);
        }

        function top25IsLocked(week) {
            return week !== getTop25CurrentWeek();
        }

        function getTop25DefaultTeams(week) {
            const current = top25Submissions[week]?.[currentUser]?.teams;
            if (Array.isArray(current)) return current.slice(0, 25);
            for (let previousWeek = week - 1; previousWeek >= 1; previousWeek--) {
                const previous = top25Submissions[previousWeek]?.[currentUser]?.teams;
                if (Array.isArray(previous)) return previous.slice(0, 25);
            }
            return [];
        }

        function getTop25PreviousTeams(week, username = currentUser) {
            return Array.isArray(top25Submissions[week - 1]?.[username]?.teams)
                ? top25Submissions[week - 1][username].teams.slice(0, 25)
                : [];
        }

        function top25MovementMarkup(team, index, previousTeams) {
            const previousIndex = previousTeams.indexOf(team);
            if (previousIndex < 0) return '<span class="inline-flex items-center rounded bg-emerald-600 px-1.5 py-1 text-xs font-black text-white" title="Newly ranked">&uarr; NR</span>';
            const movement = previousIndex - index;
            if (movement > 0) return `<span class="inline-flex items-center rounded bg-emerald-600 px-1.5 py-1 text-xs font-black text-white" title="Moved up ${movement} spot${movement === 1 ? '' : 's'}">&uarr; ${movement}</span>`;
            if (movement < 0) return `<span class="inline-flex items-center rounded bg-red-600 px-1.5 py-1 text-xs font-black text-white" title="Moved down ${Math.abs(movement)} spot${Math.abs(movement) === 1 ? '' : 's'}">&darr; ${Math.abs(movement)}</span>`;
            return '';
        }

        function getTop25TeamStats(team) {
            const clean = cleanTeamName(team);
            const record = getTeamCurrentRecord(clean, 'CFB');
            const games = Object.values(cfbGamesByWeek).flat().filter(game => {
                if (!game) return false;
                const h = cleanTeamName(game.home);
                const a = cleanTeamName(game.away);
                return h === clean || a === clean;
            });
            const completed = games.filter(game => {
                const isFinished = !!(game.isCompleted || game.statusState === 'post' || game.winner);
                return isFinished && Number.isFinite(Number(game.homeScore)) && Number.isFinite(Number(game.awayScore));
            });
            const latest = completed.sort((first, second) => second.dateObj - first.dateObj)[0];
            if (!latest) return { record, recent: 'No completed games yet' };
            const isHome = cleanTeamName(latest.home) === clean;
            const opponent = isHome ? latest.away : latest.home;
            const teamScore = isHome ? latest.homeScore : latest.awayScore;
            const opponentScore = isHome ? latest.awayScore : latest.homeScore;
            const result = latest.winner ? (cleanTeamName(latest.winner) === clean ? 'W' : 'L') : (Number(teamScore) > Number(opponentScore) ? 'W' : (Number(opponentScore) > Number(teamScore) ? 'L' : 'T'));
            return { record, recent: `${result} ${teamScore}-${opponentScore} vs ${opponent}` };
        }

        function top25TeamMarkup(team, index, editable, previousTeams = []) {
            const colors = cfbColors[team] || { primary: '#0F172A', secondary: '#CBD5E1' };
            const logo = renderTeamLogo(team, 'w-7 h-7 sm:w-8 sm:h-8');
            const stats = getTop25TeamStats(team);
            return `<div draggable="${editable}" ondragstart="top25DragStart(event, ${index})" ondragover="top25DragOver(event)" ondrop="top25Drop(event, ${index})" class="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 mb-2 rounded-lg border border-black/10 shadow-sm ${editable ? 'cursor-grab' : ''}" style="background-color:${colors.primary};color:${colors.secondary}">
                <span class="w-6 sm:w-7 text-center font-black text-white shrink-0">${index + 1}</span>
                ${logo}
                <span class="flex-1 min-w-0"><span class="block font-black truncate text-xs sm:text-sm">${highlightEscape(team)} (${stats.record})</span><span class="block text-[10px] sm:text-xs font-black opacity-80 truncate">${highlightEscape(stats.recent)}</span></span>
                ${top25MovementMarkup(team, index, previousTeams)}
                ${editable ? `
                    <div class="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                        ${index > 0 ? `<button type="button" aria-label="Move ${highlightEscape(team)} up" onclick="moveTop25Team(${index}, -1)" class="p-1 hover:bg-black/20 rounded text-current leading-none font-bold text-xs"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>` : ''}
                        ${index < top25Draft.length - 1 ? `<button type="button" aria-label="Move ${highlightEscape(team)} down" onclick="moveTop25Team(${index}, 1)" class="p-1 hover:bg-black/20 rounded text-current leading-none font-bold text-xs"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>` : ''}
                        <button type="button" aria-label="Remove ${highlightEscape(team)}" onclick="removeTop25Team(${index})" class="text-current hover:opacity-70 font-black text-xl px-1.5 leading-none">&times;</button>
                    </div>
                ` : ''}
            </div>`;
        }

        function top25SubmittedTeamMarkup(team, index, previousTeams = []) {
            const colors = cfbColors[team] || { primary: '#0F172A', secondary: '#CBD5E1' };
            const logo = teamLogos[team] ? `<img src="${teamLogos[team]}" alt="${highlightEscape(team)} logo" class="w-2/3 h-2/3 object-contain logo-shadow">` : '<span class="w-2/3 h-2/3 rounded-full bg-black/10"></span>';
            const record = getTeamCurrentRecord(team, 'CFB');
            return `<div class="relative aspect-square min-w-0 rounded-lg border border-black/10 shadow-sm flex flex-col items-center justify-center gap-1 p-2 text-center" style="background-color:${colors.primary};color:${colors.secondary}" title="#${index + 1} ${highlightEscape(team)} (${record})">
                <span class="absolute top-1 left-1 text-sm font-black text-white leading-none">${index + 1}</span>
                <span class="absolute top-1 right-1">${top25MovementMarkup(team, index, previousTeams)}</span>
                ${logo}
            </div>`;
        }

        function renderTop25() {
            const editor = document.getElementById('top25-editor');
            const submissions = document.getElementById('top25-submissions');
            const select = document.getElementById('top25-week-select');
            const deadline = document.getElementById('top25-deadline');
            if (!editor || !submissions || !select || !currentUser) return;

            const currentWeek = getTop25CurrentWeek();
            if (select.options.length !== Math.max(0, currentWeek - 1)) {
                select.innerHTML = '';
                for (let week = 2; week <= currentWeek; week++) select.add(new Option(`Week ${week + 1}`, week));
            }
            if (!select.value || Number(select.value) > currentWeek) select.value = currentWeek;
            const week = Number(select.value) || currentWeek;
            top25ViewedWeek = week;
            const editable = week === currentWeek;
            deadline.innerText = editable ? 'Open until Sunday at 6:00 AM Eastern.' : 'This week is locked. Historical rankings are view-only.';

            if (top25DraftWeek !== week) {
                top25Draft = getTop25DefaultTeams(week);
                top25DraftWeek = week;
            }
            const previousTeams = getTop25PreviousTeams(week);
            const compareBtn = `<div class="mb-3 flex items-center gap-2 flex-wrap">
                <button type="button" onclick="openCompareModal()" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md shadow-sm transition-all text-sm cursor-pointer"><i data-lucide="scale" class="w-4 h-4"></i> Compare</button>
                <button type="button" onclick="shareTop25()" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-md border border-slate-700 shadow-sm transition-all text-sm cursor-pointer"><i data-lucide="share-2" class="w-4 h-4 text-purple-400"></i> Share Ballot</button>
            </div>`;
            const search = editable ? `${compareBtn}<div class="relative"><input id="top25-search" type="search" autocomplete="off" placeholder="Search any FBS school to add..." class="w-full p-2.5 border border-slate-300 rounded-md font-bold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" oninput="renderTop25Search()" onfocus="renderTop25Search()" onkeydown="handleTop25SearchKeydown(event)"><div id="top25-search-results" class="mt-2"></div></div>` : compareBtn;
            const save = editable 
                ? `<div class="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onclick="saveTop25()" class="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-md shadow-sm text-sm cursor-pointer">Save Top 25</button>
                    <button type="button" onclick="shareTop25()" class="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 px-5 rounded-md border border-slate-700 shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2">
                        <i data-lucide="share-2" class="w-4 h-4 text-purple-400"></i> Share Top 25 Ballot
                    </button>
                   </div>`
                : `<div class="mt-4">
                    <button type="button" onclick="shareTop25()" class="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 px-5 rounded-md border border-slate-700 shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2">
                        <i data-lucide="share-2" class="w-4 h-4 text-purple-400"></i> Share Top 25 Ballot
                    </button>
                   </div>`;
            editor.innerHTML = `<div class="mb-4">${search}</div><div>${top25Draft.length ? top25Draft.map((team, index) => top25TeamMarkup(team, index, editable, previousTeams)).join('') : '<p class="p-5 text-center text-slate-500 font-bold">Search for an FBS school to build your ranking.</p>'}</div>${save}<p id="top25-save-status" class="text-sm font-bold text-[#059669] mt-3"></p>`;
            renderTop25Search();

            const weekSubmissions = top25Submissions[week] || {};
            const submitted = Object.values(weekSubmissions).filter(entry => Array.isArray(entry.teams));
            submissions.innerHTML = `<div class="flex items-center justify-between mb-3"><h3 class="text-lg font-black text-slate-900">Submitted Rankings</h3><span class="text-xs font-black uppercase tracking-widest text-slate-400">${submitted.length} submitted</span></div>${submitted.length ? submitted.map(entry => `<article class="bg-white border border-slate-200 rounded-md p-4 shadow-sm"><h4 class="font-black text-slate-900 mb-3">${highlightEscape(entry.username || 'Anonymous')}</h4><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">${entry.teams.slice(0, 25).map((team, index) => top25SubmittedTeamMarkup(team, index, getTop25PreviousTeams(week, entry.username))).join('')}</div></article>`).join('') : '<p class="p-5 bg-white border border-slate-200 rounded-md text-slate-500 font-bold">No Top 25 rankings have been submitted for this week yet.</p>'}`;
            renderIcons();
        }

        function handleTop25SearchKeydown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const results = document.getElementById('top25-search-results');
                if (!results) return;
                const firstBtn = results.querySelector('button');
                if (firstBtn) firstBtn.click();
            } else if (event.key === 'Escape') {
                const results = document.getElementById('top25-search-results');
                if (results) results.innerHTML = '';
            }
        }

        function renderTop25Search() {
            const input = document.getElementById('top25-search');
            const results = document.getElementById('top25-search-results');
            if (!input || !results) return;
            const query = input.value.trim().toLowerCase();
            if (top25Draft.length >= 25) {
                results.innerHTML = `<div class="p-3 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg border border-amber-200 text-center">Top 25 is full (25/25 teams). Remove a team to add another.</div>`;
                return;
            }
            let matches = [];
            let header = '';
            if (!query) {
                const suggestions = ["Georgia", "Ohio State", "Texas", "Alabama", "Oregon", "Penn State", "Notre Dame", "Michigan", "Ole Miss", "LSU", "Clemson", "Tennessee"];
                matches = suggestions.filter(team => !top25Draft.includes(team)).slice(0, 8);
                if (matches.length) header = '<div class="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 rounded-t-lg border-b border-slate-200">Suggested Teams</div>';
            } else {
                matches = fbsSchools.filter(team => team.toLowerCase().includes(query) && !top25Draft.includes(team)).slice(0, 8);
            }
            if (!matches.length) {
                results.innerHTML = query ? '<p class="p-3 text-sm text-slate-500">No available FBS schools found.</p>' : '';
                return;
            }
            results.innerHTML = `<div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">${header}${matches.map(team => {
                const logo = teamLogos[team];
                return `<button type="button" onclick="addTop25Team('${encodeURIComponent(team)}')" class="w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-cyan-50 font-bold flex items-center justify-between transition-colors cursor-pointer group">
                    <div class="flex items-center gap-2">
                        ${logo ? `<img src="${logo}" alt="${team}" class="w-5 h-5 logo-shadow object-contain shrink-0">` : ''}
                        <span class="text-sm text-slate-800 group-hover:text-cyan-900">${highlightEscape(team)}</span>
                    </div>
                    <span class="text-xs font-black text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                </button>`;
            }).join('')}</div>`;
        }

        function addTop25Team(encodedTeam) {
            const team = decodeURIComponent(encodedTeam);
            if (!top25Draft.includes(team) && top25Draft.length < 25) top25Draft.push(team);
            renderTop25();
            document.getElementById('top25-search')?.focus();
        }

        function moveTop25Team(index, direction) {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= top25Draft.length) return;
            const team = top25Draft[index];
            top25Draft.splice(index, 1);
            top25Draft.splice(newIndex, 0, team);
            renderTop25();
        }

        function removeTop25Team(index) {
            top25Draft.splice(index, 1);
            renderTop25();
        }

        function top25DragStart(event, index) {
            event.dataTransfer.setData('text/plain', index);
        }

        function top25DragOver(event) {
            event.preventDefault();
        }

        function top25Drop(event, targetIndex) {
            event.preventDefault();
            const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
            if (!Number.isInteger(sourceIndex) || sourceIndex === targetIndex) return;
            const [team] = top25Draft.splice(sourceIndex, 1);
            top25Draft.splice(targetIndex, 0, team);
            renderTop25();
        }

        function saveTop25() {
            const currentWeek = getTop25CurrentWeek();
            if (top25ViewedWeek !== currentWeek) return alert('Only the current Top 25 week can be edited.');
            if (top25Draft.length !== 25) return alert('Please rank exactly 25 teams before saving.');
            const submission = { username: currentUser, teams: top25Draft.slice(), timestamp: new Date().toISOString() };
            db.ref(`top25/CFB/${currentWeek}/${currentUser}`).set(submission).then(() => {
                top25Submissions[currentWeek] = top25Submissions[currentWeek] || {};
                top25Submissions[currentWeek][currentUser] = submission;
                const status = document.getElementById('top25-save-status');
                if (status) status.innerText = `Week ${currentWeek} Top 25 saved.`;
                renderTop25();
            }).catch(() => alert('Unable to save your Top 25 right now.'));
        }

