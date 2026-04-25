// ============================================================
// ARGUSINTEL — AUTH MODULE
// js/auth.js
//
// Name-based login. Checks Firestore roster.
// Assigns role: Manager / Core Team / Site Engineer
// Also loads VERSION_TEST flag from Firestore settings doc.
// Not case sensitive — normalizes to lowercase for lookup.
// ============================================================

import { DUMMY_ROSTER } from './modules/dummy-data.js';

// ============================================================
// CHECK NAME AGAINST ROSTER
// Returns { name, role, site } or null if not found (→ Site Engineer)
// ============================================================
export async function checkRoster(inputName, db) {
  const nameKey = inputName.trim().toLowerCase();
  if (!nameKey) return null;

  // Try Firestore first (live data)
  if (db) {
    try {
      const { collection, getDocs, query, where } = await import(
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
      );
      const q = query(collection(db, 'roster'), where('key', '==', nameKey));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return { name: data.name, role: data.role, site: data.site };
      }
    } catch (err) {
      console.warn('Firestore roster check failed, falling back to dummy:', err);
    }
  }

  // Fallback: dummy roster (test mode or no Firebase yet)
  const found = DUMMY_ROSTER.find(r => r.key === nameKey);
  if (found) return { name: found.name, role: found.role, site: found.site };

  // Not in roster → Site Engineer
  const displayName = inputName.trim().charAt(0).toUpperCase() + inputName.trim().slice(1);
  return { name: displayName, role: 'Site Engineer', site: 'Unassigned' };
}

// ============================================================
// LOAD APP SETTINGS (version test flag, etc.)
// ============================================================
export async function loadSettings(db) {
  const defaults = { versionTest: false, version: 'v0.1' };

  if (!db) return defaults;

  try {
    const { doc, getDoc } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) return { ...defaults, ...snap.data() };
  } catch (err) {
    console.warn('Settings load failed:', err);
  }

  return defaults;
}

// ============================================================
// SAVE VERSION TEST FLAG (Manager only)
// ============================================================
export async function setVersionTest(enabled, db) {
  if (!db) return;
  try {
    const { doc, setDoc } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    await setDoc(doc(db, 'settings', 'app'), { versionTest: enabled }, { merge: true });
  } catch (err) {
    console.error('Failed to save version test flag:', err);
  }
}
