# **Local Setup Guide for Gurudwara Dashboard (Vite + Yarn)**

Follow these steps to run the application on your local machine using **Vite** and **Yarn**.

---

## **Prerequisites**

* **Node.js v16 or higher**
* **Yarn** installed
  Recommended ways to get Yarn:

  - If your Node version supports Corepack (Node 16.10+):

  ```bash
  corepack enable
  corepack prepare yarn@stable --activate
  ```

  - Or install via npm:

  ```bash
  npm install -g yarn
  ```
* A **Google Firebase** account

---

## **Step 1: Create a Vite App**

```bash
yarn create vite gurudwara-app --template react
cd gurudwara-app
yarn
```

## Admin setup & testing

This project supports three ways to grant admin access (use one or more):

- Environment fallback: set `VITE_ADMIN_UIDS` to a comma-separated list of admin UIDs in your `.env` (useful for local testing).
- Firestore UID: create a document at `admins/{uid}` (document ID equals the user's `uid`).
- Firestore email: create a document at `admins_by_email/{email}` (document ID equals the user's email in lowercase).

How admin detection works (in order):
1. If the current user's `uid` is present in `VITE_ADMIN_UIDS`, they are admin.
2. Else, the app checks `admins/{uid}` in Firestore.
3. Else, if the user has an email, the app checks `admins_by_email/{email}`.

Grant admin locally for testing:

1. Start the app and register/sign-in via the `Account` page (top nav). Note the signed-in user's `uid` from the browser console or the Firebase Auth panel.
2. Option A (env): Add the UID to `.env` like:

```env
VITE_ADMIN_UIDS=uid1,uid2
```

Then restart the dev server.

2. Option B (Firestore by UID): In Firebase Console → Firestore → create a collection `admins` and add a document whose ID equals the UID.

3. Option C (Firestore by email): Create a document in `admins_by_email` where the document ID is the user's email lowercased.

Inviting admins from the app:

- Once you have an admin account, open the **Admin Panel**. There is an **Invite Admin** box where an admin can add another admin by email (creates a `admins_by_email/{email}` doc) or directly by UID (`admins/{uid}`).

Testing flow summary:

1. Register a user via `Account` → `Register` (or sign in using an existing account).
2. Add that user's UID to `.env` or add an admin doc in Firestore as described above.
3. Reload the app. The top nav should show the **Admin Panel** button. Open it to access admin tools.

Security note:

This simple invite mechanism (using Firestore doc existence) is intended for small teams and local testing. For production use, enforce stricter server-side checks (Cloud Functions + Admin SDK) and secure your Firestore rules so only authorized operators can add admin entries.

Firestore rules (example)
------------------------
Add these rules to your Firestore rules to protect admin documents and registration requests. Adjust `request.auth.uid` checks to match your security model.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admins collection reads only to authenticated users; writes only by super_admins
    match /admins/{adminId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (
        // super_admins can write
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin'
      );
    }

    // admins_by_email - only super_admins can create/update
    match /admins_by_email/{email} {
      allow read: if request.auth != null && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
      allow write: if request.auth != null && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
    }

    // admin_requests - anyone authenticated can create their own request; super_admins can read and update
    match /admin_requests/{reqId} {
      allow create: if request.auth != null && request.auth.uid == reqId;
      allow read, update: if request.auth != null && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'super_admin';
    }

    // Other data rules (default): authenticated reads/writes as appropriate for your app
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```


Notification functions: removed
--------------------------------
The example Cloud Functions and functions/ folder have been removed from this repository to keep the local dev workflow simple. Admin and super-admin behavior is implemented in the frontend using Firestore documents (`admins`, `admins_by_email`, `admin_requests`).


---

## **Step 2: Install Dependencies & Tailwind CSS**

### 1. Install Firebase & Icons

```bash
yarn add firebase lucide-react
```

### 2. Install Tailwind CSS v3

> We explicitly install `@3` to ensure compatibility.

```bash
yarn add -D tailwindcss@3 postcss autoprefixer
```

### 3. Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

*(If `npx` fails, try `yarn tailwindcss init -p`)*

### 4. Configure `tailwind.config.js`

Replace everything with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 5. Clean Styles & Add Tailwind Directives

* **Delete:** `src/App.css`
* Open `src/index.css` → replace entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## **Step 3: Firebase Configuration**

1. Go to **Firebase Console**
2. Create a new project
3. Enable **Authentication**

   * Enable **Anonymous Sign-in**
4. Enable **Firestore Database**

   * Start in **Test Mode**
5. Go to **Project Settings → General → Your apps → Add Web App**
6. Copy the `firebaseConfig` object

---

## **Step 4: Create Environment File**

Create a `.env` file at the project root.

> Vite requires env variables to start with `VITE_`.

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

---

## **Step 5: Initialize Firebase**

Create `src/firebase.js`:

```js
// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
```