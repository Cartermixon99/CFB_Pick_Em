        // --- LUCIDE ICON HELPER ---
        function renderIcons() {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }
        document.addEventListener('DOMContentLoaded', renderIcons);
        // ==========================================
        // 1. FIREBASE CONFIGURATION
        // ==========================================
        const firebaseConfig = {
            apiKey: "AIzaSyA6ybSlhtJX0nXdBghBDUx0HtLejLcd7xs",
            authDomain: "cfb-pick--em-d47c6.firebaseapp.com",
            databaseURL: "https://cfb-pick--em-d47c6-default-rtdb.firebaseio.com",
            projectId: "cfb-pick--em-d47c6",
            storageBucket: "cfb-pick--em-d47c6.firebasestorage.app",
            messagingSenderId: "16388468919",
            appId: "1:16388468919:web:3e24f4c7685e8aa50fdd32"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

