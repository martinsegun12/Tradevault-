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

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence for Firestore
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
            console.log('Firestore persistence failed: multiple tabs open');
        } else if (err.code == 'unimplemented') {
            // Browser doesn't support persistence
            console.log('Firestore persistence not supported by browser');
        }
    });

// Set auth persistence to LOCAL (stay logged in even after refresh)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => {
        console.error("Auth persistence error:", err);
    });

console.log("Firebase initialized successfully");
