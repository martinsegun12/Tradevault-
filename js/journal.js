// Journal Functions

// Rank to stars mapping
const rankStarsMap = {
    1: 0,   // Novice
    2: 15,  // Apprentice
    3: 30,  // Master
    4: 45,  // Elite
    5: 165, // Grandmaster
    6: 285, // Legend
    7: 405, // Titan
    8: 525  // Supreme
};

const rankNamesMap = {
    1: "Novice Trader",
    2: "Apprentice Trader",
    3: "Master Trader",
    4: "Elite Trader",
    5: "Grandmaster Trader",
    6: "Legend Trader",
    7: "Titan Trader",
    8: "Supreme Trader"
};

// Calculate rank from total stars
function calculateRank(totalStars) {
    if (totalStars < 15) return { level: 1, rank: rankNamesMap[1] };
    if (totalStars < 30) return { level: 2, rank: rankNamesMap[2] };
    if (totalStars < 45) return { level: 3, rank: rankNamesMap[3] };
    if (totalStars < 165) return { level: 4, rank: rankNamesMap[4] };
    if (totalStars < 285) return { level: 5, rank: rankNamesMap[5] };
    if (totalStars < 405) return { level: 6, rank: rankNamesMap[6] };
    if (totalStars < 525) return { level: 7, rank: rankNamesMap[7] };
    return { level: 8, rank: rankNamesMap[8] };
}

// Calculate current stage
function calculateStage(totalStars, level) {
    if (level >= 5) {
        const baseStars = 165 + (level - 5) * 120;
        const starsInLevel = totalStars - baseStars;
        const stage = Math.floor(starsInLevel / 20) + 1;
        const starsInStage = starsInLevel % 20;
        return {
            stage: Math.min(stage, 6),
            starsInStage: starsInStage,
            needed: 20,
            progress: (starsInStage / 20) * 100
        };
    } else {
        const baseStars = (level - 1) * 15;
        const starsInLevel = totalStars - baseStars;
        const stage = Math.floor(starsInLevel / 5) + 1;
        const starsInStage = starsInLevel % 5;
        return {
            stage: Math.min(stage, 3),
            starsInStage: starsInStage,
            needed: 5,
            progress: (starsInStage / 5) * 100
        };
    }
}

// Add a trade
async function addTrade(userId, result, instrument, strategy, session, entryPrice, exitPrice, riskPercent, screenshotFile) {
    const starChange = result === "Win" ? 1 : (result === "Loss" ? -1 : 0);
    
    // Get current user data
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const newTotalStars = (userData.totalStars || 0) + starChange;
    const newMonthStars = (userData.currentMonthStars || 0) + starChange;
    
    // Upload screenshot if provided
    let screenshotUrl = "";
    if (screenshotFile) {
        const storageRef = storage.ref(`screenshots/${userId}/${Date.now()}_${screenshotFile.name}`);
        await storageRef.put(screenshotFile);
        screenshotUrl = await storageRef.getDownloadURL();
    }
    
    // Save trade
    await db.collection("trades").add({
        userId: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        instrument: instrument,
        strategy: strategy,
        session: session,
        result: result,
        starChange: starChange,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        riskPercent: riskPercent,
        screenshotUrl: screenshotUrl,
        accountBalance: (userData.totalPnl || 0) + (result === "Win" ? 1000 : (result === "Loss" ? -500 : 0))
    });
    
    // Update user
    const rankInfo = calculateRank(newTotalStars);
    const stageInfo = calculateStage(newTotalStars, rankInfo.level);
    
    await db.collection("users").doc(userId).update({
        totalStars: newTotalStars,
        currentMonthStars: newMonthStars,
        totalPnl: (userData.totalPnl || 0) + (result === "Win" ? 1000 : (result === "Loss" ? -500 : 0)),
        level: rankInfo.level,
        rank: rankInfo.rank,
        stage: stageInfo.stage
    });
    
    return { success: true, starChange: starChange, newTotalStars: newTotalStars };
}

// Get trades by date range
async function getTradesByDate(userId, startDate, endDate) {
    const tradesRef = db.collection("trades");
    const q = tradesRef
        .where("userId", "==", userId)
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", endDate)
        .orderBy("timestamp", "desc");
    
    const snapshot = await q.get();
    const trades = [];
    snapshot.forEach(doc => {
        trades.push({ id: doc.id, ...doc.data() });
    });
    return trades;
}

// Get recent trades
async function getRecentTrades(userId, limit = 10) {
    const tradesRef = db.collection("trades");
    const q = tradesRef
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .limit(limit);
    
    const snapshot = await q.get();
    const trades = [];
    snapshot.forEach(doc => {
        trades.push({ id: doc.id, ...doc.data() });
    });
    return trades;
}

// Calculate consistency score
async function calculateConsistencyScore(userId) {
    const trades = await getRecentTrades(userId, 50);
    if (trades.length < 10) return 0;
    
    // Win rate stability
    const wins = trades.filter(t => t.result === "Win").length;
    const winRate = (wins / trades.length) * 100;
    
    // Risk consistency (if risk% is logged)
    const risks = trades.filter(t => t.riskPercent).map(t => t.riskPercent);
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
    const riskVariance = risks.reduce((a, b) => a + Math.pow(b - avgRisk, 2), 0) / risks.length;
    const riskScore = Math.max(0, 100 - riskVariance * 10);
    
    // Drawdown control (consecutive losses)
    let maxConsecutiveLosses = 0;
    let currentConsecutive = 0;
    trades.forEach(t => {
        if (t.result === "Loss") {
            currentConsecutive++;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutive);
        } else {
            currentConsecutive = 0;
        }
    });
    const drawdownScore = Math.max(0, 100 - (maxConsecutiveLosses * 10));
    
    // Combine scores
    const consistencyScore = (winRate * 0.4 + riskScore * 0.3 + drawdownScore * 0.3);
    return Math.round(consistencyScore);
}

// Get best session
async function getBestSession(userId) {
    const trades = await getRecentTrades(userId, 100);
    const sessions = {
        Asian: { wins: 0, total: 0 },
        London: { wins: 0, total: 0 },
        "New York": { wins: 0, total: 0 },
        Overlap: { wins: 0, total: 0 }
    };
    
    trades.forEach(trade => {
        if (sessions[trade.session]) {
            sessions[trade.session].total++;
            if (trade.result === "Win") sessions[trade.session].wins++;
        }
    });
    
    let bestSession = "London";
    let bestWinRate = 0;
    
    Object.entries(sessions).forEach(([session, data]) => {
        if (data.total > 5) {
            const winRate = (data.wins / data.total) * 100;
            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestSession = session;
            }
        }
    });
    
    return { session: bestSession, winRate: Math.round(bestWinRate) };
}
