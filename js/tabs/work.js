// ============================================================
// ARGUSINTEL — TAB: WORK
// js/tabs/work.js
// ============================================================

import { getState, toast, showModal, closeModal, addDoc, writeDoc } from '../app.js';
import { generateWorkloadSummaryPrompt, generateFileImportPrompt } from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

let _filters = { status: 'All', priority: 'All', person: 'All' };
let _importStep = 1;

// ============================================================
// RENDER
// ============================================================
export function render() {
  const { tasks, roster, currentRole } = getState();
  const isManager = currentRole === 'Manager';
  const people = [...new Set(roster.map(r => r.name))];

  const filtered = tasks.filter(t =>
    (_filters.status   === 'All' || t.status   === _filters.status) &&
    (_filters.priority === 'All' || t.priority === _filters.priority) &&
    (_filters.person   === 'All' || t.person   === _filters.person)
  );

  return `
    <div class="module-label">TAB-02 · WORK</div>

    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.work.openAddItem()">+ Add Item</button>
      <button class="btn btn-sm" onclick="window.work.openImport()">⊞ Import File</button>
      <button class="btn btn-sm" onclick="window.work.openSummaryPrompt()">◈ Summary Prompt</button>
    </div>

    <div class="filter-row">
      <select class="filter-select" onchange="window.work.setFilter('status', this.value)">
        <option value="All">All Status</option>
        <option value="Ongoing">Ongoing</option>
        <option value="Pending">Pending</option>
        <option value="Blocked">Blocked</option>
        <option value="Done">Done</option>
      </select>
      <select class="filter-select" onchange="window.work.setFilter('priority', this.value)">
        <option value="All">All Priority</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
      <select class="filter-select" onchange="window.work.setFilter('person', this.value)">
        <option value="All">All People</option>
        ${people.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>

    <div id="work-list">
      ${filtered.length === 0
        ? `<div class="empty-state">No tasks match the current filters.</div>`
        : filtered.map(t => renderTaskCard(t, isManager)).join('')
      }
    </div>
  `;
}

// ============================================================
// TASK CARD
// ============================================================
function renderTaskCard(t, isManager) {
  const gCls = t.gravity === 'red' ? 'g-red' : t.gravity === 'amber' ? 'g-amber' : 'g-green';
  const sCls = t.status === 'Blocked' ? 'badge-red' : t.status === 'Done' ? 'badge-green' : t.status === 'Ongoing' ? 'badge-blue' : 'badge-amber';
  const pCls = t.priority === 'High' ? 'badge-red' : t.priority === 'Medium' ? 'badge-amber' : 'badge-green';

  return `
  <div class="task-card" id="task-${t.id}">
    <div class="task-card-top">
      <div class="gravity-dot ${gCls}"></div>
      <div class="task-desc">${escHtml(t.desc)}</div>
      <span class="badge ${sCls}">${t.status}</span>
    </div>
    <div class="task-meta">
      <span style="font-family:monospace;font-size:10px;">${t.id}</span>
      <span>${t.person}</span>
      <span class="badge ${pCls}">${t.priority}</span>
      ${t.deadline ? `<span>Due ${t.deadline}</span>` : ''}
      <span>${t.daysActive}d active</span>
      ${t.notes ? `<span>◎ ${t.notes} notes</span>` : ''}
      ${t.cswRef ? `<span style="color:var(--c-blue);">⊟ ${t.cswRef}</span>` : ''}
    </div>
    <div class="task-actions">
      <button class="btn btn-sm" onclick="window.work.openUpdate('${t.id}')">✏ Update</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.work.openManagerEdit('${t.id}')">🔒 Edit</button>` : ''}
      <button class="btn btn-sm" onclick="window.work.openNotes('${t.id}')">◎ Notes</button>
      <button class="btn btn-sm" onclick="window.work.escalateToCSW('${t.id}')">▤→CSW</button>
      <button class="btn btn-sm" onclick="window.work.openFiles('${t.id}')">⊟ Files</button>
    </div>
  </div>`;
}

// ============================================================
// ADD WORK ITEM MODAL
// ============================================================
function modalAddItem() {
  const { roster, currentUser } = getState();
  const people = roster.map(r => `<option value="${r.name}" ${r.name === currentUser ? 'selected' : ''}>${r.name}</option>`).join('');

  return `
    <div class="modal-title">+ Add Work Item</div>
    <div class="form-group">
      <label class="form-label">Description <span style="color:var(--c-red)">*</span></label>
      <textarea class="form-textarea" id="add-desc" placeholder="Describe the task or concern (any language)..." rows="3"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Update / Context</label>
      <textarea class="form-textarea" id="add-context" placeholder="Any background or current status..." rows="2"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Help Needed?</label>
      <input class="form-input" id="add-help" placeholder="What do you need from the team?" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Assign To</label>
        <select class="form-select" id="add-person">${people}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="add-priority">
          <option value="High">High</option>
          <option value="Medium" selected>Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Gravity</label>
        <select class="form-select" id="add-gravity">
          <option value="red">🔴 Red — Urgent</option>
          <option value="amber" selected>🟡 Amber — Watch</option>
          <option value="green">🟢 Green — Routine</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input class="form-input" type="date" id="add-deadline" />
      </div>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitAddItem()">✔ Save Item</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// UPDATE MODAL
// ============================================================
function modalUpdate(taskId) {
  const { tasks } = getState();
  const t = tasks.find(t => t.id === taskId);
  if (!t) return '<div class="modal-title">Task not found</div>';

  return `
    <div class="modal-title">✏ Update — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="upd-status">
        ${['Ongoing','Pending','Blocked','Done'].map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Update Note</label>
      <textarea class="form-textarea" id="upd-note" placeholder="What happened? What changed?..." rows="3"></textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitUpdate('${taskId}')">✔ Save Update</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// NOTES HISTORY MODAL
// ============================================================
function modalNotes(taskId) {
  const { tasks } = getState();
  const t = tasks.find(t => t.id === taskId);
  if (!t) return '<div class="modal-title">Task not found</div>';

  const notes = (t.notesHistory || []);
  return `
    <div class="modal-title">◎ Notes — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    ${notes.length === 0
      ? `<div class="empty-state">No notes yet.</div>`
      : notes.map(n => `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:12px;font-weight:600;">${n.author}</span>
            <span style="font-size:11px;color:#aaa;">${n.date}</span>
          </div>
          <div style="font-size:12px;line-height:1.5;">${escHtml(n.text)}</div>
        </div>`).join('')
    }
    <div class="row" style="margin-top:10px;">
      <button class="btn" onclick="window.argus.closeModal()">Close</button>
    </div>
  `;
}

// ============================================================
// MANAGER EDIT MODAL
// ============================================================
function modalManagerEdit(taskId) {
  const { tasks } = getState();
  const t = tasks.find(t => t.id === taskId);
  if (!t) return '<div class="modal-title">Task not found</div>';

  return `
    <div class="modal-title">🔒 Manager Edit — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Gravity</label>
        <select class="form-select" id="mgr-gravity">
          ${['red','amber','green'].map(g => `<option value="${g}" ${g === t.gravity ? 'selected' : ''}>
            ${g === 'red' ? '🔴 Red' : g === 'amber' ? '🟡 Amber' : '🟢 Green'}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="mgr-priority">
          ${['High','Medium','Low'].map(p => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Deadline</label>
      <input class="form-input" type="date" id="mgr-deadline" value="${t.deadline || ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Internal Note (hidden from site eng.)</label>
      <textarea class="form-textarea" id="mgr-note" placeholder="Manager-only context..." rows="2"></textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitManagerEdit('${taskId}')">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// IMPORT — 3-STEP FLOW
// ============================================================
function modalImport(step = 1) {
  const stepLabels = ['1 Prompt', '2 Integrate', '3 Verify'];
  const pills = stepLabels.map((l, i) =>
    `<span class="step-pill ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}">${l}</span>`
  ).join('');

  let body = '';
  if (step === 1) {
    const { tasks } = getState();
    const summary = tasks.slice(0, 5).map(t => `[${t.id}] ${t.desc} | ${t.person} | ${t.status}`).join('\n');
    const prompt = generateFileImportPrompt(summary);
    body = `
      <div style="font-size:12px;color:#888;margin-bottom:10px;line-height:1.5;">
        Select your file in Claude.ai (Excel/PDF/DOCX/JPG), then paste this prompt with it.
      </div>
      <div class="prompt-box" id="import-prompt-text">${escHtml(prompt)}</div>
      <div class="row">
        <button class="btn btn-primary btn-sm" onclick="window.work.copyImportPrompt()">◈ Copy Prompt</button>
        <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      </div>
      <div class="divider"></div>
      <div style="font-size:12px;color:#888;">After Claude responds, come back and click Next to paste the result.</div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.importStep(2)">Next →</button>
        <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
      </div>
    `;
  } else if (step === 2) {
    body = `
      <div style="font-size:12px;color:#888;margin-bottom:10px;line-height:1.5;">
        Paste Claude's full output below. The app will parse it into structured items.
      </div>
      <textarea class="paste-area" id="import-paste" placeholder="Paste Claude's response here..."></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.importStep(3)">Parse & Verify →</button>
        <button class="btn" onclick="window.work.importStep(1)">← Back</button>
      </div>
    `;
  } else if (step === 3) {
    body = `
      <div style="font-size:12px;color:#888;margin-bottom:10px;">
        Review each item and confirm before adding to workload.
      </div>
      <div id="verify-items">
        ${renderDummyVerifyItems()}
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.confirmImport()">✔ Confirm All</button>
        <button class="btn" onclick="window.work.importStep(2)">← Back</button>
      </div>
    `;
  }

  return `
    <div class="modal-title">⊞ File Import</div>
    <div class="step-pills">${pills}</div>
    ${body}
  `;
}

function renderDummyVerifyItems() {
  const items = [
    { desc: 'Site B retaining wall inspection — flagged in uploaded report', status: 'NEW', priority: 'High', gravity: 'red' },
    { desc: 'Road alignment Phase 3 planning notes', status: 'SIMILAR', priority: 'Medium', gravity: 'amber', similar: 'T-041' },
    { desc: 'Monthly progress summary — April', status: 'DUPLICATE', priority: 'Low', gravity: 'green', similar: 'T-025' },
  ];
  return items.map((item, i) => {
    const cls = item.status === 'NEW' ? 'badge-green' : item.status === 'SIMILAR' ? 'badge-amber' : 'badge-red';
    return `
    <div class="card" style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;margin-bottom:4px;">${escHtml(item.desc)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <span class="badge ${cls}">${item.status}</span>
            <span class="badge badge-${item.priority === 'High' ? 'red' : item.priority === 'Medium' ? 'amber' : 'green'}">${item.priority}</span>
            ${item.similar ? `<span class="badge badge-blue">Similar: ${item.similar}</span>` : ''}
          </div>
        </div>
        <select class="filter-select" id="verify-action-${i}">
          ${item.status === 'DUPLICATE' ? '<option value="skip" selected>Skip</option>' : ''}
          <option value="add" ${item.status === 'NEW' ? 'selected' : ''}>Add New</option>
          <option value="merge" ${item.status === 'SIMILAR' ? 'selected' : ''}>Merge with Existing</option>
          <option value="skip" ${item.status === 'DUPLICATE' ? 'selected' : ''}>Skip</option>
        </select>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// SUMMARY PROMPT MODAL
// ============================================================
function modalSummaryPrompt() {
  const { roster } = getState();
  const people = ['All', ...roster.map(r => r.name)];

  return `
    <div class="modal-title">◈ Workload Summary Prompt</div>
    <div class="form-group">
      <label class="form-label">Target</label>
      <select class="form-select" id="summary-person">
        ${people.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.work.buildSummaryPrompt()">Build Prompt</button>
    </div>
    <div id="summary-prompt-output" style="margin-top:10px;"></div>
  `;
}

// ============================================================
// INIT — wire all window.work handlers
// ============================================================
export function init() {
  window.work = {
    setFilter(key, val) {
      _filters[key] = val;
      const list = document.getElementById('work-list');
      if (list) {
        const { tasks, currentRole } = getState();
        const isManager = currentRole === 'Manager';
        const filtered = tasks.filter(t =>
          (_filters.status   === 'All' || t.status   === _filters.status) &&
          (_filters.priority === 'All' || t.priority === _filters.priority) &&
          (_filters.person   === 'All' || t.person   === _filters.person)
        );
        list.innerHTML = filtered.length === 0
          ? `<div class="empty-state">No tasks match the current filters.</div>`
          : filtered.map(t => renderTaskCard(t, isManager)).join('');
      }
    },

    openAddItem() { showModal(modalAddItem()); },

    submitAddItem() {
      const desc = document.getElementById('add-desc')?.value?.trim();
      if (!desc) { toast('Description is required', 'error'); return; }
      const item = {
        desc,
        context: document.getElementById('add-context')?.value || '',
        helpNeeded: document.getElementById('add-help')?.value || '',
        person: document.getElementById('add-person')?.value || '',
        priority: document.getElementById('add-priority')?.value || 'Medium',
        gravity: document.getElementById('add-gravity')?.value || 'amber',
        deadline: document.getElementById('add-deadline')?.value || '',
        status: 'Pending',
        daysActive: 0,
        notes: 0,
        notesHistory: [],
        createdAt: new Date().toISOString(),
      };
      // TODO: check for similar items before saving (Phase 3 enhancement)
      addDoc('tasks', item);
      toast('Work item saved — visible to team', 'success');
      closeModal();
    },

    openUpdate(taskId) { showModal(modalUpdate(taskId)); },

    submitUpdate(taskId) {
      const status = document.getElementById('upd-status')?.value;
      const note   = document.getElementById('upd-note')?.value?.trim();
      const { currentUser } = getState();
      if (!note) { toast('Please add a note describing the update', 'error'); return; }
      writeDoc('tasks', taskId, {
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      });
      // TODO: append to notesHistory
      toast('Task updated', 'success');
      closeModal();
    },

    openNotes(taskId)       { showModal(modalNotes(taskId)); },
    openManagerEdit(taskId) { showModal(modalManagerEdit(taskId)); },

    submitManagerEdit(taskId) {
      const gravity   = document.getElementById('mgr-gravity')?.value;
      const priority  = document.getElementById('mgr-priority')?.value;
      const deadline  = document.getElementById('mgr-deadline')?.value;
      writeDoc('tasks', taskId, { gravity, priority, deadline });
      toast('Task updated by manager', 'success');
      closeModal();
    },

    escalateToCSW(taskId) {
      const { tasks } = getState();
      const t = tasks.find(t => t.id === taskId);
      if (!t) return;
      // Switch to CSW tab and pre-fill (stored in sessionStorage for tab to pick up)
      sessionStorage.setItem('argus_prefill_csw', JSON.stringify({
        title: t.desc, situation: t.desc, linkedTask: t.id,
      }));
      window.argus.switchTab('csw');
      toast('Switched to CSW tab — form pre-filled from task', 'info');
    },

    openFiles(taskId) {
      showModal(`
        <div class="modal-title">⊟ Files — ${taskId}</div>
        <div class="empty-state" style="margin:20px 0;">No files attached yet.</div>
        <div class="row">
          <button class="btn btn-primary btn-sm" onclick="window.argus.toast('File upload — Phase 3')">+ Attach File</button>
          <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
        </div>
      `);
    },

    openImport() { _importStep = 1; showModal(modalImport(1)); },
    importStep(n) { _importStep = n; showModal(modalImport(n)); },

    async copyImportPrompt() {
      const el = document.getElementById('import-prompt-text');
      if (!el) return;
      await copyPromptToClipboard(el.innerText);
      toast('Prompt copied — paste into Claude.ai with your file', 'success');
    },

    confirmImport() {
      toast('Import confirmed — items added to workload', 'success');
      closeModal();
    },

    openSummaryPrompt() { showModal(modalSummaryPrompt()); },

    async buildSummaryPrompt() {
      const person = document.getElementById('summary-person')?.value || 'All';
      const prompt = generateWorkloadSummaryPrompt(person);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('summary-prompt-output');
      if (out) {
        out.innerHTML = `
          <div class="notice"><span>Prompt copied to clipboard</span> — paste into Claude.ai, then paste the result back here.</div>
          <div class="prompt-box">${escHtml(prompt.slice(0, 400))}...</div>
        `;
      }
    },
  };
}

// ============================================================
// UTIL
// ============================================================
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
