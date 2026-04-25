// ============================================================
// ARGUSINTEL — TAB: HOME
// js/tabs/home.js
// ============================================================

import { getState, toast } from '../app.js';

export function render() {
  const { currentRole, currentUser, tasks, csws, recall, digest, versionTest } = getState();
  if (currentRole === 'Site Engineer') return renderSite(currentUser, tasks, versionTest);
  return renderCore(currentRole, currentUser, tasks, csws, recall, digest, versionTest);
}

// ============================================================
// CORE TEAM / MANAGER VIEW
// ============================================================
function renderCore(role, user, tasks, csws, recall, digest, versionTest) {
  const isManager = role === 'Manager';
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });

  // Upcoming deadlines — next 7 days
  const now = new Date();
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const upcoming = tasks
    .filter(t => t.status !== 'Done' && t.deadline)
    .map(t => ({ ...t, dueDate: new Date(t.deadline) }))
    .filter(t => t.dueDate >= now && t.dueDate <= in7)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 4);

  const todayPulse = buildPulse(tasks, csws);

  return `
    <div class="module-label">TAB-01 · HOME</div>

    ${versionTest ? `<div class="notice" style="border-color:#EF9F2744;background:#FFFBF2;">
      <span style="color:var(--c-amber);">⚠ Version Test Mode ON</span> — dummy data is active across all tabs
    </div>` : ''}

    ${digest && digest.published ? `
    <div class="card" style="border-left:3px solid var(--c-accent);cursor:pointer;" onclick="window.argus.switchTab('daily')">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="card-title">Today's Digest</div>
        <span class="badge badge-green">Published</span>
      </div>
      <div class="card-sub" style="margin-top:5px;">${today} — Tap to read full digest</div>
    </div>` : ''}

    ${recall ? `
    <div class="recall-card">
      <div class="recall-label">◎ CSW RECALL — ${recall.id}</div>
      <div class="recall-q">${recall.question}</div>
      <div class="recall-actions">
        <button class="r-btn" id="recall-in-place"
          style="color:#0F6E56;"
          onclick="handleRecall('in_place')">✔ In Place</button>
        <button class="r-btn" id="recall-needs-review"
          style="color:#854F0B;"
          onclick="handleRecall('needs_review')">⚠ Needs Review</button>
        <button class="r-btn" id="recall-not-impl"
          style="color:#A32D2D;"
          onclick="handleRecall('not_implemented')">✕ Not Implemented</button>
      </div>
    </div>` : ''}

    <div class="section-title">Pulse — Today</div>
    <div id="pulse-list">
      ${todayPulse.map(p => `
        <div class="pulse-item">
          <div class="pulse-dot" style="background:${p.color || 'var(--c-accent)'}"></div>
          <div>
            <div class="pulse-text">${p.text}</div>
            <div class="pulse-time">${p.time}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="divider"></div>

    <div class="section-title">Upcoming Deadlines — Next 7 Days</div>
    ${upcoming.length === 0
      ? `<div class="empty-state">No deadlines in the next 7 days</div>`
      : upcoming.map(t => {
          const daysLeft = Math.ceil((t.dueDate - now) / 86400000);
          const cls = daysLeft <= 2 ? 'badge-red' : daysLeft <= 4 ? 'badge-amber' : 'badge-green';
          return `
          <div class="card" style="cursor:pointer;" onclick="window.argus.switchTab('work')">
            <div class="card-title">${t.desc}</div>
            <div class="task-meta" style="margin-top:5px;">
              <span class="badge ${cls}">${daysLeft}d left</span>
              <span>${t.person}</span>
              <span>${t.site || ''}</span>
            </div>
          </div>`;
        }).join('')
    }

    <div class="divider"></div>

    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.argus.switchTab('work')">+ Report Work</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.argus.switchTab('daily')">◉ Build Digest</button>` : ''}
      <button class="btn btn-sm" onclick="window.home.printView()">⊟ Print View</button>
    </div>
  `;
}

// ============================================================
// SITE ENGINEER VIEW
// ============================================================
function renderSite(user, tasks, versionTest) {
  const myTasks = tasks.filter(t => t.person === user);
  const ongoing = myTasks.filter(t => t.status === 'Ongoing').length;
  const blocked  = myTasks.filter(t => t.status === 'Blocked').length;
  const done     = myTasks.filter(t => t.status === 'Done').length;
  const recent   = myTasks.slice(0, 3);

  return `
    <div class="module-label">TAB-01 · HOME · SITE ENG</div>

    ${versionTest ? `<div class="notice" style="border-color:#EF9F2744;background:#FFFBF2;">
      <span style="color:var(--c-amber);">⚠ Test Mode</span> — dummy data active
    </div>` : ''}

    <div class="card">
      <div class="card-title">Welcome, ${user}</div>
      <div class="card-sub">Site Engineer · ${new Date().toLocaleDateString('en-PH', { weekday:'long', month:'short', day:'numeric' })}</div>
      <div class="metric-row" style="margin-top:10px;">
        <div class="metric"><div class="metric-val" style="color:var(--c-blue)">${ongoing}</div><div class="metric-lbl">Ongoing</div></div>
        <div class="metric"><div class="metric-val" style="color:var(--c-red)">${blocked}</div><div class="metric-lbl">Blocked</div></div>
        <div class="metric"><div class="metric-val" style="color:var(--c-accent)">${done}</div><div class="metric-lbl">Done</div></div>
      </div>
    </div>

    <div class="row" style="margin-top:4px;">
      <button class="btn btn-primary btn-sm" onclick="window.argus.switchTab('work')">+ Add Work</button>
      <button class="btn btn-sm" onclick="window.argus.switchTab('csw')">+ CSW</button>
    </div>

    <div class="section-title" style="margin-top:14px;">My Recent Work</div>
    ${recent.length === 0
      ? `<div class="empty-state">No tasks yet — tap + Add Work to start</div>`
      : recent.map(t => {
          const cls = t.status === 'Done' ? 'badge-green' : t.status === 'Blocked' ? 'badge-red' : t.status === 'Ongoing' ? 'badge-blue' : 'badge-amber';
          return `
          <div class="task-card">
            <div class="task-desc">${t.desc}</div>
            <div class="task-meta" style="margin-top:5px;">
              <span class="badge ${cls}">${t.status}</span>
              <span>${t.deadline || ''}</span>
            </div>
          </div>`;
        }).join('')
    }
  `;
}

// ============================================================
// PULSE — build from task/CSW activity
// ============================================================
function buildPulse(tasks, csws) {
  const items = [];
  const now = new Date();

  tasks.filter(t => t.status === 'Blocked').forEach(t => {
    items.push({ text: `${t.person}'s task blocked — ${t.desc.slice(0,55)}`, time: 'Today', color: 'var(--c-red)' });
  });
  csws.filter(c => c.status === 'Ongoing' && c.gravity === 'red').forEach(c => {
    items.push({ text: `${c.id} ongoing — ${c.title.slice(0,55)}`, time: 'Active', color: 'var(--c-amber)' });
  });
  tasks.filter(t => t.daysActive >= 14 && t.status !== 'Done').slice(0, 2).forEach(t => {
    items.push({ text: `${t.id} stale — ${t.daysActive} days active, ${t.person}`, time: 'Flag', color: 'var(--c-amber)' });
  });
  if (items.length === 0) {
    items.push({ text: 'No urgent activity today — all on track', time: 'System', color: 'var(--c-accent)' });
  }
  return items.slice(0, 5);
}

// ============================================================
// INIT — wire recall buttons, print view
// ============================================================
export function init() {
  window.handleRecall = async (response) => {
    const { recall } = getState();
    if (!recall) return;
    const labels = { in_place: '✔ Marked: In Place', needs_review: '⚠ Marked: Needs Review', not_implemented: '✕ Marked: Not Implemented' };
    toast(labels[response] || 'Response saved', response === 'in_place' ? 'success' : response === 'needs_review' ? 'warn' : 'error');
    // TODO Phase 3: write recall response to Firestore
    ['recall-in-place','recall-needs-review','recall-not-impl'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.disabled = true; el.style.opacity = '0.5'; }
    });
  };

  window.home = {
    printView: () => {
      toast('Print view — opens formatted summary (Phase 3)');
    }
  };
}
