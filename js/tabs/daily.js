// ============================================================
// ARGUSINTEL — TAB: DAILY  js/tabs/daily.js
// ============================================================
import { getState, toast, showModal, closeModal } from '../app.js';
import { generateDigestPrompt, generateTeamOverviewPrompt, generateWellbeingPrompt } from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

const AVATAR_COLORS = { Charles:'#534AB7', Ana:'#378ADD', Ben:'#1D9E75', Lei:'#EF9F27', Marco:'#E24B4A' };

export function render() {
  const { currentRole, roster, tasks, csws, digest } = getState();
  const isManager = currentRole === 'Manager';
  const team = roster.filter(r => r.role !== 'Manager');

  return `
    <div class="module-label">TAB-04 · DAILY</div>

    ${isManager ? `
    <div class="row">
      <button class="btn btn-sm" onclick="window.daily.openTeamOverview()">◈ Team Overview</button>
      <button class="btn btn-sm" onclick="window.daily.openWellbeing()">◉ Wellbeing</button>
      <button class="btn btn-primary btn-sm" onclick="window.daily.openDigestBuilder()">✦ Build Digest</button>
      <button class="refresh-btn" onclick="window.daily.refresh(this)">↺ Refresh</button>
    </div>` : `
    <div class="row">
      <button class="refresh-btn" onclick="window.daily.refresh(this)">↺ Refresh</button>
    </div>`}

    <div class="section-title">Team</div>
    <div id="team-cards">
      ${team.map(r => personCard(r, tasks, csws)).join('')}
    </div>

    ${isManager ? renderMonthlyAccomplishments(tasks) : ''}

    <div class="divider"></div>

    <div class="section-title">Today's Digest</div>
    ${renderDigestSection(digest, isManager)}`;
}

function personCard(r, tasks, csws) {
  const mine    = tasks.filter(t=>t.person===r.name);
  const ongoing = mine.filter(t=>t.status==='Ongoing').length;
  const pending  = mine.filter(t=>t.status==='Pending').length;
  const blocked  = mine.filter(t=>t.status==='Blocked').length;
  const done     = mine.filter(t=>t.status==='Done').length;
  const top      = mine.filter(t=>t.status==='Ongoing'||t.status==='Blocked').slice(0,2);
  const init     = r.name.slice(0,2).toUpperCase();
  const bg       = AVATAR_COLORS[r.name]||'#1D9E75';
  return `
  <div class="person-card">
    <div class="person-top">
      <div class="avatar" style="background:${bg}">${init}</div>
      <div><div class="person-name">${r.name}</div><div class="person-role">${r.role} · ${r.site}</div></div>
    </div>
    <div class="stat-row" style="margin-bottom:${top.length?'10px':'0'};">
      <span class="stat-chip" style="background:#378ADD18;color:#155f9a;">⚡ ${ongoing} ongoing</span>
      <span class="stat-chip" style="background:#EF9F2718;color:#8a560a;">⏳ ${pending} pending</span>
      ${blocked?`<span class="stat-chip" style="background:#E24B4A18;color:#b83130;">✕ ${blocked} blocked</span>`:''}
      <span class="stat-chip" style="background:#1D9E7518;color:#0b6e50;">✔ ${done} done</span>
    </div>
    ${top.map(t=>`
      <div style="font-size:12px;padding:5px 0;border-top:0.5px solid var(--border2);display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <span style="flex:1;line-height:1.4;color:var(--text);">${escHtml(t.desc.slice(0,65))}${t.desc.length>65?'…':''}</span>
        <span class="badge ${t.status==='Blocked'?'badge-red':'badge-blue'}">${t.status}</span>
      </div>`).join('')}
  </div>`;
}

function renderMonthlyAccomplishments(tasks) {
  const done = tasks.filter(t=>t.status==='Done');
  if (!done.length) return '';
  return `
    <div class="divider"></div>
    <div class="section-title">Monthly Accomplishments</div>
    ${done.map(t=>`
      <div class="card" style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;flex:1;color:var(--text);">${escHtml(t.desc)}</div>
          <span style="font-size:11px;color:var(--text3);">${t.person}</span>
        </div>
      </div>`).join('')}`;
}

function renderDigestSection(digest, isManager) {
  if (!digest) return `<div class="empty-state">No digest published today.</div>`;
  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="card-title">Morning Digest — ${digest.date}</div>
        <span class="badge ${digest.published?'badge-green':'badge-amber'}">${digest.published?'Published':'Draft'}</span>
      </div>
      <div style="font-size:13px;line-height:1.7;color:var(--text);">${escHtml(digest.body)}</div>
    </div>
    ${isManager && digest.aiSuggestions?.length ? `
      <div class="section-title">AI Suggestions</div>
      <div id="ai-suggestions">
        ${digest.aiSuggestions.map(s=>aiSuggestionCard(s)).join('')}
      </div>` : ''}`;
}

function aiSuggestionCard(s) {
  return `
  <div class="ai-suggestion-card" id="sug-${s.id}">
    <div class="ai-sug-text">${escHtml(s.text)}</div>
    <div class="ai-sug-actions">
      <button class="btn btn-sm" style="color:var(--c-accent);" onclick="window.daily.acceptSug('${s.id}')">✔ Add</button>
      <button class="btn btn-sm" style="color:var(--c-red);"   onclick="window.daily.removeSug('${s.id}')">✕</button>
      <button class="btn btn-sm" onclick="window.daily.editSug('${s.id}')">✏</button>
    </div>
  </div>`;
}

// ── DIGEST BUILDER MODAL (3-step like bottleneck) ──
function modalDigestBuilder(step) {
  const pills = ['1 Build Prompt','2 Claude.ai','3 Paste & Publish'].map((l,i)=>
    `<span class="step-pill ${i+1===step?'active':i+1<step?'done':''}">${l}</span>`).join('');

  if (step===1) {
    return `
      <div class="modal-title">✦ Build Digest</div>
      <div class="step-pills">${pills}</div>
      <div class="form-group"><label class="form-label">Meeting Context / Additional Notes</label>
        <textarea class="form-textarea" id="digest-context" rows="3"
          placeholder="Announcements, site updates, priorities Charles wants highlighted..."></textarea></div>
      <div class="form-group"><label class="form-label">Upload External Report (optional — for AI analysis only)</label>
        <input type="file" class="form-input" id="digest-file" accept=".pdf,.docx,.xlsx,.jpg,.png" /></div>
      <div class="row" style="margin-top:6px;">
        <button class="btn btn-primary" onclick="window.daily.digestStep2()">◈ Generate Prompt →</button>
        <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
      </div>
      <div id="digest-step1-output" style="margin-top:10px;"></div>`;
  }

  if (step===2) {
    return `
      <div class="modal-title">✦ Build Digest — Claude.ai</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Prompt was copied. Paste it into Claude.ai (attach any uploaded file), then come back.</div>
      <div class="row">
        <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
        <button class="btn btn-primary" onclick="window.daily.openDigestStep3()">Next: Paste Result →</button>
      </div>
      <div class="row" style="margin-top:4px;">
        <button class="btn" onclick="window.daily.openDigestBuilder()">← Regenerate</button>
      </div>`;
  }

  if (step===3) {
    return `
      <div class="modal-title">✦ Build Digest — Paste & Publish</div>
      <div class="step-pills">${pills}</div>
      <div class="notice">Paste Claude's digest response. Review AI suggestions below before publishing.</div>
      <textarea class="paste-area" id="digest-paste"
        placeholder="Paste Claude's digest response here..."></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" onclick="window.daily.publishDigest()">✔ Publish Digest</button>
        <button class="btn" onclick="window.daily.openDigestStep2()">← Back</button>
      </div>`;
  }
}

// ── TEAM OVERVIEW MODAL ──
function modalTeamOverview() {
  return `
    <div class="modal-title">◈ Team Overview Prompt</div>
    <div class="form-group"><label class="form-label">Meeting Context</label>
      <textarea class="form-textarea" id="team-context" rows="3"
        placeholder="Meeting agenda, focus areas, concerns..."></textarea></div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.daily.buildTeamPrompt()">◈ Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
    <div id="team-prompt-output" style="margin-top:12px;"></div>`;
}

// ── WELLBEING MODAL ──
function modalWellbeing() {
  return `
    <div class="modal-title">◉ Wellbeing Prompt</div>
    <div class="notice">Generates <span>3 suggestions per team member</span> — morale, performance, routine. Visible to manager only.</div>
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-primary" onclick="window.daily.buildWellbeingPrompt()">◈ Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
    <div id="wellbeing-output" style="margin-top:12px;"></div>`;
}

export function init() {
  window.daily = {
    refresh(btn) {
      if(btn){btn.classList.add('spinning');setTimeout(()=>btn.classList.remove('spinning'),600);}
      import('../app.js').then(m=>m.refreshTab());
      toast('Daily refreshed','success');
    },

    openDigestBuilder() { showModal(modalDigestBuilder(1)); },
    openDigestStep2()   { showModal(modalDigestBuilder(2)); },
    openDigestStep3()   { showModal(modalDigestBuilder(3)); },
    openTeamOverview()  { showModal(modalTeamOverview()); },
    openWellbeing()     { showModal(modalWellbeing()); },

    async digestStep2() {
      const context = document.getElementById('digest-context')?.value||'';
      const prompt  = generateDigestPrompt(context);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('digest-step1-output');
      if (out) out.innerHTML=`<div class="notice"><span>Prompt copied!</span> Tap Open Claude.ai → paste prompt + attach file → come back.</div>
        <div class="row" style="margin-top:8px;">
          <button class="btn btn-primary btn-sm" onclick="window.daily.openDigestStep2()">Next →</button>
          <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
        </div>`;
      toast('Digest prompt copied','success');
    },

    publishDigest() {
      const text = document.getElementById('digest-paste')?.value?.trim();
      if (!text) { toast('Paste the digest result first','error'); return; }
      sessionStorage.setItem('argus_digest_result', text);
      toast('Digest published — visible to all team','success');
      closeModal();
    },

    async buildTeamPrompt() {
      const context = document.getElementById('team-context')?.value||'';
      const prompt  = generateTeamOverviewPrompt(context);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('team-prompt-output');
      if (out) out.innerHTML=`<div class="notice"><span>Prompt copied!</span> Paste into Claude.ai.</div>
        <div class="prompt-box">${escHtml(prompt.slice(0,400))}...</div>`;
      toast('Team overview prompt copied','success');
    },

    async buildWellbeingPrompt() {
      const prompt = generateWellbeingPrompt();
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('wellbeing-output');
      if (out) out.innerHTML=`<div class="notice"><span>Prompt copied!</span> Results are manager-only.</div>
        <div class="prompt-box">${escHtml(prompt.slice(0,400))}...</div>`;
      toast('Wellbeing prompt copied','success');
    },

    acceptSug(id) {
      const el = document.getElementById('sug-'+id);
      if (el) { el.style.opacity='0.5'; el.style.borderColor='var(--c-accent)'; }
      toast('Suggestion added to digest','success');
    },
    removeSug(id) {
      const el = document.getElementById('sug-'+id);
      if (el) el.remove();
      toast('Suggestion removed','info');
    },
    editSug(id) {
      const el = document.getElementById('sug-'+id);
      const text = el?.querySelector('.ai-sug-text')?.textContent||'';
      window._editingSugId = id;
      showModal(`
        <div class="modal-title">✏ Edit Suggestion</div>
        <div class="form-group">
          <textarea class="form-textarea" id="edit-sug-text" rows="4">${escHtml(text)}</textarea>
        </div>
        <div class="row" style="margin-top:6px;">
          <button class="btn btn-primary" onclick="window.daily.saveEditedSug()">✔ Save</button>
          <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
        </div>`);
    },
    saveEditedSug() {
      const text = document.getElementById('edit-sug-text')?.value?.trim();
      const id   = window._editingSugId;
      if (!text||!id) return;
      const el = document.getElementById('sug-'+id);
      if (el) el.querySelector('.ai-sug-text').textContent=text;
      toast('Suggestion updated','success');
      closeModal();
    },
  };
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
