// Leaderboard Functions

// Get top 10 participants for leaderboard
async function getLeaderboard(limit = 10) {
    const usersRef = db.collection("users");
    const q = usersRef
        .where("accountType", "==", "participant")
        .where("isBanned", "==", false)
        .orderBy("currentMonthStars", "desc")
        .limit(limit);
    
    const snapshot = await q.get();
    const leaderboard = [];
    let rank = 1;
    
    snapshot.forEach(doc => {
        const user = doc.data();
        leaderboard.push({
            id: doc.id,
            rank: rank,
            name: user.name,
            stars: user.currentMonthStars || 0,
            traderRank: user.rank,
            medal: rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : null))
        });
        rank++;
    });
    
    return leaderboard;
}

// Render leaderboard to HTML
async function renderLeaderboard(containerId) {
    const leaderboard = await getLeaderboard(10);
    const container = document.getElementById(containerId);
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<p class="text-center">No participants yet. Be the first!</p>';
        return;
    }
    
    container.innerHTML = leaderboard.map(item => `
        <div class="leaderboard-item">
            <span class="rank-number">${item.medal || item.rank + "."}</span>
            <div>
                <strong>${item.name}</strong>
                <br>
                <small class="rank-badge-small">${item.traderRank}</small>
            </div>
            <div style="margin-left: auto; text-align: right;">
                <strong>${item.stars} ⭐</strong>
            </div>
        </div>
    `).join('');
}

// Award monthly prizes (run this on the 1st of each month)
async function awardMonthlyPrizes() {
    const leaderboard = await getLeaderboard(3);
    
    for (let i = 0; i < leaderboard.length; i++) {
        const winner = leaderboard[i];
        // Add 20 reward stars (will be added to next month's stars)
        await db.collection("users").doc(winner.id).update({
            rewardStarsPending: firebase.firestore.FieldValue.increment(20)
        });
        
        // Also give them a free 200k challenge
        await db.collection("challenges").add({
            userId: winner.id,
            accountSize: "200k",
            type: "free_prize",
            awardedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: "pending"
        });
    }
    
    console.log(`Awarded prizes to ${leaderboard.length} winners`);
}

// Reset monthly stars (run on the 1st of each month)
async function resetMonthlyStars() {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("accountType", "==", "participant").get();
    
    for (const doc of snapshot.docs) {
        const user = doc.data();
        const newMonthStars = (user.rewardStarsPending || 0);
        
        await db.collection("users").doc(doc.id).update({
            currentMonthStars: newMonthStars,
            rewardStarsPending: 0,
            lastMonthStars: user.currentMonthStars || 0
        });
    }
    
    console.log("Monthly stars reset completed");
}
