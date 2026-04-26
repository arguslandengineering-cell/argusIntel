// ============================================================
// ARGUSINTEL — TAB: WORK  js/tabs/work.js
// ============================================================
import { getState, toast, showModal, closeModal, addDoc, writeDoc } from '../app.js';
import { generateWorkloadSummaryPrompt, generateFileImportPrompt } from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

let _filters = { status:'All', priority:'All', person:'All' };
let _importStep = 1;
let _importItems = [];   // parsed items from step 2 paste

export function render() {
  const { tasks, roster, currentRole } = getState();
  const isManager = currentRole === 'Manager';
  const people = [...new Set(roster.map(r => r.name))];
  const filtered = applyFilters(tasks);

  return `
    <div class="module-label">TAB-02 · WORK</div>
    <div class="row">
      <button class="btn btn-primary btn-sm" onclick="window.work.openAddItem()">+ Add Item</button>
      <button class="btn btn-sm" onclick="window.work.openImport()">⊞ Import File</button>
      ${isManager ? `<button class="btn btn-sm" onclick="window.work.openSummaryPrompt()">◈ Summary Prompt</button>` : ''}
      <button class="refresh-btn" onclick="window.work.refresh(this)">↺ Refresh</button>
    </div>

    <div class="filter-row">
      <select class="filter-select" onchange="window.work.setFilter('status',this.value)">
        <option value="All">All Status</option>
        <option>Ongoing</option><option>Pending</option><option>Blocked</option><option>Done</option>
      </select>
      <select class="filter-select" onchange="window.work.setFilter('priority',this.value)">
        <option value="All">All Priority</option>
        <option>High</option><option>Medium</option><option>Low</option>
      </select>
      <select class="filter-select" onchange="window.work.setFilter('person',this.value)">
        <option value="All">All People</option>
        ${people.map(p=>`<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>

    <div id="work-list">
      ${filtered.length === 0
        ? `<div class="empty-state">No tasks match the current filters.</div>`
        : filtered.map(t => taskCard(t, isManager)).join('')}
    </div>`;
}

function applyFilters(tasks) {
  return tasks.filter(t =>
    (_filters.status   === 'All' || t.status   === _filters.status) &&
    (_filters.priority === 'All' || t.priority === _filters.priority) &&
    (_filters.person   === 'All' || t.person   === _filters.person)
  );
}

function taskCard(t, isManager) {
  const gCls = t.gravity==='red'?'g-red':t.gravity==='amber'?'g-amber':'g-green';
  const sCls = t.status==='Blocked'?'badge-red':t.status==='Done'?'badge-green':t.status==='Ongoing'?'badge-blue':'badge-amber';
  const pCls = t.priority==='High'?'badge-red':t.priority==='Medium'?'badge-amber':'badge-green';
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
      ${t.deadline?`<span>Due ${t.deadline}</span>`:''}
      <span>${t.daysActive}d active</span>
      ${t.notes?`<span>◎ ${t.notes} notes</span>`:''}
      ${t.importAltered?`<span class="import-tag">⊞ import</span>`:''}
      ${t.cswRef?`<span style="color:var(--c-blue);">⊟ ${t.cswRef}</span>`:''}
    </div>
    <div class="task-actions">
      <button class="btn btn-sm" onclick="window.work.openUpdate('${t.id}')">✏ Update</button>
      ${isManager?`<button class="btn btn-sm" onclick="window.work.openManagerEdit('${t.id}')">🔒 Edit</button>`:''}
      <button class="btn btn-sm" onclick="window.work.openNotes('${t.id}')">◎ Notes</button>
      <button class="btn btn-sm" onclick="window.work.escalateToCSW('${t.id}')">▤→CSW</button>
      <button class="btn btn-sm" onclick="window.work.openFiles('${t.id}')">⊟ Files</button>
    </div>
  </div>`;
}

// ── ADD ITEM MODAL ──
function modalAddItem() {
  const { roster, currentUser } = getState();
  const people = roster.map(r=>`<option value="${r.name}" ${r.name===currentUser?'selected':''}>${r.name}</option>`).join('');
  return `
    <div class="modal-title">+ Add Work Item</div>
    <div class="form-group">
      <label class="form-label">Description *</label>
      <textarea class="form-textarea" id="add-desc" placeholder="Describe the task or concern..." rows="3"></textarea>
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
      <div class="form-group"><label class="form-label">Assign To</label>
        <select class="form-select" id="add-person">${people}</select></div>
      <div class="form-group"><label class="form-label">Priority</label>
        <select class="form-select" id="add-priority">
          <option>High</option><option selected>Medium</option><option>Low</option>
        </select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group"><label class="form-label">Gravity</label>
        <select class="form-select" id="add-gravity">
          <option value="red">🔴 Red — Urgent</option>
          <option value="amber" selected>🟡 Amber — Watch</option>
          <option value="green">🟢 Green — Routine</option>
        </select></div>
      <div class="form-group"><label class="form-label">End Date</label>
        <input class="form-input" type="date" id="add-deadline" /></div>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitAddItem()">✔ Save Item</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

// ── UPDATE MODAL ──
function modalUpdate(id) {
  const { tasks } = getState();
  const t = tasks.find(t=>t.id===id);
  if (!t) return '<div class="modal-title">Task not found</div>';
  return `
    <div class="modal-title">✏ Update — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    <div class="form-group"><label class="form-label">Status</label>
      <select class="form-select" id="upd-status">
        ${['Ongoing','Pending','Blocked','Done'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Update Note *</label>
      <textarea class="form-textarea" id="upd-note" placeholder="What happened? What changed?" rows="3"></textarea></div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitUpdate('${id}')">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

// ── NOTES MODAL ──
function modalNotes(id) {
  const { tasks } = getState();
  const t = tasks.find(t=>t.id===id);
  if (!t) return '<div class="modal-title">Task not found</div>';
  const notes = t.notesHistory || [];
  return `
    <div class="modal-title">◎ Notes — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    ${notes.length===0 ? `<div class="empty-state">No notes yet.</div>` :
      notes.map(n=>`
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:12px;font-weight:600;color:var(--text);">${n.author}</span>
            <div style="display:flex;gap:5px;align-items:center;">
              <span style="font-size:11px;color:var(--text3);">${n.date}</span>
              ${n.importAltered?`<span class="import-tag">⊞ import</span>`:''}
            </div>
          </div>
          <div style="font-size:12px;line-height:1.5;color:var(--text);">${escHtml(n.text)}</div>
        </div>`).join('')}
    <div class="row" style="margin-top:10px;">
      <button class="btn" onclick="window.argus.closeModal()">Close</button>
    </div>`;
}

// ── MANAGER EDIT MODAL ──
function modalManagerEdit(id) {
  const { tasks } = getState();
  const t = tasks.find(t=>t.id===id);
  if (!t) return '<div class="modal-title">Task not found</div>';
  return `
    <div class="modal-title">🔒 Manager Edit — ${t.id}</div>
    <div class="card-sub" style="margin-bottom:12px;">${escHtml(t.desc)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="form-group"><label class="form-label">Gravity</label>
        <select class="form-select" id="mgr-gravity">
          ${['red','amber','green'].map(g=>`<option value="${g}" ${g===t.gravity?'selected':''}>${g==='red'?'🔴 Red':g==='amber'?'🟡 Amber':'🟢 Green'}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Priority</label>
        <select class="form-select" id="mgr-priority">
          ${['High','Medium','Low'].map(p=>`<option ${p===t.priority?'selected':''}>${p}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-group"><label class="form-label">Deadline</label>
      <input class="form-input" type="date" id="mgr-deadline" value="${t.deadline||''}" /></div>
    <div class="form-group"><label class="form-label">Internal Note (manager only)</label>
      <textarea class="form-textarea" id="mgr-note" rows="2" placeholder="Manager-only context..."></textarea></div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.work.submitManagerEdit('${id}')">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

// ── IMPORT — 3-STEP MODAL ──
function modalImport(step) {
  const pills = ['1 Prompt','2 Integrate','3 Verify & Sort'].map((l,i)=>
    `<span class="step-pill ${i+1===step?'active':i+1<step?'done':''}">${l}</span>`).join('');

  if (step === 1) {
    const { tasks } = getState();
    const summary = tasks.slice(0,6).map(t=>`[${t.id}] ${t.desc} | ${t.person} | ${t.status}`).join('\n');
    const prompt = generateFileImportPrompt(summary);
    return `
      <div class="modal-title">⊞ File Import</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Select your file in Claude.ai (Excel/PDF/DOCX/JPG), then paste this prompt together with it.</div>
      <div class="prompt-box" id="import-prompt-text">${escHtml(prompt)}</div>
      <div class="row">
        <button class="btn btn-primary btn-sm" onclick="window.work.copyImportPrompt()">◈ Copy Prompt</button>
        <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      </div>
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text3);">After Claude responds, click Next to paste the result.</div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.importStep(2)">Next →</button>
        <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
      </div>`;
  }

  if (step === 2) {
    return `
      <div class="modal-title">⊞ File Import — Integrate</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Paste Claude's full output below. The app will parse it into items to sort.</div>
      <textarea class="paste-area" id="import-paste" placeholder="Paste Claude's response here..."></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.parseAndVerify()">Parse & Verify →</button>
        <button class="btn" onclick="window.work.importStep(1)">← Back</button>
      </div>`;
  }

  if (step === 3) {
    const items = _importItems.length ? _importItems : getDummyImportItems();
    const total = items.length;
    return `
      <div class="modal-title">⊞ File Import — Verify & Sort</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">
        <span>${total} item${total!==1?'s':''} found.</span>
        Sort each item — merge adds a note to the existing record, new creates a fresh item.
      </div>
      <div id="verify-items">
        ${items.map((item,i) => `
          <div class="card" style="margin-bottom:8px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text);">${escHtml(item.desc)}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
              <span class="badge ${item.status==='NEW'?'badge-green':item.status==='SIMILAR'?'badge-amber':'badge-blue'}">${item.status}</span>
              ${item.similar?`<span class="badge badge-blue">Similar: ${item.similar}</span>`:''}
              ${item.metaWarning?`<span class="badge badge-amber">⚠ unclear metadata</span>`:''}
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <select class="filter-select" id="verify-action-${i}" style="flex:1;">
                ${item.status==='SIMILAR'
                  ? `<option value="merge" selected>Merge — add as note to existing</option>
                     <option value="new">New — create separate item</option>`
                  : `<option value="new" selected>New — create item</option>
                     <option value="merge">Merge — add as note to existing</option>`}
              </select>
              ${item.status==='SIMILAR'?`
              <input class="form-input" id="verify-ref-${i}" value="${item.similar||''}"
                placeholder="Existing ID to merge into" style="width:90px;flex:none;" />`:
              `<input class="form-input" id="verify-ref-${i}" value=""
                placeholder="Assign to..." style="width:90px;flex:none;" />`}
            </div>
          </div>`).join('')}
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.work.confirmImport(${total})">✔ Confirm All</button>
        <button class="btn" onclick="window.work.importStep(2)">← Back</button>
      </div>`;
  }
}

function getDummyImportItems() {
  return [
    { desc:'Site B retaining wall inspection — flagged in uploaded report', status:'NEW', priority:'High', gravity:'red', metaWarning:false },
    { desc:'Road alignment Phase 3 planning notes', status:'SIMILAR', priority:'Medium', gravity:'amber', similar:'T-041', metaWarning:false },
    { desc:'Drainage audit checklist — person not specified in document', status:'NEW', priority:'Low', gravity:'green', metaWarning:true },
  ];
}

// ── SUMMARY PROMPT MODAL (manager only) ──
function modalSummaryPrompt() {
  const { roster } = getState();
  const people = ['All', ...roster.map(r=>r.name)];
  return `
    <div class="modal-title">◈ Workload Summary Prompt</div>
    <div class="form-group"><label class="form-label">Target</label>
      <select class="form-select" id="summary-person">
        ${people.map(p=>`<option value="${p}">${p}</option>`).join('')}
      </select></div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.work.buildSummaryPrompt()">Build Prompt</button>
    </div>
    <div id="summary-prompt-output" style="margin-top:10px;"></div>`;
}

export function init() {
  // Pick up filter nav from Report scorecard tap
  const sf = sessionStorage.getItem('argus_work_filter');
  const pf = sessionStorage.getItem('argus_work_person_filter');
  if (sf) { _filters.status = sf; sessionStorage.removeItem('argus_work_filter'); }
  if (pf) { _filters.person = pf; sessionStorage.removeItem('argus_work_person_filter'); }

  window.work = {
    refresh(btn) {
      if (btn) { btn.classList.add('spinning'); setTimeout(()=>btn.classList.remove('spinning'),600); }
      import('../app.js').then(m=>m.refreshTab());
      toast('Work list refreshed','success');
    },

    setFilter(key, val) {
      _filters[key] = val;
      const list = document.getElementById('work-list');
      if (!list) return;
      const { tasks, currentRole } = getState();
      const isManager = currentRole === 'Manager';
      const filtered = applyFilters(tasks);
      list.innerHTML = filtered.length===0
        ? `<div class="empty-state">No tasks match the current filters.</div>`
        : filtered.map(t=>taskCard(t,isManager)).join('');
    },

    openAddItem()       { showModal(modalAddItem()); },
    openUpdate(id)      { showModal(modalUpdate(id)); },
    openNotes(id)       { showModal(modalNotes(id)); },
    openManagerEdit(id) { showModal(modalManagerEdit(id)); },
    openImport()        { _importItems=[]; _importStep=1; showModal(modalImport(1)); },
    importStep(n)       { _importStep=n; showModal(modalImport(n)); },

    submitAddItem() {
      const desc = document.getElementById('add-desc')?.value?.trim();
      if (!desc) { toast('Description is required','error'); return; }
      const item = {
        desc,
        context:     document.getElementById('add-context')?.value||'',
        helpNeeded:  document.getElementById('add-help')?.value||'',
        person:      document.getElementById('add-person')?.value||'',
        priority:    document.getElementById('add-priority')?.value||'Medium',
        gravity:     document.getElementById('add-gravity')?.value||'amber',
        deadline:    document.getElementById('add-deadline')?.value||'',
        status:      'Pending', daysActive:0, notes:0, notesHistory:[],
        createdAt:   new Date().toISOString(),
      };
      addDoc('tasks', item);
      toast('Work item saved','success');
      closeModal();
    },

    submitUpdate(id) {
      const status = document.getElementById('upd-status')?.value;
      const note   = document.getElementById('upd-note')?.value?.trim();
      const { currentUser } = getState();
      if (!note) { toast('Please add a note','error'); return; }
      writeDoc('tasks', id, { status, updatedAt:new Date().toISOString(), updatedBy:currentUser });
      toast('Task updated','success');
      closeModal();
    },

    submitManagerEdit(id) {
      const gravity  = document.getElementById('mgr-gravity')?.value;
      const priority = document.getElementById('mgr-priority')?.value;
      const deadline = document.getElementById('mgr-deadline')?.value;
      writeDoc('tasks', id, { gravity, priority, deadline });
      toast('Task updated by manager','success');
      closeModal();
    },

    escalateToCSW(id) {
      const { tasks } = getState();
      const t = tasks.find(t=>t.id===id);
      if (!t) return;
      sessionStorage.setItem('argus_prefill_csw', JSON.stringify({ title:t.desc, situation:t.desc, linkedTask:t.id }));
      window.argus.switchTab('csw');
      toast('Switched to CSW — form pre-filled','info');
    },

    openFiles(id) {
      showModal(`<div class="modal-title">⊟ Files — ${id}</div>
        <div class="empty-state" style="margin:20px 0;">No files attached yet.</div>
        <div class="row">
          <button class="btn btn-primary btn-sm" onclick="window.argus.toast('File upload — Phase 3')">+ Attach File</button>
          <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
        </div>`);
    },

    async copyImportPrompt() {
      const el = document.getElementById('import-prompt-text');
      if (!el) return;
      await copyPromptToClipboard(el.innerText);
      toast('Prompt copied — paste into Claude.ai with your file','success');
    },

    parseAndVerify() {
      const raw = document.getElementById('import-paste')?.value?.trim();
      if (!raw) { toast('Paste Claude\'s response first','error'); return; }
      // Simple parser — looks for numbered lines as items
      const lines = raw.split('\n').filter(l=>l.match(/^\d+\./));
      _importItems = lines.map((l,i) => ({
        desc: l.replace(/^\d+\.\s*/,'').split('|')[0].trim().slice(0,120),
        status: l.toLowerCase().includes('similar') ? 'SIMILAR' : l.toLowerCase().includes('duplicate') ? 'SIMILAR' : 'NEW',
        similar: (l.match(/T-\d+|CSW-\d+/)||[])[0]||'',
        metaWarning: l.toLowerCase().includes('unclear') || l.toLowerCase().includes('not specified'),
      }));
      if (!_importItems.length) {
        _importItems = getDummyImportItems();
        toast('Could not parse — showing sample layout','warn');
      }
      showModal(modalImport(3));
    },

    confirmImport(total) {
      let merged = 0, created = 0;
      for (let i=0; i<total; i++) {
        const action = document.getElementById(`verify-action-${i}`)?.value;
        const ref    = document.getElementById(`verify-ref-${i}`)?.value?.trim();
        const item   = _importItems[i];
        if (!item) continue;
        if (action === 'merge' && ref) {
          writeDoc('tasks', ref, {
            importAltered: true,
            lastImportNote: `Merged from import: ${item.desc}`,
            updatedAt: new Date().toISOString(),
          });
          merged++;
        } else {
          addDoc('tasks', {
            desc: item.desc, status:'Pending', priority:'Medium', gravity:'amber',
            person: ref||'', daysActive:0, notes:1,
            importAltered: true,
            notesHistory:[{
              author:'Import', date:new Date().toLocaleDateString('en-PH'),
              text:`Added via file import${item.metaWarning?' — metadata unclear, please review':''}.`,
              importAltered:true,
            }],
            createdAt: new Date().toISOString(),
          });
          created++;
        }
      }
      toast(`Import done — ${created} new, ${merged} merged`,'success');
      closeModal();
    },

    openSummaryPrompt() { showModal(modalSummaryPrompt()); },

    async buildSummaryPrompt() {
      const person = document.getElementById('summary-person')?.value||'All';
      const prompt = generateWorkloadSummaryPrompt(person);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('summary-prompt-output');
      if (out) out.innerHTML=`<div class="notice"><span>Prompt copied!</span> Paste into Claude.ai → paste result back.</div>
        <div class="prompt-box">${escHtml(prompt.slice(0,500))}...</div>`;
      toast('Workload summary prompt copied','success');
    },
  };
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
