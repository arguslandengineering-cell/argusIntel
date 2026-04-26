// ============================================================
// ARGUSINTEL — TAB: STANDARD  js/tabs/standard.js
// ============================================================
import { getState, toast, showModal, closeModal, addDoc, writeDoc } from '../app.js';
import { generateFileImportPrompt } from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

let _search = '';
let _filterSite = '';
let _filterType = '';
let _filterCat  = '';
let _importStep = 1;
let _importItems = [];

export function render() {
  const { standards, currentRole } = getState();
  const isManager = currentRole === 'Manager';

  const filtered = applyFilters(standards);
  const sites  = [...new Set(standards.map(s=>s.site).filter(Boolean))];
  const types  = [...new Set(standards.map(s=>s.type).filter(Boolean))];
  const cats   = [...new Set(standards.map(s=>s.category).filter(Boolean))];

  return `
    <div class="module-label">TAB-06 · STANDARD</div>
    <div class="row">
      ${isManager ? `<button class="btn btn-primary btn-sm" onclick="window.std.openAdd()">+ Add Standard</button>` : ''}
      <button class="btn btn-sm" onclick="window.std.openImport()">⊞ Import File</button>
      <button class="refresh-btn" onclick="window.std.refresh(this)">↺ Refresh</button>
    </div>

    <input class="search-input" type="text"
      placeholder="Search standards by keyword, type, category..."
      value="${escHtml(_search)}"
      oninput="window.std.setSearch(this.value)" />

    <div class="filter-row">
      <select class="filter-select" onchange="window.std.setSite(this.value)">
        <option value="">All Sites</option>
        ${sites.map(s=>`<option value="${s}" ${_filterSite===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="filter-select" onchange="window.std.setType(this.value)">
        <option value="">All Types</option>
        ${types.map(t=>`<option value="${t}" ${_filterType===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <select class="filter-select" onchange="window.std.setCat(this.value)">
        <option value="">All Categories</option>
        ${cats.map(c=>`<option value="${c}" ${_filterCat===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>

    <div id="std-list">
      ${filtered.length===0
        ? `<div class="empty-state">No standards match your search.</div>`
        : filtered.map(s=>stdCard(s,isManager)).join('')}
    </div>`;
}

function applyFilters(standards) {
  return standards.filter(s=>
    (!_search ||
      s.title.toLowerCase().includes(_search.toLowerCase()) ||
      (s.id||'').toLowerCase().includes(_search.toLowerCase()) ||
      (s.type||'').toLowerCase().includes(_search.toLowerCase()) ||
      (s.category||'').toLowerCase().includes(_search.toLowerCase())) &&
    (!_filterSite || (s.site||'').includes(_filterSite)) &&
    (!_filterType || s.type===_filterType) &&
    (!_filterCat  || s.category===_filterCat)
  );
}

function stdCard(s, isManager) {
  return `
  <div class="card" id="std-${s.id}" style="margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div style="flex:1;">
        <div class="card-title">${escHtml(s.title)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;">
          <span style="font-family:monospace;font-size:10px;color:var(--text3);">${s.id}</span>
          <span class="badge badge-blue">${s.type}</span>
          <span class="badge badge-purple">${s.category}</span>
          <span class="badge badge-amber">${s.site}</span>
          ${s.linkedCSW?`<span class="badge badge-green">⊟ ${s.linkedCSW}</span>`:''}
          <span class="badge ${s.status==='Active'?'badge-green':'badge-red'}">${s.status}</span>
          ${s.importAltered?`<span class="import-tag">⊞ import</span>`:''}
        </div>
      </div>
    </div>
    <div class="task-actions" style="margin-top:10px;">
      <button class="btn btn-sm" onclick="window.std.openDetail('${s.id}')">⊟ View</button>
      ${isManager?`<button class="btn btn-sm" onclick="window.std.openEdit('${s.id}')">✏ Edit</button>`:''}
      ${s.linkedCSW?`<button class="btn btn-sm" onclick="window.argus.switchTab('csw')">◈ View CSW</button>`:''}
    </div>
  </div>`;
}

// ── DETAIL MODAL ──
function modalDetail(id) {
  const { standards } = getState();
  const s = standards.find(s=>s.id===id);
  if (!s) return '<div class="modal-title">Standard not found</div>';
  return `
    <div class="modal-title">${s.id} — Standard Detail</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="badge badge-blue">${s.type}</span>
      <span class="badge badge-purple">${s.category}</span>
      <span class="badge badge-amber">${s.site}</span>
      <span class="badge ${s.status==='Active'?'badge-green':'badge-red'}">${s.status}</span>
    </div>
    <div style="font-size:15px;font-weight:600;margin-bottom:14px;line-height:1.4;color:var(--text);">${escHtml(s.title)}</div>
    ${s.description?`<div class="section-title">Description</div>
      <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;color:var(--text);">${escHtml(s.description)}</div></div>`:''}
    ${s.requirement?`<div class="section-title">Requirement</div>
      <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;color:var(--text);">${escHtml(s.requirement)}</div></div>`:''}
    ${s.reference?`<div class="section-title">Reference / Code</div>
      <div class="card" style="margin-bottom:10px;"><div style="font-size:12px;line-height:1.6;color:var(--text);">${escHtml(s.reference)}</div></div>`:''}
    ${s.linkedCSW?`<div class="notice">Linked to <span>${s.linkedCSW}</span></div>`:''}
    <div class="row" style="margin-top:6px;">
      ${s.linkedCSW?`<button class="btn btn-primary btn-sm" onclick="window.argus.closeModal();window.argus.switchTab('csw')">◈ View ${s.linkedCSW}</button>`:''}
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>`;
}

// ── ADD STANDARD MODAL (manager) ──
function modalAdd() {
  const { csws } = getState();
  return `
    <div class="modal-title">+ Add Standard</div>
    <div class="form-group"><label class="form-label">Title *</label>
      <input class="form-input" id="std-title" placeholder="Standard name..." /></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-select" id="std-type">
          <option>Structural</option><option>Environmental</option>
          <option>Geotechnical</option><option>Civil</option><option>Standard</option>
        </select></div>
      <div class="form-group"><label class="form-label">Category</label>
        <input class="form-input" id="std-cat" placeholder="Compliance, Design..." /></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group"><label class="form-label">Site</label>
        <input class="form-input" id="std-site" placeholder="All / Site A..." /></div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="std-status">
          <option>Active</option><option>Inactive</option>
        </select></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea class="form-textarea" id="std-desc" rows="2" placeholder="What does this standard cover?"></textarea></div>
    <div class="form-group"><label class="form-label">Requirement</label>
      <textarea class="form-textarea" id="std-req" rows="2" placeholder="Specific values, minimums, or conditions..."></textarea></div>
    <div class="form-group"><label class="form-label">Reference / Code</label>
      <input class="form-input" id="std-ref" placeholder="DPWH section, NSCP clause, internal code..." /></div>
    <div class="form-group"><label class="form-label">Link to CSW (optional)</label>
      <select class="form-select" id="std-csw">
        <option value="">— None —</option>
        ${csws.map(c=>`<option value="${c.id}">${c.id} — ${c.title.slice(0,40)}</option>`).join('')}
      </select></div>
    <div class="row" style="margin-top:8px;">
      <button class="btn btn-primary" onclick="window.std.submitAdd()">✔ Save Standard</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

// ── EDIT MODAL (manager) ──
function modalEdit(id) {
  const { standards } = getState();
  const s = standards.find(s=>s.id===id);
  if (!s) return '<div class="modal-title">Not found</div>';
  return `
    <div class="modal-title">✏ Edit Standard — ${s.id}</div>
    <div class="form-group"><label class="form-label">Status</label>
      <select class="form-select" id="edit-std-status">
        ${['Active','Inactive'].map(v=>`<option ${v===s.status?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Requirement (update)</label>
      <textarea class="form-textarea" id="edit-std-req" rows="3">${escHtml(s.requirement||'')}</textarea></div>
    <div class="form-group"><label class="form-label">Reference</label>
      <input class="form-input" id="edit-std-ref" value="${escHtml(s.reference||'')}" /></div>
    <div class="row" style="margin-top:8px;">
      <button class="btn btn-primary" onclick="window.std.submitEdit('${id}')">✔ Save Changes</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

// ── IMPORT — 3-STEP MODAL (same pattern as Work import) ──
function modalImport(step) {
  const pills = ['1 Prompt','2 Integrate','3 Verify & Sort'].map((l,i)=>
    `<span class="step-pill ${i+1===step?'active':i+1<step?'done':''}">${l}</span>`).join('');

  if (step===1) {
    const { standards } = getState();
    const summary = standards.slice(0,5).map(s=>`[${s.id}] ${s.title} | ${s.type} | ${s.status}`).join('\n');
    const prompt = generateFileImportPrompt(summary);
    return `
      <div class="modal-title">⊞ Import Standards</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Select your standards file in Claude.ai (PDF/DOCX/Excel), then paste this prompt together with it.</div>
      <div class="prompt-box" id="std-import-prompt">${escHtml(prompt)}</div>
      <div class="row">
        <button class="btn btn-primary btn-sm" onclick="window.std.copyImportPrompt()">◈ Copy Prompt</button>
        <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      </div>
      <div class="divider"></div>
      <div class="row" style="margin-top:4px;">
        <button class="btn btn-primary" onclick="window.std.importStep(2)">Next →</button>
        <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
      </div>`;
  }

  if (step===2) {
    return `
      <div class="modal-title">⊞ Import Standards — Integrate</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Paste Claude's full output below.</div>
      <textarea class="paste-area" id="std-import-paste" placeholder="Paste Claude's response here..."></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.std.parseAndVerify()">Parse & Verify →</button>
        <button class="btn" onclick="window.std.importStep(1)">← Back</button>
      </div>`;
  }

  if (step===3) {
    const items = _importItems.length ? _importItems : getDummyStdItems();
    return `
      <div class="modal-title">⊞ Import Standards — Verify & Sort</div>
      <div class="step-pills">${pills}</div>
      <div class="notice"><span>${items.length} item${items.length!==1?'s':''} found.</span>
        Merge adds a note to existing, New creates a fresh standard record.
      </div>
      <div id="std-verify-items">
        ${items.map((item,i)=>`
          <div class="card" style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text);">${escHtml(item.title)}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge ${item.status==='NEW'?'badge-green':'badge-amber'}">${item.status}</span>
              ${item.similar?`<span class="badge badge-blue">Similar: ${item.similar}</span>`:''}
              ${item.metaWarning?`<span class="badge badge-amber">⚠ unclear metadata</span>`:''}
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <select class="filter-select" id="std-verify-action-${i}" style="flex:1;">
                ${item.status==='SIMILAR'
                  ?`<option value="merge" selected>Merge — add as note to existing</option>
                    <option value="new">New — create separate record</option>`
                  :`<option value="new" selected>New — create record</option>
                    <option value="merge">Merge — add as note to existing</option>`}
              </select>
              <input class="form-input" id="std-verify-ref-${i}"
                value="${item.similar||''}" placeholder="${item.status==='SIMILAR'?'Existing ID':'Type...'}"
                style="width:90px;flex:none;" />
            </div>
          </div>`).join('')}
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.std.confirmImport(${items.length})">✔ Confirm All</button>
        <button class="btn" onclick="window.std.importStep(2)">← Back</button>
      </div>`;
  }
}

function getDummyStdItems() {
  return [
    { title:'Slope setback minimum — 1:1.5 ratio for cut slopes', status:'NEW', metaWarning:false },
    { title:'Drainage buffer standard — 5m minimum from boundary', status:'SIMILAR', similar:'STD-001', metaWarning:false },
    { title:'Foundation depth requirement — author not specified', status:'NEW', metaWarning:true },
  ];
}

export function init() {
  window.std = {
    refresh(btn) {
      if(btn){btn.classList.add('spinning');setTimeout(()=>btn.classList.remove('spinning'),600);}
      import('../app.js').then(m=>m.refreshTab());
      toast('Standard library refreshed','success');
    },

    setSearch(val)  { _search=val;      rerender(); },
    setSite(val)    { _filterSite=val;  rerender(); },
    setType(val)    { _filterType=val;  rerender(); },
    setCat(val)     { _filterCat=val;   rerender(); },

    openDetail(id)  { showModal(modalDetail(id)); },
    openAdd()       { showModal(modalAdd()); },
    openEdit(id)    { showModal(modalEdit(id)); },
    openImport()    { _importItems=[]; _importStep=1; showModal(modalImport(1)); },
    importStep(n)   { _importStep=n; showModal(modalImport(n)); },

    submitAdd() {
      const title = document.getElementById('std-title')?.value?.trim();
      if (!title) { toast('Title is required','error'); return; }
      addDoc('standards',{
        title,
        type:        document.getElementById('std-type')?.value,
        category:    document.getElementById('std-cat')?.value,
        site:        document.getElementById('std-site')?.value||'All',
        status:      document.getElementById('std-status')?.value||'Active',
        description: document.getElementById('std-desc')?.value,
        requirement: document.getElementById('std-req')?.value,
        reference:   document.getElementById('std-ref')?.value,
        linkedCSW:   document.getElementById('std-csw')?.value||null,
        createdAt:   new Date().toISOString(),
      });
      toast('Standard added to library','success');
      closeModal();
    },

    submitEdit(id) {
      const status = document.getElementById('edit-std-status')?.value;
      const req    = document.getElementById('edit-std-req')?.value;
      const ref    = document.getElementById('edit-std-ref')?.value;
      writeDoc('standards', id, { status, requirement:req, reference:ref, updatedAt:new Date().toISOString() });
      toast('Standard updated','success');
      closeModal();
    },

    async copyImportPrompt() {
      const el = document.getElementById('std-import-prompt');
      if (el) { await copyPromptToClipboard(el.innerText); toast('Prompt copied — paste into Claude.ai with your file','success'); }
    },

    parseAndVerify() {
      const raw = document.getElementById('std-import-paste')?.value?.trim();
      if (!raw) { toast('Paste Claude\'s response first','error'); return; }
      const lines = raw.split('\n').filter(l=>l.match(/^\d+\./));
      _importItems = lines.map(l=>({
        title: l.replace(/^\d+\.\s*/,'').split('|')[0].trim().slice(0,120),
        status: l.toLowerCase().includes('similar')?'SIMILAR':'NEW',
        similar: (l.match(/STD-\d+/)||[])[0]||'',
        metaWarning: l.toLowerCase().includes('unclear')||l.toLowerCase().includes('not specified'),
      }));
      if (!_importItems.length) {
        _importItems = getDummyStdItems();
        toast('Could not parse — showing sample layout','warn');
      }
      showModal(modalImport(3));
    },

    confirmImport(total) {
      let merged=0, created=0;
      for (let i=0; i<total; i++) {
        const action = document.getElementById(`std-verify-action-${i}`)?.value;
        const ref    = document.getElementById(`std-verify-ref-${i}`)?.value?.trim();
        const item   = _importItems[i];
        if (!item) continue;
        if (action==='merge'&&ref) {
          writeDoc('standards', ref, {
            importAltered: true,
            lastImportNote: `Merged from import: ${item.title}`,
            updatedAt: new Date().toISOString(),
          });
          merged++;
        } else {
          addDoc('standards',{
            title: item.title, type:'Standard', category:'Import',
            site:'All', status:'Active',
            importAltered: true,
            description: `Added via file import${item.metaWarning?' — metadata unclear, please review':''}.`,
            createdAt: new Date().toISOString(),
          });
          created++;
        }
      }
      toast(`Import done — ${created} new, ${merged} merged`,'success');
      closeModal();
    },
  };
}

function rerender() {
  const { standards, currentRole } = getState();
  const isManager = currentRole==='Manager';
  const list = document.getElementById('std-list');
  if (!list) return;
  const filtered = applyFilters(standards);
  list.innerHTML = filtered.length===0
    ? `<div class="empty-state">No standards match your search.</div>`
    : filtered.map(s=>stdCard(s,isManager)).join('');
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
