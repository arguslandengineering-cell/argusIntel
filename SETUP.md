# ArgusIntel — Setup Guide
**Version:** v0.1-test  
**Stack:** GitHub Pages + Firebase Firestore + PWA (Add to Home Screen)

---

## BEFORE YOU START — Read These

> ⚠️ **GitHub URL rule:** Repo name must be **all lowercase, no spaces**.  
> Use: `argusintel` ✅  
> Not: `ArgusIntel` ❌ or `Argus Intel` ❌  
> Capital letters in repo names break GitHub Pages URLs silently.

> ℹ️ Your live URL will be:  
> `https://YOUR-USERNAME.github.io/argusintel`  
> Replace `YOUR-USERNAME` with your actual GitHub username (lowercase).

---

## STEP 1 — GitHub Account + Repo

### 1a. Create GitHub account
1. Go to [github.com](https://github.com)
2. Click **Sign up**
3. Use a lowercase email and pick a **lowercase username** (e.g. `argusadmin`)
4. Verify your email

### 1b. Create the repository
1. Click the **+** icon → **New repository**
2. Repository name: **`argusintel`** (all lowercase, no spaces, no capitals)
3. Set to **Public**
4. Check **Add a README file**
5. Click **Create repository**

### 1c. Enable GitHub Pages
1. Inside your repo → click **Settings** (top menu)
2. Left sidebar → **Pages**
3. Under **Source** → select **Deploy from a branch**
4. Branch: **main** / Folder: **/ (root)**
5. Click **Save**
6. Wait 2–3 minutes → your URL appears at the top: `https://yourusername.github.io/argusintel`

### 1d. Upload app files
1. In your repo → click **Add file** → **Upload files**
2. Upload all files from the `argusintel/` folder you received
3. Keep the folder structure exactly as-is:
   ```
   index.html
   manifest.json
   sw.js
   firebase-config.js
   css/style.css
   js/app.js
   js/auth.js
   js/modules/dummy-data.js
   js/modules/bottleneck.js
   js/modules/prompts.js
   js/tabs/home.js
   js/tabs/work.js
   js/tabs/csw.js
   js/tabs/daily.js
   js/tabs/report.js
   js/tabs/standard.js
   ```
4. Commit message: `initial upload v0.1`
5. Click **Commit changes**

> ✅ **Test now:** Open `https://yourusername.github.io/argusintel` in Chrome.  
> You should see the ArgusIntel login screen.

---

## STEP 2 — Firebase Setup (Real-time Database)

### 2a. Create Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name: `argusintel` (lowercase)
4. Disable Google Analytics (not needed)
5. Click **Create project**

### 2b. Add a Web App
1. Inside your project → click the **</>** (Web) icon
2. App nickname: `argusintel-web`
3. Do **NOT** check Firebase Hosting (you're using GitHub Pages)
4. Click **Register app**
5. You'll see a `firebaseConfig` block like this:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "argusintel-xxxxx.firebaseapp.com",
     projectId: "argusintel-xxxxx",
     storageBucket: "argusintel-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
6. **Copy this entire block** — you'll need it in Step 2d

### 2c. Enable Firestore
1. Left sidebar → **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (allows all reads/writes for 30 days — fine for team launch)
4. Choose a region closest to you (e.g. `asia-southeast1` for Philippines)
5. Click **Enable**

### 2d. Paste Firebase config into the app
1. Open `firebase-config.js` in your GitHub repo
2. Click the **pencil icon** (Edit file)
3. Replace each `"PASTE_YOUR_xxx_HERE"` value with your actual values from Step 2b
4. Commit the changes

### 2e. Add GitHub Pages to authorized domains
1. Firebase console → **Authentication** (left sidebar)
2. Click **Get started** if prompted → then **Settings** tab
3. Under **Authorized domains** → click **Add domain**
4. Add: `yourusername.github.io`
5. Click **Add**

### 2f. Seed the Roster in Firestore
1. Firebase console → **Firestore Database** → **Start collection**
2. Collection ID: `roster`
3. Add a document for each team member:
   ```
   Document ID: (auto)
   Fields:
     name: "Charles"       (string)
     key:  "charles"       (string — always lowercase)
     role: "Manager"       (string)
     site: "All"           (string)
   ```
   Repeat for Ana, Ben, Lei, Marco with their roles.

4. Also create the settings document:
   ```
   Collection: settings
   Document ID: app
   Fields:
     versionTest: false    (boolean)
     version: "v0.1"      (string)
   ```

> ✅ **Test:** Reload the app → log in as Charles → all 6 tabs should appear.

---

## STEP 3 — App Script Bridge (Optional — Google Sheets Import)

> Only needed if you want direct Sheets → Firestore import without the Claude paste step.  
> The File Import Prompt Sorter works without this.

### 3a. Open Google Sheets
1. Open any Google Sheet with your workload data
2. Extensions → **Apps Script**

### 3b. Paste the bridge script
Copy and paste the contents of `appscript-bridge.gs` (provided separately) into the Apps Script editor.

### 3c. Deploy
1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy** → copy the **Web App URL**

### 3d. Add URL to config
1. Open `firebase-config.js` in GitHub
2. Set: `const APPSCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";`
3. Commit

---

## STEP 4 — Add to Home Screen (PWA Install)

### iOS (Safari)
1. Open `https://yourusername.github.io/argusintel` in **Safari**
2. Tap the **Share** icon (box with arrow)
3. Scroll down → tap **Add to Home Screen**
4. Name it **ArgusIntel** → tap **Add**
5. App icon appears on home screen — opens full screen, no browser chrome

### Android (Chrome)
1. Open the URL in **Chrome**
2. Tap the **three dots** menu
3. Tap **Add to Home screen** or **Install app**
4. Tap **Add**

### Desktop (Chrome/Edge)
1. Open the URL
2. Click the **install icon** in the address bar (looks like a computer with a down arrow)
3. Click **Install**

---

## STEP 5 — Version Test Mode

1. Log in as **Charles** (Manager)
2. At the bottom footer → toggle **Test Mode** switch to ON
3. All dummy data becomes visible to everyone for testing
4. Toggle OFF when going live — dummy data hidden, only real Firestore data shows

> ℹ️ The **Bottleneck Prompt** in the Report tab is always functional regardless of test mode.

---

## STEP 6 — Testing Checklist

Run through this after setup:

| Test | Device | Role | Expected |
|------|--------|------|----------|
| Login as Charles | PC Chrome | Manager | 6 tabs, footer toggle, manager controls |
| Login as Ana | PC Chrome | Core Team | 6 tabs, no manager-only controls |
| Login as Marco | PC Chrome | Site Eng | 3 tabs (Home, Work, CSW) |
| Login as Charles | Phone Safari | Manager | 6 tabs, PWA fullscreen |
| Toggle Test Mode ON | Phone | Manager | Footer shows "Test Mode", dummy data visible |
| Toggle Test Mode OFF | Phone | Manager | Clean view, no dummy data |
| Bottleneck Prompt | Any | Manager | Prompt generates, copies to clipboard |
| CSW → Escalate to CSW | Any | Any | Switches to CSW tab, pre-fills form |
| Add Work Item | Any | Any | Form opens, saves to Firestore |
| New CSW | Any | Any | Form opens, CSW prompt generates |
| Recall Response | Any | Any | ✔ / ⚠ / ✕ saved, buttons disabled after |

---

## TROUBLESHOOTING

**App shows blank white screen**
→ Check browser console (F12) for errors. Usually a path issue — confirm all files are in correct folders.

**Login works but tabs don't load**
→ Firebase config values may be wrong. Check `firebase-config.js` for typos.

**"Add to Home Screen" not appearing on iOS**
→ Must use Safari, not Chrome, on iOS. GitHub Pages must be HTTPS (it is by default).

**Changes I make don't appear in the app**
→ Hard reload: Ctrl+Shift+R (PC) or Cmd+Shift+R (Mac). On phone, clear Safari/Chrome cache.

**Firebase "permission denied" errors in console**
→ Firestore is still in test mode — check the expiry date in Firebase console → Firestore → Rules.

---

## FILE STRUCTURE REFERENCE

```
argusintel/
├── index.html                  ← Entry point (PWA shell)
├── manifest.json               ← PWA manifest (Add to Home Screen)
├── sw.js                       ← Service worker (offline cache)
├── firebase-config.js          ← YOUR Firebase keys go here
├── icons/
│   ├── icon-192.png            ← App icon (create or use placeholder)
│   └── icon-512.png            ← App icon large
├── css/
│   └── style.css               ← All styles
└── js/
    ├── app.js                  ← Core state, routing, Firebase init
    ├── auth.js                 ← Name-based login, roster check
    ├── modules/
    │   ├── dummy-data.js       ← All test data (isolated)
    │   ├── bottleneck.js       ← Bottleneck prompt engine
    │   └── prompts.js          ← All AI prompt generators
    └── tabs/
        ├── home.js             ← Tab 1
        ├── work.js             ← Tab 2
        ├── csw.js              ← Tab 3
        ├── daily.js            ← Tab 4
        ├── report.js           ← Tab 5
        └── standard.js         ← Tab 6
```

---

*ArgusIntel v0.1-test — Land Planning & Engineering Intelligence System*
