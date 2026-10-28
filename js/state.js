        // --- GLOBAL STATE ---
        let currentSport = 'CFB';
        const LOCKOUT_CFB = new Date("2026-09-05T12:00:00-04:00");
        const LOCKOUT_NFL = new Date("2026-09-13T12:00:00-04:00");
        
        let currentUser = "";
        let lbMode = "season";
        let currentWeeklyRenderId = 0;
        let actualCurrentWeek = 1;
        let highlightsScope = 'week';
        let highlightsRenderId = 0;
        let highlightsFinalizedRecords = [];
        let top25Submissions = {};
        let top25Draft = [];
        let top25DraftWeek = 0;
        let top25ViewedWeek = 1;
        const TOP25_TOTAL_WEEKS = 15;
        const TOP25_FIRST_SUNDAY = { year: 2026, month: 8, day: 6 };

        // Chart.js Instances
        let accChartInstance = null;
        let varChartInstance = null;

        // CFB Data
        let cfbPicks = {};
        let cfbWeeklyPicks = {};
        let cfbActualResults = {};
        let cfbGameScores = {};
        let cfbLeaderboardData = [];
        let cfbScheduleData = { "SEC": {}, "Big Ten": {}, "Big 12": {}, "ACC": {} };
        let cfbGamesByWeek = {};
        let cfbGameMeta = {};
        let cfbPlayoffPicks = {};
        let cfbBonusBets = {};

        // NFL Data
        let nflPicks = {};
        let nflWeeklyPicks = {};
        let nflActualResults = {};
        let nflGameScores = {};
        let nflLeaderboardData = [];
        let nflScheduleData = { "NFL": {} };
        let nflGamesByWeek = {};
        let nflPlayoffPicks = {};
        let nflBonusBets = {};
        let autosaveIntervalId = null;
        const pickChangeVersions = {
            CFB: { preseason: 0, weekly: 0, playoffs: 0 },
            NFL: { preseason: 0, weekly: 0, playoffs: 0 }
        };

        // Global Logo and Stats Dictionary
        let teamLogos = {}; 
        let teamIds = {};
        let teamStatsCache = {};
        let espnTeamRecords = { CFB: {}, NFL: {} };

        // ==========================================
        // DATA DICTIONARIES
        // ==========================================
        function getContrastRatio(hex1, hex2) {
            function getLuminance(hex) {
                hex = String(hex || '').replace('#', '');
                if (hex.length < 6) return 0;
                const rgb = [0, 2, 4].map(idx => {
                    const channel = parseInt(hex.substr(idx, 2), 16) / 255;
                    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
                });
                return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
            }
            const lum1 = getLuminance(hex1);
            const lum2 = getLuminance(hex2);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        }

        function getContrastYIQ(hexcolor) {
            if (!hexcolor) return '#FFFFFF';
            const hex = String(hexcolor).replace('#', '');
            if (hex.length < 6) return '#FFFFFF';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 140) ? '#000000' : '#FFFFFF';
        }

        function formatHexColor(hex) {
            if (!hex) return null;
            hex = String(hex).trim().replace(/^#/, '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length !== 6) return null;
            return '#' + hex.toUpperCase();
        }

        function ensureContrast(primary, secondary) {
            const p = formatHexColor(primary) || '#334155';
            let s = formatHexColor(secondary);
            if (!s || getContrastRatio(p, s) < 2.5) {
                s = getContrastYIQ(p);
            }
            return { primary: p, secondary: s };
        }

        const dynamicTeamColors = {};
        function registerTeamColor(teamName, primary, secondary) {
            if (!teamName || !primary) return;
            const clean = ensureContrast(primary, secondary);
            dynamicTeamColors[teamName] = clean;
            if (typeof rawCfbColors !== 'undefined') {
                rawCfbColors[teamName] = clean;
            }
        }

        const rawCfbColors = {
            // Power 4
            "Alabama": { primary: "#9E1B32", secondary: "#FFFFFF" }, "Arkansas": { primary: "#9D2235", secondary: "#FFFFFF" },
            "Auburn": { primary: "#0C2340", secondary: "#E87722" }, "Florida": { primary: "#0021A5", secondary: "#FA4616" },
            "Georgia": { primary: "#BA0C2F", secondary: "#000000" }, "Kentucky": { primary: "#0033A0", secondary: "#FFFFFF" },
            "LSU": { primary: "#461D7C", secondary: "#FDD023" }, "Ole Miss": { primary: "#182B49", secondary: "#CE1126" },
            "Mississippi State": { primary: "#660000", secondary: "#FFFFFF" }, "Missouri": { primary: "#000000", secondary: "#F1B82D" },
            "Oklahoma": { primary: "#841617", secondary: "#FDF5E6" }, "South Carolina": { primary: "#73000A", secondary: "#FFFFFF" },
            "Tennessee": { primary: "#FF8200", secondary: "#FFFFFF" }, "Texas": { primary: "#BF5700", secondary: "#FFFFFF" },
            "Texas A&M": { primary: "#500000", secondary: "#FFFFFF" }, "Vanderbilt": { primary: "#000000", secondary: "#866D4B" },
            "Illinois": { primary: "#13294B", secondary: "#FF5F05" }, "Indiana": { primary: "#990000", secondary: "#EEEDEB" },
            "Iowa": { primary: "#000000", secondary: "#FFCD00" }, "Maryland": { primary: "#E21833", secondary: "#FFD100" },
            "Michigan": { primary: "#00274C", secondary: "#FFCB05" }, "Michigan State": { primary: "#18453B", secondary: "#FFFFFF" },
            "Minnesota": { primary: "#7A0019", secondary: "#FFCC33" }, "Nebraska": { primary: "#E31837", secondary: "#FFFFFF" },
            "Northwestern": { primary: "#4E2A84", secondary: "#FFFFFF" }, "Ohio State": { primary: "#BB0000", secondary: "#FFFFFF" },
            "Oregon": { primary: "#154734", secondary: "#FEE12B" }, "Penn State": { primary: "#041E42", secondary: "#FFFFFF" },
            "Purdue": { primary: "#CEB888", secondary: "#000000" }, "Rutgers": { primary: "#CC0033", secondary: "#FFFFFF" },
            "UCLA": { primary: "#2D68C4", secondary: "#F2A900" }, "USC": { primary: "#990000", secondary: "#FFC72C" },
            "Washington": { primary: "#4B2E83", secondary: "#B7A57A" }, "Wisconsin": { primary: "#C5050C", secondary: "#FFFFFF" },
            "Arizona": { primary: "#CC0033", secondary: "#003366" }, "Arizona State": { primary: "#8C1D40", secondary: "#FFC627" },
            "Baylor": { primary: "#154734", secondary: "#FFB81C" }, "BYU": { primary: "#002E5D", secondary: "#FFFFFF" },
            "UCF": { primary: "#000000", secondary: "#BA9B37" }, "Cincinnati": { primary: "#E00122", secondary: "#FFFFFF" },
            "Colorado": { primary: "#000000", secondary: "#CFB87C" }, "Houston": { primary: "#C8102E", secondary: "#FFFFFF" },
            "Iowa State": { primary: "#C8102E", secondary: "#F1BE48" }, "Kansas": { primary: "#0051BA", secondary: "#E8000D" },
            "Kansas State": { primary: "#512888", secondary: "#FFFFFF" }, "Oklahoma State": { primary: "#FF6600", secondary: "#000000" },
            "TCU": { primary: "#4D1979", secondary: "#FFFFFF" }, "Texas Tech": { primary: "#CC0000", secondary: "#000000" },
            "Utah": { primary: "#CC0000", secondary: "#FFFFFF" }, "West Virginia": { primary: "#002855", secondary: "#EAAA00" },
            "Boston College": { primary: "#800000", secondary: "#988643" }, "California": { primary: "#003262", secondary: "#FDB515" },
            "Clemson": { primary: "#F56600", secondary: "#522D80" }, "Duke": { primary: "#003087", secondary: "#FFFFFF" },
            "Florida State": { primary: "#782F40", secondary: "#CEB888" }, "Georgia Tech": { primary: "#B3A369", secondary: "#003057" },
            "Louisville": { primary: "#AD0000", secondary: "#FFFFFF" }, "Miami": { primary: "#F47321", secondary: "#005030" },
            "North Carolina": { primary: "#7BAFD4", secondary: "#FFFFFF" }, "NC State": { primary: "#CC0000", secondary: "#FFFFFF" },
            "Pitt": { primary: "#003594", secondary: "#FFB81C" }, "SMU": { primary: "#CC0000", secondary: "#003366" },
            "Stanford": { primary: "#8C1515", secondary: "#FFFFFF" }, "Syracuse": { primary: "#D44500", secondary: "#FFFFFF" },
            "Virginia": { primary: "#232D4B", secondary: "#F15A24" }, "Virginia Tech": { primary: "#630031", secondary: "#CF4520" },
            "Wake Forest": { primary: "#9E7E38", secondary: "#000000" }, "Notre Dame": { primary: "#0C2340", secondary: "#C99700" },

            // Non-P4 FBS (Mountain West, AAC, Sun Belt, C-USA, MAC, Pac-12, Independents)
            "Air Force": { primary: "#003087", secondary: "#FFFFFF" }, "Boise State": { primary: "#0033A0", secondary: "#D64309" },
            "Colorado State": { primary: "#1E4D2B", secondary: "#C8C372" }, "Fresno State": { primary: "#DB0032", secondary: "#0A2240" },
            "Hawaii": { primary: "#024731", secondary: "#FFFFFF" }, "Nevada": { primary: "#003DA5", secondary: "#807F84" },
            "New Mexico": { primary: "#BA0C2F", secondary: "#C5B783" }, "San Diego State": { primary: "#A6192E", secondary: "#000000" },
            "San Jose State": { primary: "#0055A2", secondary: "#E5A823" }, "UNLV": { primary: "#B1021B", secondary: "#000000" },
            "Utah State": { primary: "#0F2439", secondary: "#FFFFFF" }, "Wyoming": { primary: "#492F24", secondary: "#FFC425" },
            "Army": { primary: "#000000", secondary: "#D4AF37" }, "Charlotte": { primary: "#00703C", secondary: "#FFFFFF" },
            "East Carolina": { primary: "#592A8A", secondary: "#FEC923" }, "Florida Atlantic": { primary: "#003366", secondary: "#CC0000" },
            "Memphis": { primary: "#003087", secondary: "#A5ACAF" }, "Navy": { primary: "#00205B", secondary: "#B5A36A" },
            "North Texas": { primary: "#00853F", secondary: "#FFFFFF" }, "Rice": { primary: "#00205B", secondary: "#C1C6C8" },
            "South Florida": { primary: "#006747", secondary: "#CFC493" }, "Temple": { primary: "#A32035", secondary: "#FFFFFF" },
            "Tulane": { primary: "#006747", secondary: "#8FD6BD" }, "Tulsa": { primary: "#003B5C", secondary: "#C8102E" },
            "UAB": { primary: "#006633", secondary: "#F7C600" }, "UTSA": { primary: "#0C2340", secondary: "#F15A22" },
            "Appalachian State": { primary: "#000000", secondary: "#FFCC00" }, "App State": { primary: "#000000", secondary: "#FFCC00" }, "Arkansas State": { primary: "#CC092F", secondary: "#000000" },
            "Coastal Carolina": { primary: "#006F71", secondary: "#A27752" }, "Georgia Southern": { primary: "#041E42", secondary: "#FFFFFF" },
            "Georgia State": { primary: "#0039A6", secondary: "#CC0000" }, "James Madison": { primary: "#450084", secondary: "#CBB677" },
            "Louisiana": { primary: "#CE181E", secondary: "#FFFFFF" }, "Louisiana-Lafayette": { primary: "#CE181E", secondary: "#FFFFFF" }, "UL Lafayette": { primary: "#CE181E", secondary: "#FFFFFF" }, "Louisiana-Monroe": { primary: "#800029", secondary: "#F7B718" }, "UL Monroe": { primary: "#800029", secondary: "#F7B718" },
            "Marshall": { primary: "#00A651", secondary: "#FFFFFF" }, "Old Dominion": { primary: "#003057", secondary: "#A2AAAD" },
            "South Alabama": { primary: "#00205B", secondary: "#C8102E" }, "Southern Miss": { primary: "#FFB81C", secondary: "#000000" }, "Southern Mississippi": { primary: "#FFB81C", secondary: "#000000" },
            "Texas State": { primary: "#501214", secondary: "#B3A369" }, "Troy": { primary: "#8A1538", secondary: "#C5B783" },
            "Delaware": { primary: "#00539F", secondary: "#FFD200" }, "FIU": { primary: "#081E3F", secondary: "#B6862C" }, "Florida International": { primary: "#081E3F", secondary: "#B6862C" },
            "Jacksonville State": { primary: "#CC0000", secondary: "#FFFFFF" }, "Kennesaw State": { primary: "#FFC629", secondary: "#000000" },
            "Liberty": { primary: "#002D62", secondary: "#A89968" }, "Middle Tennessee": { primary: "#0066CC", secondary: "#FFFFFF" }, "Middle Tennessee State": { primary: "#0066CC", secondary: "#FFFFFF" },
            "New Mexico State": { primary: "#8B2332", secondary: "#FFFFFF" }, "Sam Houston": { primary: "#F47920", secondary: "#FFFFFF" }, "Sam Houston State": { primary: "#F47920", secondary: "#FFFFFF" },
            "UTEP": { primary: "#FF8200", secondary: "#041E42" }, "Western Kentucky": { primary: "#B32025", secondary: "#FFFFFF" }, "WKU": { primary: "#B32025", secondary: "#FFFFFF" },
            "Akron": { primary: "#041E42", secondary: "#A89968" }, "Ball State": { primary: "#BA0C2F", secondary: "#FFFFFF" },
            "Bowling Green": { primary: "#FE5000", secondary: "#4F2C1D" }, "Buffalo": { primary: "#005BBB", secondary: "#FFFFFF" },
            "Central Michigan": { primary: "#6A0032", secondary: "#FFC82E" }, "Eastern Michigan": { primary: "#006633", secondary: "#FFFFFF" },
            "Kent State": { primary: "#002664", secondary: "#EAAA00" }, "Miami (OH)": { primary: "#B61E2E", secondary: "#FFFFFF" }, "Miami (Ohio)": { primary: "#B61E2E", secondary: "#FFFFFF" }, "Miami Ohio": { primary: "#B61E2E", secondary: "#FFFFFF" },
            "Northern Illinois": { primary: "#BA0C2F", secondary: "#000000" }, "NIU": { primary: "#BA0C2F", secondary: "#000000" }, "Ohio": { primary: "#00694E", secondary: "#FFFFFF" },
            "Toledo": { primary: "#15397F", secondary: "#FFCC00" }, "Western Michigan": { primary: "#6C4023", secondary: "#FFCB05" },
            "UMass": { primary: "#881C1C", secondary: "#FFFFFF" }, "UConn": { primary: "#000E2F", secondary: "#FFFFFF" }, "Connecticut": { primary: "#000E2F", secondary: "#FFFFFF" },
            "Oregon State": { primary: "#DC4405", secondary: "#000000" }, "Washington State": { primary: "#981E32", secondary: "#FFFFFF" },
            "Louisiana Tech": { primary: "#002F8B", secondary: "#FFFFFF" }
        };

        const cfbColors = new Proxy(rawCfbColors, {
            get(target, prop) {
                if (typeof prop !== "string" || prop === "then" || prop === "toJSON") return target[prop];
                if (target[prop]) return target[prop];
                if (dynamicTeamColors[prop]) return dynamicTeamColors[prop];

                if (typeof teamNameMapper !== "undefined" && teamNameMapper[prop]) {
                    const m = teamNameMapper[prop];
                    if (target[m]) return target[m];
                    if (dynamicTeamColors[m]) return dynamicTeamColors[m];
                }

                if (typeof teamNameMapper !== "undefined") {
                    for (const [k, v] of Object.entries(teamNameMapper)) {
                        if (v === prop) {
                            if (target[k]) return target[k];
                            if (dynamicTeamColors[k]) return dynamicTeamColors[k];
                        }
                    }
                }

                const norm = s => String(s || "").toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/['’.\-]/g, "")
                    .replace(/\bstate\b/g, "st")
                    .trim();

                const pNorm = norm(prop);
                for (const [k, v] of Object.entries(target)) {
                    if (norm(k) === pNorm) return v;
                }
                for (const [k, v] of Object.entries(dynamicTeamColors)) {
                    if (norm(k) === pNorm) return v;
                }

                const stripped = prop.replace(/^(The\s+)/i, "")
                    .replace(/\s+(Bears|Bulldogs|Tigers|Wildcats|Eagles|Lions|Panthers|Hawks|Rams|Cowboys|Cardinals|Pirates|Knights|Mustangs|Cougars|Warriors|Spartans|Bobcats|Bison|Miners|Skyhawks|Flames|Tribe|Spiders|Keydets|Terriers|Seawolves|Monarchs|Paladins|Catamounts|Mocs|Chanticleers|Red Wolves|Thundering Herd|Golden Hurricane|Owls|Blazers|Roadrunners|Mean Green|Green Wave|Aggies|Huskies|Chippewas|Broncos|Rockets|Zips|Falcons|Bulls|Golden Flashes|RedHawks|Salukis|Leathernecks|Lumberjacks|Jackrabbits|Coyotes|Fighting Hawks|Grizzlies|Dukes|Golden Eagles|Runnin' Bulldogs|Jaguars)$/i, "")
                    .trim();
                if (stripped && stripped !== prop) {
                    if (target[stripped]) return target[stripped];
                    if (dynamicTeamColors[stripped]) return dynamicTeamColors[stripped];
                    const sNorm = norm(stripped);
                    for (const [k, v] of Object.entries(target)) {
                        if (norm(k) === sNorm) return v;
                    }
                }

                return target[prop];
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            },
            has(target, prop) {
                if (prop in target || prop in dynamicTeamColors) return true;
                if (typeof teamNameMapper !== "undefined" && teamNameMapper[prop]) return true;
                return false;
            }
        });

        const cfbTeams = {
            "SEC": ["Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Ole Miss", "Mississippi State", "Missouri", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt"],
            "Big Ten": ["Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin"],
            "Big 12": ["Arizona", "Arizona State", "Baylor", "BYU", "UCF", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "Utah", "West Virginia"],
            "ACC": ["Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami", "North Carolina", "NC State", "Notre Dame", "Pitt", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest"]
        };
        const p4CfbSchools = new Set(Object.values(cfbTeams).flat());
        const fbsSchools = Array.from(new Set([
            ...Object.values(cfbTeams).flat(),
            "Air Force", "Akron", "Appalachian State", "App State", "Army", "Arkansas State", "Ball State", "Boise State", "Bowling Green", "Buffalo", "Central Michigan", "Charlotte", "Coastal Carolina", "Colorado State", "Delaware", "East Carolina", "Eastern Michigan", "FIU", "Florida Atlantic", "Fresno State", "Georgia Southern", "Georgia State", "Hawaii", "Jacksonville State", "James Madison", "Kennesaw State", "Kent State", "Liberty", "Louisiana", "Louisiana-Monroe", "Louisiana Tech", "Marshall", "Memphis", "Miami (OH)", "Middle Tennessee", "Navy", "Nevada", "New Mexico", "New Mexico State", "North Texas", "Northern Illinois", "Ohio", "Old Dominion", "Oregon State", "Rice", "Sam Houston", "San Diego State", "San Jose State", "South Alabama", "South Florida", "Southern Miss", "Temple", "Texas State", "Toledo", "Troy", "Tulane", "Tulsa", "UAB", "UConn", "UMass", "UNLV", "UTEP", "UTSA", "Utah State", "Washington State", "Western Kentucky", "Western Michigan", "Wyoming"
        ])).sort((a, b) => a.localeCompare(b));
        const cfbWinTotals = {
            "Alabama": 8.5, "Arkansas": 3.5, "Auburn": 6.5, "Florida": 7.5, "Georgia": 9.5, "Kentucky": 4.5, "LSU": 8.5, "Ole Miss": 7.5, "Mississippi State": 4.5, "Missouri": 6.5, "Oklahoma": 8.5, "South Carolina": 6.5, "Tennessee": 7.5, "Texas": 9.5, "Texas A&M": 8.5, "Vanderbilt": 5.5,
            "Illinois": 7.5, "Indiana": 10.5, "Iowa": 7.5, "Maryland": 5.5, "Michigan": 8.5, "Michigan State": 4.5, "Minnesota": 6.5, "Nebraska": 6.5, "Northwestern": 5.5, "Ohio State": 9.5, "Oregon": 10.5, "Penn State": 8.5, "Purdue": 3.5, "Rutgers": 4.5, "UCLA": 6.5, "USC": 8.5, "Washington": 7.5, "Wisconsin": 6.5,
            "Arizona": 7.5, "Arizona State": 6.5, "Baylor": 5.5, "BYU": 8.5, "UCF": 5.5, "Cincinnati": 5.5, "Colorado": 4.5, "Houston": 8.5, "Iowa State": 4.5, "Kansas": 5.5, "Kansas State": 8.5, "Oklahoma State": 6.5, "TCU": 7.5, "Texas Tech": 10.5, "Utah": 8.5, "West Virginia": 5.5,
            "Boston College": 3.5, "California": 6.5, "Clemson": 7.5, "Duke": 5.5, "Florida State": 5.5, "Georgia Tech": 6.5, "Louisville": 8.5, "Miami": 10.5, "North Carolina": 4.5, "NC State": 7.5, "Notre Dame": 9.5, "Pitt": 7.5, "SMU": 8.5, "Stanford": 3.5, "Syracuse": 4.5, "Virginia": 7.5, "Virginia Tech": 6.5, "Wake Forest": 5.5
        };
        const fpiSosRank = {
            "Arkansas": 1, "Oklahoma": 2, "Texas": 3, "Kentucky": 4, "Ole Miss": 5, "Mississippi State": 6, "Florida": 7, "Ohio State": 8, "Texas A&M": 9, "South Carolina": 10,
            "LSU": 11, "Missouri": 12, "Auburn": 13, "Tennessee": 14, "Alabama": 15, "Michigan": 16, "Northwestern": 17, "Vanderbilt": 18, "USC": 19, "Georgia": 20,
            "Nebraska": 21, "Florida State": 22, "Purdue": 23, "Boston College": 24, "Washington": 25, "Wisconsin": 26, "Penn State": 27, "Iowa": 28, "Michigan State": 29, "Arizona State": 30,
            "Minnesota": 31, "Indiana": 33, "Georgia Tech": 34, "Clemson": 35, "Rutgers": 36, "Maryland": 37, "Illinois": 38, "Virginia Tech": 40, "Louisville": 41, "Baylor": 42,
            "California": 43, "Oklahoma State": 44, "Miami": 45, "Stanford": 46, "TCU": 47, "Colorado": 48, "Cincinnati": 49, "Duke": 50, "North Carolina": 51, "West Virginia": 52,
            "Arizona": 53, "NC State": 54, "BYU": 55, "Virginia": 56, "Iowa State": 57, "Pitt": 58, "Houston": 59, "Kansas": 60, "Wake Forest": 61, "SMU": 62,
            "Utah": 63, "UCF": 64, "Notre Dame": 66, "Syracuse": 67, "Kansas State": 68, "Texas Tech": 71
        };
        const nflTeams = {
            "NFL": [
                "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers", "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins", "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants", "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders"
            ]
        };
        const nflColors = {
            "Arizona Cardinals": { primary: "#97233F", secondary: "#000000" }, "Atlanta Falcons": { primary: "#A71930", secondary: "#000000" },
            "Baltimore Ravens": { primary: "#241773", secondary: "#000000" }, "Buffalo Bills": { primary: "#00338D", secondary: "#C60C30" },
            "Carolina Panthers": { primary: "#0085CA", secondary: "#101820" }, "Chicago Bears": { primary: "#0B162A", secondary: "#C83803" },
            "Cincinnati Bengals": { primary: "#FB4F14", secondary: "#000000" }, "Cleveland Browns": { primary: "#311D00", secondary: "#FF3C00" },
            "Dallas Cowboys": { primary: "#003594", secondary: "#041E42" }, "Denver Broncos": { primary: "#FB4F14", secondary: "#002244" },
            "Detroit Lions": { primary: "#0076B6", secondary: "#B0B7BC" }, "Green Bay Packers": { primary: "#203731", secondary: "#FFB612" },
            "Houston Texans": { primary: "#03202F", secondary: "#A71930" }, "Indianapolis Colts": { primary: "#002C5F", secondary: "#A2AAAD" },
            "Jacksonville Jaguars": { primary: "#006778", secondary: "#9F792C" }, "Kansas City Chiefs": { primary: "#E31837", secondary: "#FFB81C" },
            "Las Vegas Raiders": { primary: "#000000", secondary: "#A5ACAF" }, "Los Angeles Chargers": { primary: "#0080C6", secondary: "#FFC20E" },
            "Los Angeles Rams": { primary: "#003594", secondary: "#FFA300" }, "Miami Dolphins": { primary: "#008E97", secondary: "#FC4C02" },
            "Minnesota Vikings": { primary: "#4F2683", secondary: "#FFC62E" }, "New England Patriots": { primary: "#002244", secondary: "#C60C30" },
            "New Orleans Saints": { primary: "#D3BC8D", secondary: "#101820" }, "New York Giants": { primary: "#0B2265", secondary: "#A71930" },
            "New York Jets": { primary: "#125740", secondary: "#FFFFFF" }, "Philadelphia Eagles": { primary: "#004C54", secondary: "#A5ACAF" },
            "Pittsburgh Steelers": { primary: "#FFB612", secondary: "#101820" }, "San Francisco 49ers": { primary: "#AA0000", secondary: "#B3995D" },
            "Seattle Seahawks": { primary: "#002244", secondary: "#69BE28" }, "Tampa Bay Buccaneers": { primary: "#D50A0A", secondary: "#FF7900" },
            "Tennessee Titans": { primary: "#0C2340", secondary: "#4B92DB" }, "Washington Commanders": { primary: "#5A1414", secondary: "#FFB612" }
        };
        const nflWinTotals = {
            "Kansas City Chiefs": 11.5, "Baltimore Ravens": 11.5, "San Francisco 49ers": 11.5, "Detroit Lions": 10.5, "Cincinnati Bengals": 10.5, 
            "Buffalo Bills": 10.5, "Philadelphia Eagles": 10.5, "Dallas Cowboys": 10.5, "Green Bay Packers": 9.5, "Houston Texans": 9.5, 
            "Miami Dolphins": 9.5, "New York Jets": 9.5, "Atlanta Falcons": 9.5, "Los Angeles Rams": 8.5, "Chicago Bears": 8.5, 
            "Cleveland Browns": 8.5, "Jacksonville Jaguars": 8.5, "Los Angeles Chargers": 8.5, "Indianapolis Colts": 8.5, "Tampa Bay Buccaneers": 7.5, 
            "Seattle Seahawks": 7.5, "Pittsburgh Steelers": 7.5, "New Orleans Saints": 7.5, "Las Vegas Raiders": 6.5, "Minnesota Vikings": 6.5, 
            "Arizona Cardinals": 6.5, "Washington Commanders": 6.5, "New York Giants": 6.5, "Tennessee Titans": 6.5, "Denver Broncos": 5.5, 
            "Carolina Panthers": 4.5, "New England Patriots": 4.5
        };
        const nflDivisions = {
            "AFC North": ["Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers"],
            "AFC South": ["Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans"],
            "AFC East": ["Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets"],
            "AFC West": ["Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers"],
            "NFC North": ["Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings"],
            "NFC South": ["Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers"],
            "NFC East": ["Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders"],
            "NFC West": ["Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"]
        };

        const teamNameMapper = {
            "Pittsburgh": "Pitt", "Mississippi": "Ole Miss", "Southern California": "USC", "Texas Christian": "TCU",
            "Central Florida": "UCF", "Southern Methodist": "SMU", "Louisiana State": "LSU",
            "Pennsylvania State": "Penn State", "North Carolina State": "NC State",
            "Miami (FL)": "Miami", "San José State": "San Jose State", "Hawai'i": "Hawaii", 
            "Massachusetts": "UMass", "Brigham Young": "BYU", "UT San Antonio": "UTSA",
            "Texas-San Antonio": "UTSA", "Texas-El Paso": "UTEP"
        };

        // ==========================================
        // TEAM MASCOT EMOJIS (FOR TOP 25 SHARING)
        // ==========================================
        const cfbMascotEmojis = {
            // SEC
            "Georgia": "🐶", // Bulldogs (Uga)
            "Texas": "🐂", // Longhorns (Bevo)
            "Alabama": "🐘", // Crimson Tide (Big Al)
            "LSU": "🐯", // Tigers (Mike the Tiger)
            "Tennessee": "🐶", // Volunteers (Smokey)
            "Ole Miss": "🦈", // Rebels (Tony the Landshark)
            "Texas A&M": "🐶", // Aggies (Reveille)
            "Missouri": "🐯", // Tigers (Truman the Tiger)
            "Oklahoma": "🐎", // Sooners (Boomer and Sooner)
            "Florida": "🐊", // Gators (Albert and Alberta)
            "South Carolina": "🐔", // Gamecocks (Cocky)
            "Arkansas": "🐗", // Razorbacks (Tusk)
            "Kentucky": "🐱", // Wildcats (Scratch)
            "Auburn": "🦅", // Tigers / War Eagle (Aubie)
            "Vanderbilt": "⚓", // Commodores (Mr. C)
            "Mississippi State": "🐶", // Bulldogs (Bully)

            // Big Ten
            "Ohio State": "🌰", // Buckeyes (Brutus Buckeye)
            "Oregon": "🦆", // Ducks (The Duck)
            "Penn State": "🦁", // Nittany Lions
            "Michigan": "🦡", // Wolverines
            "Indiana": "🔴", // Hoosiers
            "Illinois": "🔶", // Fighting Illini
            "Iowa": "🦅", // Hawkeyes (Herky the Hawk)
            "Nebraska": "🌽", // Cornhuskers (Herbie Husker)
            "Wisconsin": "🦡", // Badgers (Bucky Badger)
            "USC": "⚔️", // Trojans (Tommy Trojan)
            "Washington": "🐺", // Huskies (Harry the Husky)
            "Michigan State": "⚔️", // Spartans (Sparty)
            "Minnesota": "🐿️", // Golden Gophers (Goldy Gopher)
            "Maryland": "🐢", // Terrapins (Testudo)
            "Rutgers": "⚔️", // Scarlet Knights
            "Purdue": "🚂", // Boilermakers (Boilermaker Special)
            "UCLA": "🐻", // Bruins (Joe Bruin)
            "Northwestern": "🐱", // Wildcats (Willie the Wildcat)

            // Big 12
            "BYU": "🐆", // Cougars (Cosmo the Cougar)
            "Iowa State": "🌪️", // Cyclones (Cy the Cardinal)
            "Kansas State": "🐱", // Wildcats (Willie the Wildcat)
            "Colorado": "🦬", // Buffaloes (Ralphie)
            "Utah": "🦅", // Utes (Swoop)
            "Arizona State": "😈", // Sun Devils (Sparky)
            "Arizona": "🐱", // Wildcats (Wilbur and Wilma)
            "Texas Tech": "🤠", // Red Raiders (Raider Red)
            "TCU": "🐸", // Horned Frogs (Super Frog)
            "West Virginia": "🧗", // Mountaineers
            "Baylor": "🐻", // Bears (Judge Joy and Lady)
            "Cincinnati": "🐱", // Bearcats
            "UCF": "⚔️", // Knights (Knightro)
            "Houston": "🐆", // Cougars (Shasta)
            "Kansas": "🐦", // Jayhawks (Big Jay)
            "Oklahoma State": "🤠", // Cowboys (Pistol Pete)

            // ACC
            "Miami": "🌪️", // Hurricanes (Sebastian the Ibis)
            "Miami (FL)": "🌪️",
            "Clemson": "🐯", // Tigers (The Tiger)
            "SMU": "🐎", // Mustangs (Peruna)
            "Pitt": "🐆", // Panthers (Roc the Panther)
            "Pittsburgh": "🐆",
            "Louisville": "🐦", // Cardinals (Louie)
            "Virginia Tech": "🦃", // Hokies (HokieBird)
            "Duke": "😈", // Blue Devils
            "Syracuse": "🍊", // Orange (Otto the Orange)
            "Georgia Tech": "🐝", // Yellow Jackets (Buzz)
            "North Carolina": "🐏", // Tar Heels (Rameses)
            "NC State": "🐺", // Wolfpack (Mr. Wuf)
            "Virginia": "⚔️", // Cavaliers (Cavalier)
            "Boston College": "🦅", // Eagles (Baldwin)
            "California": "🐻", // Golden Bears (Oski)
            "Stanford": "🌲", // Cardinal (Stanford Tree)
            "Wake Forest": "🎩", // Demon Deacons
            "Florida State": "🍢", // Seminoles (Osceola and Renegade)

            // Independents & Group of 5
            "Notre Dame": "☘️", // Fighting Irish (Leprechaun)
            "Boise State": "🐴", // Broncos (Buster Bronco)
            "Army": "⚔️", // Black Knights
            "Navy": "⚓", // Midshipmen (Bill the Goat)
            "Air Force": "⚡", // Falcons (The Falcon)
            "Tulane": "🌊", // Green Wave (Riptide)
            "Memphis": "🐯", // Tigers (TOM)
            "UNLV": "🤠", // Rebels (Hey Reb!)
            "Washington State": "🐆", // Cougars (Butch T. Cougar)
            "Oregon State": "🦫", // Beavers (Benny Beaver)
            "Appalachian State": "🧗", // Mountaineers (Yosef)
            "App State": "🧗",
            "James Madison": "🐶", // Dukes (Duke Dog)
            "Liberty": "🦅", // Flames (Sparky)
            "Fresno State": "🐶", // Bulldogs (Time Out)
            "San Diego State": "🏹", // Aztecs
            "South Florida": "🐂", // Bulls (Rocky the Bull)
            "UTSA": "🐦", // Roadrunners (Rowdy)
            "North Texas": "🦅", // Mean Green (Scrappy)
            "Coastal Carolina": "🐓", // Chanticleers (Chauncey)
            "Marshall": "🦬", // Thundering Herd (Marco)
            "Toledo": "🚀", // Rockets (Rocky the Rocket)
            "Miami (OH)": "🦅", // RedHawks (Swoop)
            "Ohio": "🐱", // Bobcats (Rufus)
            "Bowling Green": "🦅", // Falcons (Freddie and Frieda)
            "UConn": "🐺" // Huskies (Jonathan)
        };

        function getTeamMascotEmoji(team) {
            if (!team) return '🏈';
            const clean = (typeof cleanTeamName === 'function') ? cleanTeamName(team) : team;
            const mapped = (typeof teamNameMapper !== 'undefined' && teamNameMapper[clean]) ? teamNameMapper[clean] : clean;
            return cfbMascotEmojis[team] || cfbMascotEmojis[clean] || cfbMascotEmojis[mapped] || '🏈';
        }


