// ============================================================
// ARGUSINTEL — DUMMY DATA MODULE
// js/modules/dummy-data.js
//
// All dummy/test data lives here and ONLY here.
// When VERSION_TEST is OFF (manager toggle), nothing from this
// file is used. When ON, this data populates every tab.
// Isolating here means: safe to wipe, never touches real data.
// ============================================================

export const DUMMY_ROSTER = [
  { name: 'Charles', key: 'charles', role: 'Manager', site: 'All' },
  { name: 'Ana',     key: 'ana',     role: 'Core Team', site: 'Site A' },
  { name: 'Ben',     key: 'ben',     role: 'Core Team', site: 'Site C' },
  { name: 'Lei',     key: 'lei',     role: 'Core Team', site: 'Site B' },
  { name: 'Marco',   key: 'marco',   role: 'Site Engineer', site: 'Site C' },
];

export const DUMMY_TASKS = [
  {
    id: 'T-041', desc: 'Road alignment study — Phase 2 submission package',
    person: 'Ana', status: 'Ongoing', priority: 'High', gravity: 'red',
    deadline: '2025-04-26', daysActive: 14, notes: 3,
    cswRef: 'CSW-019', site: 'Site A',
    notesHistory: [
      { author: 'Ana', date: '2025-04-20', text: 'Revised alignment per client comment on curve radius' },
      { author: 'Charles', date: '2025-04-22', text: 'Approved revised plan — proceed with submission' },
      { author: 'Ana', date: '2025-04-23', text: 'Package 90% complete — pending DPWH cover letter' },
    ]
  },
  {
    id: 'T-039', desc: 'Earthfill volume calculation — revised per client comment',
    person: 'Ana', status: 'Ongoing', priority: 'Medium', gravity: 'amber',
    deadline: '2025-04-30', daysActive: 7, notes: 1,
    cswRef: null, site: 'Site A',
    notesHistory: [
      { author: 'Ana', date: '2025-04-18', text: 'Client requested 15% reduction in fill volume at north berm' },
    ]
  },
  {
    id: 'T-037', desc: 'Retaining wall slope check — Site C access road',
    person: 'Ben', status: 'Blocked', priority: 'High', gravity: 'red',
    deadline: '2025-05-02', daysActive: 21, notes: 5,
    cswRef: 'CSW-031', site: 'Site C',
    notesHistory: [
      { author: 'Ben', date: '2025-04-02', text: 'Initial measurement taken — slope at 1:1.2 vs 1:1.5 standard' },
      { author: 'Ben', date: '2025-04-08', text: 'Awaiting site access clearance for re-survey' },
      { author: 'Charles', date: '2025-04-10', text: 'Escalated to CSW-031. Flagged to site coordinator.' },
      { author: 'Ben', date: '2025-04-15', text: 'Access still not granted. Blocked.' },
      { author: 'Charles', date: '2025-04-22', text: 'Following up with site owner. Priority raised.' },
    ]
  },
  {
    id: 'T-033', desc: 'Standard drainage buffer audit — all active sites',
    person: 'Lei', status: 'Pending', priority: 'Low', gravity: 'green',
    deadline: '2025-05-10', daysActive: 3, notes: 0,
    cswRef: 'CSW-014', site: 'All',
    notesHistory: []
  },
  {
    id: 'T-029', desc: 'Geotechnical boring log review — Site B expansion area',
    person: 'Lei', status: 'Pending', priority: 'Medium', gravity: 'amber',
    deadline: '2025-05-15', daysActive: 5, notes: 2,
    cswRef: null, site: 'Site B',
    notesHistory: [
      { author: 'Lei', date: '2025-04-19', text: 'Boring logs received from sub-contractor' },
      { author: 'Lei', date: '2025-04-21', text: 'SPT values at 6m depth below design standard — flagging' },
    ]
  },
  {
    id: 'T-025', desc: 'Monthly accomplishment report — April 2025',
    person: 'Charles', status: 'Ongoing', priority: 'Medium', gravity: 'amber',
    deadline: '2025-04-30', daysActive: 2, notes: 0,
    cswRef: null, site: 'All',
    notesHistory: []
  },
];

export const DUMMY_CSW = [
  {
    id: 'CSW-031', title: 'Retaining wall slope exceedance — Site C access road',
    type: 'Structural', site: 'Site C', owner: 'Ben', gravity: 'red',
    status: 'Ongoing', priority: 'High',
    situation: 'Measured slope ratio 1:1.2 exceeds standard 1:1.5 at access road retaining wall.',
    impact: 'Risk of soil movement and road instability during heavy rain. Site access may be compromised.',
    rootCause: 'Design change during construction not reflected in engineering drawings.',
    recommendation: 'Option A: Re-grade slope to 1:1.5. Option B: Install gabion reinforcement. Option C: Temporary barrier + monitoring until re-survey.',
    linkedTask: 'T-037',
  },
  {
    id: 'CSW-028', title: 'Drainage buffer non-compliance — Site B east boundary',
    type: 'Environmental', site: 'Site B', owner: 'Ana', gravity: 'amber',
    status: 'Pending', priority: 'Medium',
    situation: 'East boundary drainage buffer measured at 3.8m vs required 5m minimum.',
    impact: 'Potential environmental violation. Regulatory review may halt site works.',
    rootCause: 'Buffer standard not applied during initial layout. System gap — standard not in roster checklist.',
    recommendation: 'Option A: Relocate east boundary fence. Option B: Install engineered drainage channel within buffer. Option C: Apply for variance with mitigation plan.',
    linkedTask: null,
  },
  {
    id: 'CSW-019', title: 'Slope stability report — pending DPWH response',
    type: 'Geotechnical', site: 'Site A', owner: 'Ana', gravity: 'amber',
    status: 'Ongoing', priority: 'High',
    situation: 'DPWH slope stability requirements not yet confirmed for Phase 2 submission.',
    impact: 'Submission delay risk. Road alignment cannot be finalized without DPWH sign-off.',
    rootCause: 'Coordination gap — DPWH requirement not included in project timeline.',
    recommendation: 'Option A: Submit with current standards + addendum. Option B: Request expedited DPWH review. Option C: Revise submission timeline by 2 weeks.',
    linkedTask: 'T-041',
  },
  {
    id: 'CSW-014', title: 'Drainage buffer compliance — standard in place check',
    type: 'Standard', site: 'All', owner: 'Charles', gravity: 'green',
    status: 'Approved', priority: 'Low',
    situation: 'Recurring issue of drainage buffer non-compliance across multiple sites.',
    impact: 'Regulatory and environmental risk if not consistently applied.',
    rootCause: 'Standard exists but not embedded in site checklist or onboarding.',
    recommendation: 'Option A: Add to all site checklists. Option B: Monthly audit. Option C: Training session + sign-off.',
    linkedTask: 'T-033',
  },
];

export const DUMMY_RECALL = {
  id: 'CSW-014',
  title: 'Drainage buffer compliance audit standard',
  question: 'CSW-014: Drainage buffer minimum setbacks — is this standard currently applied at your site?',
};

export const DUMMY_DIGEST = {
  date: 'April 24, 2025',
  published: true,
  body: `Road alignment Phase 2 deadline in 2 days (T-041 — Ana). Ben's retaining wall task (T-037) remains blocked — site access clearance still pending, priority escalated. CSW-031 flagged for structural review. Lei has 2 pending items this week — check if any support is needed. 3 upcoming deadlines this week across the team.`,
  aiSuggestions: [
    { id: 'sug-1', text: 'Highlight Ben\'s blocked status — prompt team support or site coordinator follow-up', added: false },
    { id: 'sug-2', text: 'Mention Lei\'s 2 pending items — check for hidden blockers before week end', added: false },
    { id: 'sug-3', text: 'Acknowledge Ana\'s Phase 2 progress — morale note before deadline push', added: false },
  ],
};

export const DUMMY_STANDARDS = [
  { id: 'STD-001', title: 'Drainage buffer minimum setbacks', type: 'Environmental', site: 'All', category: 'Compliance', linkedCSW: 'CSW-014', status: 'Active' },
  { id: 'STD-002', title: 'Retaining wall slope design limit (1:1.5)', type: 'Structural', site: 'All', category: 'Design', linkedCSW: 'CSW-031', status: 'Active' },
  { id: 'STD-003', title: 'Road alignment horizontal clearance', type: 'Civil', site: 'Site A, B', category: 'Design', linkedCSW: 'CSW-019', status: 'Active' },
  { id: 'STD-004', title: 'SPT boring minimum depth at structure foundations', type: 'Geotechnical', site: 'All', category: 'Investigation', linkedCSW: null, status: 'Active' },
];

export const DUMMY_VERSION = {
  label: 'v0.1-test',
  note: 'Version Test — dummy data active',
};
