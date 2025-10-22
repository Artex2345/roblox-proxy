require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const app = express();
const PORT = process.env.PORT || 3000;

// Basit cache (60 saniye)
const cache = new Map();
function setCache(key, value, ttl = 60) {
    cache.set(key, { value, expire: Date.now() + ttl * 1000 });
}
function getCache(key) {
    const e = cache.get(key);
    if (!e) return null;
    if (Date.now() > e.expire) { cache.delete(key); return null; }
    return e.value;
}

// Kullanıcının oyunlarını al
async function getUserGames(userId) {
    const url = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&limit=50`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Roblox-Proxy' } });
    return res.json();
}

// Oyun için gamepassleri al
async function getGamePasses(universeId) {
    const url = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Roblox-Proxy' } });
    return res.json();
}

// Endpoint: tüm kullanıcının gamepassleri
app.get('/api/user-gamepasses/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const cached = getCache(userId);
        if (cached) return res.json(cached);

        const gamesData = await getUserGames(userId);
        const gamePassList = [];

        const games = gamesData.data || [];
        for (const g of games) {
            const universeId = g.universeId;
            if (!universeId) continue;

            try {
                const gpData = await getGamePasses(universeId);
                const passes = gpData.data || [];
                for (const p of passes) {
                    gamePassList.push({ universeId, id: p.id, name: p.name });
                }
            } catch (e) { console.warn("Gamepass fetch failed", universeId); }
        }

        setCache(userId, gamePassList, 60);
        res.json(gamePassList);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
