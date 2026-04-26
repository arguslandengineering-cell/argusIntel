// ============================================================
// ARGUSINTEL — TAB: REPORT  js/tabs/report.js
// ============================================================
import { getState, toast, showModal, closeModal } from '../app.js';
import { generateBottleneckPrompt, saveBottleneckResult, copyPromptToClipboard } from '../modules/bottleneck.js';
import { generatePDPrompt, generateWeeklyNarrativePrompt } from '../modules/prompts.js';

export function render() {
  const { tasks, csws, currentRole, roster } = getState();
  const isManager = currentRole === 'Manager';

  const topPriorities = [
    ...tasks.filter(t=>t.priority==='High'&&t.status!=='Done'),
    ...csws.filter(c=>c.priority==='High'&&c.status!=='Approved'),
  ].slice(0,5);

  const cswTotal    = csws.length;
  const cswApproved = csws.filter(c=>c.status==='Approved').length;
  const cswOpen     = csws.filter(c=>c.status!=='Approved'&&c.status!=='Rejected').length;
  const cswRate     = cswTotal>0?Math.round((cswApproved/cswTotal)*100):0;
  const taskTotal   = tasks.length;
  const taskDone    = tasks.filter(t=>t.status==='Done').length;
  const taskBlocked = tasks.filter(t=>t.status==='Blocked').length;
  const taskActive  = tasks.filter(t=>t.status==='Ongoing').length;

  const people = [...new Set(roster.map(r=>r.name))];
  const maxCSW  = Math.max(...people.map(p=>csws.filter(c=>c.owner===p).length),1);
  const maxWork = Math.max(...people.map(p=>tasks.filter(t=>t.person===p&&t.status!=='Done').length),1);

  // Stale = tasks + CSWs that are ongoing/pending AND have no update in 7+ days
  const now = Date.now();
  const staleWork = tasks.filter(t=>t.status!=='Done'&&t.daysActive>=7);
  const staleCSW  = csws.filter(c=>c.status!=='Approved'&&c.status!=='Rejected'&&(c.daysActive||0)>=7);

  const colors = ['#378ADD','#1D9E75','#EF9F27','#534AB7','#E24B4A'];

  return `
    <div class="module-label">TAB-05 · REPORT</div>

    <div class="section-title">Top Priorities</div>
    ${topPriorities.length===0
      ? `<div class="empty-state">No high-priority items.</div>`
      : topPriorities.map(item=>{
          const isCSW = Boolean(item.title);
          const name  = isCSW?item.title:item.desc;
          const owner = isCSW?item.owner:item.person;
          const days  = item.daysActive||0;
          const cls   = days>=14?'tp-red':days>=7?'tp-amber':'tp-green';
          const badge = days>=14?'badge-red':'badge-amber';
          const tab   = isCSW?'csw':'work';
          return `<div class="top-priority-card ${cls}" onclick="window.argus.switchTab('${tab}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div>
                <div style="font-size:12px;font-weight:600;margin-bottom:3px;color:var(--text);">${escHtml(name.slice(0,70))}${name.length>70?'…':''}</div>
                <div style="font-size:11px;color:var(--text3);">${item.id} · ${owner} · ${days}d active</div>
              </div>
              <span class="badge ${badge}">${days>=14?'Prolonged':'On Track'}</span>
            </div>
          </div>`;
        }).join('')}

    <div class="divider"></div>

    <div class="section-title">Scorecard</div>
    <div class="notice" style="margin-bottom:8px;font-size:11px;">Tap any metric to navigate to the relevant section</div>
    <div class="metric-row">
      <div class="metric" onclick="window.report.scoreNav('csw-total')">
        <div class="metric-val">${cswTotal}</div><div class="metric-lbl">CSW Total</div></div>
      <div class="metric" onclick="window.report.scoreNav('csw-approved')">
        <div class="metric-val" style="color:var(--c-accent)">${cswApproved}</div><div class="metric-lbl">Approved</div></div>
      <div class="metric" onclick="window.report.scoreNav('csw-open')">
        <div class="metric-val" style="color:var(--c-amber)">${cswOpen}</div><div class="metric-lbl">Open CSW</div></div>
      <div class="metric" onclick="window.report.scoreNav('approval-rate')">
        <div class="metric-val" style="color:var(--c-blue)">${cswRate}%</div><div class="metric-lbl">Approval Rate</div></div>
    </div>
    <div class="metric-row">
      <div class="metric" onclick="window.report.scoreNav('task-total')">
        <div class="metric-val">${taskTotal}</div><div class="metric-lbl">Tasks Total</div></div>
      <div class="metric" onclick="window.report.scoreNav('task-done')">
        <div class="metric-val" style="color:var(--c-accent)">${taskDone}</div><div class="metric-lbl">Done</div></div>
      <div class="metric" onclick="window.report.scoreNav('task-blocked')">
        <div class="metric-val" style="color:var(--c-red)">${taskBlocked}</div><div class="metric-lbl">Blocked</div></div>
      <div class="metric" onclick="window.report.scoreNav('task-active')">
        <div class="metric-val" style="color:var(--c-blue)">${taskActive}</div><div class="metric-lbl">Active</div></div>
    </div>

    <div class="divider"></div>

    <div class="section-title">CSW Load by Owner</div>
    <div class="chart-bar-wrap">
      ${people.map((p,i)=>{
        const count = csws.filter(c=>c.owner===p).length;
        return `<div class="chart-row" onclick="window.report.openCSWByOwner('${p}')">
          <span class="chart-label">${p}</span>
          <div class="chart-track"><div class="chart-fill" style="width:${Math.round((count/maxCSW)*100)}%;background:${colors[i%colors.length]};"></div></div>
          <span class="chart-val">${count}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title">Work Load by Owner</div>
    <div class="chart-bar-wrap">
      ${people.map((p,i)=>{
        const count = tasks.filter(t=>t.person===p&&t.status!=='Done').length;
        return `<div class="chart-row" onclick="window.report.openWorkByOwner('${p}')">
          <span class="chart-label">${p}</span>
          <div class="chart-track"><div class="chart-fill" style="width:${Math.round((count/maxWork)*100)}%;background:${colors[i%colors.length]};"></div></div>
          <span class="chart-val">${count}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="divider"></div>

    <div class="section-title">Stale &amp; Not Implemented</div>
    <div class="notice" style="margin-bottom:8px;font-size:11px;">Work tasks and CSWs ongoing/pending for 7+ days with no recent update</div>
    ${staleWork.length===0&&staleCSW.length===0
      ? `<div class="empty-state">No stale items — all active items recently updated.</div>`
      : [
          ...staleWork.map(t=>`
            <div class="card" style="border-left:3px solid var(--c-amber);margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div>
                  <div style="font-size:12px;font-weight:600;color:var(--text);">${escHtml(t.desc.slice(0,70))}</div>
                  <div style="font-size:11px;color:var(--text3);margin-top:2px;">${t.id} · ${t.person} · ${t.daysActive}d active</div>
                </div>
                <span class="badge badge-amber">Work</span>
              </div>
            </div>`),
          ...staleCSW.map(c=>`
            <div class="card" style="border-left:3px solid var(--c-blue);margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div>
                  <div style="font-size:12px;font-weight:600;color:var(--text);">${escHtml(c.title.slice(0,70))}</div>
                  <div style="font-size:11px;color:var(--text3);margin-top:2px;">${c.id} · ${c.owner} · ${c.status}</div>
                </div>
                <span class="badge badge-blue">CSW</span>
              </div>
            </div>`),
        ].join('')}

    ${isManager ? renderManagerSection(roster) : ''}`;
}

function renderManagerSection(roster) {
  const staff = roster.filter(r=>r.role!=='Manager');
  return `
    <div class="divider"></div>
    <div class="section-title" style="color:var(--c-accent);">◈ Bottleneck Analysis</div>
    <div class="notice" style="border-color:var(--c-accent)44;margin-bottom:10px;">
      <span>Manager only.</span> Analyses full team performance — both CSW and workload as a whole, with staff context.
      Always functional regardless of test mode.
    </div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.openBottleneck()">◈ Generate Bottleneck Prompt</button>
    </div>
    <div id="bottleneck-result-section" style="margin-top:10px;"></div>

    <div class="divider"></div>
    <div class="section-title">Monthly PD Prompts</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${staff.map(r=>`<button class="btn btn-sm" onclick="window.report.openPD('${r.name}')">◉ ${r.name}</button>`).join('')}
    </div>

    <div class="divider"></div>
    <div class="section-title">Weekly Narrative</div>
    <div class="row">
      <button class="btn btn-sm" onclick="window.report.openWeeklyNarrative()">▤ Build Weekly Narrative</button>
    </div>`;
}

// ── BOTTLENECK MODAL (3-step) ──
function modalBottleneck(step) {
  const pills = ['1 Copy Prompt','2 Claude.ai','3 Paste Back'].map((l,i)=>
    `<span class="step-pill ${i+1===step?'active':i+1<step?'done':''}">${l}</span>`).join('');
  const prompt = generateBottleneckPrompt();

  if (step===1) return `
    <div class="modal-title">◈ Bottleneck Analysis</div>
    <div class="step-pills">${pills}</div>
    <div class="notice"><span>Step 1:</span> Copy the prompt below and paste it into Claude.ai.</div>
    <div class="prompt-box" id="bottleneck-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyBottleneck()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
    </div>
    <div class="row" style="margin-top:4px;">
      <button class="btn btn-primary btn-sm" onclick="window.report.openBottleneckStep2()">Next →</button>
    </div>`;

  if (step===2) return `
    <div class="modal-title">◈ Bottleneck Analysis — Claude.ai</div>
    <div class="step-pills">${pills}</div>
    <div class="notice">Prompt pasted? Claude is analysing? Come back when you have the result.</div>
    <div class="row">
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      <button class="btn btn-primary" onclick="window.report.openBottleneckStep3()">Next: Paste Result →</button>
    </div>
    <div class="row" style="margin-top:4px;">
      <button class="btn" onclick="window.report.openBottleneck()">← Back</button>
    </div>`;

  if (step===3) return `
    <div class="modal-title">◈ Bottleneck Analysis — Paste Result</div>
    <div class="step-pills">${pills}</div>
    <div class="notice">Paste Claude's full bottleneck analysis below. It will be saved to the Report tab.</div>
    <textarea class="paste-area" id="bottleneck-paste" placeholder="Paste Claude's bottleneck analysis here..."></textarea>
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-primary" onclick="window.report.saveBottleneck()">✔ Save Analysis</button>
      <button class="btn" onclick="window.report.openBottleneckStep2()">← Back</button>
    </div>`;
}

// ── PD MODAL ──
function modalPD(name) {
  const prompt = generatePDPrompt(name);
  return `
    <div class="modal-title">◉ Monthly PD — ${name}</div>
    <div class="notice">Copy → Claude.ai → paste result for your PD session notes.</div>
    <div class="prompt-box" id="pd-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyPD()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
      <button class="btn btn-sm" onclick="window.argus.closeModal()">Close</button>
    </div>
    <div class="divider"></div>
    <div class="form-group"><label class="form-label">Paste PD Brief Result</label>
      <textarea class="paste-area" id="pd-paste" placeholder="Paste Claude's PD coaching brief here..."></textarea></div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.savePD('${name}')">✔ Save PD Brief</button>
    </div>`;
}

// ── WEEKLY NARRATIVE MODAL ──
function modalWeeklyNarrative() {
  const prompt = generateWeeklyNarrativePrompt();
  return `
    <div class="modal-title">▤ Weekly Narrative Prompt</div>
    <div class="notice">Copy → Claude.ai → paste as your weekly report.</div>
    <div class="prompt-box" id="narrative-prompt-text">${escHtml(prompt)}</div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.copyNarrative()">◈ Copy Prompt</button>
      <button class="btn btn-sm" onclick="window.open('https://claude.ai','_blank')">Open Claude.ai →</button>
    </div>
    <div class="divider"></div>
    <div class="form-group"><label class="form-label">Paste Weekly Report Result</label>
      <textarea class="paste-area" id="narrative-paste" placeholder="Paste Claude's weekly narrative here..."></textarea></div>
    <div class="row">
      <button class="btn btn-primary" onclick="window.report.saveNarrative()">✔ Save Report</button>
      <button class="btn" onclick="window.argus.closeModal()">Cancel</button>
    </div>`;
}

export function init() {
  window.report = {
    // ── SCORECARD NAV ──
    scoreNav(key) {
      const navMap = {
        'csw-approved':  ()=>{ window.argus.switchTab('csw'); sessionStorage.setItem('argus_csw_filter','Approved'); },
        'csw-open':      ()=>{ window.argus.switchTab('csw'); sessionStorage.setItem('argus_csw_filter','Ongoing'); },
        'task-done':     ()=>{ window.argus.switchTab('work'); sessionStorage.setItem('argus_work_filter','Done'); },
        'task-blocked':  ()=>{ window.argus.switchTab('work'); sessionStorage.setItem('argus_work_filter','Blocked'); },
        'task-active':   ()=>{ window.argus.switchTab('work'); sessionStorage.setItem('argus_work_filter','Ongoing'); },
        'csw-total':     ()=>{ window.argus.switchTab('daily'); toast('CSW progress overview — Daily tab','info'); },
        'task-total':    ()=>{ window.argus.switchTab('daily'); toast('Task progress overview — Daily tab','info'); },
        'approval-rate': ()=>{ window.argus.switchTab('daily'); toast('Approval rate expectation — Daily tab','info'); },
      };
      if (navMap[key]) { navMap[key](); }
      else toast('Navigate to relevant section','info');
    },

    // ── CHART NAV ──
    openCSWByOwner(person) {
      sessionStorage.setItem('argus_csw_owner_filter', person);
      window.argus.switchTab('csw');
      toast(`Showing CSW for ${person}`,'info');
    },
    openWorkByOwner(person) {
      sessionStorage.setItem('argus_work_person_filter', person);
      window.argus.switchTab('work');
      toast(`Showing work items for ${person}`,'info');
    },

    // ── BOTTLENECK (always active, manager only) ──
    openBottleneck()      { showModal(modalBottleneck(1)); },
    openBottleneckStep2() { showModal(modalBottleneck(2)); },
    openBottleneckStep3() { showModal(modalBottleneck(3)); },

    async copyBottleneck() {
      const el = document.getElementById('bottleneck-prompt-text');
      if (!el) return;
      await copyPromptToClipboard(el.innerText);
      toast('Bottleneck prompt copied — paste into Claude.ai','success');
    },

    async saveBottleneck() {
      const text = document.getElementById('bottleneck-paste')?.value?.trim();
      if (!text) { toast('Paste Claude\'s analysis first','error'); return; }
      const { db } = getState();
      const result = await saveBottleneckResult(text, db);
      const sec = document.getElementById('bottleneck-result-section');
      if (sec) sec.innerHTML=`
        <div class="card" style="border-left:3px solid var(--c-accent);">
          <div class="section-title" style="margin-bottom:6px;">Latest Analysis</div>
          <div style="font-size:12px;line-height:1.6;white-space:pre-wrap;color:var(--text);">${escHtml(text.slice(0,800))}${text.length>800?'…':''}</div>
        </div>`;
      toast(result.ok?'Bottleneck analysis saved':'Analysis saved locally','success');
      closeModal();
    },

    // ── PD ──
    openPD(name) { showModal(modalPD(name)); },
    async copyPD() {
      const el = document.getElementById('pd-prompt-text');
      if (el) { await copyPromptToClipboard(el.innerText); toast('PD prompt copied','success'); }
    },
    savePD(name) {
      const text = document.getElementById('pd-paste')?.value?.trim();
      if (!text) { toast('Paste the PD brief first','error'); return; }
      sessionStorage.setItem('argus_pd_'+name, text);
      toast(`PD brief saved for ${name}`,'success');
      closeModal();
    },

    // ── WEEKLY NARRATIVE ──
    openWeeklyNarrative() { showModal(modalWeeklyNarrative()); },
    async copyNarrative() {
      const el = document.getElementById('narrative-prompt-text');
      if (el) { await copyPromptToClipboard(el.innerText); toast('Weekly narrative prompt copied','success'); }
    },
    saveNarrative() {
      const text = document.getElementById('narrative-paste')?.value?.trim();
      if (!text) { toast('Paste the narrative first','error'); return; }
      sessionStorage.setItem('argus_weekly_narrative', text);
      toast('Weekly narrative saved','success');
      closeModal();
    },
  };
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
