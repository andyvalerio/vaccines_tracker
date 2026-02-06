# Health Tracker

A personal health and immunization tracker app built for my family to keep track of vaccination history and upcoming boosters. It uses **Google Gemini AI** to intelligently analyze records and suggest due dates or missing vaccines based on general medical guidelines.

**[👉 Use it live here](http://valerio.nu/vaccines)**

> **Note:** This is a live application, not just a demo. You can create an account and start tracking immediately.

## ✨ Features

*   **Smart Dashboard:** View upcoming vaccinations due in the next 6 months at a glance.
*   **AI Analysis (Powered by Gemini):**
    *   Automatically calculates suggested "Next Due Dates" for vaccines based on when you last took them.
    *   Provides brief medical reasoning for why a booster might be needed.
*   **Missing Vaccine Suggestions:** The AI analyzes your portfolio and suggests common adult vaccines you might be missing (e.g., Tetanus, Flu, HPV).
*   **Excel Export:** Download your entire medical history to `.xls` format to share with doctors.
*   **Secure Cloud Sync:** Real-time data synchronization across all your devices using Firebase.
*   **Privacy First:** Data is stored securely in your private account.

## 🛠️ Build & Run (Self-Hosted)

If you want to run this locally or host your own version, you will need a [Firebase](https://firebase.google.com/) account.

### Prerequisites
*   Node.js (v18+)
*   Firebase CLI (`npm install -g firebase-tools`)
*   A Google Cloud Project with the **Gemini API** enabled.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/health-tracker.git
    cd health-tracker
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd functions
    npm install
    cd ..
    ```

### Configuration

1.  **Firebase Setup**
    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Authentication** (Email/Password and Google Sign-in).
    *   Enable **Realtime Database** (Create in `europe-west1` or update the config).
    *   Enable **Cloud Functions** (Requires Blaze Pay-as-you-go plan).

2.  **Update Config**
    *   Rename/Update `firebaseConfig.ts` with your own Firebase project credentials.

3.  **Set API Keys**
    The backend uses Google's Gemini API. You need to store your API key securely in Firebase Functions secrets.
    ```bash
    firebase login
    firebase functions:secrets:set GEMINI_API_KEY
    # Paste your Gemini API key when prompted
    ```

### Running Locally

```bash
npm run dev
```

To test the Cloud Functions locally, you will need the Firebase Emulator Suite:
```bash
firebase emulators:start
```

## 🚀 Deployment

The project includes a custom `scripts/deploy.js` for FTP deployment, but strictly for the frontend.

To deploy the backend (Functions):
```bash
firebase deploy --only functions
```

To build the frontend:
```bash
npm run build
```

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.