importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDk33nyJStLroL0mslnqBScfJp4r90K0M0",
    authDomain: "vaccine-tracker-pupicci.firebaseapp.com",
    databaseURL: "https://vaccine-tracker-pupicci-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vaccine-tracker-pupicci",
    storageBucket: "vaccine-tracker-pupicci.firebasestorage.app",
    messagingSenderId: "167738804252",
    appId: "1:167738804252:web:b857fa33bc390c8a4f77d9"
});

const messaging = firebase.messaging();

// 1. Show the single manual notification from the data block
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message caught!', payload);

    // Read from data since we changed the Cloud Function
    const notificationTitle = payload.data?.title || 'Gym Tracker';
    const notificationOptions = {
        body: payload.data?.body || 'Rest time over!',
        icon: '/vaccines/pwa-192x192.png',
        // Store the target URL in the notification's custom data property
        data: {
            url: payload.data?.click_action_url || '/vaccines/'
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. Handle the click action
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification banner immediately

    // Extract the target URL we saved in the options step above
    const targetUrl = event.notification.data?.url || '/vaccines/';

    // Look through all open windows/tabs to see if the user already has the site open
    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        // If your site is already open in a tab, just focus it
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes('/vaccines/') && 'focus' in client) {
                return client.focus();
            }
        }
        // If your site is completely closed, open a brand new tab
        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    });

    event.waitUntil(promiseChain);
});