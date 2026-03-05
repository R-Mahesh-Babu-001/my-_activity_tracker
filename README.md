# LevelUp Daily Tracker (PWA + Google OAuth + Google Sheets)

### 🌐 Live Demo

https://my-activity-tracker.onrender.com

⚠️ **Note:** This application is hosted on a **Render free instance**.
The server may go to sleep when inactive, so the **first load may take 20–40 seconds** while the server wakes up. After that, the app will work normally.

---

# Overview

**LevelUp Daily Tracker** is a **React Progressive Web App (PWA)** designed to help developers track their daily coding habits and progress.

The application integrates **Google OAuth authentication** and **Google Sheets** as a lightweight backend data store. Each user automatically gets their **own personal Google Sheet**, ensuring complete data ownership and transparency.

---

# Features

* Google OAuth login
* Each user owns their own data
* Automatic Google Sheet creation per user
* Checkbox activity sync to Google Sheets
* XP system with avatar leveling
* Progress charts and tracking dashboard
* Installable Progressive Web App (PWA)

---

# Tech Stack

## Frontend

* React
* Vite
* vite-plugin-pwa
* Recharts

## Backend

* Node.js
* Express
* Google APIs

## Deployment

* Render (render.yaml included)

---

# How Data Ownership Works

1. The user logs in using **Google OAuth**.
2. The frontend receives a **Google access token**.
3. The backend verifies the token using Google APIs.
4. If the user logs in for the first time, the backend **creates a Google Sheet in the user's Google Drive**.
5. All daily tracker updates are synced to that sheet.

This architecture ensures:

* Users **fully own their data**
* No centralized database is required
* Data remains transparent and portable

---

# Local Setup

## 1. Create Google OAuth Client

Go to:

Google Cloud Console → **APIs & Services → Credentials**

Create:

**OAuth 2.0 Client ID**

Application type:

```
Web application
```

Add Authorized JavaScript Origins:

```
http://localhost:5173
```

Enable the following APIs:

```
Google Sheets API
Google People API
```

---

# Backend Setup

```
cd backend
cp .env.example .env
npm install
npm run dev
```

---

# Frontend Setup

```
cd frontend
cp .env.example .env
```

Edit `.env`:

```
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
VITE_API_URL=http://localhost:8787
```

Run the frontend:

```
npm install
npm run dev
```

Frontend will start at:

```
http://localhost:5173
```

---

# Deploy to Render

## Step 1

Push the repository to GitHub.

## Step 2

Go to **Render Dashboard** and create a new deployment:

```
New + → Blueprint
```

Select your repository.

Render will automatically create:

```
daily-tracker-api
daily-tracker-pwa
```

---

# Environment Variables

## Backend (daily-tracker-api)

```
FRONTEND_ORIGIN=https://your-frontend.onrender.com
GOOGLE_SHEET_TAB=DailyTracker
```

## Frontend (daily-tracker-pwa)

```
VITE_API_URL=https://your-api.onrender.com
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

---

# Update Google OAuth for Production

Add the deployed frontend origin in Google Cloud:

```
https://your-frontend.onrender.com
```

---

# Core API Routes

```
GET /api/me
POST /api/bootstrap
GET /api/dashboard
POST /api/check
```

---

# Git Push

```
git add .
git commit -m "Daily tracker project"
git push
```

---

# License

MIT License
