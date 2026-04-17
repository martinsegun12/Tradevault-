// Firebase Config
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

// Global variables
let currentUser = null;
let authChecked = false;

// ============ AUTHENTICATION FUNCTIONS ============

function toggleAuth() {
    const login = document.getElementById("auth-login");
    const reg = document.getElementById("auth-register");
    if (login && reg) {
        login.style.display = login.style.display === "none" ? "block" : "none";
        reg.style.display = reg.style.display === "none" ? "block" : "none";
    }
}

async function registerEmail() {
    const name = document.getElementById("reg-name")?.value;
    const email = document.getElementById("reg-email")?.value;
    const pass = document.getElementById("reg-password")?.value;
    
    if (!name || !email || !pass) {
        showError("reg-error", "All fields required");
        return;
    }
    if (pass.length < 6) {
        showError("reg-error", "Password must be at least 6 characters");
        return;
    }
    
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        
        await db.collection("users").doc(cred.user.uid).set({
            email: email,
            name: name,
            isActive: true,
            createdAt: new Date().toISOString(),
            trialEnd: trialEnd.toISOString()
        });
        
        showSuccess("reg-success", "✅ Account created! 7 days free trial.");
        setTimeout(() => location.reload(), 1500);
    } catch(e) {
        showError("reg-error", e.message);
    }
}

async function loginEmail() {
    const email = document.getElementById("login-email")?.value;
    const pass = document.getElementById("login-password")?.value;
    
    if (!email || !pass) {
        showError("login-error", "Email and password required");
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch(e) {
        if (e.code === 'auth/user-disabled') {
            showError("login-error", "⚠️ Account disabled. Contact WhatsApp: 0803 295 8122");
        } else if (e.code === 'auth/invalid-credential') {
            showError("login-error", "Invalid email or password");
        } else {
            showError("login-error", e.message);
        }
    }
}

async function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch(e) {
        if (e.code === 'auth/user-disabled') {
            showError("login-error", "⚠️ Account disabled. Contact WhatsApp: 0803 295 8122");
        } else if (e.code !== 'auth/cancelled-popup-request') {
            showError("login-error", e.message);
        }
    }
}

function signOut() {
    auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('tradevault_auth_cache');
    location.href = 'index.html';
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        setTimeout(() => { el.textContent = ''; }, 5000);
    }
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        setTimeout(() => { el.textContent = ''; }, 3000);
    }
}

// ============ USER DATA FUNCTIONS ============

async function loadUserData(user) {
    if (!user) return null;
    const userDoc = await db.collection("users").doc(user.uid).get();
    return userDoc.exists ? userDoc.data() : null;
}

async function loadTrades() {
    if (!currentUser) return [];
    try {
        const tradesRef = db.collection("users").doc(currentUser.uid).collection("trades");
        const snapshot = await tradesRef.orderBy("timestamp", "desc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) {
        console.error("Error loading trades:", e);
        return [];
    }
}

async function saveTrade(tradeData) {
    if (!currentUser) throw new Error("Not authenticated");
    const tradeId = tradeData.tradeId || Date.now().toString();
    await db.collection("users").doc(currentUser.uid).collection("trades").doc(tradeId).set(tradeData);
}

async function deleteTrade(tradeId) {
    if (!currentUser) throw new Error("Not authenticated");
    await db.collection("users").doc(currentUser.uid).collection("trades").doc(tradeId).delete();
}

// ============ CHALLENGE FUNCTIONS ============

function getChallengeKey() {
    return currentUser ? `tradevault_challenge_${currentUser.uid}` : null;
}

function saveChallenge(challengeData) {
    const key = getChallengeKey();
    if (key) localStorage.setItem(key, JSON.stringify(challengeData));
}

function loadChallenge() {
    const key = getChallengeKey();
    if (key) {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    }
    return null;
}

// ============ AUTH INITIALIZATION ============

function updateUIForAuth(user) {
    const authScreen = document.getElementById("auth-screen");
    const appDiv = document.getElementById("app");
    
    if (user) {
        if (authScreen) authScreen.style.display = "none";
        if (appDiv) appDiv.style.display = "block";
        
        // Update avatar
        const avatar = document.getElementById("user-avatar");
        if (avatar) {
            avatar.textContent = (user.displayName || user.email || "?")[0].toUpperCase();
        }
    } else {
        if (authScreen) authScreen.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
}

// Main auth listener
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateUIForAuth(user);
    
    if (user) {
        sessionStorage.setItem('tradevault_auth_cache', 'true');
        
        // Dispatch event for page-specific initialization
        window.dispatchEvent(new CustomEvent('authReady', { detail: { user } }));
    } else {
        sessionStorage.removeItem('tradevault_auth_cache');
        window.dispatchEvent(new CustomEvent('authLogout'));
    }
});

// Check cached auth for faster page loads
if (sessionStorage.getItem('tradevault_auth_cache') === 'true' && !auth.currentUser) {
    // Show app immediately while Firebase verifies
    const authScreen = document.getElementById("auth-screen");
    const appDiv = document.getElementById("app");
    if (authScreen) authScreen.style.display = "none";
    if (appDiv) appDiv.style.display = "block";
}

// Make functions global
window.toggleAuth = toggleAuth;
window.registerEmail = registerEmail;
window.loginEmail = loginEmail;
window.loginGoogle = loginGoogle;
window.signOut = signOut;
window.loadTrades = loadTrades;
window.saveTrade = saveTrade;
window.deleteTrade = deleteTrade;
window.loadChallenge = loadChallenge;
window.saveChallenge = saveChallenge;
