// Authentication Functions

// Sign Up
async function signUp(email, password, name, phone) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            accountType: "free",
            totalStars: 0,
            currentMonthStars: 0,
            rank: "Novice Trader",
            level: 1,
            stage: 1,
            profilePictureUrl: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isBanned: false,
            bankAccount: null,
            bankName: null,
            accountHolder: null,
            consistencyScore: 0,
            bestSession: "London",
            totalPnl: 0,
            demoAccountLogin: null,
            demoAccountPassword: null,
            demoAccountServer: null
        });
        
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Login
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        window.location.href = "index.html";
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Check if user is logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User logged in:", user.email);
        // Update UI if needed
        if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
            window.location.href = "dashboard.html";
        }
    } else {
        // Not logged in, redirect to login if on protected page
        if (!window.location.pathname.includes("index.html") && 
            !window.location.pathname.includes("terms.html")) {
            window.location.href = "index.html";
        }
    }
});
