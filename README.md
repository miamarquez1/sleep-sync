# SleepSync

SleepSync is a beginner-friendly sleep tracking web app where users log sleep times, track streaks, and visualize sleep habits.

## Features

1. Firebase Email/Password sign up and login
2. Protected dashboard route (redirects unauthenticated users to login)
3. Guest-only auth routes (logged-in users are redirected from login/signup to dashboard)
4. Persistent auth session on refresh via Firebase local persistence
5. Sleep logs, streaks, and insights stored locally per authenticated user UID

## Tech Stack

- HTML5
- CSS3
- JavaScript (Vanilla)
- Firebase Authentication

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com.
2. In Firebase Console, create a Web app and copy its config values.
3. In Authentication > Sign-in method, enable Email/Password.
4. Open `js/firebase-config.js` and paste your config:

```js
window.SLEEPSYNC_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};
```

## Run Locally

1. Clone this repository.
2. Open `index.html` in a browser (or use a local static server).
3. Navigate to login/signup pages and authenticate with Firebase.

## Project Structure

- `index.html` — landing page
- `css/styles.css` — styles
- `js/app.js` — app and dashboard logic
- `js/storage.js` — local sleep-log storage by Firebase user UID
- `js/firebase-auth.js` — Firebase auth wrapper and route guards
- `js/firebase-config.js` — Firebase Web config values
- `pages/` — login, signup, dashboard pages
