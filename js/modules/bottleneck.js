// ============================================================
// ARGUSINTEL — BOTTLENECK PROMPT MODULE
// js/modules/bottleneck.js
//
// This module is ALWAYS functional — in test mode and live.
// It is the Step 3 engine: pulls current data, generates
// a structured AI prompt, copies to clipboard.
// Manager pastes to Claude → pastes result back → saved.
// ============================================================

import { getState } from '../app.js';

// ============================================================
// GENERATE BOTTLENECK ANALYSIS PROMPT
// Pulls live task + CSW data, builds structured prompt
// ============================================================
export function generateBottleneckPrompt() {
  const { tasks, csws, roster, currentUser } = getState();

  const blockedTasks = tasks.filter(t => t.status === 'Blocked');
  const staleTasks   = tasks.filter(t => t.status === 'Ongoing' && t.daysActive >= 14);
  const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Done');
  const openCSW      = csws.filter(c => c.status === 'Ongoing' || c.status === 'Pending');

  const taskLines = tasks.map(t =>
    `  [${t.id}] ${t.desc} | Owner: ${t.person} | Status: ${t.status} | Priority: ${t.priority} | Gravity: ${t.gravity} | Days active: ${t.daysActive} | Deadline: ${t.deadline}`
  ).join('\n');

  const cswLines = openCSW.map(c =>
    `  [${c.id}] ${c.title} | Owner: ${c.owner} | Status: ${c.status} | Type: ${c.type} | Site: ${c.site}`
  ).join('\n');

  const blockedLines = blockedTasks.map(t =>
    `  [${t.id}] ${t.desc} | Owner: ${t.person} | Days blocked: ${t.daysActive}`
  ).join('\n') || '  None currently blocked.';

  const staleLines = staleTasks.map(t =>
    `  [${t.id}] ${t.desc} | Owner: ${t.person} | Days active: ${t.daysActive}`
  ).join('\n') || '  No stale items.';

  const rosterLines = roster.map(r =>
    `  ${r.name} (${r.role}) — ${r.site}`
  ).join('\n');

  const today = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const prompt = `
=== ARGUSINTEL — BOTTLENECK ANALYSIS REQUEST ===
Generated: ${today}
Requested by: ${currentUser}

---

CONTEXT:
You are analyzing the workload of a Land Planning & Engineering team (${roster.length} people).
Your job is to identify real bottlenecks, surface root causes, and give actionable guidance.
Be direct. Use the person's names. Do not be vague.

---

FULL TASK LIST:
${taskLines || '  (No tasks on record)'}

---

OPEN CSW ITEMS:
${cswLines || '  (No open CSWs)'}

---

CURRENTLY BLOCKED TASKS:
${blockedLines}

---

STALE ONGOING TASKS (14+ days):
${staleLines}

---

TEAM ROSTER:
${rosterLines}

---

ANALYSIS INSTRUCTIONS:
Please provide your analysis in this exact format:

1. TOP 3 BOTTLENECKS
   For each: Name the bottleneck, who owns it, why it matters, and what is causing it.

2. WORKLOAD BALANCE
   Is the work distributed fairly? Who is overloaded? Who has capacity?

3. IMMEDIATE ACTIONS RECOMMENDED
   Give 3 to 5 specific actions Charles (Manager) should take this week.
   Be specific: name the person, the task, and the exact action.

4. SYSTEMIC ISSUES
   Are there patterns that will keep causing problems if not addressed?
   (e.g. standard not embedded, coordination gaps, information not flowing)

5. TONE ADJUSTMENT (for team comms)
   Based on this data, should the manager's tone be urgent, supportive, or steady?
   Give a one-sentence rationale.

---
Reply with the analysis only. No preamble.
=== END OF PROMPT ===
`.trim();

  return prompt;
}

// ============================================================
// SAVE BOTTLENECK RESULT
// Paste-back handler — saves AI response as a versioned entry
// ============================================================
export async function saveBottleneckResult(resultText, db) {
  const { currentUser } = getState();
  const entry = {
    text: resultText,
    generatedBy: currentUser,
    timestamp: new Date().toISOString(),
    version: Date.now(),
  };

  try {
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await addDoc(collection(db, 'bottleneck_results'), entry);
    return { ok: true };
  } catch (err) {
    console.error('Bottleneck save error:', err);
    return { ok: false, error: err.message };
  }
}

// ============================================================
// COPY PROMPT TO CLIPBOARD
// ============================================================
export async function copyPromptToClipboard(promptText) {
  try {
    await navigator.clipboard.writeText(promptText);
    return true;
  } catch {
    // Fallback for older mobile browsers
    const el = document.createElement('textarea');
    el.value = promptText;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}
