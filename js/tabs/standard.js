// ============================================================
// ARGUSINTEL — TAB: STANDARD
// js/tabs/standard.js
// ============================================================

import { getState, toast, showModal, closeModal, addDoc } from '../app.js';

let _searchQuery = '';
let _filterSite = '';
let _filterType = '';
let _filterCat  = '';

// ============================================================
// RENDER
// ============================================================
export function render() {
  const { standards, currentRole } = getState();
  const isManager = currentRole === 'Manager';

  const filtered = standards.filter(s =>
    (!_searchQuery ||
      s.title.toLowerCase().includes(_searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
      (s.type || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(_searchQuery.toLowerCase())
    ) &&
    (!_filterSite || (s.site || '').includes(_filterSite)) &&
    (!_filterType || s.type === _filterType) &&
    (!_filterCat  || s.category === _filterCat)
  );

  const sites      = [...new Set(standards.map(s => s.site).filter(Boolean))];
  const types      = [...new Set(standards.map(s => s.type).filter(Boolean))];
  const categories = [...new Set(standards.map(s => s.category).filter(Boolean))];

  return `
    <div class="module-label">TAB-06 · STANDARD</div>

    ${isManager ? `
    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.std.openAddStandard()">+ Add Standard</button>
    </div>` : ''}

    <input class="search-input" type="text"
      placeholder="Search standards by keyword, type, category..."
      value="${escHtml(_searchQuery)}"
      oninput="window.std.setSearch(this.value)" />

    <div class="filter-row">
      <select class="filter-select" onchange="window.std.setSiteFilter(this.value)">
        <option value="">All Sites</option>
        ${sites.map(s => `<option value="${s}" ${_filterSite === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select class="filter-select" onchange="window.std.setTypeFilter(this.value)">
        <option value="">All Types</option>
        ${types.map(t => `<option value="${t}" ${_filterType === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      <select class="filter-select" onchange="window.std.setCatFilter(this.value)">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c}" ${_filterCat === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>

    <div id="std-list">
      ${filtered.length === 0
        ? `<div class="empty-state">No standards match your search.</div>`
        : filtered.map(s => renderStandardCard(s, isManager)).join('')
      }
    </div>
  `;
}

// ============================================================
// STANDARD CARD
// ============================================================
function renderStandardCard(s, isManager) {
  return `
  <div class="card" id="std-${s.id}" style="margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="flex:1;">
        <div class="card-title">${escHtml(s.title)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;">
          <span style="font-family:monospace;font-size:10px;color:#888;">${s.id}</span>
          <span class="badge badge-blue">${s.type}</span>
          <span class="badge badge-purple">${s.category}</span>
          <span class="badge badge-amber">${s.site}</span>
          ${s.linkedCSW ? `<span class="badge badge-green">⊟ ${s.linkedCSW}</span>` : ''}
          <span class="badge ${s.status === 'Active' ? 'badge-green' : 'badge-red'}">${s.status}</span>
        </div>
      </div>
    </div>
    <div class="task-actions" style="margin-top:10px;">
      <button class="btn btn-sm" onclick="window.std.openDetail('${s.id}')">⊟ View</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.std.openEdit('${s.id}')">✏ Edit</button>` : ''}
      ${s.linkedCSW ? `<button class="btn btn-sm" onclick="window.argus.switchTab('csw')">◈ View CSW</button>` : ''}
    </div>
  </div>`;
}

// ============================================================
// DETAIL MODAL
// ============================================================
function modalDetail(stdId) {
  const { standards } = getState();
  const s = standards.find(s => s.id === stdId);
  if (!s) return '<div class="modal-title">Standard not found</div>';

  return `
    <div class="modal-title">${escHtml(s.id)} — Standard Detail</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="badge badge-blue">${s.type}</span>
      <span class="badge badge-purple">${s.category}</span>
      <span class="badge badge-amber">${s.site}</span>
      <span class="badge ${s.status === 'Active' ? 'badge-green' : 'badge-red'}">${s.status}</span>
    </div>
    <div style="font-size:15px;font-weight:600;margin-bottom:14px;line-height:1.4;">${escHtml(s.title)}</div>

    ${s.description ? `
      <div class="section-title">Description</div>
      <div class="card" style="margin-bottom:10px;">
        <div style="font-size:12px;line-height:1.6;">${escHtml(s.description)}</div>
      </div>
    ` : ''}

    ${s.requirement ? `
      <div class="section-title">Requirement</div>
      <div class="card" style="margin-bottom:10px;">
        <div style="font-size:12px;line-height:1.6;">${escHtml(s.requirement)}</div>
      </div>
    ` : ''}

    ${s.reference ? `
      <div class="section-title">Reference / Code</div>
      <div class="card" style="margin-bottom:10px;">
        <div style="font-size:12px;line-height:1.6;">${escHtml(s.reference)}</div>
      </div>
    ` : ''}

    ${s.linkedCSW ? `
      <div class="notice" style="margin-bottom:10px;">
        Linked to <span>${s.linkedCSW}</span> — tap to view CSW record
      </div>
    ` : ''}

    <div class="row" style="margin-top:6px;">
      ${s.linkedCSW ? `<button class="btn btn-primary btn-sm" onclick="window.argus.closeModal();window.argus.switchTab('csw')">◈ View ${s.linkedCSW}</button>` : ''}
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>
  `;
}

// ============================================================
// ADD STANDARD MODAL (manager)
// ============================================================
function modalAddStandard() {
  const { csws } = getState();
  const cswOptions = csws.map(c => `<option value="${c.id}">${c.id} — ${c.title.slice(0,40)}</option>`).join('');

  return `
    <div class="modal-title">+ Add Standard</div>
    <div class="form-group">
      <label class="form-label">Title <span style="color:var(--c-red)">*</span></label>
      <input class="form-input" id="std-title" placeholder="Standard name..." />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" id="std-type">
          <option>Structural</option><option>Environmental</option>
          <option>Geotechnical</option><option>Civil</option><option>Standard</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input class="form-input" id="std-category" placeholder="e.g. Compliance, Design..." />
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group">
        <label class="form-label">Site</label>
        <input class="form-input" id="std-site" placeholder="All / Site A / Site B..." />
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="std-status">
          <option>Active</option><option>Inactive</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="std-description" rows="2"
        placeholder="What does this standard cover?"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Requirement</label>
      <textarea class="form-textarea" id="std-requirement" rows="2"
        placeholder="Specific values, minimums, or conditions required..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Reference / Code</label>
      <input class="form-input" id="std-reference" placeholder="DPWH section, NSCP clause, internal code..." />
    </div>
    <div class="form-group">
      <label class="form-label">Link to CSW (optional)</label>
      <select class="form-select" id="std-csw">
        <option value="">— None —</option>
        ${cswOptions}
      </select>
    </div>
    <div class="row" style="margin-top:8px;">
      <button class="btn btn-primary" onclick="window.std.submitAddStandard()">✔ Save Standard</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// EDIT MODAL (manager)
// ============================================================
function modalEdit(stdId) {
  const { standards } = getState();
  const s = standards.find(s => s.id === stdId);
  if (!s) return '<div class="modal-title">Standard not found</div>';

  return `
    <div class="modal-title">✏ Edit Standard — ${s.id}</div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="edit-std-status">
        ${['Active','Inactive'].map(v => `<option ${v === s.status ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Requirement (update)</label>
      <textarea class="form-textarea" id="edit-std-req" rows="3">${escHtml(s.requirement || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Reference</label>
      <input class="form-input" id="edit-std-ref" value="${escHtml(s.reference || '')}" />
    </div>
    <div class="row" style="margin-top:8px;">
      <button class="btn btn-primary" onclick="window.std.submitEdit('${stdId}')">✔ Save Changes</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================
export function init() {
  window.std = {
    setSearch(val) {
      _searchQuery = val;
      refreshList();
    },
    setSiteFilter(val) { _filterSite = val; refreshList(); },
    setTypeFilter(val) { _filterType = val; refreshList(); },
    setCatFilter(val)  { _filterCat  = val; refreshList(); },

    openDetail(id)       { showModal(modalDetail(id)); },
    openAddStandard()    { showModal(modalAddStandard()); },
    openEdit(id)         { showModal(modalEdit(id)); },

    submitAddStandard() {
      const title = document.getElementById('std-title')?.value?.trim();
      if (!title) { toast('Title is required', 'error'); return; }
      const data = {
        title,
        type:        document.getElementById('std-type')?.value,
        category:    document.getElementById('std-category')?.value,
        site:        document.getElementById('std-site')?.value || 'All',
        status:      document.getElementById('std-status')?.value || 'Active',
        description: document.getElementById('std-description')?.value,
        requirement: document.getElementById('std-requirement')?.value,
        reference:   document.getElementById('std-reference')?.value,
        linkedCSW:   document.getElementById('std-csw')?.value || null,
        createdAt:   new Date().toISOString(),
      };
      addDoc('standards', data);
      toast('Standard added to library', 'success');
      closeModal();
    },

    submitEdit(id) {
      const status  = document.getElementById('edit-std-status')?.value;
      const req     = document.getElementById('edit-std-req')?.value;
      const ref     = document.getElementById('edit-std-ref')?.value;
      const { writeDoc } = window._argusDb || {};
      // Use app.js writeDoc
      import('../app.js').then(m => {
        m.writeDoc('standards', id, { status, requirement: req, reference: ref });
        toast('Standard updated', 'success');
        closeModal();
      });
    },
  };
}

// ============================================================
// REFRESH LIST IN PLACE
// ============================================================
function refreshList() {
  const list = document.getElementById('std-list');
  if (!list) return;
  const { standards, currentRole } = getState();
  const isManager = currentRole === 'Manager';
  const filtered = standards.filter(s =>
    (!_searchQuery ||
      s.title.toLowerCase().includes(_searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(_searchQuery.toLowerCase()) ||
      (s.type || '').toLowerCase().includes(_searchQuery.toLowerCase())
    ) &&
    (!_filterSite || (s.site || '').includes(_filterSite)) &&
    (!_filterType || s.type === _filterType) &&
    (!_filterCat  || s.category === _filterCat)
  );
  list.innerHTML = filtered.length === 0
    ? `<div class="empty-state">No standards match your search.</div>`
    : filtered.map(s => renderStandardCard(s, isManager)).join('');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
