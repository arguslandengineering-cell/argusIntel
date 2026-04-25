// ============================================================
// ARGUSINTEL — CORE APP MODULE
// js/app.js
//
// Central state. Firebase init. Tab routing.
// All tabs import getState() to read current data.
// All writes go through updateState() → Firestore → re-render.
// ============================================================

import { FIREBASE_CONFIG } from '../firebase-config.js';
import { checkRoster, loadSettings, setVersionTest } from './auth.js';
import {
  DUMMY_TASKS, DUMMY_CSW, DUMMY_ROSTER,
  DUMMY_RECALL, DUMMY_DIGEST, DUMMY_STANDARDS, DUMMY_VERSION
} from './modules/dummy-data.js';

// ============================================================
// GLOBAL STATE — single source of truth
// ============================================================
let STATE = {
  currentUser: null,
  currentRole: null,
  currentSite: null,
  db: null,
  versionTest: false,
  version: 'v0.1',
  tasks: [],
  csws: [],
  roster: [],
  recall: null,
  digest: null,
  standards: [],
  activeTab: 'home',
  loading: true,
};

export const getState = () => ({ ...STATE });
export const getRawState = () => STATE;

// ============================================================
// FIREBASE INIT
// ============================================================
async function initFirebase() {
  if (FIREBASE_CONFIG.apiKey === 'PASTE_YOUR_apiKey_HERE') {
    console.warn('ArgusIntel: Firebase not configured — running in offline/dummy mode');
    return null;
  }
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const app = initializeApp(FIREBASE_CONFIG);
    return getFirestore(app);
  } catch (err) {
    console.error('Firebase init failed:', err);
    return null;
  }
}

// ============================================================
// LOAD DATA — from Firestore or dummy fallback
// ============================================================
async function loadData() {
  const { db, versionTest } = STATE;

  // Always use dummy data if version test is on OR no Firebase
  if (versionTest || !db) {
    STATE.tasks     = DUMMY_TASKS;
    STATE.csws      = DUMMY_CSW;
    STATE.roster    = DUMMY_ROSTER;
    STATE.recall    = DUMMY_RECALL;
    STATE.digest    = DUMMY_DIGEST;
    STATE.standards = DUMMY_STANDARDS;
    return;
  }

  // Live Firestore data
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const [tasksSnap, cswSnap, rosterSnap, stdSnap] = await Promise.all([
      getDocs(collection(db, 'tasks')),
      getDocs(collection(db, 'csw')),
      getDocs(collection(db, 'roster')),
      getDocs(collection(db, 'standards')),
    ]);
    STATE.tasks     = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.csws      = cswSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.roster    = rosterSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.standards = stdSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Firestore load error:', err);
  }
}

// ============================================================
// LOGIN FLOW
// ============================================================
export async function login(inputName) {
  showLoader(true);

  // Init Firebase
  if (!STATE.db) STATE.db = await initFirebase();

  // Load settings (version test flag)
  const settings = await loadSettings(STATE.db);
  STATE.versionTest = settings.versionTest;
  STATE.version     = settings.version || 'v0.1';

  // Roster check
  const user = await checkRoster(inputName, STATE.db);
  STATE.currentUser = user.name;
  STATE.currentRole = user.role;
  STATE.currentSite = user.site;

  // Load data
  await loadData();

  STATE.loading = false;
  showLoader(false);

  // Render app
  renderApp();
}

// ============================================================
// VERSION TEST TOGGLE (Manager only)
// ============================================================
export async function toggleVersionTest(enabled) {
  STATE.versionTest = enabled;
  await setVersionTest(enabled, STATE.db);
  await loadData();
  renderActiveTab();
  renderFooter();
}

// ============================================================
// TAB ROUTING
// ============================================================
const TAB_CONFIG = {
  Manager:      ['home','work','csw','daily','report','standard'],
  'Core Team':  ['home','work','csw','daily','report','standard'],
  'Site Engineer': ['home','work','csw'],
};

const TAB_LABELS = {
  home: { icon: '⌂', label: 'Home' },
  work: { icon: '⊞', label: 'Work' },
  csw:  { icon: '◈', label: 'CSW' },
  daily:{ icon: '◉', label: 'Daily' },
  report:{ icon: '▤', label: 'Report' },
  standard:{ icon: '⊟', label: 'Standard' },
};

export function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  renderActiveTab();
}

async function renderActiveTab() {
  const content = document.getElementById('tab-content');
  if (!content) return;
  content.innerHTML = '<div class="loading-tab">Loading...</div>';

  const tabMap = {
    home:     () => import('./tabs/home.js').then(m => m.render()),
    work:     () => import('./tabs/work.js').then(m => m.render()),
    csw:      () => import('./tabs/csw.js').then(m => m.render()),
    daily:    () => import('./tabs/daily.js').then(m => m.render()),
    report:   () => import('./tabs/report.js').then(m => m.render()),
    standard: () => import('./tabs/standard.js').then(m => m.render()),
  };

  const html = await (tabMap[STATE.activeTab] || tabMap['home'])();
  content.innerHTML = html;

  // Wire tab-specific events after render
  const initMap = {
    home:     () => import('./tabs/home.js').then(m => m.init && m.init()),
    work:     () => import('./tabs/work.js').then(m => m.init && m.init()),
    csw:      () => import('./tabs/csw.js').then(m => m.init && m.init()),
    daily:    () => import('./tabs/daily.js').then(m => m.init && m.init()),
    report:   () => import('./tabs/report.js').then(m => m.init && m.init()),
    standard: () => import('./tabs/standard.js').then(m => m.init && m.init()),
  };
  await (initMap[STATE.activeTab] || initMap['home'])();
}

// ============================================================
// RENDER APP SHELL (post-login)
// ============================================================
function renderApp() {
  document.getElementById('login-view').classList.add('hidden');
  const appView = document.getElementById('app-view');
  appView.classList.remove('hidden');

  // Header user info
  document.getElementById('role-display').textContent = STATE.currentRole;
  document.getElementById('role-display').className = 'role-badge role-' +
    (STATE.currentRole === 'Manager' ? 'manager' : STATE.currentRole === 'Core Team' ? 'core' : 'site');
  document.getElementById('role-display').classList.remove('hidden');
  document.getElementById('user-display').textContent = STATE.currentUser;
  document.getElementById('user-display').style.display = 'block';

  // Build tab bar
  const tabs = TAB_CONFIG[STATE.currentRole] || TAB_CONFIG['Site Engineer'];
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = '';
  tabs.forEach(id => {
    const t = TAB_LABELS[id];
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (id === STATE.activeTab ? ' active' : '');
    btn.dataset.tab = id;
    btn.innerHTML = `<span class="tab-icon">${t.icon}</span>${t.label}`;
    btn.onclick = () => switchTab(id);
    bar.appendChild(btn);
  });

  // Footer
  renderFooter();

  // Load first tab
  renderActiveTab();
}

function renderFooter() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  const isTest = STATE.versionTest;
  const isManager = STATE.currentRole === 'Manager';

  footer.innerHTML = `
    <div class="footer-inner">
      <span class="version-label ${isTest ? 'version-test' : ''}">
        ArgusIntel ${STATE.version}${isTest ? ' — Test Mode' : ''}
      </span>
      ${isManager ? `
        <label class="toggle-wrap" title="Toggle dummy test data for all users">
          <span class="toggle-label">Test Mode</span>
          <span class="toggle-track">
            <input type="checkbox" id="version-test-toggle" ${isTest ? 'checked' : ''}
              onchange="window.argus.toggleVersionTest(this.checked)">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      ` : ''}
    </div>
  `;
}

function showLoader(on) {
  const l = document.getElementById('app-loader');
  if (l) l.style.display = on ? 'flex' : 'none';
}

// ============================================================
// FIRESTORE WRITE HELPERS — used by tab modules
// ============================================================
export async function writeDoc(collectionName, docId, data) {
  const { db } = STATE;
  if (!db) { console.warn('No Firebase — write skipped'); return false; }
  try {
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(db, collectionName, docId), data, { merge: true });
    return true;
  } catch (err) {
    console.error('Write error:', err);
    return false;
  }
}

export async function addDoc(collectionName, data) {
  const { db } = STATE;
  if (!db) { console.warn('No Firebase — add skipped'); return null; }
  try {
    const fb = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const ref = await fb.addDoc(fb.collection(db, collectionName), data);
    return ref.id;
  } catch (err) {
    console.error('Add error:', err);
    return null;
  }
}

// ============================================================
// TOAST UTILITY — global
// ============================================================
let _toastTimer;
export function toast(msg, type = 'info') {
  let el = document.getElementById('argus-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'argus-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'argus-toast toast-' + type;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ============================================================
// MODAL UTILITY — global
// ============================================================
export function showModal(html, onClose) {
  let overlay = document.getElementById('argus-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'argus-modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-card" id="modal-card">
        <button class="modal-close" onclick="window.argus.closeModal()">✕</button>
        ${html}
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
  window.argus._modalOnClose = onClose;
}

export function closeModal() {
  const overlay = document.getElementById('argus-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  if (window.argus._modalOnClose) window.argus._modalOnClose();
}

// ============================================================
// GLOBAL API — accessible from inline HTML handlers
// ============================================================
window.argus = {
  login,
  switchTab,
  toggleVersionTest,
  toast,
  showModal,
  closeModal,
  getState,
};
