// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCanqzINHcJgGt_2s_6RRzPh-1BX6nzbV0",
    authDomain: "web-app-a36aa.firebaseapp.com",
    projectId: "web-app-a36aa",
    storageBucket: "web-app-a36aa.firebasestorage.app",
    messagingSenderId: "873638679873",
    appId: "1:873638679873:web:490942c8492e947b09bdc0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;

// Authentication functions
function toggleAuth() {
    const login = document.getElementById("auth-login");
    const reg = document.getElementById("auth-register");
    login.style.display = login.style.display === "none" ? "block" : "none";
    reg.style.display = reg.style.display === "none" ? "block" : "none";
}

async function registerEmail() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-password").value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        await db.collection("users").doc(cred.user.uid).set({
            email: email, name: name, isActive: true, createdAt: new Date().toISOString(), trialEnd: trialEnd.toISOString()
        });
        document.getElementById("reg-success").textContent = "✅ Account created! 7 days free trial.";
        setTimeout(() => location.reload(), 1500);
    } catch(e) { document.getElementById("reg-error").textContent = e.message; }
}

async function loginEmail() {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    try { await auth.signInWithEmailAndPassword(email, pass); }
    catch(e) { document.getElementById("login-error").textContent = e.message; }
}

async function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(provider); }
    catch(e) { document.getElementById("login-error").textContent = e.message; }
}

function signOut() { auth.signOut(); location.reload(); }

async function loadUserData(user) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) return;
    return userDoc.data();
}

// Make functions available globally
window.toggleAuth = toggleAuth;
window.registerEmail = registerEmail;
window.loginEmail = loginEmail;
window.loginGoogle = loginGoogle;
window.signOut = signOut;
