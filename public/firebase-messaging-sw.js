// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyDk33nyJStLroL0mslnqBScfJp4r90K0M0",
    authDomain: "vaccine-tracker-pupicci.firebaseapp.com",
    databaseURL: "https://vaccine-tracker-pupicci-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vaccine-tracker-pupicci",
    storageBucket: "vaccine-tracker-pupicci.firebasestorage.app",
    messagingSenderId: "167738804252",
    appId: "1:167738804252:web:b857fa33bc390c8a4f77d9"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'Gym Tracker';
    const notificationOptions = {
        body: payload.notification?.body || 'Rest time is over! Time for your next set.',
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
