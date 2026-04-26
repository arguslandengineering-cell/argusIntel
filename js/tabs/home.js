// ============================================================
// ARGUSINTEL — TAB: HOME  js/tabs/home.js
// ============================================================
import { getState, toast } from '../app.js';

export function render() {
  const { currentRole, currentUser, tasks, csws, recall, digest, versionTest } = getState();
  if (currentRole === 'Site Admin') return renderSite(currentUser, tasks, versionTest);
  return renderCore(currentRole, currentUser, tasks, csws, recall, digest, versionTest);
}

function renderCore(role, user, tasks, csws, recall, digest, versionTest) {
  const isManager = role === 'Manager';
  const today = new Date().toLocaleDateString('en-PH', { weekday:'long', month:'short', day:'numeric' });
  const now = new Date();
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const upcoming = tasks
    .filter(t => t.status !== 'Done' && t.deadline)
    .map(t => ({ ...t, dueDate: new Date(t.deadline) }))
    .filter(t => t.dueDate >= now && t.dueDate <= in7)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 4);
  const pulse = buildPulse(tasks, csws);

  return `
    <div class="module-label">TAB-01 · HOME</div>

    ${versionTest ? `<div class="notice" style="border-color:#EF9F2744;background:var(--card-bg);">
      <span style="color:var(--c-amber);">⚠ Version Test Mode ON</span> — dummy data active across all tabs
    </div>` : ''}

    ${digest && digest.published ? `
    <div class="card" style="border-left:3px solid var(--c-accent);cursor:pointer;" onclick="window.argus.switchTab('daily')">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="card-title">Today's Digest</div>
        <span class="badge badge-green">Published</span>
      </div>
      <div class="card-sub" style="margin-top:4px;">${today} — Tap to read</div>
    </div>` : ''}

    ${recall ? `
    <div class="recall-card">
      <div class="recall-label">◎ CSW RECALL — ${recall.id}</div>
      <div class="recall-q">${escHtml(recall.question)}</div>
      <div class="recall-actions">
        <button class="r-btn" style="color:#0b6e50;" onclick="handleRecall('in_place')">✔ In Place</button>
        <button class="r-btn" style="color:#8a560a;" onclick="handleRecall('needs_review')">⚠ Needs Review</button>
        <button class="r-btn" style="color:#b83130;" onclick="handleRecall('not_implemented')">✕ Not Implemented</button>
      </div>
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div class="section-title" style="margin:0;">Pulse — Today</div>
      <button class="refresh-btn" onclick="window.home.refresh(this)">↺ Refresh</button>
    </div>
    <div id="pulse-list">
      ${pulse.map(p => `
        <div class="pulse-item">
          <div class="pulse-dot" style="background:${p.color}"></div>
          <div><div class="pulse-text">${escHtml(p.text)}</div><div class="pulse-time">${p.time}</div></div>
        </div>`).join('')}
    </div>

    <div class="divider"></div>
    <div class="section-title">Upcoming Deadlines — Next 7 Days</div>
    ${upcoming.length === 0
      ? `<div class="empty-state">No deadlines in the next 7 days</div>`
      : upcoming.map(t => {
          const d = Math.ceil((t.dueDate - now) / 86400000);
          const cls = d <= 2 ? 'badge-red' : d <= 4 ? 'badge-amber' : 'badge-green';
          return `<div class="card" style="cursor:pointer;" onclick="window.argus.switchTab('work')">
            <div class="card-title">${escHtml(t.desc)}</div>
            <div class="task-meta" style="margin-top:5px;">
              <span class="badge ${cls}">${d}d left</span>
              <span>${t.person}</span>
            </div>
          </div>`;
        }).join('')}

    <div class="divider"></div>
    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.argus.switchTab('work')">+ Report Work</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.argus.switchTab('daily')">◉ Build Digest</button>` : ''}
      <button class="btn btn-sm" onclick="window.home.printView()">⊟ Print View</button>
    </div>`;
}

function renderSite(user, tasks, versionTest) {
  const myTasks = tasks.filter(t => t.person === user);
  const ongoing = myTasks.filter(t => t.status === 'Ongoing').length;
  const blocked  = myTasks.filter(t => t.status === 'Blocked').length;
  const done     = myTasks.filter(t => t.status === 'Done').length;

  return `
    <div class="module-label">TAB-01 · HOME · SITE ADMIN</div>
    ${versionTest ? `<div class="notice"><span style="color:var(--c-amber);">⚠ Test Mode</span></div>` : ''}
    <div class="card">
      <div class="card-title">Welcome, ${escHtml(user)}</div>
      <div class="card-sub">Site Admin · ${new Date().toLocaleDateString('en-PH',{weekday:'long',month:'short',day:'numeric'})}</div>
      <div class="metric-row" style="margin-top:10px;">
        <div class="metric"><div class="metric-val" style="color:var(--c-blue)">${ongoing}</div><div class="metric-lbl">Ongoing</div></div>
        <div class="metric"><div class="metric-val" style="color:var(--c-red)">${blocked}</div><div class="metric-lbl">Blocked</div></div>
        <div class="metric"><div class="metric-val" style="color:var(--c-accent)">${done}</div><div class="metric-lbl">Done</div></div>
      </div>
    </div>
    <div class="row" style="margin-top:4px;">
      <button class="btn btn-primary btn-sm" onclick="window.argus.switchTab('work')">+ Add Work</button>
      <button class="btn btn-sm" onclick="window.argus.switchTab('csw')">+ CSW</button>
      <button class="refresh-btn" onclick="window.home.refresh(this)">↺ Refresh</button>
    </div>
    <div class="section-title" style="margin-top:14px;">My Recent Work</div>
    ${myTasks.slice(0,3).map(t => {
      const cls = t.status==='Done'?'badge-green':t.status==='Blocked'?'badge-red':t.status==='Ongoing'?'badge-blue':'badge-amber';
      return `<div class="task-card">
        <div class="task-desc">${escHtml(t.desc)}</div>
        <div class="task-meta" style="margin-top:5px;"><span class="badge ${cls}">${t.status}</span><span>${t.deadline||''}</span></div>
      </div>`;
    }).join('') || `<div class="empty-state">No tasks yet — tap + Add Work</div>`}`;
}

function buildPulse(tasks, csws) {
  const items = [];
  tasks.filter(t => t.status === 'Blocked').forEach(t =>
    items.push({ text: `${t.person}'s task blocked — ${t.desc.slice(0,55)}`, time: 'Today', color: 'var(--c-red)' }));
  csws.filter(c => c.gravity === 'red' && c.status === 'Ongoing').forEach(c =>
    items.push({ text: `${c.id} ongoing — ${c.title.slice(0,55)}`, time: 'Active', color: 'var(--c-amber)' }));
  tasks.filter(t => t.daysActive >= 14 && t.status !== 'Done').slice(0,2).forEach(t =>
    items.push({ text: `${t.id} stale — ${t.daysActive} days active, ${t.person}`, time: 'Flag', color: 'var(--c-amber)' }));
  if (!items.length)
    items.push({ text: 'No urgent activity today — all on track', time: 'System', color: 'var(--c-accent)' });
  return items.slice(0, 5);
}

export function init() {
  window.handleRecall = (response) => {
    const labels = { in_place:'✔ Marked: In Place', needs_review:'⚠ Marked: Needs Review', not_implemented:'✕ Marked: Not Implemented' };
    toast(labels[response], response==='in_place'?'success':response==='needs_review'?'warn':'error');
    document.querySelectorAll('.r-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
  };
  window.home = {
    refresh(btn) {
      if (btn) { btn.classList.add('spinning'); setTimeout(() => btn.classList.remove('spinning'), 600); }
      import('../app.js').then(m => m.refreshTab());
      toast('Refreshed', 'success');
    },
    printView() { toast('Print view — Phase 3'); },
  };
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
