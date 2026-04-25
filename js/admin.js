// Admin Functions (Protected - only you should access)

// Check if user is admin (hardcoded for now)
function isAdmin(email) {
    const adminEmails = ["michaelsegunmartin@gmail.com", "admin@tradingjournal.com"];
    return adminEmails.includes(email);
}

// Get all pending participants (paid but not activated)
async function getPendingParticipants() {
    const usersRef = db.collection("users");
    const q = usersRef
        .where("accountType", "==", "free")
        .where("participantPaidAt", "!=", null);
    
    const snapshot = await q.get();
    const pending = [];
    snapshot.forEach(doc => {
        pending.push({ id: doc.id, ...doc.data() });
    });
    return pending;
}

// Activate participant (add demo account)
async function activateParticipant(userId, demoLogin, demoPassword, demoServer) {
    await db.collection("users").doc(userId).update({
        accountType: "participant",
        demoAccountLogin: demoLogin,
        demoAccountPassword: demoPassword,
        demoAccountServer: demoServer,
        activatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
}

// Ban a user
async function banUser(userId, reason) {
    await db.collection("users").doc(userId).update({
        isBanned: true,
        banReason: reason,
        bannedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
}

// Unban a user
async function unbanUser(userId) {
    await db.collection("users").doc(userId).update({
        isBanned: false,
        banReason: null
    });
    
    return { success: true };
}

// Get all users (admin only)
async function getAllUsers() {
    const snapshot = await db.collection("users").get();
    const users = [];
    snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
    });
    return users;
}

// Verify payment (mark user as paid for participant access)
async function verifyPayment(userId, paymentAmount, paymentType) {
    await db.collection("users").doc(userId).update({
        participantPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
        paymentAmount: paymentAmount,
        paymentType: paymentType, // "participation" or "challenge"
        paymentVerified: true
    });
    
    return { success: true };
}

// Get all challenges
async function getAllChallenges() {
    const snapshot = await db.collection("challenges").get();
    const challenges = [];
    snapshot.forEach(doc => {
        challenges.push({ id: doc.id, ...doc.data() });
    });
    return challenges;
}

// Update challenge status
async function updateChallengeStatus(challengeId, status) {
    await db.collection("challenges").doc(challengeId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
}

// Get trading statistics (admin dashboard)
async function getTradingStats() {
    const users = await getAllUsers();
    const tradesSnapshot = await db.collection("trades").get();
    const trades = [];
    tradesSnapshot.forEach(doc => trades.push(doc.data()));
    
    const totalTrades = trades.length;
    const totalWins = trades.filter(t => t.result === "Win").length;
    const totalLosses = trades.filter(t => t.result === "Loss").length;
    const totalStarsAwarded = trades.reduce((sum, t) => sum + (t.starChange > 0 ? t.starChange : 0), 0);
    
    const participants = users.filter(u => u.accountType === "participant").length;
    const bannedUsers = users.filter(u => u.isBanned).length;
    
    return {
        totalUsers: users.length,
        participants: participants,
        bannedUsers: bannedUsers,
        totalTrades: totalTrades,
        totalWins: totalWins,
        totalLosses: totalLosses,
        winRate: totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : 0,
        totalStarsAwarded: totalStarsAwarded
    };
}
