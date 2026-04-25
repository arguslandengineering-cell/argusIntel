// ============================================================
// ARGUSINTEL — TAB: DAILY
// js/tabs/daily.js
// ============================================================

import { getState, toast, showModal, closeModal } from '../app.js';
import {
  generateDigestPrompt,
  generateTeamOverviewPrompt,
  generateWellbeingPrompt,
} from '../modules/prompts.js';
import { copyPromptToClipboard } from '../modules/bottleneck.js';

const AVATAR_COLORS = {
  Charles: '#534AB7', Ana: '#378ADD', Ben: '#1D9E75',
  Lei: '#EF9F27', Marco: '#E24B4A',
};

// ============================================================
// RENDER
// ============================================================
export function render() {
  const { currentRole, roster, tasks, csws, digest, versionTest } = getState();
  const isManager = currentRole === 'Manager';

  const teamMembers = roster.filter(r => r.role !== 'Manager' || roster.length === 1);

  return `
    <div class="module-label">TAB-04 · DAILY</div>

    ${isManager ? renderManagerPromptRow() : ''}

    <div class="section-title">Team</div>
    <div id="team-cards">
      ${teamMembers.map(r => renderPersonCard(r, tasks, csws)).join('')}
    </div>

    ${isManager ? renderMonthlyAccomplishments(tasks) : ''}

    <div class="divider"></div>

    <div class="section-title">Today's Digest</div>
    ${renderDigestSection(digest, isManager)}
  `;
}

// ============================================================
// MANAGER PROMPT ROW
// ============================================================
function renderManagerPromptRow() {
  return `
    <div class="row" style="margin-bottom:14px;">
      <button class="btn btn-sm" onclick="window.daily.openTeamOverviewPrompt()">◈ Team Overview</button>
      <button class="btn btn-sm" onclick="window.daily.openWellbeingPrompt()">◉ Wellbeing</button>
      <button class="btn btn-primary btn-sm" onclick="window.daily.openDigestBuilder()">✦ Build Digest</button>
    </div>
  `;
}

// ============================================================
// PERSON CARD
// ============================================================
function renderPersonCard(r, tasks, csws) {
  const myTasks = tasks.filter(t => t.person === r.name);
  const ongoing = myTasks.filter(t => t.status === 'Ongoing').length;
  const pending  = myTasks.filter(t => t.status === 'Pending').length;
  const blocked  = myTasks.filter(t => t.status === 'Blocked').length;
  const done     = myTasks.filter(t => t.status === 'Done').length;
  const topTasks = myTasks.filter(t => t.status === 'Ongoing' || t.status === 'Blocked').slice(0, 2);
  const initials = r.name.slice(0, 2).toUpperCase();
  const bg = AVATAR_COLORS[r.name] || '#1D9E75';

  return `
  <div class="person-card">
    <div class="person-top">
      <div class="avatar" style="background:${bg}">${initials}</div>
      <div>
        <div class="person-name">${r.name}</div>
        <div class="person-role">${r.role} · ${r.site}</div>
      </div>
    </div>
    <div class="stat-row" style="margin-bottom:10px;">
      <span class="stat-chip" style="background:#378ADD18;color:#185FA5;">⚡ ${ongoing} ongoing</span>
      <span class="stat-chip" style="background:#EF9F2718;color:#854F0B;">⏳ ${pending} pending</span>
      ${blocked > 0
        ? `<span class="stat-chip" style="background:#E24B4A18;color:#A32D2D;">✕ ${blocked} blocked</span>`
        : ''}
      <span class="stat-chip" style="background:#1D9E7518;color:#0F6E56;">✔ ${done} done</span>
    </div>
    ${topTasks.length > 0 ? `
      <div style="font-size:11px;color:#888;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">Top Active</div>
      ${topTasks.map(t => `
        <div style="font-size:12px;padding:5px 0;border-top:0.5px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <span style="flex:1;line-height:1.4;">${escHtml(t.desc.slice(0, 60))}${t.desc.length > 60 ? '…' : ''}</span>
          <span class="badge ${t.status === 'Blocked' ? 'badge-red' : 'badge-blue'}">${t.status}</span>
        </div>
      `).join('')}
    ` : ''}
  </div>`;
}

// ============================================================
// MONTHLY ACCOMPLISHMENTS (manager only)
// ============================================================
function renderMonthlyAccomplishments(tasks) {
  const done = tasks.filter(t => t.status === 'Done');
  if (done.length === 0) return '';

  return `
    <div class="divider"></div>
    <div class="section-title">Monthly Accomplishments</div>
    ${done.map(t => `
      <div class="card" style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;flex:1;">${escHtml(t.desc)}</div>
          <span style="font-size:11px;color:#888;">${t.person}</span>
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================================
// DIGEST SECTION
// ============================================================
function renderDigestSection(digest, isManager) {
  if (!digest) {
    return `<div class="empty-state">No digest published today.</div>`;
  }

  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="card-title">Morning Digest — ${digest.date}</div>
        ${digest.published
          ? `<span class="badge badge-green">Published</span>`
          : `<span class="badge badge-amber">Draft</span>`}
      </div>
      <div style="font-size:13px;line-height:1.6;color:#333;">${escHtml(digest.body)}</div>
    </div>

    ${isManager && digest.aiSuggestions?.length > 0 ? `
      <div class="section-title">AI Suggestions</div>
      <div id="ai-suggestions">
        ${digest.aiSuggestions.map(s => renderAISuggestion(s)).join('')}
      </div>
    ` : ''}
  `;
}

function renderAISuggestion(s) {
  return `
  <div class="ai-suggestion-card" id="sug-${s.id}">
    <div class="ai-sug-text">${escHtml(s.text)}</div>
    <div class="ai-sug-actions">
      <button class="btn btn-sm" style="color:var(--c-accent);"
        onclick="window.daily.acceptSuggestion('${s.id}')">✔ Add</button>
      <button class="btn btn-sm" style="color:var(--c-red);"
        onclick="window.daily.removeSuggestion('${s.id}')">✕</button>
      <button class="btn btn-sm"
        onclick="window.daily.editSuggestion('${s.id}')">✏</button>
    </div>
  </div>`;
}

// ============================================================
// DIGEST BUILDER MODAL
// ============================================================
function modalDigestBuilder() {
  return `
    <div class="modal-title">✦ Build Digest</div>
    <div class="form-group">
      <label class="form-label">Meeting Context / Additional Notes</label>
      <textarea class="form-textarea" id="digest-context" rows="3"
        placeholder="Add any context Charles wants to include (announcements, site updates, priorities)..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Upload External Report (optional)</label>
      <input type="file" class="form-input" id="digest-file"
        accept=".pdf,.docx,.xlsx,.jpg,.png"
        title="For AI analysis — not stored in app" />
      <div style="font-size:11px;color:#aaa;margin-top:3px;">Used for AI analysis only — not stored in app</div>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.daily.buildDigestPrompt()">◈ Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
    <div id="digest-prompt-output" style="margin-top:12px;"></div>
  `;
}

// ============================================================
// TEAM OVERVIEW MODAL
// ============================================================
function modalTeamOverview() {
  return `
    <div class="modal-title">◈ Team Overview Prompt</div>
    <div class="form-group">
      <label class="form-label">Meeting Context</label>
      <textarea class="form-textarea" id="team-context" rows="3"
        placeholder="Add meeting agenda, focus areas, or specific concerns..."></textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.daily.buildTeamPrompt()">◈ Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
    <div id="team-prompt-output" style="margin-top:12px;"></div>
  `;
}

// ============================================================
// WELLBEING MODAL
// ============================================================
function modalWellbeing() {
  return `
    <div class="modal-title">◉ Wellbeing Prompt</div>
    <div class="notice">
      Generates <span>3 suggestions per team member</span> for morale, performance, and routine —
      visible to manager only.
    </div>
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-primary" onclick="window.daily.buildWellbeingPrompt()">◈ Generate Prompt</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
    <div id="wellbeing-output" style="margin-top:12px;"></div>
  `;
}

// ============================================================
// EDIT SUGGESTION MODAL
// ============================================================
function modalEditSuggestion(text) {
  return `
    <div class="modal-title">✏ Edit Suggestion</div>
    <div class="form-group">
      <textarea class="form-textarea" id="edit-sug-text" rows="4">${escHtml(text)}</textarea>
    </div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-primary" onclick="window.daily.saveEditedSuggestion()">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// PASTE-BACK MODAL (digest result)
// ============================================================
function modalPasteBack(label, storageKey) {
  return `
    <div class="modal-title">${label}</div>
    <div class="notice" style="margin-bottom:10px;">
      Paste Claude's response below. It will be saved and shown in the digest.
    </div>
    <textarea class="paste-area" id="paste-back-text"
      placeholder="Paste Claude's response here..."></textarea>
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-primary" onclick="window.daily.savePasteBack('${storageKey}')">✔ Save</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================
export function init() {
  window.daily = {
    openDigestBuilder()   { showModal(modalDigestBuilder()); },
    openTeamOverviewPrompt() { showModal(modalTeamOverview()); },
    openWellbeingPrompt() { showModal(modalWellbeing()); },

    async buildDigestPrompt() {
      const context = document.getElementById('digest-context')?.value || '';
      const prompt  = generateDigestPrompt(context);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('digest-prompt-output');
      if (out) {
        out.innerHTML = `
          <div class="notice"><span>Prompt copied!</span> Paste into Claude.ai → paste result back below.</div>
          <div class="prompt-box">${escHtml(prompt.slice(0, 500))}...</div>
          <div class="row" style="margin-top:8px;">
            <button class="btn btn-primary btn-sm" onclick="window.argus.closeModal();setTimeout(()=>window.daily.openPasteBack('Paste Digest Result','digest_result'),200)">
              → Paste Result Back
            </button>
          </div>
        `;
      }
      toast('Digest prompt copied — paste into Claude.ai', 'success');
    },

    async buildTeamPrompt() {
      const context = document.getElementById('team-context')?.value || '';
      const prompt  = generateTeamOverviewPrompt(context);
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('team-prompt-output');
      if (out) {
        out.innerHTML = `
          <div class="notice"><span>Prompt copied!</span> Paste into Claude.ai → paste result back.</div>
          <div class="prompt-box">${escHtml(prompt.slice(0, 400))}...</div>
        `;
      }
      toast('Team overview prompt copied', 'success');
    },

    async buildWellbeingPrompt() {
      const prompt = generateWellbeingPrompt();
      await copyPromptToClipboard(prompt);
      const out = document.getElementById('wellbeing-output');
      if (out) {
        out.innerHTML = `
          <div class="notice"><span>Prompt copied!</span> Results are manager-only.</div>
          <div class="prompt-box">${escHtml(prompt.slice(0, 400))}...</div>
        `;
      }
      toast('Wellbeing prompt copied', 'success');
    },

    openPasteBack(label, key) {
      showModal(modalPasteBack(label, key));
    },

    savePasteBack(key) {
      const text = document.getElementById('paste-back-text')?.value?.trim();
      if (!text) { toast('Nothing to save', 'error'); return; }
      // TODO Phase 3: write to Firestore
      sessionStorage.setItem('argus_' + key, text);
      toast('Result saved', 'success');
      closeModal();
    },

    acceptSuggestion(id) {
      const el = document.getElementById('sug-' + id);
      if (el) {
        el.style.opacity = '0.5';
        el.style.borderColor = 'var(--c-accent)';
      }
      toast('Suggestion added to digest', 'success');
    },

    removeSuggestion(id) {
      const el = document.getElementById('sug-' + id);
      if (el) el.remove();
      toast('Suggestion removed', 'info');
    },

    editSuggestion(id) {
      const el = document.getElementById('sug-' + id);
      const text = el?.querySelector('.ai-sug-text')?.textContent || '';
      window._editingSugId = id;
      showModal(modalEditSuggestion(text));
    },

    saveEditedSuggestion() {
      const text = document.getElementById('edit-sug-text')?.value?.trim();
      const id   = window._editingSugId;
      if (!text || !id) return;
      const el = document.getElementById('sug-' + id);
      if (el) el.querySelector('.ai-sug-text').textContent = text;
      toast('Suggestion updated', 'success');
      closeModal();
    },
  };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
