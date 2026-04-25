// ============================================================
// ARGUSINTEL — TAB: REPORT
// js/tabs/report.js
// ============================================================

import { getState, toast, showModal, closeModal } from '../app.js';
import {
  generateBottleneckPrompt,
  saveBottleneckResult,
  copyPromptToClipboard,
} from '../modules/bottleneck.js';
import {
  generatePDPrompt,
  generateWeeklyNarrativePrompt,
} from '../modules/prompts.js';

// ============================================================
// RENDER
// ============================================================
export function render() {
  const { tasks, csws, currentRole, roster } = getState();
  const isManager = currentRole === 'Manager';

  const topPriorities = [
    ...tasks.filter(t => t.priority === 'High' && t.status !== 'Done'),
    ...csws.filter(c => c.priority === 'High' && c.status !== 'Approved'),
  ].slice(0, 5);

  const cswTotal    = csws.length;
  const cswApproved = csws.filter(c => c.status === 'Approved').length;
  const cswPending  = csws.filter(c => c.status === 'Pending' || c.status === 'Ongoing').length;
  const cswRate     = cswTotal > 0 ? Math.round((cswApproved / cswTotal) * 100) : 0;
  const taskTotal   = tasks.length;
  const taskDone    = tasks.filter(t => t.status === 'Done').length;
  const taskBlocked = tasks.filter(t => t.status === 'Blocked').length;
  const taskActive  = tasks.filter(t => t.status === 'Ongoing').length;

  const people = [...new Set(roster.map(r => r.name))];
  const maxCSW  = Math.max(...people.map(p => csws.filter(c => c.owner === p).length), 1);
  const maxWork = Math.max(...people.map(p => tasks.filter(t => t.person === p && t.status !== 'Done').length), 1);

  const stale = tasks.filter(t => t.status === 'Ongoing' && t.daysActive >= 14);

  return `
    <div class="module-label">TAB-05 · REPORT</div>

    <!-- ── TOP PRIORITIES ── -->
    <div class="section-title">Top Priorities</div>
    ${topPriorities.length === 0
      ? `<div class="empty-state">No high-priority items.</div>`
      : topPriorities.map(item => {
          const isCSW = Boolean(item.title);
          const label = isCSW ? item.id : item.id;
          const name  = isCSW ? item.title : item.desc;
          const days  = item.daysActive || 0;
          const cls   = days >= 14 ? 'tp-red' : days >= 7 ? 'tp-amber' : 'tp-green';
          const badge = days >= 14 ? 'badge-red' : 'badge-amber';
          const status = days >= 14 ? 'Prolonged' : 'On Track';
          const owner = isCSW ? item.owner : item.person;
          return `
          <div class="top-priority-card ${cls}" style="cursor:pointer;"
            onclick="window.argus.switchTab('${isCSW ? 'csw' : 'work'}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div>
                <div style="font-size:12px;font-weight:600;margin-bottom:3px;">${escHtml(name.slice(0,70))}${name.length>70?'…':''}</div>
                <div style="font-size:11px;color:#888;">${label} · ${owner} · ${days}d active</div>
              </div>
              <span class="badge ${badge}">${status}</span>
            </div>
          </div>`;
        }).join('')
    }

    <div class="divider"></div>

    <!-- ── SCORECARD ── -->
    <div class="section-title">Scorecard</div>
    <div class="metric-row">
      <div class="metric"><div class="metric-val">${cswTotal}</div><div class="metric-lbl">CSW Total</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-accent)">${cswApproved}</div><div class="metric-lbl">Approved</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-amber)">${cswPending}</div><div class="metric-lbl">Open CSW</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-blue)">${cswRate}%</div><div class="metric-lbl">Approval Rate</div></div>
    </div>
    <div class="metric-row">
      <div class="metric"><div class="metric-val">${taskTotal}</div><div class="metric-lbl">Tasks Total</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-accent)">${taskDone}</div><div class="metric-lbl">Done</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-red)">${taskBlocked}</div><div class="metric-lbl">Blocked</div></div>
      <div class="metric"><div class="metric-val" style="color:var(--c-blue)">${taskActive}</div><div class="metric-lbl">Active</div></div>
    </div>

    <div class="divider"></div>

    <!-- ── CHARTS ── -->
    <div class="section-title">CSW Load by Owner</div>
    <div class="chart-bar-wrap">
      ${people.map((p, i) => {
        const count = csws.filter(c => c.owner === p).length;
        const colors = ['#378ADD','#1D9E75','#EF9F27','#534AB7','#E24B4A'];
        return renderBar(p, count, maxCSW, colors[i % colors.length]);
      }).join('')}
    </div>

    <div class="section-title">Work Load by Owner (Active)</div>
    <div class="chart-bar-wrap">
      ${people.map((p, i) => {
        const count = tasks.filter(t => t.person === p && t.status !== 'Done').length;
        const colors = ['#378ADD','#1D9E75','#EF9F27','#534AB7','#E24B4A'];
        return renderBar(p, count, maxWork, colors[i % colors.length]);
      }).join('')}
    </div>

    <div class="divider"></div>

    <!-- ── STALE ITEMS ── -->
    <div class="section-title">Stale & Not Implemented</div>
    ${stale.length === 0
      ? `<div class="empty-state">No stale items — all ongoing tasks under 14 days.</div>`
      : stale.map(t => `
        <div class="card" style="border-left:3px solid var(--c-amber);margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div>
              <div style="font-size:12px;font-weight:600;">${escHtml(t.desc.slice(0,70))}</div>
              <div style="font-size:11px;color:#888;margin-top:3px;">${t.person} · ${t.daysActive} days active</div>
            </div>
            <span class="badge badge-amber">${t.daysActive}d</span>
          </div>
        </div>`).join('')
    }

    <div class="divider"></div>

    <!-- ── BOTTLENECK PROMPT — ALWAYS ACTIVE ── -->
    <div class="section-title" style="color:var(--c-accent);">◈ Bottleneck Analysis</div>
    <div class="notice" style="border-color:var(--c-accent)44;margin-bottom:10px;">
      <span>Always active</span> — generates a full AI analysis of workload bottlenecks.
      Copy → paste to Claude.ai → paste result back to save.
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.openBottleneck()">◈ Generate Bottleneck Prompt</button>
    </div>
    <div id="bottleneck-result-section" style="margin-top:10px;"></div>

    ${isManager ? renderManagerSection() : ''}
  `;
}

// ============================================================
// MANAGER SECTION — PD, Narrative
// ============================================================
function renderManagerSection() {
  const { roster } = getState();
  const staff = roster.filter(r => r.role !== 'Manager');

  return `
    <div class="divider"></div>
    <div class="section-title">Monthly PD Prompts</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${staff.map(r => `
        <button class="btn btn-sm" onclick="window.report.openPDPrompt('${r.name}')">
          ◉ ${r.name}
        </button>
      `).join('')}
    </div>

    <div class="divider"></div>
    <div class="section-title">Weekly Narrative</div>
    <div class="row">
      <button class="btn btn-sm" onclick="window.report.openWeeklyNarrative()">▤ Build Weekly Narrative Prompt</button>
    </div>
  `;
}

// ============================================================
// BOTTLENECK MODAL
// ============================================================
function modalBottleneck() {
  const prompt = generateBottleneckPrompt();
  return `
    <div class="modal-title">◈ Bottleneck Analysis Prompt</div>
    <div class="notice" style="margin-bottom:10px;">
      <span>Step 1:</span> Copy prompt below &nbsp;·&nbsp;
      <span>Step 2:</span> Paste into Claude.ai &nbsp;·&nbsp;
      <span>Step 3:</span> Paste result back here
    </div>
    <div class="step-pills">
      <span class="step-pill active">1 Copy</span>
      <span class="step-pill">2 Claude.ai</span>
      <span class="step-pill">3 Paste Back</span>
    </div>
    <div class="prompt-box" id="bottleneck-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyBottleneck()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
    </div>
    <div class="divider"></div>
    <div class="form-group">
      <label class="form-label">Step 3 — Paste Claude's Analysis Here</label>
      <textarea class="paste-area" id="bottleneck-paste"
        placeholder="Paste Claude's bottleneck analysis response here..."></textarea>
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.saveBottleneck()">✔ Save Analysis</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// PD PROMPT MODAL
// ============================================================
function modalPDPrompt(personName) {
  const prompt = generatePDPrompt(personName);
  return `
    <div class="modal-title">◉ Monthly PD — ${personName}</div>
    <div class="notice" style="margin-bottom:10px;">
      Copy → Claude.ai → paste result back for your PD session notes.
    </div>
    <div class="prompt-box" id="pd-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyPD()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>
    <div class="divider"></div>
    <div class="form-group">
      <label class="form-label">Paste PD Brief Result</label>
      <textarea class="paste-area" id="pd-paste"
        placeholder="Paste Claude's PD coaching brief here..."></textarea>
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.savePD('${personName}')">✔ Save PD Brief</button>
    </div>
  `;
}

// ============================================================
// WEEKLY NARRATIVE MODAL
// ============================================================
function modalWeeklyNarrative() {
  const prompt = generateWeeklyNarrativePrompt();
  return `
    <div class="modal-title">▤ Weekly Narrative Prompt</div>
    <div class="notice" style="margin-bottom:10px;">
      Copy → Claude.ai → paste the narrative back as your weekly report.
    </div>
    <div class="prompt-box" id="narrative-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyNarrative()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
    </div>
    <div class="divider"></div>
    <div class="form-group">
      <label class="form-label">Paste Weekly Report Result</label>
      <textarea class="paste-area" id="narrative-paste"
        placeholder="Paste Claude's weekly narrative here..."></textarea>
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.saveNarrative()">✔ Save Report</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>
  `;
}

// ============================================================
// BAR CHART HELPER
// ============================================================
function renderBar(label, val, max, color) {
  const pct = max > 0 ? Math.round((val / max) * 100) : 0;
  return `
  <div class="chart-row">
    <span class="chart-label">${label}</span>
    <div class="chart-track">
      <div class="chart-fill" style="width:${pct}%;background:${color};"></div>
    </div>
    <span class="chart-val">${val}</span>
  </div>`;
}

// ============================================================
// INIT
// ============================================================
export function init() {
  window.report = {
    openBottleneck() { showModal(modalBottleneck()); },
    openPDPrompt(name) { showModal(modalPDPrompt(name)); },
    openWeeklyNarrative() { showModal(modalWeeklyNarrative()); },

    async copyBottleneck() {
      const el = document.getElementById('bottleneck-prompt-text');
      if (!el) return;
      await copyPromptToClipboard(el.innerText);
      // Highlight step pills
      const pills = document.querySelectorAll('.step-pill');
      if (pills[0]) pills[0].classList.remove('active');
      if (pills[1]) pills[1].classList.add('active');
      if (pills[2]) { /* wait for paste */ }
      toast('Bottleneck prompt copied — paste into Claude.ai', 'success');
    },

    async saveBottleneck() {
      const text = document.getElementById('bottleneck-paste')?.value?.trim();
      if (!text) { toast('Paste Claude\'s analysis first', 'error'); return; }
      const { db } = getState();
      const result = await saveBottleneckResult(text, db);
      if (result.ok) {
        toast('Bottleneck analysis saved', 'success');
        // Show preview below the button in Report tab
        const sec = document.getElementById('bottleneck-result-section');
        if (sec) {
          sec.innerHTML = `
            <div class="card" style="border-left:3px solid var(--c-accent);">
              <div class="section-title" style="margin-bottom:6px;">Latest Analysis</div>
              <div style="font-size:12px;line-height:1.6;white-space:pre-wrap;">${escHtml(text.slice(0,600))}${text.length>600?'…':''}</div>
            </div>`;
        }
      } else {
        toast('Save failed — check console', 'error');
      }
      closeModal();
    },

    async copyPD() {
      const el = document.getElementById('pd-prompt-text');
      if (el) { await copyPromptToClipboard(el.innerText); toast('PD prompt copied', 'success'); }
    },

    savePD(name) {
      const text = document.getElementById('pd-paste')?.value?.trim();
      if (!text) { toast('Paste the PD brief first', 'error'); return; }
      sessionStorage.setItem('argus_pd_' + name, text);
      toast(`PD brief saved for ${name}`, 'success');
      closeModal();
    },

    async copyNarrative() {
      const el = document.getElementById('narrative-prompt-text');
      if (el) { await copyPromptToClipboard(el.innerText); toast('Weekly narrative prompt copied', 'success'); }
    },

    saveNarrative() {
      const text = document.getElementById('narrative-paste')?.value?.trim();
      if (!text) { toast('Paste the narrative first', 'error'); return; }
      sessionStorage.setItem('argus_weekly_narrative', text);
      toast('Weekly narrative saved', 'success');
      closeModal();
    },
  };
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
