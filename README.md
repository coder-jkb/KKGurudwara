# Gurudwara Shri Dashmesh Darbar (Vite + React)

A React (Vite) app for Gurudwara Shri Dashmesh Darbar: bookings, events, and community info. Firebase is used for auth (anonymous/custom token) and Firestore for data.

## Prerequisites
- Node.js 18+
- Yarn
- Firebase project with Firestore
- Optional: Tailwind CSS (classes already used)

## Setup

1) Install dependencies

```cmd
yarn install
```

2) Configure Firebase
- Create a file `src/firebase.js` (if not present) with your Firebase config and exports for `auth` and `db`.
- Or inject globals via build-time: `__firebase_config` and `__initial_auth_token` (custom token optional).

Example `src/firebase.js`:
```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: "<YOUR_API_KEY>",
	authDomain: "<YOUR_AUTH_DOMAIN>",
	projectId: "<YOUR_PROJECT_ID>",
	storageBucket: "<YOUR_STORAGE_BUCKET>",
	messagingSenderId: "<YOUR_SENDER_ID>",
	appId: "<YOUR_APP_ID>"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

3) Development server
```cmd
yarn dev
```
Open `http://localhost:5173`.

## Tailwind (optional)
If you want Tailwind processing:
```cmd
yarn add -D tailwindcss postcss autoprefixer
yarn tailwindcss init -p
```
- Update `tailwind.config.cjs` content:
```
content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"]
```
- Add to `src/index.css`:
```
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Git & GitHub (SSH personal account)
You mentioned this SSH config:
```
Host github.com-personal
		HostName github.com
		User git
		IdentityFile ~/.ssh/id_ed25519_personal
```

Initialize repo and push using that host:
```cmd
git init
git add .
git commit -m "Initial commit: Gurudwara app"
git branch -M main
```
Create a repo on GitHub (web UI), then set remote and push:
```cmd
git remote add origin git@github.com-personal:YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Project Structure
- `src/App.jsx`: Main app (navbar, views, admin dashboard)
- `src/main.jsx`: React 18 entry
- `public/logo.jpg`: App logo (used for navbar + favicon)
- `index.html`: Favicon set to `/logo.jpg`

## Notes
- Firestore collections used:
	- `artifacts/<appId>/public/data/events`
	- `artifacts/<appId>/public/data/bookings`
- Update security rules to allow appropriate reads/writes.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
