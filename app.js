/* ================================================================
   app.js  —  QuestList Classroom Edition
   
   XP SYSTEM:
     - Performance Task  → +50 XP
     - Activity          → +25 XP

   LEVEL THRESHOLDS (cumulative XP to reach each level):
     Level 0 → 1  :  50 XP
     Level 1 → 2  : 100 XP
     Level 2 → 3  : 150 XP
     Level N → N+1: (N+1) * 50 XP

   REWARDS: Student picks 1 of 4 random options on every level up.
   TASKS:   Assigned by teacher via QR code only.
================================================================ */

'use strict';

/* ================================================================
   1. CONSTANTS
================================================================ */

/** XP awarded by task type */
const XP_VALUES = {
  performance: 50,
  activity:    25,
};

/**
 * Total XP needed to REACH a given level.
 * Level 0 is the starting level.
 * To advance from level N to N+1 you need (N+1)*50 XP earned in that level.
 *
 * xpToAdvance(0) = 50   (need 50 XP to go from lv0 → lv1)
 * xpToAdvance(1) = 100  (need 100 XP to go from lv1 → lv2)
 * xpToAdvance(2) = 150  ...
 * xpToAdvance(N) = (N+1)*50
 */
function xpToAdvance(level) {
  return (level + 1) * 50;
}

/** Titles displayed below the player's name per level */
const TITLES = [
  'Novice Scholar',      // level 0
  'Apprentice',          // level 1
  'Knowledge Seeker',    // level 2
  'Task Warrior',        // level 3
  'Rising Champion',     // level 4
  'Quest Master',        // level 5
  'Bronze Achiever',     // level 6
  'Silver Scholar',      // level 7
  'Gold Performer',      // level 8
  'Platinum Hero',       // level 9
  'Diamond Legend',      // level 10
  'Grandmaster',         // level 11+
];

function getTitle(level) {
  return TITLES[Math.min(level, TITLES.length - 1)];
}

/** Full reward pool — student picks 1 of 4 random options per level-up */
const REWARD_POOL = [
  { id: 'r01', icon: '🎮', name: 'Free Game Time',       desc: '15 min of free game time'           },
  { id: 'r02', icon: '🍫', name: 'Snack Pass',           desc: 'One snack of your choice'            },
  { id: 'r03', icon: '📚', name: 'Free Reading',         desc: '10 min free reading time'            },
  { id: 'r04', icon: '🎵', name: 'Music Pass',           desc: 'Listen to music while working'       },
  { id: 'r05', icon: '⭐', name: 'Gold Star',            desc: 'A gold star on the class board'      },
  { id: 'r06', icon: '💺', name: 'Seat Choice',          desc: 'Pick your own seat for the day'      },
  { id: 'r07', icon: '📖', name: 'Skip One Homework',    desc: 'Skip one homework assignment'        },
  { id: 'r08', icon: '🎨', name: 'Art Break',            desc: '10 min of free drawing time'         },
  { id: 'r09', icon: '🏅', name: 'Class Helper Badge',   desc: 'Be the class helper today'           },
  { id: 'r10', icon: '🕹️', name: 'Extra Recess',         desc: '5 extra minutes of recess'           },
  { id: 'r11', icon: '📝', name: 'Sticker Pack',         desc: 'Choose a sticker pack from teacher'  },
  { id: 'r12', icon: '🧩', name: 'Puzzle Time',          desc: '10 min of brain game / puzzle'       },
  { id: 'r13', icon: '📢', name: 'Line Leader',          desc: 'Lead the class line today'           },
  { id: 'r14', icon: '🌟', name: 'Star Certificate',     desc: 'Receive a certificate of excellence' },
  { id: 'r15', icon: '🎤', name: 'Show & Tell',          desc: 'Bring one item for show & tell'      },
  { id: 'r16', icon: '🏆', name: 'Trophy Display',       desc: 'Your name on the class trophy board' },
];

const CONFETTI_COLORS = [
  '#a78bfa','#f472b6','#fbbf24','#34d399',
  '#60a5fa','#fb923c','#f87171','#818cf8',
];

/* ================================================================
   2. STATE
================================================================ */

let state = loadState();

function defaultState() {
  return {
    name:          '',
    level:         0,          // starts at level 0
    currentXP:     0,          // XP earned in current level
    totalXP:       0,          // lifetime XP
    tasks:         [],
    nextId:        1,
    earnedRewards: [],         // [{ level, rewardId }]
    pendingReward: false,      // true if level-up happened but reward not yet chosen
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('ql_classroom_v1');
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (_) { /* ignore parse errors */ }
  return defaultState();
}

function saveState() {
  try {
    localStorage.setItem('ql_classroom_v1', JSON.stringify(state));
  } catch (_) { /* ignore quota errors */ }
}

/* ================================================================
   3. UTILITY HELPERS
================================================================ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _toastTimer = null;
function showToast(message, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

function spawnXpFloat(text, anchorEl) {
  const rect = anchorEl
    ? anchorEl.getBoundingClientRect()
    : { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 };

  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = text;
  el.style.left = (rect.left + (rect.width || 0) / 2 - 30) + 'px';
  el.style.top  = (rect.top + window.scrollY - 10) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function spawnConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  wrap.innerHTML = '';

  for (let i = 0; i < 85; i++) {
    const p = document.createElement('div');
    p.className = 'cp';
    const size = 6 + Math.random() * 9;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size + Math.random() * 7}px;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      animation-duration: ${1.5 + Math.random() * 2.5}s;
      animation-delay: ${Math.random() * 0.7}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '3px'};
    `;
    wrap.appendChild(p);
  }

  setTimeout(() => { wrap.innerHTML = ''; }, 5500);
}

/** Returns 4 random rewards, preferring ones not yet claimed */
function pickRewardOptions() {
  const claimedIds = state.earnedRewards.map(r => r.rewardId);
  const unclaimed  = REWARD_POOL.filter(r => !claimedIds.includes(r.id));
  const pool       = unclaimed.length >= 4 ? unclaimed : REWARD_POOL;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
}

/* ================================================================
   4. RENDER FUNCTIONS
================================================================ */

/** Master render — called after every state change */
function render() {
  renderPlayerCard();
  renderTaskList();
  renderRewardsPanel();
}

/* ─── Player card ─── */
function renderPlayerCard() {
  document.getElementById('player-name').textContent  = state.name || 'Adventurer';
  document.getElementById('level-badge').textContent  = 'LVL ' + state.level;
  document.getElementById('player-title').textContent = getTitle(state.level);

  const needed = xpToAdvance(state.level);
  const pct    = Math.min(100, Math.round((state.currentXP / needed) * 100));

  document.getElementById('xp-fill').style.width     = pct + '%';
  document.getElementById('xp-numbers').textContent  = state.currentXP + ' / ' + needed + ' XP';
  document.getElementById('xp-hint').textContent     =
    (needed - state.currentXP) + ' XP needed to reach Level ' + (state.level + 1);

  const active = state.tasks.filter(t => !t.done).length;
  const done   = state.tasks.filter(t =>  t.done).length;

  document.getElementById('stat-active').textContent   = active;
  document.getElementById('stat-done').textContent     = done;
  document.getElementById('stat-total-xp').textContent = state.totalXP;
  document.getElementById('stat-rewards').textContent  = state.earnedRewards.length;
}

/* ─── Task list ─── */
function renderTaskList() {
  const listEl  = document.getElementById('task-list');
  const emptyEl = document.getElementById('empty-state');
  listEl.innerHTML = '';

  if (state.tasks.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  // Show active tasks first, then completed
  const sorted = [
    ...state.tasks.filter(t => !t.done),
    ...state.tasks.filter(t =>  t.done),
  ];

  sorted.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.type}${task.done ? ' done' : ''}`;
    card.dataset.id = task.id;

    const typeLabel = task.type === 'performance' ? '⚡ Performance Task' : '📝 Activity';
    const xpLabel   = task.type === 'performance' ? '+50 XP' : '+25 XP';

    card.innerHTML = `
      <div class="check-btn" data-id="${task.id}" title="${task.done ? 'Completed' : 'Mark as done'}">
        ${task.done ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-meta">
          <span class="type-tag ${task.type}">${typeLabel}</span>
          <span class="xp-badge">${task.done ? '✅ Done' : xpLabel}</span>
        </div>
      </div>
    `;

    listEl.appendChild(card);
  });
}

/* ─── Rewards panel ─── */
function renderRewardsPanel() {
  renderEarnedRewards();
  renderXpRoadmap();
}

function renderEarnedRewards() {
  const container = document.getElementById('earned-rewards-list');
  container.innerHTML = '';

  if (state.earnedRewards.length === 0) {
    container.innerHTML = `
      <div class="no-rewards">
        <span>🏆</span>
        No rewards yet — complete tasks to earn XP and level up!
      </div>
    `;
    return;
  }

  // Show most recently earned first
  [...state.earnedRewards].reverse().forEach(entry => {
    const reward = REWARD_POOL.find(r => r.id === entry.rewardId);
    if (!reward) return;

    const div = document.createElement('div');
    div.className = 'earned-reward';
    div.innerHTML = `
      <div class="earned-reward-icon">${reward.icon}</div>
      <div class="earned-reward-info">
        <div class="earned-reward-name">${reward.name}</div>
        <div class="earned-reward-sub">Earned at Level ${entry.level} · ${reward.desc}</div>
      </div>
      <span class="earned-reward-badge">✅ LVL ${entry.level}</span>
    `;
    container.appendChild(div);
  });
}

function renderXpRoadmap() {
  const container = document.getElementById('xp-roadmap');
  container.innerHTML = '';

  // Show levels 0 through current+4 (or at least 8 levels)
  const maxDisplay = Math.max(8, state.level + 5);

  for (let lv = 0; lv < maxDisplay; lv++) {
    const xpNeeded = xpToAdvance(lv);
    const isDone    = state.level > lv;
    const isCurrent = state.level === lv;
    const isFuture  = state.level < lv;

    const rowClass = isDone ? 'done' : isCurrent ? 'current' : 'future';
    const icon     = isDone ? '✅' : isCurrent ? '⚡' : '🔒';
    const status   = isDone ? 'DONE' : isCurrent ? 'IN PROGRESS' : '';

    const div = document.createElement('div');
    div.className = `roadmap-row ${rowClass}`;
    div.innerHTML = `
      <span class="roadmap-icon">${icon}</span>
      <span class="roadmap-level">Level ${lv}</span>
      <span class="roadmap-xp">${xpNeeded} XP to advance</span>
      <span class="roadmap-status">${status}</span>
    `;
    container.appendChild(div);
  }
}

/* ================================================================
   5. TASK ACTIONS
================================================================ */

/**
 * Called when student taps the check button on a task card.
 * Awards XP, checks for level-up, saves, re-renders.
 */
function completeTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || task.done) return;

  task.done      = true;
  const xpGain   = XP_VALUES[task.type];
  state.currentXP += xpGain;
  state.totalXP   += xpGain;

  // Show floating XP label near the task card
  const cardEl = document.querySelector(`.task-card[data-id="${taskId}"]`);
  spawnXpFloat('+' + xpGain + ' XP ⚡', cardEl);

  // Check for level-up BEFORE saving/rendering
  checkLevelUp();

  saveState();
  render();
  showToast('✅ Task done! +' + xpGain + ' XP earned!');
}

/**
 * Adds a new task that was received via QR code.
 * Called after student confirms the scanned text and selects task type.
 */
function addTaskFromQR(name, type) {
  if (!name || !name.trim()) return;

  state.tasks.push({
    id:   state.nextId++,
    name: name.trim(),
    type: type,        // 'performance' | 'activity'
    done: false,
  });

  saveState();
  render();
  showToast('📋 New quest added: "' + name.trim() + '"');
}

/* ================================================================
   6. LEVEL-UP SYSTEM
================================================================ */

function checkLevelUp() {
  const needed = xpToAdvance(state.level);

  if (state.currentXP >= needed) {
    // Carry over excess XP into the next level
    state.currentXP -= needed;
    state.level++;
    state.pendingReward = true;

    saveState();
    spawnConfetti();

    // Small delay so the XP bar animation plays first
    setTimeout(() => openRewardModal(), 600);
  }
}

/* ================================================================
   7. MODALS
================================================================ */

/* ─── Name modal ─── */
function openNameModal() {
  const input = document.getElementById('input-name');
  input.value = state.name || '';
  document.getElementById('modal-name').classList.add('open');
  setTimeout(() => input.focus(), 150);
}

function saveName() {
  const val = document.getElementById('input-name').value.trim();
  if (val) {
    state.name = val;
    saveState();
    render();
  }
  document.getElementById('modal-name').classList.remove('open');
}

/* ─── Reward choice modal ─── */
let _rewardOptions   = [];
let _selectedRewardId = null;

function openRewardModal() {
  _rewardOptions    = pickRewardOptions();
  _selectedRewardId = null;

  // Update modal text
  document.getElementById('modal-new-level').textContent = 'Level ' + state.level + '!';

  // Build the 4 option cards
  const grid = document.getElementById('reward-picker-grid');
  grid.innerHTML = '';

  _rewardOptions.forEach(reward => {
    const div = document.createElement('div');
    div.className   = 'reward-option';
    div.dataset.rid = reward.id;
    div.innerHTML = `
      <span class="reward-option-icon">${reward.icon}</span>
      <div class="reward-option-name">${reward.name}</div>
      <div class="reward-option-desc">${reward.desc}</div>
      <div class="reward-check">✓</div>
    `;
    div.addEventListener('click', () => selectReward(reward.id));
    grid.appendChild(div);
  });

  // Reset claim button
  document.getElementById('btn-claim').disabled = true;
  document.getElementById('modal-reward').classList.add('open');
}

function selectReward(rewardId) {
  _selectedRewardId = rewardId;

  // Highlight selected option
  document.querySelectorAll('.reward-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.rid === rewardId);
  });

  // Enable claim button
  document.getElementById('btn-claim').disabled = false;
}

function claimReward() {
  if (!_selectedRewardId) return;

  const reward = REWARD_POOL.find(r => r.id === _selectedRewardId);
  if (!reward) return;

  // Record the earned reward
  state.earnedRewards.push({
    level:    state.level,
    rewardId: _selectedRewardId,
  });
  state.pendingReward = false;

  saveState();
  render();

  document.getElementById('modal-reward').classList.remove('open');
  showToast('🎉 Reward claimed: ' + reward.icon + ' ' + reward.name + '!', 3200);
}

/* ─── QR Scanned → Task Type modal ─── */
let _pendingQRTaskName = '';

function openQRTypeModal(taskName) {
  _pendingQRTaskName = taskName;
  document.getElementById('qr-task-name').textContent = taskName;
  document.getElementById('modal-qr-type').classList.add('open');
}

function addScannedTask(type) {
  if (!_pendingQRTaskName) return;
  addTaskFromQR(_pendingQRTaskName, type);
  _pendingQRTaskName = '';
  document.getElementById('modal-qr-type').classList.remove('open');

  // Navigate to tasks tab
  switchTab('tasks', document.querySelector('[data-tab="tasks"]'));
}

function cancelQRModal() {
  _pendingQRTaskName = '';
  document.getElementById('modal-qr-type').classList.remove('open');
}

/* ================================================================
   8. TAB NAVIGATION
================================================================ */

function switchTab(tabName, clickedEl) {
  // Hide all panels, deactivate all tabs
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  // Show selected panel & mark tab active
  document.getElementById('panel-' + tabName).classList.add('visible');
  if (clickedEl) clickedEl.classList.add('active');

  // Stop camera when leaving scanner tab
  if (tabName !== 'scanner') stopScan();
}

/* ================================================================
   9. QR SCANNER
================================================================ */

let _scanning    = false;
let _stream      = null;
let _scanLoop    = null;
let _lastScanned = '';

async function startScan() {
  if (_scanning) return;

  try {
    _stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });

    const video = document.getElementById('qr-video');
    video.srcObject = _stream;
    await video.play();

    document.getElementById('video-wrap').style.display  = 'block';
    document.getElementById('btn-start-scan').style.display = 'none';
    document.getElementById('btn-stop-scan').style.display  = 'inline-flex';
    document.getElementById('qr-result').classList.remove('show');

    _lastScanned = '';
    _scanning    = true;
    _scanLoop    = setInterval(scanFrame, 180);

    showToast('📷 Camera ready — point at a QR code!');
  } catch (err) {
    showToast('📷 Camera unavailable or permission denied');
  }
}

function stopScan() {
  _scanning = false;
  clearInterval(_scanLoop);

  if (_stream) {
    _stream.getTracks().forEach(track => track.stop());
    _stream = null;
  }

  document.getElementById('video-wrap').style.display  = 'none';
  document.getElementById('btn-start-scan').style.display = 'inline-flex';
  document.getElementById('btn-stop-scan').style.display  = 'none';
}

function scanFrame() {
  const video  = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  if (!video || !canvas) return;
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  try {
    if (!window.jsQR) return;

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && code.data !== _lastScanned) {
      _lastScanned = code.data;

      // Pause scanning — wait for student to confirm
      clearInterval(_scanLoop);

      document.getElementById('qr-result-text').textContent = code.data;
      document.getElementById('qr-result').classList.add('show');
      showToast('✅ QR Code detected!');
    }
  } catch (_) { /* jsQR decode errors — ignore */ }
}

function acceptScan() {
  const taskName = document.getElementById('qr-result-text').textContent;
  if (!taskName) return;

  // Hide result banner, stop camera
  document.getElementById('qr-result').classList.remove('show');
  stopScan();

  // Ask student to choose task type
  openQRTypeModal(taskName);
}

function rejectScan() {
  // Clear result and resume scanning
  document.getElementById('qr-result').classList.remove('show');
  _lastScanned = '';

  if (_stream) {
    _scanLoop = setInterval(scanFrame, 180);
    _scanning = true;
  }
}

/* ================================================================
   10. DELEGATED EVENT LISTENERS
================================================================ */

// Check button clicks on task cards
document.addEventListener('click', function (e) {
  const checkBtn = e.target.closest('.check-btn');
  if (checkBtn && checkBtn.dataset.id) {
    completeTask(parseInt(checkBtn.dataset.id, 10));
  }
});

// ESC key closes non-critical modals
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  // Don't close reward modal if a reward is pending
  if (!state.pendingReward) {
    document.getElementById('modal-reward').classList.remove('open');
  }
  document.getElementById('modal-qr-type').classList.remove('open');
});

/* ================================================================
   11. INITIALISE
================================================================ */

function init() {
  render();

  // Show name modal on first visit (no name saved)
  if (!state.name) {
    document.getElementById('modal-name').classList.add('open');
    setTimeout(() => document.getElementById('input-name').focus(), 200);
  } else {
    document.getElementById('modal-name').classList.remove('open');
  }

  // Re-show reward modal if student refreshed mid level-up
  if (state.pendingReward) {
    setTimeout(() => openRewardModal(), 700);
  }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}