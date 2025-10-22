// api/user-gamepasses.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    try {
        // 1) Kullanıcının oyunlarını çek
        const gamesResp = await fetch(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&limit=50`, {
            headers: { 'User-Agent': 'Roblox-Proxy' }
        });
        const gamesData = await gamesResp.json();
        const games = gamesData.data || [];

        // 2) Her oyun için gamepassleri çek
        const gamePassList = [];
        for (const g of games) {
            const universeId = g.universeId;
            if (!universeId) continue;

            try {
                const gpResp = await fetch(`https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Asc`, {
                    headers: { 'User-Agent': 'Roblox-Proxy' }
                });
                const gpData = await gpResp.json();
                const passes = gpData.data || [];
                for (const p of passes) {
                    gamePassList.push({ universeId, id: p.id, name: p.name });
                }
            } catch (e) {
                console.warn("Gamepass fetch failed for universe:", universeId);
            }
        }

        res.status(200).json(gamePassList);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
