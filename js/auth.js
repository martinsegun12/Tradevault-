// Global variables
let currentUser = null;
let userData = null;

// Authentication functions
function showAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
    gsap.fromTo('.auth-modal', 
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );
}

function hideAuthModal() {
    gsap.to('.auth-modal', {
        scale: 0.9, opacity: 0, duration: 0.2,
        onComplete: () => document.getElementById('auth-modal').classList.remove('active')
    });
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'login') {
        document.getElementById('auth-login').style.display = 'block';
        document.getElementById('auth-register').style.display = 'none';
    } else {
        document.getElementById('auth-login').style.display = 'none';
        document.getElementById('auth-register').style.display = 'block';
    }

    gsap.fromTo('.auth-form', 
        { x: tab === 'login' ? -20 : 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3 }
    );
}

async function registerEmail() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-password").value;
    const registerBtn = document.querySelector('#auth-register button[type="button"]');
    const originalText = registerBtn?.innerHTML;

    if (!name || !email || !pass) {
        document.getElementById("reg-error").textContent = "Please fill in all fields";
        return;
    }

    if (registerBtn) {
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        registerBtn.disabled = true;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);

        await db.collection("users").doc(cred.user.uid).set({
            email: email,
            name: name,
            isActive: true,
            isPaid: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            trialEnd: trialEnd,
            avatar: null,
            totalTrades: 0,
            winCount: 0,
            lossCount: 0,
            totalPnl: 0,
            consistencyScore: 0,
            streakDays: 0,
            bestStreak: 0,
            badges: [],
            stars: 0,
            rank: 'Bronze',
            rankColor: '#cd7f32',
            currentWinStreak: 0,
            currentLossStreak: 0,
            starHistory: [],
            dailyShieldUsed: false,
            lastShieldDate: null
        });

        document.getElementById("reg-success").textContent = "✅ Account created! 15 days free trial.";

        gsap.to('#reg-success', {
            scale: 1.05, duration: 0.2, yoyo: true, repeat: 1
        });

        setTimeout(() => {
            window.location.href = 'pages/dashboard.html';
        }, 1500);
    } catch(e) {
        document.getElementById("reg-error").textContent = e.message;
        gsap.fromTo('#reg-error', { x: -10 }, { x: 10, duration: 0.1, repeat: 3, yoyo: true });
        if (registerBtn) {
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
    }
}

async function loginEmail() {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    const loginBtn = document.querySelector('#auth-login button[type="button"]');
    const originalText = loginBtn?.innerHTML;

    if (!email || !pass) {
        document.getElementById("login-error").textContent = "Please enter email and password";
        return;
    }

    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;
    }

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // Auth state listener will handle redirect
    } catch(e) {
        document.getElementById("login-error").textContent = e.message;
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
        gsap.fromTo('#login-error', { x: -10 }, { x: 10, duration: 0.1, repeat: 3, yoyo: true });
    }
}

async function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const loginBtn = document.querySelector('#auth-login .btn-google');
    const originalText = loginBtn?.innerHTML;
    
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;
    }
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) {
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 15);

            await db.collection("users").doc(user.uid).set({
                email: user.email,
                name: user.displayName || 'Trader',
                isActive: true,
                isPaid: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                trialEnd: trialEnd,
                avatar: user.photoURL,
                totalTrades: 0,
                winCount: 0,
                lossCount: 0,
                totalPnl: 0,
                consistencyScore: 0,
                streakDays: 0,
                bestStreak: 0,
                badges: [],
                stars: 0,
                rank: 'Bronze',
                rankColor: '#cd7f32',
                currentWinStreak: 0,
                currentLossStreak: 0,
                starHistory: [],
                dailyShieldUsed: false,
                lastShieldDate: null
            });
        }

        // Force redirect to dashboard
        window.location.href = 'pages/dashboard.html';
        
    } catch(e) {
        console.error("Google login error:", e);
        const errorEl = document.getElementById("login-error") || document.getElementById("reg-error");
        if (errorEl) errorEl.textContent = e.message;
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }
}

function signOut() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch((e) => {
        console.error("Sign out error:", e);
        window.location.href = '../index.html';
    });
}

async function loadUserData(user) {
    if (!user) return null;
    try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            return userData;
        }
    } catch(e) {
        console.error("Error loading user data:", e);
    }
    return null;
}

async function checkAccess(user) {
    const data = await loadUserData(user);
    if (!data) return { hasAccess: false, trialExpired: false, daysLeft: 0 };

    const now = new Date();
    const trialEnd = data.trialEnd ? data.trialEnd.toDate() : new Date(0);
    const hasAccess = data.isPaid === true || now < trialEnd;

    return { 
        hasAccess, 
        trialExpired: !hasAccess && !data.isPaid,
        daysLeft: Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
    };
}

function showPaywall() {
    const modal = document.getElementById('paywall-modal');
    if (modal) {
        modal.classList.add('active');
        gsap.fromTo('.paywall-modal', 
            { scale: 0.9, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }
}

function hidePaywall() {
    const modal = document.getElementById('paywall-modal');
    if (modal) {
        gsap.to('.paywall-modal', {
            scale: 0.9, opacity: 0, duration: 0.2,
            onComplete: () => modal.classList.remove('active')
        });
    }
}

async function requestActivation() {
    if (!currentUser) return;

    try {
        await db.collection("activationRequests").add({
            userId: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || 'Trader',
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });

        showToast('Activation request sent! We will verify within 24 hours.', 'success');
        hidePaywall();
    } catch(e) {
        showToast('Error sending request. Please try again.', 'error');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Account number copied!', 'success');
    });
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    gsap.fromTo(toast, 
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );

    setTimeout(() => {
        gsap.to(toast, {
            x: 100, opacity: 0, duration: 0.3,
            onComplete: () => toast.remove()
        });
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user ? `Logged in as ${user.email}` : "Logged out");
    currentUser = user;

    if (user) {
        try {
            // Load user data first
            await loadUserData(user);
            
            const access = await checkAccess(user);
            
            // Determine current page
            const currentPath = window.location.pathname;
            const isLandingPage = currentPath.includes('index.html') || 
                                  currentPath === '/' || 
                                  currentPath === '' ||
                                  currentPath.endsWith('/');
            const isDashboardPage = currentPath.includes('dashboard.html');
            const isAuthPage = currentPath.includes('index.html');

            // If on landing page, redirect to dashboard
            if (isLandingPage && !isDashboardPage) {
                console.log("Redirecting from landing to dashboard");
                window.location.href = 'pages/dashboard.html';
                return;
            }

            // Update sidebar user info (only if on pages with these elements)
            const userNameEl = document.querySelector('.user-name');
            const userAvatarEl = document.querySelector('.user-avatar');

            if (userNameEl) {
                userNameEl.textContent = user.displayName || 'Trader';
            }

            if (userAvatarEl) {
                if (user.photoURL) {
                    userAvatarEl.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    const initials = (user.displayName || 'T').split(' ').map(n => n[0]).join('').toUpperCase();
                    userAvatarEl.textContent = initials;
                    userAvatarEl.style.display = 'flex';
                    userAvatarEl.style.alignItems = 'center';
                    userAvatarEl.style.justifyContent = 'center';
                }
            }

            // Update trial info
            const trialBarFill = document.querySelector('.trial-bar-fill');
            const trialText = document.querySelector('.trial-info p');

            if (trialBarFill && access.daysLeft !== undefined) {
                const percent = userData?.isPaid ? 100 : Math.min(100, (access.daysLeft / 15) * 100);
                trialBarFill.style.width = percent + '%';

                if (trialText) {
                    if (userData?.isPaid) {
                        trialText.textContent = 'Pro Account Active';
                        trialBarFill.style.width = '100%';
                    } else if (access.daysLeft > 0) {
                        trialText.textContent = `${access.daysLeft} days left in free trial`;
                    } else {
                        trialText.textContent = 'Trial expired - Upgrade to Pro';
                        trialBarFill.style.width = '0%';
                    }
                }
            }

            // Show paywall only if trial expired and on dashboard
            if (access.trialExpired && isDashboardPage) {
                showPaywall();
            }
            
        } catch (error) {
            console.error("Auth state handler error:", error);
        }
    } else {
        // Not logged in - redirect to landing if on dashboard pages
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/') && !currentPath.includes('index.html')) {
            console.log("Not logged in, redirecting to landing");
            window.location.href = '../index.html';
        }
    }
});

// Make functions available globally
window.toggleAuth = function() {
    const login = document.getElementById("auth-login");
    const reg = document.getElementById("auth-register");
    if (login && reg) {
        login.style.display = login.style.display === "none" ? "block" : "none";
        reg.style.display = reg.style.display === "none" ? "block" : "none";
    }
};
window.registerEmail = registerEmail;
window.loginEmail = loginEmail;
window.loginGoogle = loginGoogle;
window.signOut = signOut;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.switchAuthTab = switchAuthTab;
window.showPaywall = showPaywall;
window.hidePaywall = hidePaywall;
window.requestActivation = requestActivation;
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;
