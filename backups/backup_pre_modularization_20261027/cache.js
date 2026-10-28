// ==========================================
// CLIENT-SIDE LOCAL STORAGE CACHE UTILITIES
// ==========================================
const PickEmCache = {
    PREFIX: "pickem_cache_",

    get(key) {
        try {
            const raw = localStorage.getItem(this.PREFIX + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.expires && Date.now() > parsed.expires) {
                localStorage.removeItem(this.PREFIX + key);
                return null;
            }
            return parsed ? parsed.data : null;
        } catch (e) {
            return null;
        }
    },

    set(key, data, ttlMs = 0) {
        try {
            const payload = {
                data: data,
                expires: ttlMs > 0 ? Date.now() + ttlMs : null
            };
            localStorage.setItem(this.PREFIX + key, JSON.stringify(payload));
        } catch (e) {
            // Storage quota exceeded or private browsing
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(this.PREFIX + key);
        } catch (e) {}
    },

    // Cache a completed week scoreboard events permanently (final scores do not change)
    getCompletedWeek(sport, week) {
        return this.get("sched_" + sport + "_w" + week + "_completed");
    },

    setCompletedWeek(sport, week, data) {
        return this.set("sched_" + sport + "_w" + week + "_completed", data, 0);
    }
};
