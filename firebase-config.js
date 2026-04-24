// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCanqzINHcJgGt_2s_6RRzPh-1BX6nzbV0",
    authDomain: "web-app-a36aa.firebaseapp.com",
    projectId: "web-app-a36aa",
    storageBucket: "web-app-a36aa.firebasestorage.app",
    messagingSenderId: "873638679873",
    appId: "1:873638679873:web:490942c8492e947b09bdc0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Payment Details
const PAYMENT = {
    bank: "Opay",
    accountName: "Martin segun Michael",
    accountNumber: "8112401459",
    price: 5000,
    currency: "₦"
};

// Ranking System Configuration
const RANK_SYSTEM = {
    'Beginner': { stages: 3, starsPerStage: 3, badge: '🌱 Bronze Seed', icon: '🥉', color: '#cd7f32' },
    'Intermediate': { stages: 3, starsPerStage: 3, badge: '⚙️ Silver Gear', icon: '🥈', color: '#c0c0c0' },
    'Advanced': { stages: 3, starsPerStage: 3, badge: '⚔️ Gold Sword', icon: '🥇', color: '#ffd700' },
    'Elite': { stages: 8, starsPerStage: 20, badge: '👑 Platinum Crown', icon: '💎', color: '#e5e4e2' },
    'Master': { stages: 10, starsPerStage: 20, badge: '🐉 Diamond Dragon', icon: '🐉', color: '#b9f2ff' },
    'Elite Master': { stages: 10, starsPerStage: 20, badge: '⭐ Animated Aura', icon: '🌟', color: '#ff00ff' }
};

const RANK_ORDER = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'Master', 'Elite Master'];

// Helper Functions
function getRankInfo(totalWins) {
    let remaining = totalWins;
    for (let i = 0; i < RANK_ORDER.length; i++) {
        const rank = RANK_ORDER[i];
        const config = RANK_SYSTEM[rank];
        const starsNeeded = config.stages * config.starsPerStage;
        if (remaining >= starsNeeded) {
            remaining -= starsNeeded;
            continue;
        }
        const stage = Math.floor(remaining / config.starsPerStage) + 1;
        const starsInStage = remaining % config.starsPerStage;
        return { rank, stage: Math.min(stage, config.stages), starsInStage, config };
    }
    return { rank: 'Elite Master', stage: 10, starsInStage: 50, config: RANK_SYSTEM['Elite Master'] };
}

async function checkSubscription(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    const data = userDoc.data();
    if (data.paidUntil && new Date(data.paidUntil) > new Date()) return true;
    if (data.trialEnd && new Date(data.trialEnd) > new Date()) return true;
    return false;
}

window.PAYMENT = PAYMENT;
window.RANK_SYSTEM = RANK_SYSTEM;
window.RANK_ORDER = RANK_ORDER;
window.getRankInfo = getRankInfo;
window.checkSubscription = checkSubscription;
