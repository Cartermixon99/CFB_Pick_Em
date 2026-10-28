// ==========================================
// REUSABLE UI COMPONENT RENDER HELPERS
// ==========================================

/**
 * 1. Standardized Team Logo Renderer
 * Displays official ESPN team logo with bright pop-shadow or high-contrast fallback initials circle.
 */
function renderTeamLogo(team, sizeClass = 'w-7 h-7', customClass = '') {
    if (!team) return `<span class="${sizeClass} rounded-full bg-slate-700/50 inline-block shrink-0 ${customClass}"></span>`;
    
    const logoUrl = (typeof teamLogos !== 'undefined' && teamLogos[team]) ? teamLogos[team] : null;
    if (logoUrl) {
        return `<img src="${logoUrl}" alt="${highlightEscape(team)} logo" class="${sizeClass} object-contain logo-shadow shrink-0 ${customClass}">`;
    }
    
    // Contrast-aware fallback circle
    let colors = { primary: '#1E293B', secondary: '#F8FAFC' };
    if (typeof getActiveColors === 'function') {
        const activeColors = getActiveColors();
        if (activeColors && activeColors[team]) colors = activeColors[team];
    } else if (typeof cfbColors !== 'undefined' && cfbColors[team]) {
        colors = cfbColors[team];
    }
    
    const initial = team.charAt(0).toUpperCase();
    return `<div class="${sizeClass} rounded-full shrink-0 flex items-center justify-center font-black text-xs ${customClass}" style="background-color: ${colors.primary}; color: ${colors.secondary}; border: 1px solid rgba(0,0,0,0.15)">${initial}</div>`;
}

/**
 * 2. Standardized Team Badge (Logo + Name + Optional Rank/Record)
 */
function renderTeamBadge(team, options = {}) {
    const { rank = null, record = null, logoSize = 'w-6 h-6', textClass = 'text-sm font-bold text-slate-800' } = options;
    const rankPrefix = rank ? `<span class="text-xs font-black text-purple-600 mr-1">#${rank}</span>` : '';
    const recordSub = record ? `<span class="text-[11px] font-semibold text-slate-500 block leading-none mt-0.5">${record}</span>` : '';
    const logoHtml = renderTeamLogo(team, logoSize);
    
    return `
        <div class="flex items-center gap-2 min-w-0">
            ${logoHtml}
            <div class="min-w-0">
                <div class="${textClass} truncate">${rankPrefix}${highlightEscape(team)}</div>
                ${recordSub}
            </div>
        </div>
    `;
}

/**
 * 3. Standardized Result Badge (Win / Loss / Push)
 */
function renderResultBadge(result) {
    const res = String(result || '').toLowerCase();
    if (res === 'win' || res === 'w') {
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#d1fae5] text-[#059669] border border-[#a7f3d0]">WIN</span>`;
    }
    if (res === 'loss' || res === 'l') {
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#fee2e2] text-[#DC2626] border border-[#fecaca]">LOSS</span>`;
    }
    if (res === 'push' || res === 'p') {
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300">PUSH</span>`;
    }
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">PENDING</span>`;
}

/**
 * 4. Standardized Odds Pill (Spread, Over/Under, Moneyline)
 */
function renderOddsPill(label, value, isSelected = false) {
    if (value === undefined || value === null || value === '') return '';
    const activeClass = isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700';
    return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold transition-all ${activeClass}"><span class="text-[10px] font-sans font-semibold opacity-70">${label}</span>${value}</span>`;
}

/**
 * 5. Game Info / Match Insights Button
 * Opens the ESPN Game Insights modal (FPI, efficiencies, rankings, offense/defense breakdowns).
 */
function renderGameInfoBtn(gameKey, isFutureWeek = false, options = {}) {
    const { label = 'Info', size = 'sm', customClass = '' } = options;
    const encodedKey = encodeURIComponent(gameKey || '');
    const padding = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
    return `
        <button type="button" 
            onclick="generateInsights('${encodedKey}', ${Boolean(isFutureWeek)})" 
            aria-label="View game info and match insights" 
            title="Open ESPN Game Insights" 
            class="${padding} bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded font-bold transition-colors border border-slate-200 shadow-xs flex items-center gap-1 cursor-pointer shrink-0 ${customClass}">
            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-blue-600"></i>
            <span>${label}</span>
        </button>
    `;
}

/**
 * 6. Game Summary / Boxscore Button
 * Opens the ESPN In-Game Boxscore & Stats modal.
 */
function renderGameSummaryBtn(gameKey, options = {}) {
    const { label = 'Summary', size = 'sm', customClass = '' } = options;
    const encodedKey = encodeURIComponent(gameKey || '');
    const padding = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
    return `
        <button type="button" 
            onclick="openGameSummary('${encodedKey}')" 
            aria-label="View game summary and boxscore" 
            title="Open ESPN Game Stats & Box Score" 
            class="${padding} bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded font-bold transition-colors border border-slate-200 shadow-xs flex items-center gap-1 cursor-pointer shrink-0 ${customClass}">
            <i data-lucide="activity" class="w-3.5 h-3.5 text-blue-600"></i>
            <span>${label}</span>
        </button>
    `;
}

/**
 * 7. Live Score Display Pill
 * High-contrast live game score chip for home/away teams.
 */
function renderScorePill(score, options = {}) {
    if (score === undefined || score === null || score === '') return '';
    const { customClass = '' } = options;
    return `<span class="font-mono font-black text-sm sm:text-base px-2 py-0.5 rounded bg-black/30 text-white shadow-inner shrink-0 ${customClass}">${score}</span>`;
}

/**
 * 8. Game Status Badge
 * Visual status indicator for Live (pulsing red dot), Final, or Scheduled games.
 */
function renderGameStatusBadge(statusState, statusDetail = '', options = {}) {
    const state = String(statusState || '').toLowerCase();
    const detail = (statusDetail || '').trim();
    
    if (state === 'in') {
        return `
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-600 border border-red-200">
                <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>LIVE ${detail ? `• ${detail}` : ''}</span>
            </span>
        `;
    }
    if (state === 'post' || detail.toLowerCase().includes('final')) {
        return `
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300">
                ${detail || 'FINAL'}
            </span>
        `;
    }
    return `
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
            ${detail || 'SCHEDULED'}
        </span>
    `;
}

/**
 * 9. Matchup Predictor / Probability Bar
 * Renders an interactive win-probability / FPI split bar between two teams.
 */
function renderMatchupPredictorBar(teamA, teamB, probA, probB, options = {}) {
    const pA = Math.round(Number(probA) || 50);
    const pB = 100 - pA;
    const { label = 'FPI Predictor', borderClass = 'border-slate-200' } = options;
    
    let colorA = '#2563EB';
    let colorB = '#DC2626';
    if (typeof getActiveColors === 'function') {
        const colors = getActiveColors();
        if (colors[teamA]) colorA = colors[teamA].primary;
        if (colors[teamB]) colorB = colors[teamB].primary;
    }
    
    return `
        <div class="w-full mt-2 pt-2 border-t ${borderClass}">
            <div class="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1 text-slate-500">
                <span>${pA}% ${highlightEscape(teamA)}</span>
                <span class="flex items-center gap-1"><i data-lucide="bar-chart-2" class="w-3 h-3 text-blue-600"></i> ${label}</span>
                <span>${pB}% ${highlightEscape(teamB)}</span>
            </div>
            <div class="w-full h-1.5 rounded-sm flex overflow-hidden bg-slate-100 shadow-inner">
                <div style="width: ${pA}%; background-color: ${colorA};"></div>
                <div style="width: ${pB}%; background-color: ${colorB};"></div>
            </div>
        </div>
    `;
}

/**
 * 10. Standardized Empty State Card
 * Displayed when picks, matchups, submissions, or search results are empty.
 */
function renderEmptyState(title, subtitle = '', icon = 'inbox') {
    return `
        <div class="text-center p-8 bg-white border border-slate-200/80 rounded-xl my-3 shadow-xs">
            <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <h4 class="text-sm font-black text-slate-800 tracking-wide">${title}</h4>
            ${subtitle ? `<p class="text-xs text-slate-500 font-medium mt-1">${subtitle}</p>` : ''}
        </div>
    `;
}

/**
 * 11. Progress Bar Component
 * Displays a labeled progress bar with fraction and percentage (e.g. Picks completed, bankroll).
 */
function renderProgressBar(current, total, options = {}) {
    const cur = Number(current) || 0;
    const tot = Number(total) || 1;
    const pct = Math.min(100, Math.round((cur / tot) * 100));
    const { label = 'Progress', colorClass = 'bg-purple-600' } = options;
    
    return `
        <div class="w-full">
            <div class="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
                <span>${label}</span>
                <span class="font-mono">${cur} / ${tot} (${pct}%)</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                <div class="${colorClass} h-2 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
            </div>
        </div>
    `;
}

/**
 * 12. Community Consensus Bar Component
 * Displays the split of league / community picks between away and home teams.
 */
function renderConsensusBar(awayTeam, homeTeam, stats, options = {}) {
    const { awayCount = 0, homeCount = 0, total = 0, awayPct = 0, homePct = 0 } = stats || {};
    const { borderClass = 'border-slate-100', showEmpty = true } = options;

    if (!total || total <= 0) {
        if (!showEmpty) return '';
        return `
            <div class="w-full mt-2 pt-2 border-t ${borderClass} flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
                <span class="flex items-center gap-1.5 text-slate-400">
                    <i data-lucide="users" class="w-3.5 h-3.5 text-purple-500 opacity-80"></i>
                    <span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">League Consensus</span>
                </span>
                <span class="italic text-[10px] text-slate-400">No picks submitted yet</span>
            </div>
        `;
    }

    let awayColor = '#475569';
    let homeColor = '#0F172A';
    if (typeof getActiveColors === 'function') {
        const colors = getActiveColors();
        if (colors && colors[awayTeam] && colors[awayTeam].primary) awayColor = colors[awayTeam].primary;
        if (colors && colors[homeTeam] && colors[homeTeam].primary) homeColor = colors[homeTeam].primary;
    }

    // Guard against identical colors blending together
    if (awayColor.toLowerCase() === homeColor.toLowerCase()) {
        awayColor = '#6366F1';
        homeColor = '#0F172A';
    }

    const awayIsFav = awayPct > homePct;
    const homeIsFav = homePct > awayPct;

    return `
        <div class="w-full mt-2.5 pt-2 border-t ${borderClass}">
            <div class="flex justify-between items-center text-[10px] mb-1 font-bold">
                <!-- Away team consensus -->
                <div class="flex items-center gap-1 min-w-0">
                    <span class="font-black text-xs ${awayIsFav ? 'text-purple-700 font-extrabold' : 'text-slate-600'}">${awayPct}%</span>
                    <span class="text-slate-600 truncate max-w-[85px] sm:max-w-[130px]">${highlightEscape(awayTeam)}</span>
                    <span class="text-[9px] text-slate-400 font-mono">(${awayCount})</span>
                </div>

                <!-- Center League Picks indicator -->
                <div class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-wider shrink-0 shadow-2xs">
                    <i data-lucide="users" class="w-3 h-3 text-purple-600"></i>
                    <span>${total} ${total === 1 ? 'Pick' : 'Picks'}</span>
                </div>

                <!-- Home team consensus -->
                <div class="flex items-center gap-1 min-w-0 justify-end">
                    <span class="text-[9px] text-slate-400 font-mono">(${homeCount})</span>
                    <span class="text-slate-600 truncate max-w-[85px] sm:max-w-[130px] text-right">${highlightEscape(homeTeam)}</span>
                    <span class="font-black text-xs ${homeIsFav ? 'text-purple-700 font-extrabold' : 'text-slate-600'}">${homePct}%</span>
                </div>
            </div>

            <!-- Two-tone split progress bar -->
            <div class="w-full h-1.5 rounded-full flex overflow-hidden bg-slate-200 shadow-inner">
                <div style="width: ${awayPct}%; background-color: ${awayColor}; transition: width 0.3s ease;" title="${highlightEscape(awayTeam)}: ${awayPct}% (${awayCount} picks)"></div>
                <div style="width: ${homePct}%; background-color: ${homeColor}; transition: width 0.3s ease;" title="${highlightEscape(homeTeam)}: ${homePct}% (${homeCount} picks)"></div>
            </div>
        </div>
    `;
}

/**
 * 13. Upset Alert Badge Component
 * Displays a vibrant pulsing badge when an underdog leads in a live game,
 * or an upset badge when an underdog pulls off the victory.
 */
function renderUpsetAlertBadge(game, options = {}) {
    if (typeof checkUpsetAlert !== 'function') return '';
    const upsetInfo = checkUpsetAlert(game);
    if (!upsetInfo.isUpsetAlert && !upsetInfo.isUpsetFinal) return '';

    const { size = 'sm', customClass = '', showFinal = true } = options;
    const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';

    if (upsetInfo.isUpsetAlert) {
        const isCritical = upsetInfo.severity === 'critical';
        const colorClasses = isCritical 
            ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-rose-100 ring-1 ring-rose-400/50' 
            : 'bg-amber-50 text-amber-700 border-amber-300 shadow-amber-100 ring-1 ring-amber-400/40';
        const iconName = isCritical ? 'flame' : 'alert-triangle';
        const iconColor = isCritical ? 'text-rose-600 fill-rose-500' : 'text-amber-600';

        return `
            <span class="inline-flex items-center gap-1 ${pad} rounded font-black uppercase tracking-wider border animate-pulse shadow-xs shrink-0 ${colorClasses} ${customClass}" 
                title="${highlightEscape(upsetInfo.underdog)} leads ${highlightEscape(upsetInfo.favorite)} by ${upsetInfo.dogLead} (${upsetInfo.dogScore}-${upsetInfo.favScore})">
                <i data-lucide="${iconName}" class="w-3 h-3 ${iconColor}"></i>
                <span>UPSET ALERT • ${highlightEscape(upsetInfo.underdog)} +${upsetInfo.dogLead}</span>
            </span>
        `;
    }

    if (upsetInfo.isUpsetFinal && showFinal) {
        return `
            <span class="inline-flex items-center gap-1 ${pad} rounded font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 shadow-xs shrink-0 ${customClass}" 
                title="${highlightEscape(upsetInfo.underdog)} defeated ${highlightEscape(upsetInfo.favorite)} (${upsetInfo.dogScore}-${upsetInfo.favScore})">
                <i data-lucide="zap" class="w-3 h-3 text-amber-600 fill-amber-500"></i>
                <span>UPSET • ${highlightEscape(upsetInfo.underdog)}</span>
            </span>
        `;
    }

    return '';
}


