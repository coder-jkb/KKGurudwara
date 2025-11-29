# **Local Setup Guide for Gurudwara Dashboard (Vite + Yarn)**

Follow these steps to run the application on your local machine using **Vite** and **Yarn**.

---

## **Prerequisites**

* **Node.js v16 or higher**
* **Yarn** installed

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