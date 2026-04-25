// ============================================================
// ARGUSINTEL — PROMPTS MODULE
// js/modules/prompts.js
//
// All AI prompt generators live here.
// Each function returns a string — copy to clipboard,
// user pastes to Claude, pastes result back to app.
// ============================================================

import { getState } from '../app.js';

// ============================================================
// DIGEST PROMPT — Tab 4 (Daily), Manager only
// ============================================================
export function generateDigestPrompt(managerContext = '') {
  const { tasks, csws } = getState();
  const today = new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric' });

  const urgent = tasks.filter(t => t.priority === 'High' && t.status !== 'Done');
  const blocked = tasks.filter(t => t.status === 'Blocked');

  const urgentLines = urgent.map(t => `  - ${t.desc} (${t.person}, due ${t.deadline})`).join('\n');
  const blockedLines = blocked.map(t => `  - ${t.desc} (${t.person}, ${t.daysActive}d blocked)`).join('\n');
  const cswLines = csws.filter(c => c.status === 'Ongoing').map(c => `  - ${c.id}: ${c.title} (${c.owner})`).join('\n');

  return `
=== ARGUSINTEL — DAILY DIGEST PROMPT ===
Date: ${today}

MANAGER CONTEXT:
${managerContext || '(No additional context added)'}

HIGH PRIORITY TASKS:
${urgentLines || '  None'}

BLOCKED TASKS:
${blockedLines || '  None'}

OPEN CSW ITEMS:
${cswLines || '  None'}

INSTRUCTIONS:
Write a morning digest for the Planning & Engineering team.
Format:
- 3 to 4 short paragraphs
- Paragraph 1: What's urgent today and why
- Paragraph 2: Any blocked items needing team support
- Paragraph 3: CSW updates worth noting
- Paragraph 4: A short motivational or directional closing line
Tone: professional, direct, warm. This is read by engineers first thing in the morning.
Keep total length under 200 words.
=== END ===
`.trim();
}

// ============================================================
// TEAM OVERVIEW PROMPT — Tab 4 (Daily), Manager only
// ============================================================
export function generateTeamOverviewPrompt(meetingContext = '') {
  const { tasks, roster } = getState();
  const personStats = roster.map(r => {
    const mine = tasks.filter(t => t.person === r.name);
    return `  ${r.name} (${r.role}): Ongoing: ${mine.filter(t=>t.status==='Ongoing').length}, Pending: ${mine.filter(t=>t.status==='Pending').length}, Blocked: ${mine.filter(t=>t.status==='Blocked').length}, Done this month: ${mine.filter(t=>t.status==='Done').length}`;
  }).join('\n');

  return `
=== ARGUSINTEL — TEAM OVERVIEW PROMPT ===
Meeting Context: ${meetingContext || 'Regular team check-in'}

TEAM TASK SUMMARY:
${personStats}

INSTRUCTIONS:
Write a short motivational team awareness message from the manager (Charles).
Cover: who is performing well, who might need support, what the team focus should be this week.
Keep it under 150 words. Warm but clear tone.
=== END ===
`.trim();
}

// ============================================================
// WELLBEING PROMPT — Tab 4 (Daily), Manager only
// One prompt for all staff at once
// ============================================================
export function generateWellbeingPrompt() {
  const { tasks, roster } = getState();
  const personData = roster.filter(r => r.role !== 'Manager').map(r => {
    const mine = tasks.filter(t => t.person === r.name);
    const blocked = mine.filter(t => t.status === 'Blocked').length;
    const stale = mine.filter(t => t.daysActive >= 14).length;
    return `  ${r.name} — Blocked items: ${blocked}, Stale tasks: ${stale}, Total active: ${mine.filter(t=>t.status!=='Done').length}`;
  }).join('\n');

  return `
=== ARGUSINTEL — WELLBEING ANALYSIS PROMPT ===

TEAM WORKLOAD DATA:
${personData}

INSTRUCTIONS:
For each team member listed, give 3 short suggestions for the manager:
1. Morale / appreciation angle
2. Performance coaching angle
3. Routine / workload relief suggestion
Keep each suggestion to 1 sentence. Be specific to the workload data.
Format as: [Name]: 1. ... 2. ... 3. ...
=== END ===
`.trim();
}

// ============================================================
// WORKLOAD SUMMARY PROMPT — Tab 2 (Work)
// ============================================================
export function generateWorkloadSummaryPrompt(targetPerson = 'All') {
  const { tasks } = getState();
  const filtered = targetPerson === 'All' ? tasks : tasks.filter(t => t.person === targetPerson);

  const lines = filtered.map(t =>
    `  [${t.id}] ${t.desc} | ${t.person} | ${t.status} | ${t.priority} | Due: ${t.deadline} | Days: ${t.daysActive}`
  ).join('\n');

  return `
=== ARGUSINTEL — WORKLOAD SUMMARY PROMPT ===
Target: ${targetPerson}

CURRENT TASKS:
${lines || '  No tasks found'}

INSTRUCTIONS:
Produce a clean summary table with columns:
ID | Description | Owner | Status | Priority | Deadline | Days Active
Then below the table, write 3 bullet points summarizing:
- Overall workload health
- Anything overdue or at risk
- Recommended next focus
=== END ===
`.trim();
}

// ============================================================
// MONTHLY PD PROMPT — Tab 5 (Report), Manager only
// ============================================================
export function generatePDPrompt(personName) {
  const { tasks, csws } = getState();
  const myTasks = tasks.filter(t => t.person === personName);
  const myCSW = csws.filter(c => c.owner === personName);

  const taskLines = myTasks.map(t => `  [${t.id}] ${t.desc} | ${t.status} | ${t.daysActive}d`).join('\n');
  const cswLines = myCSW.map(c => `  [${c.id}] ${c.title} | ${c.status}`).join('\n');

  return `
=== ARGUSINTEL — MONTHLY PD BRIEF — ${personName.toUpperCase()} ===

TASK HISTORY THIS MONTH:
${taskLines || '  No tasks'}

CSW INVOLVEMENT:
${cswLines || '  No CSW items'}

INSTRUCTIONS:
Write a coaching brief for ${personName}'s monthly performance discussion.
Cover:
1. What they did well (cite specific tasks)
2. Areas to develop (based on stale or blocked items)
3. One goal for next month
Keep total under 200 words. Manager tone — honest, supportive.
=== END ===
`.trim();
}

// ============================================================
// WEEKLY NARRATIVE PROMPT — Tab 5 (Report), Manager only
// ============================================================
export function generateWeeklyNarrativePrompt() {
  const { tasks, csws } = getState();
  const done = tasks.filter(t => t.status === 'Done');
  const blocked = tasks.filter(t => t.status === 'Blocked');
  const openCSW = csws.filter(c => c.status !== 'Approved');

  return `
=== ARGUSINTEL — WEEKLY NARRATIVE PROMPT ===

COMPLETED THIS WEEK:
${done.map(t=>`  - ${t.desc} (${t.person})`).join('\n') || '  None marked done'}

BLOCKED / AT RISK:
${blocked.map(t=>`  - ${t.desc} (${t.person}, ${t.daysActive}d)`).join('\n') || '  None'}

OPEN CSW:
${openCSW.map(c=>`  - ${c.id}: ${c.title}`).join('\n') || '  None'}

INSTRUCTIONS:
Write a weekly progress narrative (not just numbers).
Cover: what was achieved, what is at risk, what decisions are needed next week.
Write as if presenting to a department head. Max 3 paragraphs, 250 words total.
=== END ===
`.trim();
}

// ============================================================
// FILE IMPORT PROMPT — Tab 2 (Work), Step 1 of 3
// ============================================================
export function generateFileImportPrompt(existingSummary = '') {
  return `
=== ARGUSINTEL — FILE IMPORT PROMPT SORTER ===

EXISTING WORKLOAD SUMMARY:
${existingSummary || '(Paste or describe current workload here before sending)'}

INSTRUCTIONS FOR ATTACHED FILE:
You are helping integrate a new file (Excel/PDF/DOCX/image) into our engineering workload tracker.

For each item found in the attached file:
1. Identify if it is a task, a concern, a site issue, or an informational item
2. Check if it is SIMILAR to anything in the Existing Workload Summary above
3. Classify it as: NEW / SIMILAR / DUPLICATE
4. For each item output:
   - Description (clear, in English)
   - Suggested owner (if name appears)
   - Suggested priority: High / Medium / Low
   - Suggested gravity: red (urgent) / amber (watch) / green (routine)
   - Classification: NEW / SIMILAR / DUPLICATE
   - If SIMILAR: note which existing item it resembles

Output as a numbered list. Be concise. No preamble.
=== END ===
`.trim();
}

// ============================================================
// CSW FORMAL PROMPT — Tab 3 (CSW)
// ============================================================
export function generateCSWPrompt(cswData) {
  const { currentUser } = getState();
  return `
=== ARGUSINTEL — FORMAL CSW PROMPT ===
Raised by: ${currentUser}
Date: ${new Date().toLocaleDateString('en-PH')}

SITUATION:
${cswData.situation}

IMPACT:
${cswData.impact}

ROOT CAUSE:
${cswData.rootCause}

SITE / AREA: ${cswData.site}
TYPE: ${cswData.type}
GRAVITY: ${cswData.gravity}

INSTRUCTIONS:
Generate a formal Concern, Situation, and Warning (CSW) report.
Provide exactly 3 resolution options. For each option include:
- Description of the action
- Estimated cost level: Low / Medium / High
- Feasibility: Easy / Moderate / Complex
- Safety impact
- Required capability or resources

After the 3 options, add:
- Root cause classification: System Gap / Not Followed / External Factor
- Step-by-step implementation guide for the recommended option
- Signature block for: Charles (Engineer-in-Charge) and President

Format professionally. Clear section headers.
=== END ===
`.trim();
}
