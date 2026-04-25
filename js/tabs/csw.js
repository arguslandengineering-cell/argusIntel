// ============================================================
// ARGUSINTEL — TAB: CSW
// js/tabs/csw.js
// ============================================================

import { getState, toast, showModal, closeModal, addDoc, writeDoc } from '../app.js';
import { generateCSWPrompt } from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

let _editMode = false;
let _searchQuery = '';

// ============================================================
// RENDER
// ============================================================
export function render() {
  const { csws, currentRole } = getState();
  const isManager = currentRole === 'Manager';

  const filtered = csws.filter(c =>
    !_searchQuery ||
    c.title.toLowerCase().includes(_searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(_searchQuery.toLowerCase()) ||
    (c.site || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
    (c.owner || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
    (c.type || '').toLowerCase().includes(_searchQuery.toLowerCase())
  );

  return `
    <div class="module-label">TAB-03 · CSW</div>

    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.csw.openNewCSW()">+ Formal CSW</button>
      <button class="btn btn-sm ${_editMode ? 'btn-primary' : ''}"
        onclick="window.csw.toggleEditMode()">
        ${_editMode ? '◈ Edit Mode ON' : '⊞ Edit Mode'}
      </button>
    </div>

    <input class="search-input" type="text" placeholder="Search by keyword, site, owner, CSW number..."
      value="${escHtml(_searchQuery)}"
      oninput="window.csw.setSearch(this.value)" />

    <div class="filter-row">
      <select class="filter-select" onchange="window.csw.setTypeFilter(this.value)">
        <option value="">All Types</option>
        <option>Structural</option>
        <option>Environmental</option>
        <option>Geotechnical</option>
        <option>Civil</option>
        <option>Standard</option>
      </select>
      <select class="filter-select" onchange="window.csw.setStatusFilter(this.value)">
        <option value="">All Status</option>
        <option>Ongoing</option>
        <option>Pending</option>
        <option>Approved</option>
        <option>Rejected</option>
      </select>
    </div>

    <div id="csw-list">
      ${filtered.length === 0
        ? `<div class="empty-state">No CSW items match your search.</div>`
        : filtered.map(c => renderCSWCard(c, isManager)).join('')
      }
    </div>
  `;
}

// ============================================================
// CSW CARD
// ============================================================
function renderCSWCard(c, isManager) {
  const gCls = c.gravity === 'red' ? 'badge-red' : c.gravity === 'amber' ? 'badge-amber' : 'badge-green';
  const sCls = c.status === 'Approved' ? 'badge-green' : c.status === 'Rejected' ? 'badge-red' : 'badge-amber';

  return `
  <div class="task-card" id="csw-${c.id}">
    <div class="task-card-top">
      <div class="gravity-dot ${c.gravity === 'red' ? 'g-red' : c.gravity === 'amber' ? 'g-amber' : 'g-green'}"></div>
      <div style="flex:1;">
        <div class="task-desc">${escHtml(c.title)}</div>
        <div class="task-meta" style="margin-top:4px;">
          <span style="font-family:monospace;font-size:10px;">${c.id}</span>
          <span>${c.type}</span>
          <span>${c.site}</span>
          <span>${c.owner}</span>
          <span class="badge ${gCls}">Gravity</span>
          <span class="badge ${sCls}">${c.status}</span>
        </div>
      </div>
    </div>
    <div class="task-actions" style="margin-top:8px;">
      <button class="btn btn-sm" onclick="window.csw.openDetail('${c.id}')">◈ View</button>
      ${_editMode ? `<button class="btn btn-sm" onclick="window.csw.openUpdate('${c.id}')">✏ Update</button>` : ''}
      <button class="btn btn-sm" onclick="window.csw.openUpload('${c.id}')">⊟ Upload</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.csw.openManagerEdit('${c.id}')">🔒 Edit</button>` : ''}
    </div>
  </div>`;
}

// ============================================================
// DETAIL VIEW MODAL
// ============================================================
function modalDetail(cswId) {
  const { csws } = getState();
  const c = csws.find(c => c.id === cswId);
  if (!c) return '<div class="modal-title">CSW not found</div>';

  const gCls = c.gravity === 'red' ? 'badge-red' : c.gravity === 'amber' ? 'badge-amber' : 'badge-green';
  const sCls = c.status === 'Approved' ? 'badge-green' : c.status === 'Rejected' ? 'badge-red' : 'badge-amber';

  return `
    <div class="modal-title">${escHtml(c.id)} — Detail</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="badge ${gCls}">Gravity: ${c.gravity}</span>
      <span class="badge ${sCls}">${c.status}</span>
      <span class="badge badge-blue">${c.type}</span>
      <span class="badge badge-purple">${c.site}</span>
    </div>
    <div style="font-size:14px;font-weight:600;margin-bottom:12px;line-height:1.4;">${escHtml(c.title)}</div>

    <div class="section-title">Situation</div>
    <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;">${escHtml(c.situation || '—')}</div></div>

    <div class="section-title">Impact</div>
    <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;">${escHtml(c.impact || '—')}</div></div>

    <div class="section-title">Root Cause</div>
    <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;">${escHtml(c.rootCause || '—')}</div></div>

    <div class="section-title">Recommendation (3 Options)</div>
    <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;">${escHtml(c.recommendation || '—')}</div></div>

    <div class="row" style="margin-top:4px;">
      <button class="btn btn-primary btn-sm" onclick="window.csw.generateFormalPrompt('${cswId}')">◈ Generate Formal Prompt</button>
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>
  `;
}

// ============================================================
// NEW CSW FORM MODAL
// ============================================================
function modalNewCSW() {
  const prefill = (() => {
    try {
      const raw = sessionStorage.getItem('argus_prefill_csw');
      if (raw) { sessionStorage.removeItem('argus_prefill_csw'); return JSON.parse(raw); }
    } catch {}
    return {};
  })();

  return `
    <div class="modal-title">+ Formal CSW</div>
    <div class="form-group">
      <label class="form-label">Title <span style="color:var(--c-red)">*</span></label>
      <input class="form-input" id="csw-title" placeholder="Short descriptive title..." value="${escHtml(prefill.title || '')}" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" id="csw-type">
          <option>Structural</option><option>Environmental</option>
          <option>Geotechnical</option><option>Civil</option><option>Standard</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Gravity</label>
        <select class="form-select" id="csw-gravity">
          <option value="red">🔴 Red — Urgent</option>
          <option value="amber" selected>🟡 Amber — Watch</option>
          <option value="green">🟢 Green — Routine</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Site / Area</label>
        <input class="form-input" id="csw-site" placeholder="Site A / B / C / All" />
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <input class="form-input" id="csw-dept" placeholder="Planning / Engineering" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Situation <span style="color:var(--c-red)">*</span></label>
      <textarea class="form-textarea" id="csw-situation" rows="3"
        placeholder="Describe the situation clearly (any language)...">${escHtml(prefill.situation || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Impact</label>
      <textarea class="form-textarea" id="csw-impact" rows="2" placeholder="What is the risk or consequence?"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Root Cause</label>
      <textarea class="form-textarea" id="csw-rootcause" rows="2" placeholder="Why did this happen?"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Recommendation / Reference</label>
      <textarea class="form-textarea" id="csw-recommendation" rows="2" placeholder="Initial recommendation or reference standard..."></textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.csw.submitNewCSW()">◈ Save & Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// UPDATE MODAL
// ============================================================
function modalUpdate(cswId) {
  const { csws } = getState();
  const c = csws.find(c => c.id === cswId);
  if (!c) return '<div class="modal-title">CSW not found</div>';

  return `
    <div class="modal-title">✏ Update — ${c.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(c.title)}</div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="csw-upd-status">
        ${['Ongoing','Pending','Approved','Rejected'].map(s =>
          `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Feedback / Note</label>
      <textarea class="form-textarea" id="csw-upd-note" rows="3"
        placeholder="What changed? New information? Decision made?"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Does this update warrant a new CSW?</label>
      <select class="form-select" id="csw-upd-new">
        <option value="no">No — update existing</option>
        <option value="yes">Yes — generate new CSW from this</option>
      </select>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.csw.submitUpdate('${cswId}')">✔ Save Update</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// UPLOAD MODAL
// ============================================================
function modalUpload(cswId) {
  return `
    <div class="modal-title">⊟ Upload Files — ${cswId}</div>
    <div class="form-group">
      <label class="form-label">Document Type <span style="color:var(--c-red)">*</span></label>
      <select class="form-select" id="upload-type">
        <option>Draft</option>
        <option>Approved</option>
        <option>Rejected</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">File</label>
      <input type="file" class="form-input" id="upload-file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
    </div>
    <div class="notice" style="margin-top:4px;">
      Accepted: PDF, DOCX, XLSX, JPG, PNG.<br>
      <span>Incomplete metadata will be flagged to manager.</span>
    </div>
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-primary" onclick="window.csw.submitUpload('${cswId}')">⊟ Upload</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// MANAGER EDIT MODAL
// ============================================================
function modalManagerEdit(cswId) {
  const { csws } = getState();
  const c = csws.find(c => c.id === cswId);
  if (!c) return '<div class="modal-title">CSW not found</div>';

  return `
    <div class="modal-title">🔒 Manager Edit — ${c.id}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="mgr-csw-priority">
          ${['High','Medium','Low'].map(p =>
            `<option ${p === c.priority ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Gravity Override</label>
        <select class="form-select" id="mgr-csw-gravity">
          ${['red','amber','green'].map(g =>
            `<option value="${g}" ${g === c.gravity ? 'selected' : ''}>
              ${g === 'red' ? '🔴 Red' : g === 'amber' ? '🟡 Amber' : '🟢 Green'}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Manager Feedback / Notes</label>
      <textarea class="form-textarea" id="mgr-csw-feedback" rows="3"
        placeholder="Internal manager notes..."></textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.csw.submitManagerEdit('${cswId}')">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// FORMAL PROMPT MODAL
// ============================================================
function modalFormalPrompt(cswId) {
  const { csws } = getState();
  const c = csws.find(c => c.id === cswId);
  if (!c) return '<div class="modal-title">CSW not found</div>';

  const prompt = generateCSWPrompt({
    situation: c.situation,
    impact: c.impact,
    rootCause: c.rootCause,
    site: c.site,
    type: c.type,
    gravity: c.gravity,
  });

  return `
    <div class="modal-title">◈ Formal CSW Prompt — ${c.id}</div>
    <div class="notice" style="margin-bottom:10px;">
      Copy this prompt → paste into <span>Claude.ai</span> → paste result back to upload as approved document.
    </div>
    <div class="prompt-box" id="csw-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.csw.copyFormalPrompt()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;color:#888;">
      Signature block auto-included for Charles + President.<br>
      Generates 3 resolution options with cost, feasibility, safety, and capability ratings.
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================
export function init() {
  // Check for pre-fill from Work tab escalation
  const prefill = sessionStorage.getItem('argus_prefill_csw');
  if (prefill) {
    setTimeout(() => window.csw.openNewCSW(), 300);
  }

  window.csw = {
    setSearch(val) {
      _searchQuery = val;
      const list = document.getElementById('csw-list');
      if (!list) return;
      const { csws, currentRole } = getState();
      const isManager = currentRole === 'Manager';
      const filtered = csws.filter(c =>
        !_searchQuery ||
        c.title.toLowerCase().includes(_searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(_searchQuery.toLowerCase()) ||
        (c.site || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
        (c.owner || '').toLowerCase().includes(_searchQuery.toLowerCase())
      );
      list.innerHTML = filtered.length === 0
        ? `<div class="empty-state">No CSW items match your search.</div>`
        : filtered.map(c => renderCSWCard(c, isManager)).join('');
    },

    setTypeFilter(val) {
      const { csws, currentRole } = getState();
      const isManager = currentRole === 'Manager';
      const list = document.getElementById('csw-list');
      if (!list) return;
      const filtered = csws.filter(c => !val || c.type === val);
      list.innerHTML = filtered.map(c => renderCSWCard(c, isManager)).join('');
    },

    setStatusFilter(val) {
      const { csws, currentRole } = getState();
      const isManager = currentRole === 'Manager';
      const list = document.getElementById('csw-list');
      if (!list) return;
      const filtered = csws.filter(c => !val || c.status === val);
      list.innerHTML = filtered.map(c => renderCSWCard(c, isManager)).join('');
    },

    toggleEditMode() {
      _editMode = !_editMode;
      const { csws, currentRole } = getState();
      const isManager = currentRole === 'Manager';
      const list = document.getElementById('csw-list');
      if (list) list.innerHTML = csws.map(c => renderCSWCard(c, isManager)).join('');
      const btn = document.querySelectorAll('.tab-content .btn')[1];
      if (btn) {
        btn.textContent = _editMode ? '◈ Edit Mode ON' : '⊞ Edit Mode';
        btn.classList.toggle('btn-primary', _editMode);
      }
      toast(_editMode ? 'Edit Mode ON — tap Update on any CSW' : 'Edit Mode OFF', 'info');
    },

    openDetail(id)       { showModal(modalDetail(id)); },
    openNewCSW()         { showModal(modalNewCSW()); },
    openUpdate(id)       { showModal(modalUpdate(id)); },
    openUpload(id)       { showModal(modalUpload(id)); },
    openManagerEdit(id)  { showModal(modalManagerEdit(id)); },

    async generateFormalPrompt(id) {
      closeModal();
      setTimeout(() => showModal(modalFormalPrompt(id)), 150);
    },

    async copyFormalPrompt() {
      const el = document.getElementById('csw-prompt-text');
      if (!el) return;
      await copyPromptToClipboard(el.innerText);
      toast('Formal CSW prompt copied — paste into Claude.ai', 'success');
    },

    submitNewCSW() {
      const title = document.getElementById('csw-title')?.value?.trim();
      const situation = document.getElementById('csw-situation')?.value?.trim();
      if (!title || !situation) { toast('Title and Situation are required', 'error'); return; }

      const data = {
        title,
        type:           document.getElementById('csw-type')?.value,
        gravity:        document.getElementById('csw-gravity')?.value,
        site:           document.getElementById('csw-site')?.value,
        dept:           document.getElementById('csw-dept')?.value,
        situation,
        impact:         document.getElementById('csw-impact')?.value,
        rootCause:      document.getElementById('csw-rootcause')?.value,
        recommendation: document.getElementById('csw-recommendation')?.value,
        status: 'Ongoing',
        priority: 'Medium',
        createdAt: new Date().toISOString(),
      };
      addDoc('csw', data);
      toast('CSW saved — generating formal prompt...', 'success');
      closeModal();
    },

    submitUpdate(cswId) {
      const status  = document.getElementById('csw-upd-status')?.value;
      const note    = document.getElementById('csw-upd-note')?.value?.trim();
      const newCSW  = document.getElementById('csw-upd-new')?.value;
      if (!note) { toast('Please add a note', 'error'); return; }
      writeDoc('csw', cswId, { status, lastNote: note, updatedAt: new Date().toISOString() });
      if (newCSW === 'yes') {
        toast('Update saved — open + Formal CSW to create child CSW referencing this one', 'info');
      } else {
        toast('CSW updated', 'success');
      }
      closeModal();
    },

    submitUpload(cswId) {
      const type = document.getElementById('upload-type')?.value;
      const file = document.getElementById('upload-file')?.files?.[0];
      if (!file) { toast('Please select a file', 'error'); return; }
      // TODO Phase 3: upload file to Firebase Storage, save metadata to Firestore
      toast(`File "${file.name}" marked as ${type} — storage wiring in Phase 3`, 'success');
      closeModal();
    },

    submitManagerEdit(cswId) {
      const priority = document.getElementById('mgr-csw-priority')?.value;
      const gravity  = document.getElementById('mgr-csw-gravity')?.value;
      const feedback = document.getElementById('mgr-csw-feedback')?.value;
      writeDoc('csw', cswId, { priority, gravity, managerFeedback: feedback });
      toast('CSW updated by manager', 'success');
      closeModal();
    },
  };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
