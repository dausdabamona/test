// ============================================
// SYNC PLANNER v2.1 - OPTIMIZED VERSION
// ============================================

// CONFIG
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyUDbXWx5Is7ieQA6hnn1GH5RtB05OcLiW5EUhvKmDwKNbtw-K11ClgQobhkYijtj7kRA/exec',
  USER_ID: 'ea551f35-5726-4df8-88f8-03b3adb69e72',
  CACHE_DURATION: 5 * 60 * 1000, // 5 menit cache
  API_TIMEOUT: 15000 // 15 detik timeout
};

// STATE dengan cache tracking
const state = {
  dailySync: null,
  goals: [],
  kanban: null,
  habits: [],
  visions: [],
  pomodoroStats: null,
  pairwise: {
    items: [],
    comparisons: [],
    currentPair: 0,
    results: {}
  },
  selectedSholat: null,
  selectedGoalFilter: '',
  currentHabitFilter: 'all',
  // Cache timestamps
  cache: {
    dailySync: 0,
    goals: 0,
    kanban: 0,
    visions: 0,
    stats: 0
  },
  // Loading states
  loading: {
    initial: true,
    kanban: false,
    goals: false,
    stats: false
  },
  // Pomodoro Timer
  pomodoro: {
    active: false,
    type: null,
    duration: 0,
    remaining: 0,
    task: '',
    interval: null,
    startTime: null,
    isPaused: false
  },
  // Page loaded flags
  pageLoaded: {
    home: false,
    kanban: false,
    goals: false,
    stats: false,
    habits: false,
    vision: false,
    pairwise: false,
    pomodoro: false,
    menu: false,
    braindump: false,
    journal: false,
    dontlist: false,
    review: false,
    ibadah: false,
    bestweek: false,
    learning: false,
    wellbeing: false
  },
  // QUEUE SYSTEM - Pending actions untuk sync ke server
  pendingQueue: [],
  isSyncing: false,
  // Batch 1: Brain Dump, Journal, Don't List
  brainDumps: [],
  journals: { morning: null, evening: null },
  dontList: [],
  // Batch 2: Review, Milestones, Pomodoro Settings
  reviews: [],
  currentWeekReview: null,
  milestones: [],
  pomodoroSettings: {
    pomodoro: 25,
    deepWork: 60,
    ultraFocus: 90,
    shortBreak: 5,
    dailyTarget: 8
  },
  // Batch 3: Best Week, Learning, Wellbeing
  bestWeek: {},
  learnings: [],
  wellbeingTrends: []
};

// Habit Sunnah Rasulullah untuk ASN
const HABIT_ROSUL = [
  { id: 'tahajud', name: 'Sholat Tahajud', arabic: 'صَلاَةُ التَّهَجُّدِ', time: 'PAGI', benefit: 'Waktu mustajab doa', hour: '03:30' },
  { id: 'subuh', name: 'Subuh Berjamaah', arabic: 'صَلاَةُ الصُّبْحِ', time: 'PAGI', benefit: 'Dalam lindungan Allah', hour: '04:30' },
  { id: 'dzikir_pagi', name: 'Dzikir Pagi', arabic: 'أَذْكَارُ الصَّبَاحِ', time: 'PAGI', benefit: 'Perlindungan seharian', hour: '05:00' },
  { id: 'dhuha', name: 'Sholat Dhuha', arabic: 'صَلاَةُ الضُّحَى', time: 'PAGI', benefit: 'Sedekah 360 sendi', hour: '07:00' },
  { id: 'tilawah', name: 'Tilawah Al-Quran', arabic: 'تِلاَوَةُ القُرْآنِ', time: 'PAGI', benefit: '10 kebaikan per huruf', hour: '05:30' },
  { id: 'rawatib', name: 'Rawatib Dzuhur', arabic: 'رَوَاتِبُ الظُّهْرِ', time: 'SIANG', benefit: 'Dijauhkan dari neraka', hour: '12:00' },
  { id: 'dzikir_sore', name: 'Dzikir Sore', arabic: 'أَذْكَارُ المَسَاءِ', time: 'SIANG', benefit: 'Perlindungan malam', hour: '16:00' },
  { id: 'maghrib', name: 'Maghrib Berjamaah', arabic: 'صَلاَةُ المَغْرِبِ', time: 'MALAM', benefit: '27 derajat lebih utama', hour: '18:00' },
  { id: 'isya', name: 'Isya Berjamaah', arabic: 'صَلاَةُ العِشَاءِ', time: 'MALAM', benefit: 'Qiyamul lail setengah malam', hour: '19:00' },
  { id: 'witr', name: 'Sholat Witir', arabic: 'صَلاَةُ الوِتْرِ', time: 'MALAM', benefit: 'Penutup amalan malam', hour: '21:00' },
  { id: 'muhasabah', name: 'Muhasabah', arabic: 'مُحَاسَبَةُ النَّفْسِ', time: 'MALAM', benefit: 'Evaluasi diri', hour: '21:30' }
];

// Pomodoro Types
const POMODORO_TYPES = {
  POMODORO_25: { duration: 25 * 60, label: '🍅 Pomodoro', name: '25 menit' },
  DEEP_WORK_60: { duration: 60 * 60, label: '🧠 Deep Work', name: '60 menit' },
  DEEP_WORK_90: { duration: 90 * 60, label: '🚀 Ultra Focus', name: '90 menit' }
};

// ============================================
// API FUNCTIONS - OPTIMIZED
// ============================================
async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('userId', CONFIG.USER_ID);
  Object.entries(params).forEach(([k, v]) => { 
    if (v !== undefined && v !== '') url.searchParams.append(k, v); 
  });
  
  console.log('[API GET]', action, url.toString());
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
  
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log('[API GET] Response status:', response.status);
    const text = await response.text();
    console.log('[API GET] Response text:', text.substring(0, 500));
    const data = JSON.parse(text);
    if (!data.success) throw new Error(data.error?.message || data.error || 'API Error');
    return data.data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[API GET] Error:', err);
    if (err.name === 'AbortError') throw new Error('Request timeout');
    throw err;
  }
}

async function apiPost(action, body = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
  
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, userId: CONFIG.USER_ID, ...body }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'API Error');
    return data.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timeout');
    throw err;
  }
}

// Check if cache is valid
function isCacheValid(key) {
  return state.cache[key] && (Date.now() - state.cache[key] < CONFIG.CACHE_DURATION);
}

// ============================================
// QUEUE SYSTEM - Sync saat pindah halaman
// ============================================
function addToQueue(action, data) {
  state.pendingQueue.push({
    id: Date.now() + Math.random(),
    action,
    data,
    timestamp: new Date().toISOString()
  });
  updateSyncIndicator();
}

function updateSyncIndicator() {
  const syncBtn = document.getElementById('syncButton');
  const syncBtnCount = document.getElementById('syncBtnCount');
  const settingCount = document.getElementById('settingPendingCount');
  
  if (syncBtn) {
    if (state.pendingQueue.length > 0) {
      syncBtn.style.display = 'flex';
      if (syncBtnCount) syncBtnCount.textContent = state.pendingQueue.length;
    } else {
      syncBtn.style.display = 'none';
    }
  }
  
  if (settingCount) {
    settingCount.textContent = state.pendingQueue.length;
  }
}

async function syncPendingQueue() {
  if (state.isSyncing || state.pendingQueue.length === 0) return;
  
  state.isSyncing = true;
  const itemsToSync = [...state.pendingQueue];
  
  console.log(`[Sync] Syncing ${itemsToSync.length} pending items...`);
  
  let successCount = 0;
  let failedItems = [];
  
  for (const item of itemsToSync) {
    try {
      await apiPost(item.action, item.data);
      successCount++;
      // Remove from queue after success
      state.pendingQueue = state.pendingQueue.filter(q => q.id !== item.id);
    } catch (err) {
      console.error(`[Sync] Failed: ${item.action}`, err);
      failedItems.push(item);
    }
  }
  
  state.isSyncing = false;
  updateSyncIndicator();
  
  if (successCount > 0) {
    console.log(`[Sync] Completed: ${successCount} items synced`);
  }
  
  if (failedItems.length > 0) {
    console.warn(`[Sync] Failed: ${failedItems.length} items`);
  }
  
  // Invalidate cache setelah sync
  if (successCount > 0) {
    state.cache.dailySync = 0;
  }
}

// ============================================
// UI FUNCTIONS
// ============================================
function showPage(pageName, navEl) {
  // SYNC PENDING QUEUE saat pindah halaman (non-blocking)
  if (state.pendingQueue.length > 0) {
    syncPendingQueue(); // Fire and forget - tidak perlu await
  }
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageName)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  
  // Lazy load - hanya load jika belum pernah atau cache expired
  switch(pageName) {
    case 'kanban':
      if (!state.pageLoaded.kanban || !isCacheValid('kanban')) {
        loadKanban();
      } else {
        renderKanban();
        renderKanbanTabs();
      }
      break;
    case 'goals':
      if (!state.pageLoaded.goals || !isCacheValid('goals')) {
        loadGoals();
      } else {
        renderGoals();
      }
      break;
    case 'stats':
      if (!state.pageLoaded.stats || !isCacheValid('stats')) {
        loadStats('week');
      } else {
        renderStats();
      }
      break;
    case 'habits':
      renderHabitsFull();
      state.pageLoaded.habits = true;
      break;
    case 'pairwise':
      initPairwise();
      state.pageLoaded.pairwise = true;
      break;
    case 'vision':
      if (!state.pageLoaded.vision || !isCacheValid('visions')) {
        loadVisions();
      } else {
        renderVisions();
      }
      break;
    case 'pomodoro':
      renderPomodoroPage();
      state.pageLoaded.pomodoro = true;
      break;
    case 'menu':
      updateMenuBadges();
      state.pageLoaded.menu = true;
      break;
    case 'braindump':
      if (!state.pageLoaded.braindump) {
        loadBrainDumps();
      }
      state.pageLoaded.braindump = true;
      break;
    case 'journal':
      if (!state.pageLoaded.journal) {
        loadJournalToday();
      }
      state.pageLoaded.journal = true;
      break;
    case 'dontlist':
      if (!state.pageLoaded.dontlist) {
        loadDontList();
      }
      state.pageLoaded.dontlist = true;
      break;
    case 'review':
      if (!state.pageLoaded.review) {
        loadReviewPage();
      }
      state.pageLoaded.review = true;
      break;
    case 'ibadah':
      renderSholatGrid();
      state.pageLoaded.ibadah = true;
      break;
    case 'bestweek':
      if (!state.pageLoaded.bestweek) {
        loadBestWeek();
      }
      showBestWeekDay(1);
      state.pageLoaded.bestweek = true;
      break;
    case 'learning':
      if (!state.pageLoaded.learning) {
        loadLearnings();
      }
      state.pageLoaded.learning = true;
      break;
    case 'wellbeing':
      if (!state.pageLoaded.wellbeing) {
        loadWellbeingTrends();
      }
      state.pageLoaded.wellbeing = true;
      break;
    case 'settings':
      const userIdEl = document.getElementById('settingUserId');
      const pendingEl = document.getElementById('settingPendingCount');
      if (userIdEl) userIdEl.textContent = CONFIG.USER_ID;
      if (pendingEl) pendingEl.textContent = state.pendingQueue.length;
      break;
  }
}

function openModal(name) {
  document.getElementById('modal-' + name)?.classList.add('active');
  if (name === 'goal') {
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    document.getElementById('goalQuarter').value = q;
    document.getElementById('goalYear').value = new Date().getFullYear();
  }
  if (name === 'task') populateGoalSelect();
  if (name === 'pomodoro-start') populatePomodoroGoals();
}

function closeModal(name) {
  document.getElementById('modal-' + name)?.classList.remove('active');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { success: '✓', error: '✕', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Show skeleton loading
function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="skeleton-item">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `).join('');
}

// ============================================
// DATA LOADING - OPTIMIZED
// ============================================
async function loadAllData() {
  state.loading.initial = true;
  showSkeleton('sholatGrid', 8);
  showSkeleton('habitRosulList', 4);
  
  // Show local date immediately
  const now = new Date();
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  document.getElementById('currentDate').textContent = days[now.getDay()] + ', ' + formatDate(now.toISOString());
  
  try {
    // Load critical data first (for home page)
    await loadDailySync();
    state.pageLoaded.home = true;
    
    // Load secondary data in background (non-blocking)
    Promise.all([
      loadGoals(true), // silent mode
      loadVisions(true)
    ]).catch(console.error);
    
  } catch (err) {
    showToast('Gagal memuat: ' + err.message, 'error');
    // Show offline state
    renderOfflineState();
  }
  
  state.loading.initial = false;
}

async function loadDailySync(silent = false) {
  try {
    const apiStatusEl = document.getElementById('settingApiStatus');
    if (!silent && apiStatusEl) apiStatusEl.textContent = 'Loading...';
    state.dailySync = await apiGet('getDailySync');
    state.cache.dailySync = Date.now();
    if (!silent && apiStatusEl) apiStatusEl.textContent = '✅ Connected';
    renderDailySync();
  } catch (err) {
    const apiStatusEl = document.getElementById('settingApiStatus');
    if (!silent && apiStatusEl) apiStatusEl.textContent = '❌ ' + err.message;
    throw err;
  }
}

async function loadGoals(silent = false) {
  if (state.loading.goals) return;
  state.loading.goals = true;
  
  try {
    if (!silent && !isCacheValid('goals')) showSkeleton('goalsList', 3);
    state.goals = await apiGet('getGoals');
    state.cache.goals = Date.now();
    state.pageLoaded.goals = true;
    renderGoals();
    renderTodayFocus();
  } catch (err) {
    if (!silent) console.error('Failed to load goals:', err);
  } finally {
    state.loading.goals = false;
  }
}

async function loadKanban(forceRefresh = false) {
  if (state.loading.kanban) return;
  
  // Use cache if valid and not forcing refresh
  if (!forceRefresh && isCacheValid('kanban') && state.kanban) {
    renderKanban();
    renderKanbanTabs();
    return;
  }
  
  state.loading.kanban = true;
  showSkeleton('kanbanBoard', 4);
  
  try {
    state.kanban = await apiGet('getKanban', { goal_id: state.selectedGoalFilter });
    state.cache.kanban = Date.now();
    state.pageLoaded.kanban = true;
    renderKanban();
    renderKanbanTabs();
  } catch (err) {
    document.getElementById('kanbanBoard').innerHTML = `
      <div class="empty-state">
        <span class="icon">❌</span>
        <p>Gagal memuat</p>
        <button class="btn-submit" style="width:auto;margin-top:12px" onclick="loadKanban(true)">🔄 Coba Lagi</button>
      </div>`;
  } finally {
    state.loading.kanban = false;
  }
}

async function loadVisions(silent = false) {
  try {
    state.visions = await apiGet('getVisions');
    state.cache.visions = Date.now();
    state.pageLoaded.vision = true;
    renderVisions();
  } catch (err) {
    if (!silent) console.error('Failed to load visions:', err);
  }
}

async function loadStats(period) {
  if (state.loading.stats) return;
  state.loading.stats = true;
  showSkeleton('statsContainer', 4);
  
  try {
    state.pomodoroStats = await apiGet('getPomodoroStats', { period });
    state.cache.stats = Date.now();
    state.pageLoaded.stats = true;
    renderStats();
  } catch (err) {
    document.getElementById('statsContainer').innerHTML = `
      <div class="empty-state">
        <span class="icon">❌</span>
        <p>Gagal memuat statistik</p>
      </div>`;
  } finally {
    state.loading.stats = false;
  }
}

function renderOfflineState() {
  const grid = document.getElementById('sholatGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="icon">📴</span>
        <p>Mode Offline</p>
      </div>`;
  }
}

// ============================================
// RENDERING
// ============================================
function renderDailySync() {
  const data = state.dailySync;
  if (!data) return;
  
  const dateEl = document.getElementById('currentDate');
  const sholatEl = document.getElementById('sholatCount');
  const habitEl = document.getElementById('habitCount');
  const pomodoroEl = document.getElementById('pomodoroCount');
  const focusEl = document.getElementById('focusMinutes');
  
  if (dateEl) dateEl.textContent = (data.day || '') + ', ' + formatDate(data.tanggal || data.date);
  if (sholatEl) sholatEl.textContent = (data.stats?.sholat_completed || 0) + '/8';
  if (habitEl) habitEl.textContent = (data.stats?.habits_completed || 0) + '/' + (data.stats?.habits_total || 11);
  if (pomodoroEl) pomodoroEl.textContent = data.stats?.pomodoro_count || 0;
  if (focusEl) focusEl.textContent = (data.stats?.pomodoro_minutes || 0) + 'm';
  
  renderSholatGrid(data.sholat);
  renderHabitRosul(data.habits);
}

function renderSholatGrid(sholatData) {
  const container = document.getElementById('sholatGrid');
  if (!container) return;
  
  const sholatList = [
    { id: 'TAHAJUD', name: 'Tahajud', icon: '🌙' },
    { id: 'SUBUH', name: 'Subuh', icon: '🌅' },
    { id: 'DHUHA', name: 'Dhuha', icon: '☀️' },
    { id: 'DZUHUR', name: 'Dzuhur', icon: '🌞' },
    { id: 'ASHAR', name: 'Ashar', icon: '🌇' },
    { id: 'MAGHRIB', name: 'Maghrib', icon: '🌆' },
    { id: 'ISYA', name: 'Isya', icon: '🌃' },
    { id: 'WITIR', name: 'Witir', icon: '⭐' }
  ];
  
  // Handle array format from API
  const sholatMap = {};
  if (Array.isArray(sholatData)) {
    sholatData.forEach(s => {
      sholatMap[s.waktu] = { done: s.status === 'done' || s.status === true, ...s };
    });
  } else if (sholatData) {
    Object.assign(sholatMap, sholatData);
  }
  
  container.innerHTML = sholatList.map(s => {
    const data = sholatMap[s.id] || { done: false };
    return `<div class="sholat-item ${data.done ? 'done' : ''}" onclick="openSholatModal('${s.id}')">
      <span class="icon">${s.icon}</span>
      <span class="name">${s.name}</span>
      ${data.jam_pelaksanaan ? `<span class="time">${data.jam_pelaksanaan}</span>` : ''}
    </div>`;
  }).join('');
}

function renderHabitRosul(habits) {
  const container = document.getElementById('habitRosulList');
  if (!container) return;
  
  // Handle habits dari API
  const habitsList = habits || [];
  
  const todayHabits = HABIT_ROSUL.slice(0, 4).map(hr => {
    const dbHabit = habitsList.find(h => h.name && h.name.toLowerCase().includes(hr.id.replace('_', ' ')));
    const completed = dbHabit?.completed || false;
    return { ...hr, completed, habit_id: dbHabit?.habit_id };
  });
  
  container.innerHTML = todayHabits.map(h => `
    <div class="habit-rosul-item ${h.completed ? 'done' : ''}" onclick="toggleHabitRosul('${h.habit_id || h.id}', ${h.completed})">
      <div class="habit-rosul-checkbox">${h.completed ? '✓' : ''}</div>
      <div class="habit-rosul-info">
        <div class="habit-rosul-name">${h.name}</div>
        <div class="habit-rosul-arabic">${h.arabic}</div>
        <div class="habit-rosul-benefit">${h.benefit}</div>
      </div>
      <div class="habit-rosul-time">${h.hour}</div>
    </div>
  `).join('');
}

function renderHabitsFull() {
  const container = document.getElementById('habitFullList');
  let filtered = HABIT_ROSUL;
  if (state.currentHabitFilter !== 'all') {
    filtered = HABIT_ROSUL.filter(h => h.time === state.currentHabitFilter);
  }
  const habits = state.dailySync?.habits || [];
  
  container.innerHTML = filtered.map(hr => {
    const dbHabit = habits.find(h => h.name.toLowerCase().includes(hr.name.toLowerCase().split(' ')[0]));
    const completed = dbHabit?.completed || false;
    return `<div class="habit-rosul-item ${completed ? 'done' : ''}" onclick="toggleHabitRosul('${dbHabit?.habit_id || hr.id}', ${completed})">
      <div class="habit-rosul-checkbox">${completed ? '✓' : ''}</div>
      <div class="habit-rosul-info">
        <div class="habit-rosul-name">${hr.name}</div>
        <div class="habit-rosul-arabic">${hr.arabic}</div>
        <div class="habit-rosul-benefit">${hr.benefit}</div>
      </div>
      <div class="habit-rosul-time">${hr.hour}</div>
    </div>`;
  }).join('');
}

function filterHabits(filter, el) {
  state.currentHabitFilter = filter;
  document.querySelectorAll('#page-habits .tab-btn').forEach(b => b.classList.remove('active'));
  el?.classList.add('active');
  renderHabitsFull();
}

function filterGoals(filter, el) {
  document.querySelectorAll('#page-goals .tabs .tab-btn').forEach(b => b.classList.remove('active'));
  el?.classList.add('active');
  renderGoals(filter);
}

function renderGoals(filter = 'active') {
  const container = document.getElementById('goalsList');
  let goals = state.goals || [];
  
  if (filter === 'active') {
    goals = goals.filter(g => g.status === 'active');
  }
  
  if (goals.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">🎯</span><p>Belum ada goal</p></div>';
    return;
  }
  
  container.innerHTML = goals.map((g, idx) => {
    const tc = g.task_count || { total: 0, done: 0 };
    const progress = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : (g.progress || 0);
    const rank = g.priority_rank || (idx + 1);
    return `<div class="goal-card ${rank <= 3 ? 'rank-' + rank : ''}" onclick="viewGoalDetail('${g.goal_id}')">
      ${rank <= 3 ? `<div class="goal-rank">${rank}</div>` : ''}
      <div class="goal-header">
        <div class="goal-title">${escapeHtml(g.title)}</div>
        <div class="goal-quarter">Q${g.quarter} ${g.year}</div>
      </div>
      <div class="goal-desc">${escapeHtml(g.description || '')}</div>
      <div class="goal-progress-container">
        <div class="goal-progress-header">
          <span class="goal-progress-label">Progress</span>
          <span class="goal-progress-value">${progress}%</span>
        </div>
        <div class="goal-progress"><div class="goal-progress-bar" style="width:${progress}%"></div></div>
      </div>
      <div class="goal-stats">
        <div class="goal-stat">📋 <span class="goal-stat-value">${tc.total}</span> task</div>
        <div class="goal-stat">✅ <span class="goal-stat-value">${tc.done}</span> selesai</div>
      </div>
    </div>`;
  }).join('');
}

function renderTodayFocus() {
  const container = document.getElementById('todayFocus');
  if (!container) return;
  
  const topGoals = (state.goals || []).filter(g => g.priority_rank && g.priority_rank <= 3).slice(0, 3);
  
  if (topGoals.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="icon">⚖️</span>
      <p>Tentukan prioritas dengan Pairwise</p>
      <button class="btn-submit" style="width: auto; margin-top: 16px;" onclick="showPage('pairwise')">Mulai</button>
    </div>`;
    return;
  }
  
  container.innerHTML = `
    <div class="card-header"><span class="card-title">🔥 Top Prioritas</span></div>
    ${topGoals.map((g, i) => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: ${i === 0 ? 'var(--warning-light)' : 'var(--gray-50)'}; border-radius: var(--radius-md); margin-bottom: 8px;">
        <div style="width: 28px; height: 28px; background: ${['#FFD700','#C0C0C0','#CD7F32'][i]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${i + 1}</div>
        <div style="flex: 1;"><div style="font-weight: 600;">${escapeHtml(g.title)}</div></div>
      </div>
    `).join('')}
  `;
}

function renderKanban() {
  const k = state.kanban;
  if (!k || !k.board) {
    document.getElementById('kanbanBoard').innerHTML = '<div class="empty-state"><span class="icon">📊</span><p>Tidak ada task</p></div>';
    return;
  }
  
  const columns = [
    { id: 'backlog', title: '📥 Backlog', tasks: k.board.backlog || [] },
    { id: 'todo', title: '📋 To Do', tasks: k.board.todo || [] },
    { id: 'progress', title: '🔄 Progress', tasks: k.board.progress || [] },
    { id: 'done', title: '✅ Done', tasks: k.board.done || [] }
  ];
  
  document.getElementById('kanbanBoard').innerHTML = columns.map(col => `
    <div class="kanban-column ${col.id}">
      <div class="kanban-header">
        <span class="kanban-title">${col.title}</span>
        <span class="kanban-count">${col.tasks.length}</span>
      </div>
      <div class="kanban-tasks">${col.tasks.map(t => renderTaskCard(t, col.id)).join('')}</div>
      ${col.id !== 'done' ? `<button class="add-task-btn" onclick="openAddTask('${col.id}')">+ Task</button>` : ''}
    </div>
  `).join('');
}

function renderTaskCard(task, currentStatus) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && currentStatus !== 'done';
  const nextStatus = { backlog: 'todo', todo: 'progress', progress: 'done' };
  
  // Check if delegated
  const isDelegated = task.tags?.includes('delegated:');
  const delegatee = isDelegated ? task.tags.split('delegated:')[1]?.split(',')[0] : '';
  
  // Check if has link
  const hasLink = task.description?.includes('🔗 Link:');
  const linkMatch = task.description?.match(/🔗 Link: (https?:\/\/[^\s]+)/);
  const link = linkMatch ? linkMatch[1] : '';
  
  // Priority icons
  const priorityIcons = {
    urgent: '🔥',
    high: '🔴',
    medium: '🟡',
    low: '🟢',
    someday: '⚪'
  };
  
  return `<div class="task-card priority-${task.priority || 'medium'}">
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="task-label priority-${task.priority}">${priorityIcons[task.priority] || '🟡'} ${task.priority || 'medium'}</span>
      ${task.due_date ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDateShort(task.due_date)}</span>` : ''}
      ${task.estimated_pomodoro ? `<span class="task-pomodoro">🍅 ${task.estimated_pomodoro}</span>` : ''}
    </div>
    ${isDelegated ? `<div class="task-delegate">👤 ${escapeHtml(delegatee)}</div>` : ''}
    ${hasLink ? `<div class="task-link"><a href="${escapeHtml(link)}" target="_blank" onclick="event.stopPropagation()">🔗 Link</a></div>` : ''}
    ${currentStatus !== 'done' ? `
    <div class="task-actions">
      ${nextStatus[currentStatus] ? `<button class="task-action-btn primary" onclick="moveTask('${task.task_id}','${nextStatus[currentStatus]}')">→</button>` : ''}
      <button class="task-action-btn success" onclick="moveTask('${task.task_id}','done')">✓</button>
    </div>` : ''}
  </div>`;
}

function renderKanbanTabs() {
  let html = `<button class="tab-btn ${!state.selectedGoalFilter ? 'active' : ''}" onclick="filterKanban('')">Semua</button>`;
  if (state.goals?.length > 0) {
    html += state.goals.slice(0, 5).map(g =>
      `<button class="tab-btn ${state.selectedGoalFilter === g.goal_id ? 'active' : ''}" onclick="filterKanban('${g.goal_id}')">${escapeHtml(g.title.substring(0, 12))}${g.title.length > 12 ? '...' : ''}</button>`
    ).join('');
  }
  document.getElementById('kanbanTabs').innerHTML = html;
}

function renderVisions() {
  const visions = state.visions || [];
  const spiritual = visions.find(v => v.bidang === 'SPIRITUAL');
  const karir = visions.find(v => v.bidang === 'KARIR');
  
  const v10 = document.getElementById('vision10Content');
  const v3 = document.getElementById('vision3Content');
  const v1 = document.getElementById('vision1Content');
  const vQ = document.getElementById('visionQuarterContent');
  
  if (v10 && (spiritual?.vision_10_tahun || karir?.vision_10_tahun)) {
    let content = '';
    if (spiritual?.vision_10_tahun) content += `<strong>Spiritual:</strong> ${escapeHtml(spiritual.vision_10_tahun)}<br>`;
    if (karir?.vision_10_tahun) content += `<strong>Karir:</strong> ${escapeHtml(karir.vision_10_tahun)}`;
    v10.innerHTML = content;
  }
  
  if (vQ && state.goals?.length > 0) {
    vQ.innerHTML = `${state.goals.length} goal aktif`;
  }
}

function renderStats() {
  const s = state.pomodoroStats;
  if (!s) return;
  
  document.getElementById('statsContainer').innerHTML = `
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${s.completed_sessions || 0}</div><div class="stat-label">Sesi</div></div>
      <div class="stat-box success"><div class="stat-value">${s.total_focus_hours || 0}h</div><div class="stat-label">Jam Fokus</div></div>
      <div class="stat-box warning"><div class="stat-value">${s.completion_rate || 0}%</div><div class="stat-label">Rate</div></div>
      <div class="stat-box spiritual"><div class="stat-value">${s.streak || 0}</div><div class="stat-label">Streak</div></div>
    </div>
  `;
}

// ============================================
// POMODORO TIMER - NEW FEATURE
// ============================================
function renderPomodoroPage() {
  const container = document.getElementById('pomodoroContainer');
  if (!container) return;
  
  if (state.pomodoro.active) {
    renderActivePomodoro();
  } else {
    renderPomodoroStart();
  }
}

function renderPomodoroStart() {
  const container = document.getElementById('pomodoroContainer');
  const topGoals = (state.goals || []).filter(g => g.priority_rank && g.priority_rank <= 3).slice(0, 3);
  
  container.innerHTML = `
    <div class="pomodoro-start-container">
      <div class="pomodoro-icon">🍅</div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Mulai Sesi Fokus</h2>
      <p style="color: var(--gray-600); margin-bottom: 24px;">Pilih durasi dan task yang akan dikerjakan</p>
      
      <div class="pomodoro-types">
        ${Object.entries(POMODORO_TYPES).map(([key, val]) => `
          <button class="pomodoro-type-btn" onclick="selectPomodoroType('${key}')">
            <span class="pomodoro-type-icon">${val.label.split(' ')[0]}</span>
            <span class="pomodoro-type-name">${val.name}</span>
          </button>
        `).join('')}
      </div>
      
      ${topGoals.length > 0 ? `
        <div class="section-title" style="margin-top: 24px;">🎯 Quick Start dari Prioritas</div>
        <div class="quick-pomodoro-goals">
          ${topGoals.map(g => `
            <button class="quick-goal-btn" onclick="quickStartPomodoro('${g.goal_id}', '${escapeHtml(g.title)}')">
              <span class="quick-goal-rank">${g.priority_rank}</span>
              <span class="quick-goal-title">${escapeHtml(g.title)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderActivePomodoro() {
  const container = document.getElementById('pomodoroContainer');
  const p = state.pomodoro;
  const typeInfo = POMODORO_TYPES[p.type] || POMODORO_TYPES.POMODORO_25;
  const progress = ((p.duration - p.remaining) / p.duration) * 100;
  const minutes = Math.floor(p.remaining / 60);
  const seconds = p.remaining % 60;
  
  container.innerHTML = `
    <div class="pomodoro-active-container">
      <div class="pomodoro-timer-ring">
        <svg viewBox="0 0 200 200">
          <circle class="timer-bg" cx="100" cy="100" r="90"/>
          <circle class="timer-progress" cx="100" cy="100" r="90" 
            style="stroke-dasharray: ${2 * Math.PI * 90}; stroke-dashoffset: ${2 * Math.PI * 90 * (1 - progress/100)}"/>
        </svg>
        <div class="timer-display">
          <div class="timer-time">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
          <div class="timer-label">${typeInfo.label}</div>
        </div>
      </div>
      
      <div class="pomodoro-task">
        <div class="pomodoro-task-label">Sedang mengerjakan:</div>
        <div class="pomodoro-task-name">${escapeHtml(p.task)}</div>
      </div>
      
      <div class="pomodoro-controls">
        <button class="pomodoro-ctrl-btn secondary" onclick="stopPomodoro()">
          <span>⏹</span> Stop
        </button>
        <button class="pomodoro-ctrl-btn primary" onclick="togglePausePomodoro()">
          <span>${p.isPaused ? '▶️' : '⏸'}</span> ${p.isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  `;
}

function selectPomodoroType(type) {
  openModal('pomodoro-start');
  document.getElementById('pomodoroType').value = type;
}

function quickStartPomodoro(goalId, title) {
  startPomodoroTimer('POMODORO_25', title);
}

async function startPomodoroFromModal() {
  const task = document.getElementById('pomodoroTask').value.trim();
  const type = document.getElementById('pomodoroType').value;
  
  if (!task) { 
    showToast('Isi task yang akan dikerjakan', 'error'); 
    return; 
  }
  
  closeModal('pomodoro-start');
  startPomodoroTimer(type, task);
}

function startPomodoroTimer(type, task) {
  const typeInfo = POMODORO_TYPES[type];
  
  state.pomodoro = {
    active: true,
    type: type,
    duration: typeInfo.duration,
    remaining: typeInfo.duration,
    task: task,
    interval: null,
    startTime: Date.now(),
    isPaused: false
  };
  
  // Add to queue - log start
  addToQueue('startPomodoro', {
    options: { type, planned_task: task }
  });
  
  // Start timer
  state.pomodoro.interval = setInterval(updatePomodoroTimer, 1000);
  
  showToast(`${typeInfo.label} dimulai! 🍅`, 'success');
  renderPomodoroPage();
  
  // Switch to pomodoro page
  showPage('pomodoro');
}

function updatePomodoroTimer() {
  if (state.pomodoro.isPaused) return;
  
  state.pomodoro.remaining--;
  
  if (state.pomodoro.remaining <= 0) {
    completePomodoro();
  } else {
    // Update display
    const container = document.getElementById('pomodoroContainer');
    if (container && state.pomodoro.active) {
      renderActivePomodoro();
    }
  }
}

function togglePausePomodoro() {
  state.pomodoro.isPaused = !state.pomodoro.isPaused;
  showToast(state.pomodoro.isPaused ? 'Timer di-pause' : 'Timer dilanjutkan', 'info');
  renderActivePomodoro();
}

function stopPomodoro() {
  if (confirm('Yakin ingin menghentikan sesi fokus?')) {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.active = false;
    showToast('Sesi dihentikan', 'info');
    renderPomodoroPage();
  }
}

function completePomodoro() {
  clearInterval(state.pomodoro.interval);
  
  const typeInfo = POMODORO_TYPES[state.pomodoro.type];
  
  // Play notification sound
  playNotificationSound();
  
  // Show completion
  showToast(`${typeInfo.label} selesai! 🎉`, 'success');
  
  // Add to queue - log completion
  addToQueue('completePomodoro', {
    type: state.pomodoro.type,
    task: state.pomodoro.task,
    duration_minutes: Math.floor(typeInfo.duration / 60)
  });
  
  // Update local stats
  if (state.dailySync?.stats) {
    state.dailySync.stats.pomodoro_count = (state.dailySync.stats.pomodoro_count || 0) + 1;
    state.dailySync.stats.focus_minutes = (state.dailySync.stats.focus_minutes || 0) + Math.floor(typeInfo.duration / 60);
    
    document.getElementById('pomodoroCount').textContent = state.dailySync.stats.pomodoro_count;
    document.getElementById('focusMinutes').textContent = state.dailySync.stats.focus_minutes + 'm';
  }
  
  // Reset state
  state.pomodoro.active = false;
  
  // Show completion screen
  const container = document.getElementById('pomodoroContainer');
  container.innerHTML = `
    <div class="pomodoro-complete">
      <div class="complete-icon">🎉</div>
      <h2>Sesi Selesai!</h2>
      <p>Kamu telah fokus selama ${Math.floor(typeInfo.duration / 60)} menit</p>
      <p style="color: var(--gray-600); margin-top: 8px;">Task: ${escapeHtml(state.pomodoro.task)}</p>
      <button class="btn-submit" style="margin-top: 24px;" onclick="renderPomodoroPage()">
        🍅 Mulai Sesi Baru
      </button>
    </div>
  `;
}

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQcAQJzZ0ZZ7KQxMl9LRopBJHDKLyt/ZpGcrCSCEwMHHvaVsQxohhcDb3rtfJwYZcazN2MKFRhIIXZbC0MSjcEwfElCJuc3Rs4pnSi0/hr7f4tCYaD0aLIK93u7drXg+Dhl0qNHj38Z+OQcMYJbG1d/TqoNOGxZPhr7Z5N2sfEUOFV+Ux9vh1qeDUBwWUYi+2OLcp39IERdgl8jc4tighlIaF1KLvtfg2Z+DUh4ZVY2+1t3Xn4NUHxpXj77W3NWdglQhG1mQvtXb1JuBVCMcW5K+09jSmYBVJR1dlb7R1dCXflcnH2CYvs/Sz5V9WCkgYpu+zdDNk3xaKyJknr7Lzsp/');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
  
  // Also try vibration
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

// ============================================
// PAIRWISE COMPARISON
// ============================================
function initPairwise() {
  const goals = (state.goals || []).filter(g => g.status === 'active');
  
  if (goals.length < 2) {
    document.getElementById('pairwiseContainer').innerHTML = `<div class="empty-state">
      <span class="icon">🎯</span><p>Tambahkan minimal 2 goal</p>
      <button class="btn-submit" style="width: auto; margin-top: 16px;" onclick="showPage('goals')">Tambah Goal</button>
    </div>`;
    return;
  }
  
  state.pairwise.items = goals;
  state.pairwise.comparisons = [];
  state.pairwise.results = {};
  state.pairwise.currentPair = 0;
  
  goals.forEach(g => { state.pairwise.results[g.goal_id] = 0; });
  
  for (let i = 0; i < goals.length; i++) {
    for (let j = i + 1; j < goals.length; j++) {
      state.pairwise.comparisons.push([goals[i], goals[j]]);
    }
  }
  
  renderPairwiseQuestion();
}

function renderPairwiseQuestion() {
  const container = document.getElementById('pairwiseContainer');
  const { comparisons, currentPair } = state.pairwise;
  
  if (currentPair >= comparisons.length) {
    renderPairwiseResults();
    return;
  }
  
  const [a, b] = comparisons[currentPair];
  const progress = Math.round((currentPair / comparisons.length) * 100);
  
  container.innerHTML = `
    <div class="pairwise-progress">
      <div style="font-size: 14px; color: var(--gray-600);">${currentPair + 1}/${comparisons.length}</div>
      <div class="pairwise-progress-bar"><div class="pairwise-progress-fill" style="width: ${progress}%"></div></div>
    </div>
    <div style="text-align: center; margin: 20px 0; font-weight: 600;">Mana yang LEBIH PENTING?</div>
    <div class="pairwise-vs">
      <div class="pairwise-option" onclick="selectPairwise('${a.goal_id}')">
        <div class="pairwise-option-title">${escapeHtml(a.title)}</div>
        <div class="pairwise-option-desc">${escapeHtml(a.description || '')}</div>
      </div>
      <div class="pairwise-divider">VS</div>
      <div class="pairwise-option" onclick="selectPairwise('${b.goal_id}')">
        <div class="pairwise-option-title">${escapeHtml(b.title)}</div>
        <div class="pairwise-option-desc">${escapeHtml(b.description || '')}</div>
      </div>
    </div>
  `;
}

function selectPairwise(goalId) {
  state.pairwise.results[goalId]++;
  state.pairwise.currentPair++;
  renderPairwiseQuestion();
}

function renderPairwiseResults() {
  const container = document.getElementById('pairwiseContainer');
  const { results, items } = state.pairwise;
  const ranked = [...items].sort((a, b) => results[b.goal_id] - results[a.goal_id]);
  
  container.innerHTML = `
    <div class="pairwise-result">
      <div class="pairwise-result-title">🏆 Hasil Prioritas</div>
      <div class="pairwise-rank-list">
        ${ranked.map((g, i) => `
          <div class="pairwise-rank-item">
            <div class="pairwise-rank-number">${i + 1}</div>
            <div class="pairwise-rank-title">${escapeHtml(g.title)}</div>
            <div style="font-size: 12px; color: var(--gray-500);">${results[g.goal_id]} poin</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 20px;">
      <button class="btn-submit btn-secondary" style="flex: 1;" onclick="initPairwise()">🔄 Ulangi</button>
      <button class="btn-submit" style="flex: 1;" onclick="savePairwiseResults()">💾 Simpan</button>
    </div>
  `;
}

function savePairwiseResults() {
  const { results, items } = state.pairwise;
  const ranked = [...items].sort((a, b) => results[b.goal_id] - results[a.goal_id]);
  const rankings = ranked.map((g, i) => ({ goal_id: g.goal_id, rank: i + 1 }));
  
  // Update local state langsung - tambahkan rank ke goals
  if (state.goals) {
    rankings.forEach(r => {
      const goal = state.goals.find(g => g.goal_id === r.goal_id);
      if (goal) goal.rank = r.rank;
    });
  }
  
  // Add to queue - gunakan updateGoalRanks yang ada di backend
  addToQueue('updateGoalRanks', { ranks: rankings });
  
  showToast('Prioritas tersimpan! ✓', 'success');
  
  // Re-render today focus
  renderTodayFocus();
}

// ============================================
// ACTIONS
// ============================================
function openSholatModal(waktu) {
  const data = state.dailySync?.sholat?.[waktu];
  if (data?.done) { showToast(waktu + ' sudah dicatat', 'info'); return; }
  state.selectedSholat = waktu;
  document.getElementById('sholatModalTitle').textContent = '🕌 ' + waktu;
  document.getElementById('sholatJam').value = new Date().toTimeString().slice(0, 5);
  openModal('sholat');
}

function submitSholat() {
  const waktu = state.selectedSholat;
  const jam = document.getElementById('sholatJam').value;
  const lokasi = document.getElementById('sholatLokasi').value;
  const berjamaah = document.getElementById('sholatBerjamaah').checked;
  
  // INSTANT UI UPDATE - Update grid langsung
  const sholatItems = document.querySelectorAll('.sholat-item');
  sholatItems.forEach(item => {
    if (item.querySelector('.name')?.textContent.toUpperCase() === waktu) {
      item.classList.add('done');
      // Tambah waktu jika belum ada
      let timeEl = item.querySelector('.time');
      if (!timeEl) {
        timeEl = document.createElement('span');
        timeEl.className = 'time';
        item.appendChild(timeEl);
      }
      timeEl.textContent = jam;
    }
  });
  
  // Update local state langsung
  if (state.dailySync) {
    if (!state.dailySync.sholat) state.dailySync.sholat = {};
    state.dailySync.sholat[waktu] = { done: true, jam_pelaksanaan: jam };
    
    // Update stats di header
    if (state.dailySync.stats) {
      state.dailySync.stats.sholat_completed++;
      document.getElementById('sholatCount').textContent = 
        state.dailySync.stats.sholat_completed + '/8';
    }
  }
  
  // ADD TO QUEUE - akan sync saat pindah halaman
  addToQueue('logSholat', {
    waktu_sholat: waktu,
    options: { jam, lokasi, berjamaah }
  });
  
  closeModal('sholat');
  showToast('Tersimpan ✓', 'success');
}

function toggleHabitRosul(habitId, isCompleted) {
  if (isCompleted) { 
    showToast('Sudah selesai ✓', 'info'); 
    return; 
  }
  
  // INSTANT UI UPDATE
  const clickedItem = event?.currentTarget;
  if (clickedItem) {
    clickedItem.classList.add('done');
    const checkbox = clickedItem.querySelector('.habit-rosul-checkbox');
    if (checkbox) checkbox.textContent = '✓';
  }
  
  // Update local state langsung
  if (state.dailySync?.habits) {
    const habit = state.dailySync.habits.find(h => h.habit_id === habitId);
    if (habit) habit.completed = true;
    
    // Update stats di header
    if (state.dailySync.stats) {
      state.dailySync.stats.habits_completed++;
      document.getElementById('habitCount').textContent = 
        state.dailySync.stats.habits_completed + '/' + state.dailySync.stats.habits_total;
    }
  }
  
  // ADD TO QUEUE - akan sync saat pindah halaman
  addToQueue('checkHabit', { habit_id: habitId });
  
  showToast('Alhamdulillah! ✓', 'success');
}

function submitGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { showToast('Isi judul', 'error'); return; }
  
  const goalData = {
    title,
    description: document.getElementById('goalDesc').value.trim(),
    quarter: parseInt(document.getElementById('goalQuarter').value),
    year: parseInt(document.getElementById('goalYear').value)
  };
  
  // Generate temporary ID
  const tempId = 'temp_' + Date.now();
  
  // Update local state langsung
  const newGoal = {
    goal_id: tempId,
    ...goalData,
    status: 'active',
    created_at: new Date().toISOString()
  };
  state.goals = state.goals || [];
  state.goals.unshift(newGoal);
  
  // Add to queue
  addToQueue('createGoal', { data: goalData });
  
  // Clear form & close modal
  document.getElementById('goalTitle').value = '';
  document.getElementById('goalDesc').value = '';
  closeModal('goal');
  
  showToast('Goal tersimpan! ✓', 'success');
  
  // Re-render jika di halaman goals
  if (state.pageLoaded.goals) {
    renderGoals();
  }
}

function populateGoalSelect() {
  const select = document.getElementById('taskGoal');
  if (!select) return;
  select.innerHTML = '<option value="">-- Tanpa Goal --</option>';
  (state.goals || []).forEach(g => {
    select.innerHTML += `<option value="${g.goal_id}">${escapeHtml(g.title)}</option>`;
  });
  
  // Also update milestone select
  const milestoneSelect = document.getElementById('taskMilestone');
  if (milestoneSelect) {
    milestoneSelect.innerHTML = '<option value="">-- Tanpa Milestone --</option>';
  }
}

function updateMilestoneSelect(goalId) {
  const milestoneSelect = document.getElementById('taskMilestone');
  if (!milestoneSelect) return;
  
  milestoneSelect.innerHTML = '<option value="">-- Tanpa Milestone --</option>';
  
  if (!goalId) return;
  
  const goal = state.goals.find(g => g.goal_id === goalId);
  if (goal && goal.milestones) {
    goal.milestones.forEach(m => {
      milestoneSelect.innerHTML += `<option value="${m.milestone_id}">${escapeHtml(m.title)} (W${m.week})</option>`;
    });
  }
}

// Milestone Functions
function submitMilestone() {
  const title = document.getElementById('milestoneTitle')?.value.trim();
  const week = document.getElementById('milestoneWeek')?.value || '1';
  const goalId = document.getElementById('milestoneGoalId')?.value;
  
  if (!title) {
    showToast('Isi judul milestone', 'error');
    return;
  }
  
  if (!goalId) {
    showToast('Goal tidak ditemukan', 'error');
    return;
  }
  
  const tempId = 'temp_' + Date.now();
  
  const newMilestone = {
    milestone_id: tempId,
    goal_id: goalId,
    title: title,
    week: parseInt(week),
    completed: false
  };
  
  // Add to goal's milestones in state
  const goal = state.goals.find(g => g.goal_id === goalId);
  if (goal) {
    if (!goal.milestones) goal.milestones = [];
    goal.milestones.push(newMilestone);
  }
  
  // Add to queue
  addToQueue('addMilestone', {
    goal_id: goalId,
    data: { title, week: parseInt(week) }
  });
  
  closeModal('milestone');
  renderGoals(state.currentGoalFilter || 'active');
  showToast('Milestone ditambahkan! ✓', 'success');
}

function toggleMilestone(milestoneId) {
  // Find milestone in goals
  for (const goal of state.goals) {
    if (!goal.milestones) continue;
    const milestone = goal.milestones.find(m => m.milestone_id === milestoneId);
    if (milestone) {
      milestone.completed = !milestone.completed;
      
      addToQueue('toggleMilestone', {
        milestone_id: milestoneId,
        completed: milestone.completed
      });
      
      renderGoals(state.currentGoalFilter || 'active');
      showToast(milestone.completed ? 'Milestone selesai! ✓' : 'Milestone dibuka', 'success');
      return;
    }
  }
}

function populatePomodoroGoals() {
  const select = document.getElementById('pomodoroGoal');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih --</option>';
  (state.goals || []).slice(0, 5).forEach(g => {
    select.innerHTML += `<option value="${g.goal_id}">${escapeHtml(g.title)}</option>`;
  });
}

function selectPomodoroGoal() {
  const goal = (state.goals || []).find(g => g.goal_id === document.getElementById('pomodoroGoal').value);
  if (goal) document.getElementById('pomodoroTask').value = goal.title;
}

function openAddTask(status) {
  openModal('task');
  document.getElementById('taskStatus').value = status;
}

// Toggle delegate input visibility
function toggleDelegateInput(value) {
  const delegateGroup = document.getElementById('delegateInputGroup');
  if (delegateGroup) {
    delegateGroup.style.display = value === 'delegate' ? 'block' : 'none';
  }
}

function submitTask() {
  const titleEl = document.getElementById('taskTitle');
  const title = titleEl?.value.trim();
  if (!title) { showToast('Isi judul', 'error'); return; }
  
  // Get assignee info
  const assigneeType = document.getElementById('taskAssignee')?.value || 'self';
  const delegateTo = assigneeType === 'delegate' ? 
    (document.getElementById('taskDelegateTo')?.value.trim() || '') : '';
  
  // Get link
  const link = document.getElementById('taskLink')?.value.trim() || '';
  
  // Build description with link if provided
  let description = document.getElementById('taskDesc')?.value.trim() || '';
  if (link) {
    description = description ? `${description}\n\n🔗 Link: ${link}` : `🔗 Link: ${link}`;
  }
  if (delegateTo) {
    description = description ? `${description}\n\n👤 Didelegasikan ke: ${delegateTo}` : `👤 Didelegasikan ke: ${delegateTo}`;
  }
  
  const taskData = {
    title,
    description,
    priority: document.getElementById('taskPriority')?.value || 'medium',
    status: document.getElementById('taskStatus')?.value || 'todo',
    due_date: document.getElementById('taskDueDate')?.value || '',
    estimated_pomodoro: parseInt(document.getElementById('taskEstPomodoro')?.value) || 2,
    tags: delegateTo ? `delegated:${delegateTo}` : (assigneeType === 'self' ? 'self' : '')
  };
  const goalId = document.getElementById('taskGoal')?.value || '';
  const milestoneId = document.getElementById('taskMilestone')?.value || '';
  
  // Generate temporary ID
  const tempId = 'temp_' + Date.now();
  
  // Update local state langsung
  const newTask = {
    task_id: tempId,
    goal_id: goalId,
    milestone_id: milestoneId,
    ...taskData,
    created_at: new Date().toISOString()
  };
  
  if (!state.kanban) state.kanban = { backlog: [], todo: [], progress: [], done: [] };
  const status = taskData.status || 'todo';
  if (!state.kanban[status]) state.kanban[status] = [];
  state.kanban[status].unshift(newTask);
  
  // Add to queue with milestone_id
  addToQueue('createTask', { 
    goal_id: goalId, 
    milestone_id: milestoneId,
    data: taskData 
  });
  
  // Clear form & close modal
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskLink').value = '';
  document.getElementById('taskDelegateTo').value = '';
  document.getElementById('taskAssignee').value = 'self';
  toggleDelegateInput('self');
  closeModal('task');
  
  showToast('Task tersimpan! ✓', 'success');
  
  // Re-render kanban
  renderKanban();
}

function moveTask(taskId, newStatus) {
  // Update local state langsung
  if (state.kanban) {
    let movedTask = null;
    
    // Cari dan hapus task dari status lama
    ['backlog', 'todo', 'progress', 'done'].forEach(status => {
      if (state.kanban[status]) {
        const idx = state.kanban[status].findIndex(t => t.task_id === taskId);
        if (idx !== -1) {
          movedTask = state.kanban[status].splice(idx, 1)[0];
        }
      }
    });
    
    // Tambah ke status baru
    if (movedTask) {
      movedTask.status = newStatus;
      if (!state.kanban[newStatus]) state.kanban[newStatus] = [];
      state.kanban[newStatus].unshift(movedTask);
    }
  }
  
  // Add to queue
  addToQueue('moveTask', { task_id: taskId, status: newStatus });
  
  showToast('Dipindahkan! ✓', 'success');
  
  // Re-render kanban
  renderKanban();
}

function filterKanban(goalId) {
  state.selectedGoalFilter = goalId;
  state.cache.kanban = 0; // Force refresh for different filter
  loadKanban(true);
}

function viewGoalDetail(goalId) {
  state.selectedGoalFilter = goalId;
  state.cache.kanban = 0;
  showPage('kanban');
}

function saveVision(level) {
  let data = {};
  
  if (level === '10') {
    data = {
      spiritual: document.getElementById('vision10Spiritual')?.value.trim(),
      karir: document.getElementById('vision10Karir')?.value.trim(),
      relasi: document.getElementById('vision10Relasi')?.value.trim(),
      kesehatan: document.getElementById('vision10Kesehatan')?.value.trim()
    };
  } else if (level === '3') {
    data = { content: document.getElementById('vision3Content')?.value.trim() };
  } else if (level === '1') {
    data = { content: document.getElementById('vision1Content')?.value.trim() };
  }
  
  // Validasi - pastikan ada isi
  const hasContent = Object.values(data).some(v => v && v.length > 0);
  if (!hasContent) {
    showToast('Isi minimal satu field', 'error');
    return;
  }
  
  // Update local state langsung
  if (!state.visions) state.visions = {};
  state.visions[level] = data;
  
  // Add to queue
  addToQueue('saveVision', { level, data });
  
  closeModal('vision-' + level);
  showToast('Visi tersimpan! ✓', 'success');
  
  // Re-render vision page jika sedang dibuka
  if (state.pageLoaded.vision) {
    renderVisions();
  }
}

// ============================================
// HELPERS
// ============================================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.getDate() + '/' + (d.getMonth() + 1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Force refresh all data
function refreshAllData() {
  // Sync pending dulu
  syncPendingQueue();
  
  state.cache = { dailySync: 0, goals: 0, kanban: 0, visions: 0, stats: 0 };
  state.pageLoaded = { home: false, kanban: false, goals: false, stats: false, habits: false, vision: false, pairwise: false, pomodoro: false, menu: false, braindump: false, journal: false, dontlist: false, review: false, ibadah: false, bestweek: false, learning: false, wellbeing: false };
  loadAllData();
  showToast('Memuat ulang data...', 'info');
}

// Force sync sekarang (dari header button atau settings)
async function forceSyncNow() {
  if (state.pendingQueue.length === 0) {
    showToast('Semua data sudah tersimpan ✓', 'success');
    return;
  }
  
  const count = state.pendingQueue.length;
  const syncBtn = document.getElementById('syncButton');
  
  // Update button state
  if (syncBtn) {
    syncBtn.innerHTML = '⏳ Syncing...';
    syncBtn.disabled = true;
  }
  
  showToast(`Menyimpan ${count} item...`, 'info');
  
  await syncPendingQueue();
  
  // Restore button
  if (syncBtn) {
    syncBtn.disabled = false;
    updateSyncIndicator();
  }
  
  if (state.pendingQueue.length === 0) {
    showToast('Semua data tersimpan! ✓', 'success');
  } else {
    showToast(`${state.pendingQueue.length} item gagal disimpan`, 'warning');
  }
  
  // Update settings page jika sedang dibuka
  const settingCount = document.getElementById('settingPendingCount');
  if (settingCount) {
    settingCount.textContent = state.pendingQueue.length;
  }
}

// ============================================
// BATCH 1: BRAIN DUMP FUNCTIONS
// ============================================
function updateCharCount() {
  const input = document.getElementById('brainDumpInput');
  const count = document.getElementById('brainDumpCharCount');
  if (input && count) {
    count.textContent = input.value.length;
  }
}

async function loadBrainDumps() {
  try {
    const data = await apiGet('getBrainDumps', { date: todayString() });
    state.brainDumps = data || [];
    renderBrainDumps();
  } catch (err) {
    console.error('Failed to load brain dumps:', err);
    state.brainDumps = [];
    renderBrainDumps();
  }
}

function renderBrainDumps() {
  const container = document.getElementById('brainDumpList');
  const countBadge = document.getElementById('brainDumpTodayCount');
  
  if (!container) return;
  
  const dumps = state.brainDumps || [];
  
  if (countBadge) {
    countBadge.textContent = dumps.length + ' items';
  }
  
  if (dumps.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🧠</div>
        <p>Belum ada brain dump<br>Mulai tulis apa yang ada di pikiranmu</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = dumps.map(dump => `
    <div class="brain-dump-item" data-id="${dump.log_id}">
      <div class="content">${escapeHtml(dump.content)}</div>
      <div class="meta">
        <span class="time">${dump.time || formatTime(dump.created_at)}</span>
        <div class="actions">
          <button class="btn-task" onclick="openBrainDumpToTask('${dump.log_id}', '${escapeHtml(dump.content).replace(/'/g, "\\'")}')">
            ➡️ Task
          </button>
          <button class="btn-delete" onclick="deleteBrainDump('${dump.log_id}')">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function submitBrainDump() {
  const input = document.getElementById('brainDumpInput');
  const content = input?.value.trim();
  
  if (!content) {
    showToast('Tulis sesuatu dulu', 'error');
    return;
  }
  
  const tempId = 'temp_' + Date.now();
  const now = new Date();
  
  const newDump = {
    log_id: tempId,
    content: content,
    time: now.toTimeString().slice(0, 5),
    created_at: now.toISOString()
  };
  state.brainDumps = [newDump, ...(state.brainDumps || [])];
  
  addToQueue('addBrainDump', { content: content });
  
  input.value = '';
  updateCharCount();
  renderBrainDumps();
  
  showToast('Brain dump tersimpan! ✓', 'success');
}

function openBrainDumpToTask(logId, content) {
  document.getElementById('brainDumpTaskTitle').value = content.substring(0, 100);
  document.getElementById('brainDumpTaskSourceId').value = logId;
  openModal('braindump-task');
}

function convertBrainDumpToTask() {
  const title = document.getElementById('brainDumpTaskTitle').value.trim();
  const priority = document.getElementById('brainDumpTaskPriority').value;
  const status = document.getElementById('brainDumpTaskStatus').value;
  const sourceId = document.getElementById('brainDumpTaskSourceId').value;
  
  if (!title) {
    showToast('Isi judul task', 'error');
    return;
  }
  
  const taskData = {
    title: title,
    description: '',
    priority: priority,
    status: status,
    due_date: ''
  };
  
  const tempId = 'temp_' + Date.now();
  const newTask = {
    task_id: tempId,
    ...taskData,
    created_at: new Date().toISOString()
  };
  
  if (!state.kanban) state.kanban = { backlog: [], todo: [], progress: [], done: [] };
  if (!state.kanban[status]) state.kanban[status] = [];
  state.kanban[status].unshift(newTask);
  
  addToQueue('createTask', { goal_id: '', data: taskData });
  
  state.brainDumps = state.brainDumps.filter(d => d.log_id !== sourceId);
  renderBrainDumps();
  
  closeModal('braindump-task');
  showToast('Task dibuat! ✓', 'success');
}

function deleteBrainDump(logId) {
  if (!confirm('Hapus brain dump ini?')) return;
  
  state.brainDumps = state.brainDumps.filter(d => d.log_id !== logId);
  renderBrainDumps();
  showToast('Dihapus', 'success');
}

// ============================================
// BATCH 1: JOURNAL FUNCTIONS
// ============================================
async function loadJournalToday() {
  try {
    const data = await apiGet('getJournal', { date: todayString() });
    
    state.journals = { morning: null, evening: null };
    
    if (data && data.length > 0) {
      data.forEach(entry => {
        const content = parseJSON(entry.content) || {};
        if (content.type === 'morning' || (entry.time && entry.time < '12:00')) {
          state.journals.morning = { ...entry, parsed: content };
        } else {
          state.journals.evening = { ...entry, parsed: content };
        }
      });
    }
    
    renderJournal();
  } catch (err) {
    console.error('Failed to load journal:', err);
    renderJournal();
  }
}

function renderJournal() {
  const morningStatus = document.getElementById('journalMorningStatus');
  const eveningStatus = document.getElementById('journalEveningStatus');
  const morningContent = document.getElementById('journalMorningContent');
  const eveningContent = document.getElementById('journalEveningContent');
  
  if (!morningStatus || !eveningStatus) return;
  
  // Morning Journal
  if (state.journals.morning) {
    const m = state.journals.morning.parsed || {};
    morningStatus.textContent = '✓ Ditulis';
    morningStatus.className = 'section-status done';
    morningContent.innerHTML = `
      <div class="journal-content">
        <div class="label">3 hal yang disyukuri:</div>
        <div>${escapeHtml(m.gratitude || '-')}</div>
        <div class="label">Fokus utama:</div>
        <div>${escapeHtml(m.focus || '-')}</div>
        <div class="label">Afirmasi:</div>
        <div>${escapeHtml(m.affirmation || '-')}</div>
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 16px;" onclick="editJournal('morning')">✏️ Edit</button>
    `;
  } else {
    morningStatus.textContent = 'Belum ditulis';
    morningStatus.className = 'section-status pending';
  }
  
  // Evening Journal
  if (state.journals.evening) {
    const e = state.journals.evening.parsed || {};
    eveningStatus.textContent = '✓ Ditulis';
    eveningStatus.className = 'section-status done';
    eveningContent.innerHTML = `
      <div class="journal-content">
        <div class="label">Yang berjalan baik:</div>
        <div>${escapeHtml(e.wins || '-')}</div>
        <div class="label">Yang bisa diperbaiki:</div>
        <div>${escapeHtml(e.improve || '-')}</div>
        <div class="label">Pelajaran:</div>
        <div>${escapeHtml(e.lesson || '-')}</div>
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 16px;" onclick="editJournal('evening')">✏️ Edit</button>
    `;
  } else {
    eveningStatus.textContent = 'Belum ditulis';
    eveningStatus.className = 'section-status pending';
  }
}

function editJournal(type) {
  const journal = state.journals[type];
  const parsed = journal?.parsed || {};
  
  if (type === 'morning') {
    document.getElementById('journalMorningContent').innerHTML = `
      <div class="journal-form">
        <div class="form-group">
          <label class="form-label">3 hal yang disyukuri hari ini:</label>
          <textarea id="journalGratitude" placeholder="1. ...&#10;2. ...&#10;3. ...">${escapeHtml(parsed.gratitude || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Fokus utama hari ini:</label>
          <textarea id="journalFocus" placeholder="Apa yang harus saya selesaikan hari ini?">${escapeHtml(parsed.focus || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Afirmasi positif:</label>
          <textarea id="journalAffirmation" placeholder="Hari ini saya akan...">${escapeHtml(parsed.affirmation || '')}</textarea>
        </div>
        <button class="btn-submit" onclick="submitJournal('morning')">💾 Simpan Jurnal Pagi</button>
      </div>
    `;
  } else {
    document.getElementById('journalEveningContent').innerHTML = `
      <div class="journal-form">
        <div class="form-group">
          <label class="form-label">Apa yang berjalan baik hari ini?</label>
          <textarea id="journalWins" placeholder="Hal positif yang terjadi...">${escapeHtml(parsed.wins || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Apa yang bisa diperbaiki?</label>
          <textarea id="journalImprove" placeholder="Hal yang perlu ditingkatkan...">${escapeHtml(parsed.improve || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Pelajaran hari ini:</label>
          <textarea id="journalLesson" placeholder="Apa yang saya pelajari...">${escapeHtml(parsed.lesson || '')}</textarea>
        </div>
        <button class="btn-submit" onclick="submitJournal('evening')">💾 Simpan Jurnal Malam</button>
      </div>
    `;
  }
}

function submitJournal(type) {
  let content = {};
  
  if (type === 'morning') {
    content = {
      type: 'morning',
      gratitude: document.getElementById('journalGratitude')?.value.trim() || '',
      focus: document.getElementById('journalFocus')?.value.trim() || '',
      affirmation: document.getElementById('journalAffirmation')?.value.trim() || ''
    };
  } else {
    content = {
      type: 'evening',
      wins: document.getElementById('journalWins')?.value.trim() || '',
      improve: document.getElementById('journalImprove')?.value.trim() || '',
      lesson: document.getElementById('journalLesson')?.value.trim() || ''
    };
  }
  
  const hasContent = Object.values(content).some(v => v && v !== 'morning' && v !== 'evening');
  if (!hasContent) {
    showToast('Isi minimal satu field', 'error');
    return;
  }
  
  state.journals[type] = {
    parsed: content,
    time: type
  };
  
  addToQueue('addJournal', { 
    content: JSON.stringify(content),
    time: type
  });
  
  renderJournal();
  showToast('Jurnal tersimpan! ✓', 'success');
}

// ============================================
// BATCH 1: DON'T LIST FUNCTIONS
// ============================================
async function loadDontList() {
  try {
    const data = await apiGet('getDontList');
    state.dontList = data || [];
    renderDontList();
  } catch (err) {
    console.error('Failed to load dont list:', err);
    state.dontList = [];
    renderDontList();
  }
}

function renderDontList() {
  const container = document.getElementById('dontListContainer');
  if (!container) return;
  
  const items = state.dontList || [];
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🚫</div>
        <p>Belum ada Don't List<br>Tambahkan hal-hal yang harus dihindari</p>
      </div>
    `;
    return;
  }
  
  const categories = {
    'FOKUS': { icon: '🎯', title: 'Fokus', items: [] },
    'WAKTU': { icon: '⏰', title: 'Waktu', items: [] },
    'ENERGI': { icon: '⚡', title: 'Energi', items: [] },
    'KEBIASAAN': { icon: '🔄', title: 'Kebiasaan', items: [] }
  };
  
  items.forEach(item => {
    const cat = item.category || 'FOKUS';
    if (categories[cat]) {
      categories[cat].items.push(item);
    }
  });
  
  let html = '';
  Object.entries(categories).forEach(([key, cat]) => {
    if (cat.items.length === 0) return;
    
    html += `
      <div class="dont-category ${key.toLowerCase()}">
        <div class="dont-category-header">
          ${cat.icon} ${cat.title} (${cat.items.length})
        </div>
        <div class="dont-category-items">
          ${cat.items.map(item => `
            <div class="dont-item" data-id="${item.dont_id}">
              <span class="icon">🚫</span>
              <div class="content">
                <div class="item-text">${escapeHtml(item.item)}</div>
                ${item.reason ? `<div class="item-reason">${escapeHtml(item.reason)}</div>` : ''}
              </div>
              <div class="actions">
                <button onclick="deleteDontItem('${item.dont_id}')" title="Hapus">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function submitDontItem() {
  const item = document.getElementById('dontItemText')?.value.trim();
  const reason = document.getElementById('dontItemReason')?.value.trim();
  const category = document.getElementById('dontItemCategory')?.value || 'FOKUS';
  
  if (!item) {
    showToast('Isi hal yang harus dihindari', 'error');
    return;
  }
  
  const tempId = 'temp_' + Date.now();
  
  const newItem = {
    dont_id: tempId,
    item: item,
    reason: reason,
    category: category,
    active: true
  };
  state.dontList = [newItem, ...(state.dontList || [])];
  
  addToQueue('addDontItem', { 
    data: { item, reason, category }
  });
  
  document.getElementById('dontItemText').value = '';
  document.getElementById('dontItemReason').value = '';
  closeModal('dont-add');
  
  renderDontList();
  showToast('Don\'t item ditambahkan! ✓', 'success');
}

function deleteDontItem(dontId) {
  if (!confirm('Hapus item ini?')) return;
  
  state.dontList = state.dontList.filter(d => d.dont_id !== dontId);
  renderDontList();
  
  addToQueue('deleteDontItem', { dont_id: dontId });
  
  showToast('Dihapus', 'success');
}

// ============================================
// BATCH 1: MENU BADGES UPDATE
// ============================================
function updateMenuBadges() {
  // Habit badge
  const habitBadge = document.getElementById('menuHabitBadge');
  if (habitBadge && state.dailySync?.stats) {
    habitBadge.textContent = `${state.dailySync.stats.habits_completed || 0}/${state.dailySync.stats.habits_total || 11}`;
  }
  
  // Brain dump badge
  const brainBadge = document.getElementById('menuBrainDumpBadge');
  if (brainBadge) {
    brainBadge.textContent = (state.brainDumps || []).length;
  }
  
  // Journal badge
  const journalBadge = document.getElementById('menuJournalBadge');
  if (journalBadge) {
    const hasMorning = state.journals?.morning;
    const hasEvening = state.journals?.evening;
    if (hasMorning && hasEvening) {
      journalBadge.textContent = '✓ Lengkap';
      journalBadge.className = 'badge success';
    } else if (hasMorning || hasEvening) {
      journalBadge.textContent = '½';
      journalBadge.className = 'badge warning';
    } else {
      journalBadge.textContent = 'Belum';
      journalBadge.className = 'badge';
    }
  }
  
  // Don't list badge
  const dontBadge = document.getElementById('menuDontBadge');
  if (dontBadge) {
    dontBadge.textContent = (state.dontList || []).length;
  }
  
  // Sync badge
  const syncBadge = document.getElementById('menuSyncBadge');
  if (syncBadge) {
    if (state.pendingQueue.length > 0) {
      syncBadge.style.display = 'inline';
      syncBadge.textContent = state.pendingQueue.length;
    } else {
      syncBadge.style.display = 'none';
    }
  }
}

// ============================================
// BATCH 1: HELPER FUNCTIONS
// ============================================
function todayString() {
  const d = new Date();
  return d.getFullYear() + '-' + 
    String(d.getMonth() + 1).padStart(2, '0') + '-' + 
    String(d.getDate()).padStart(2, '0');
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toTimeString().slice(0, 5);
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// ============================================
// BATCH 2: QUICK BRAIN DUMP
// ============================================
function openQuickBrainDump() {
  document.getElementById('quickBrainDumpInput').value = '';
  openModal('quick-braindump');
}

function submitQuickBrainDump() {
  const input = document.getElementById('quickBrainDumpInput');
  const content = input?.value.trim();
  
  if (!content) {
    showToast('Tulis sesuatu dulu', 'error');
    return;
  }
  
  const tempId = 'temp_' + Date.now();
  const now = new Date();
  
  const newDump = {
    log_id: tempId,
    content: content,
    time: now.toTimeString().slice(0, 5),
    created_at: now.toISOString()
  };
  state.brainDumps = [newDump, ...(state.brainDumps || [])];
  
  addToQueue('addBrainDump', { content: content });
  
  closeModal('quick-braindump');
  showToast('Brain dump tersimpan! 🧠', 'success');
}

// ============================================
// BATCH 2: WEEKLY REVIEW FUNCTIONS
// ============================================
async function loadReviewPage() {
  // Set week number
  const weekNum = getWeekNumber(new Date());
  const weekNumEl = document.getElementById('reviewWeekNumber');
  if (weekNumEl) weekNumEl.textContent = 'Minggu ' + weekNum;
  
  // Load stats (use existing data)
  updateReviewStats();
  
  // Load current week review
  try {
    const year = new Date().getFullYear();
    const review = await apiGet('getWeeklyReview', { week_number: weekNum, year: year });
    state.currentWeekReview = review;
    renderCurrentReview();
  } catch (err) {
    console.error('Failed to load weekly review:', err);
  }
  
  // Load history
  try {
    const history = await apiGet('getReviewHistory', { type: 'WEEKLY', limit: 5 });
    state.reviews = history || [];
    renderReviewHistory();
  } catch (err) {
    console.error('Failed to load review history:', err);
  }
}

function updateReviewStats() {
  // Using existing dailySync stats (weekly stats would need additional API)
  const stats = state.dailySync?.stats || {};
  
  const sholatEl = document.getElementById('reviewStatSholat');
  const habitEl = document.getElementById('reviewStatHabit');
  const pomodoroEl = document.getElementById('reviewStatPomodoro');
  const tasksEl = document.getElementById('reviewStatTasks');
  
  if (sholatEl) {
    const sholatPct = Math.round(((stats.sholat_completed || 0) / 8) * 100);
    sholatEl.textContent = sholatPct + '%';
  }
  if (habitEl) {
    const habitTotal = stats.habits_total || 11;
    const habitPct = Math.round(((stats.habits_completed || 0) / habitTotal) * 100);
    habitEl.textContent = habitPct + '%';
  }
  if (pomodoroEl) pomodoroEl.textContent = stats.pomodoro_count || 0;
  if (tasksEl) {
    const done = state.kanban?.done?.length || 0;
    tasksEl.textContent = done;
  }
}

function renderCurrentReview() {
  const container = document.getElementById('reviewCurrentContent');
  const statusBadge = document.getElementById('reviewCurrentStatus');
  
  if (!container) return;
  
  if (state.currentWeekReview) {
    const r = state.currentWeekReview;
    statusBadge.textContent = '✓ Ditulis';
    statusBadge.className = 'badge success';
    
    container.innerHTML = `
      <div style="font-size: 13px; line-height: 1.8; color: var(--gray-700);">
        ${r.wins ? `<p><strong>🏆 Wins:</strong> ${escapeHtml(r.wins)}</p>` : ''}
        ${r.challenges ? `<p><strong>🚧 Challenges:</strong> ${escapeHtml(r.challenges)}</p>` : ''}
        ${r.lessons ? `<p><strong>💡 Lessons:</strong> ${escapeHtml(r.lessons)}</p>` : ''}
        ${r.next_focus ? `<p><strong>🎯 Fokus:</strong> ${escapeHtml(r.next_focus)}</p>` : ''}
        <div style="display: flex; gap: 16px; margin-top: 12px;">
          ${r.energy_level ? `<span>⚡ Energi: ${r.energy_level}/10</span>` : ''}
          ${r.satisfaction ? `<span>😊 Kepuasan: ${r.satisfaction}/10</span>` : ''}
        </div>
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 16px; width: 100%;" onclick="editWeeklyReview()">
        ✏️ Edit Review
      </button>
    `;
  } else {
    statusBadge.textContent = 'Belum';
    statusBadge.className = 'badge';
    container.innerHTML = `
      <button class="btn-submit" onclick="openModal('weekly-review')" style="width: 100%;">
        ✏️ Tulis Weekly Review
      </button>
    `;
  }
}

function editWeeklyReview() {
  const r = state.currentWeekReview || {};
  document.getElementById('reviewWins').value = r.wins || '';
  document.getElementById('reviewChallenges').value = r.challenges || '';
  document.getElementById('reviewLessons').value = r.lessons || '';
  document.getElementById('reviewGratitude').value = r.gratitude || '';
  document.getElementById('reviewNextFocus').value = r.next_focus || '';
  document.getElementById('reviewEnergy').value = r.energy_level || '';
  document.getElementById('reviewSatisfaction').value = r.satisfaction || '';
  openModal('weekly-review');
}

function submitWeeklyReview() {
  const data = {
    wins: document.getElementById('reviewWins')?.value.trim() || '',
    challenges: document.getElementById('reviewChallenges')?.value.trim() || '',
    lessons: document.getElementById('reviewLessons')?.value.trim() || '',
    gratitude: document.getElementById('reviewGratitude')?.value.trim() || '',
    next_focus: document.getElementById('reviewNextFocus')?.value.trim() || '',
    energy_level: document.getElementById('reviewEnergy')?.value || '',
    satisfaction: document.getElementById('reviewSatisfaction')?.value || ''
  };
  
  // Check if has content
  const hasContent = Object.values(data).some(v => v);
  if (!hasContent) {
    showToast('Isi minimal satu field', 'error');
    return;
  }
  
  // Update local state
  state.currentWeekReview = {
    ...data,
    week_number: getWeekNumber(new Date()),
    year: new Date().getFullYear()
  };
  
  // Add to queue
  addToQueue('saveWeeklyReview', { data: data });
  
  closeModal('weekly-review');
  renderCurrentReview();
  showToast('Weekly review tersimpan! ✓', 'success');
}

function renderReviewHistory() {
  const container = document.getElementById('reviewHistoryList');
  if (!container) return;
  
  const reviews = state.reviews || [];
  
  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <p style="color: var(--gray-500); font-size: 13px;">Belum ada riwayat review</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = reviews.map(r => `
    <div class="review-history-item">
      <div class="header">
        <span class="week">Minggu ${r.week_number}</span>
        <span class="date">${r.date || ''}</span>
      </div>
      <div class="scores">
        ${r.energy_level ? `<span>⚡ ${r.energy_level}</span>` : ''}
        ${r.satisfaction ? `<span>😊 ${r.satisfaction}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// JOURNAL - UPDATED FOR HOME PAGE
// ============================================
function openJournalForm(type) {
  openModal('journal-' + type);
}

function renderHomeJournals() {
  // Morning
  const morningCard = document.getElementById('journalMorningCard');
  const morningStatus = document.getElementById('journalMorningStatus');
  const morningContent = document.getElementById('journalMorningContent');
  
  if (morningCard && state.journals.morning) {
    const m = state.journals.morning.parsed || {};
    morningStatus.textContent = '✓ Ditulis';
    morningStatus.className = 'status done';
    morningContent.innerHTML = `
      <div class="content">
        <div class="label">🙏 Syukur:</div>
        <div>${escapeHtml(m.gratitude || '-')}</div>
        <div class="label">🎯 Fokus:</div>
        <div>${escapeHtml(m.focus || '-')}</div>
        <div class="label">✨ Afirmasi:</div>
        <div>${escapeHtml(m.affirmation || '-')}</div>
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 12px;" onclick="openJournalForm('morning')">✏️ Edit</button>
    `;
  }
  
  // Evening
  const eveningCard = document.getElementById('journalEveningCard');
  const eveningStatus = document.getElementById('journalEveningStatus');
  const eveningContent = document.getElementById('journalEveningContent');
  
  if (eveningCard && state.journals.evening) {
    const e = state.journals.evening.parsed || {};
    eveningStatus.textContent = '✓ Ditulis';
    eveningStatus.className = 'status done';
    eveningContent.innerHTML = `
      <div class="content">
        <div class="label">🏆 Wins:</div>
        <div>${escapeHtml(e.wins || '-')}</div>
        <div class="label">🔧 Improve:</div>
        <div>${escapeHtml(e.improve || '-')}</div>
        <div class="label">💡 Pelajaran:</div>
        <div>${escapeHtml(e.lesson || '-')}</div>
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 12px;" onclick="openJournalForm('evening')">✏️ Edit</button>
    `;
  }
}

// ============================================
// BATCH 3: BEST WEEK TEMPLATE
// ============================================
async function loadBestWeek() {
  try {
    const data = await apiGet('getBestWeek');
    state.bestWeek = {};
    if (data && data.length > 0) {
      data.forEach(t => {
        const parsed = parseJSON(t.data) || {};
        if (parsed.hari) {
          state.bestWeek[parsed.hari] = parsed.jadwal || [];
        }
      });
    }
  } catch (err) {
    console.error('Failed to load best week:', err);
  }
}

function showBestWeekDay(day) {
  // Update tabs
  const tabs = document.querySelectorAll('#bestWeekTabs .tab-btn');
  tabs.forEach((t, i) => {
    t.classList.toggle('active', i + 1 === day);
  });
  
  const container = document.getElementById('bestWeekContent');
  const jadwal = state.bestWeek[day] || [];
  
  if (jadwal.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>Belum ada jadwal untuk hari ini</p>
        <button class="btn-submit btn-secondary" style="width: auto; margin-top: 12px;" onclick="openBestWeekEdit(${day})">+ Atur Jadwal</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div style="font-size: 13px; line-height: 2;">
      ${jadwal.map(item => `
        <div style="display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--gray-100);">
          <span style="font-weight: 600; color: var(--primary); min-width: 50px;">${item.waktu}</span>
          <span>${escapeHtml(item.aktivitas)}</span>
        </div>
      `).join('')}
    </div>
    <button class="btn-submit btn-secondary" style="margin-top: 16px;" onclick="openBestWeekEdit(${day})">✏️ Edit</button>
  `;
}

function openBestWeekEdit(day) {
  // Simple prompt-based edit for now
  const jadwal = state.bestWeek[day] || [];
  const current = jadwal.map(j => `${j.waktu} - ${j.aktivitas}`).join('\n');
  
  const input = prompt(
    `Jadwal Hari ${day} (format: HH:MM - Aktivitas, satu per baris):\n\nContoh:\n03:30 - Tahajud\n04:30 - Subuh\n05:00 - Tilawah`,
    current
  );
  
  if (input === null) return;
  
  const lines = input.split('\n').filter(l => l.trim());
  const newJadwal = lines.map(line => {
    const parts = line.split(' - ');
    return {
      waktu: parts[0]?.trim() || '',
      aktivitas: parts.slice(1).join(' - ').trim() || ''
    };
  }).filter(j => j.waktu && j.aktivitas);
  
  state.bestWeek[day] = newJadwal;
  
  addToQueue('saveBestWeek', {
    dayNumber: day,
    jadwal: newJadwal
  });
  
  showBestWeekDay(day);
  showToast('Jadwal tersimpan! ✓', 'success');
}

// ============================================
// BATCH 3: LEARNING TRACKER
// ============================================
async function loadLearnings() {
  try {
    const data = await apiGet('getLearning');
    state.learnings = data || [];
    renderLearnings();
  } catch (err) {
    console.error('Failed to load learnings:', err);
    state.learnings = [];
    renderLearnings();
  }
}

function renderLearnings() {
  const container = document.getElementById('learningList');
  if (!container) return;
  
  const items = state.learnings || [];
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <p>Belum ada learning yang di-track</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = items.map(item => {
    const data = parseJSON(item.data) || {};
    const progress = parseInt(item.progress) || 0;
    
    return `
      <div class="card" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 15px; font-weight: 700;">${escapeHtml(item.name)}</div>
            <div style="font-size: 12px; color: var(--gray-500); margin-top: 4px;">${escapeHtml(data.sumber || '')}</div>
          </div>
          <button onclick="deleteLearning('${item.template_id}')" style="background: none; border: none; cursor: pointer; font-size: 16px;">🗑️</button>
        </div>
        ${data.target ? `<div style="font-size: 12px; color: var(--gray-600); margin-bottom: 12px;">🎯 ${escapeHtml(data.target)}</div>` : ''}
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="flex: 1; height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: var(--success); border-radius: 4px;"></div>
          </div>
          <span style="font-size: 13px; font-weight: 600; color: var(--success);">${progress}%</span>
        </div>
        <div style="margin-top: 12px;">
          <input type="range" min="0" max="100" value="${progress}" 
            style="width: 100%;" 
            onchange="updateLearningProgress('${item.template_id}', this.value)">
        </div>
      </div>
    `;
  }).join('');
}

function submitLearning() {
  const name = document.getElementById('learningName')?.value.trim();
  const sumber = document.getElementById('learningSumber')?.value.trim();
  const target = document.getElementById('learningTarget')?.value.trim();
  
  if (!name) {
    showToast('Isi topik learning', 'error');
    return;
  }
  
  const tempId = 'temp_' + Date.now();
  
  const newItem = {
    template_id: tempId,
    name: name,
    data: JSON.stringify({ topik: name, sumber, target }),
    progress: '0%',
    status: 'active'
  };
  
  state.learnings = [...(state.learnings || []), newItem];
  
  addToQueue('saveLearning', {
    data: { name, sumber, target, topik: name }
  });
  
  document.getElementById('learningName').value = '';
  document.getElementById('learningSumber').value = '';
  document.getElementById('learningTarget').value = '';
  
  closeModal('learning-add');
  renderLearnings();
  showToast('Learning ditambahkan! ✓', 'success');
}

function updateLearningProgress(templateId, progress) {
  const item = state.learnings.find(l => l.template_id === templateId);
  if (item) {
    item.progress = progress + '%';
    
    addToQueue('updateLearning', {
      template_id: templateId,
      updates: { progress: progress + '%' }
    });
    
    showToast('Progress updated', 'success');
  }
}

function deleteLearning(templateId) {
  if (!confirm('Hapus learning ini?')) return;
  
  state.learnings = state.learnings.filter(l => l.template_id !== templateId);
  renderLearnings();
  
  addToQueue('deleteLearning', { template_id: templateId });
  showToast('Dihapus', 'success');
}

// ============================================
// BATCH 3: WELLBEING TRENDS
// ============================================
async function loadWellbeingTrends() {
  try {
    const data = await apiGet('getWellbeingTrends', { weeks: 12 });
    state.wellbeingTrends = data || [];
    renderWellbeingTrends();
  } catch (err) {
    console.error('Failed to load wellbeing:', err);
    state.wellbeingTrends = [];
    renderWellbeingTrends();
  }
}

function renderWellbeingTrends() {
  const chartContainer = document.getElementById('wellbeingChart');
  const avgEnergy = document.getElementById('wellbeingAvgEnergy');
  const avgSatisfaction = document.getElementById('wellbeingAvgSatisfaction');
  
  if (!chartContainer) return;
  
  const trends = state.wellbeingTrends || [];
  
  if (trends.length === 0) {
    chartContainer.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>Isi Weekly Review untuk melihat tren</p>
      </div>
    `;
    if (avgEnergy) avgEnergy.textContent = '-';
    if (avgSatisfaction) avgSatisfaction.textContent = '-';
    return;
  }
  
  // Calculate averages
  let totalEnergy = 0, totalSat = 0, countEnergy = 0, countSat = 0;
  trends.forEach(t => {
    if (t.energy) { totalEnergy += parseInt(t.energy); countEnergy++; }
    if (t.satisfaction) { totalSat += parseInt(t.satisfaction); countSat++; }
  });
  
  if (avgEnergy) avgEnergy.textContent = countEnergy > 0 ? (totalEnergy / countEnergy).toFixed(1) : '-';
  if (avgSatisfaction) avgSatisfaction.textContent = countSat > 0 ? (totalSat / countSat).toFixed(1) : '-';
  
  // Simple bar chart
  const maxVal = 10;
  chartContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${trends.slice(0, 8).reverse().map(t => `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: var(--gray-500); min-width: 30px;">W${t.week}</span>
          <div style="flex: 1; display: flex; gap: 4px;">
            <div style="height: 16px; width: ${(parseInt(t.energy || 0) / maxVal) * 100}%; background: var(--warning); border-radius: 2px;" title="Energi: ${t.energy}"></div>
          </div>
          <div style="flex: 1; display: flex; gap: 4px;">
            <div style="height: 16px; width: ${(parseInt(t.satisfaction || 0) / maxVal) * 100}%; background: var(--success); border-radius: 2px;" title="Kepuasan: ${t.satisfaction}"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="display: flex; justify-content: center; gap: 24px; margin-top: 16px; font-size: 11px; color: var(--gray-500);">
      <span>⚡ Energi</span>
      <span>😊 Kepuasan</span>
    </div>
  `;
}

// ============================================
// GOAL CARD - EXPANDABLE WITH MILESTONES & TASKS
// ============================================
function renderGoals(filter = 'active') {
  const container = document.getElementById('goalsList');
  if (!container) return;
  
  let goals = state.goals || [];
  
  if (filter === 'active') {
    goals = goals.filter(g => g.status === 'active');
  }
  
  // Sort by rank
  goals.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon">🎯</span>
        <p>Belum ada goal. Tambahkan goal 12 minggu Anda!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = goals.map((goal, index) => {
    const milestones = goal.milestones || [];
    const tasks = (state.kanban ? [...(state.kanban.todo || []), ...(state.kanban.progress || []), ...(state.kanban.done || [])] : [])
      .filter(t => t.goal_id === goal.goal_id);
    
    const completedMilestones = milestones.filter(m => m.completed).length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const progress = milestones.length > 0 
      ? Math.round((completedMilestones / milestones.length) * 100)
      : (tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0);
    
    const rankClass = index === 0 ? 'r1' : (index === 1 ? 'r2' : (index === 2 ? 'r3' : ''));
    
    return `
      <div class="goal-card" id="goal-${goal.goal_id}">
        <div class="goal-card-header" onclick="toggleGoalCard('${goal.goal_id}')">
          <div class="goal-card-top">
            <div class="goal-rank ${rankClass}">#${index + 1}</div>
            <div class="goal-info">
              <div class="goal-title">${escapeHtml(goal.title)}</div>
              <div class="goal-meta">Q${goal.quarter} ${goal.year} • ${milestones.length} milestone • ${tasks.length} task</div>
            </div>
            <span class="goal-expand">▼</span>
          </div>
          <div class="goal-progress">
            <div class="goal-progress-bar" style="width: ${progress}%;"></div>
          </div>
          <div class="goal-progress-text">
            <span>Progress</span>
            <span>${progress}%</span>
          </div>
        </div>
        
        <div class="goal-card-body">
          <div class="goal-card-content">
            <!-- Milestones Section -->
            <div class="goal-section">
              <div class="goal-section-header">
                <span class="goal-section-title">📌 Milestones (${completedMilestones}/${milestones.length})</span>
                <span class="goal-section-action" onclick="event.stopPropagation(); openMilestoneModal('${goal.goal_id}')">+ Tambah</span>
              </div>
              ${milestones.length === 0 ? '<p style="font-size: 12px; color: var(--gray-400);">Belum ada milestone</p>' : ''}
              ${milestones.map(m => `
                <div class="milestone-mini ${m.completed ? 'done' : ''}">
                  <div class="check" onclick="event.stopPropagation(); toggleMilestone('${m.milestone_id}')">${m.completed ? '✓' : ''}</div>
                  <span class="text">${escapeHtml(m.title)}</span>
                  <span class="week">W${m.week || 1}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Tasks Section -->
            <div class="goal-section">
              <div class="goal-section-header">
                <span class="goal-section-title">📋 Tasks (${completedTasks}/${tasks.length})</span>
                <span class="goal-section-action" onclick="event.stopPropagation(); openTaskModalForGoal('${goal.goal_id}')">+ Tambah</span>
              </div>
              ${tasks.length === 0 ? '<p style="font-size: 12px; color: var(--gray-400);">Belum ada task</p>' : ''}
              ${tasks.slice(0, 5).map(t => `
                <div class="task-mini">
                  <span class="priority ${t.priority || 'medium'}"></span>
                  <span class="title">${escapeHtml(t.title)}</span>
                  <span class="status ${t.status}">${t.status === 'done' ? 'Done' : (t.status === 'progress' ? 'Progress' : 'Todo')}</span>
                </div>
              `).join('')}
              ${tasks.length > 5 ? `<p style="font-size: 11px; color: var(--gray-500); margin-top: 8px;">+${tasks.length - 5} task lainnya</p>` : ''}
            </div>
            
            <!-- Actions -->
            <div style="display: flex; gap: 8px; margin-top: 16px;">
              <button class="btn-submit btn-secondary" style="flex: 1; padding: 10px;" onclick="event.stopPropagation(); showPage('kanban')">📊 Kanban</button>
              <button class="btn-submit btn-secondary" style="flex: 1; padding: 10px;" onclick="event.stopPropagation(); deleteGoal('${goal.goal_id}')">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleGoalCard(goalId) {
  const card = document.getElementById('goal-' + goalId);
  if (card) {
    card.classList.toggle('expanded');
  }
}

function openMilestoneModal(goalId) {
  document.getElementById('milestoneGoalId').value = goalId;
  document.getElementById('milestoneTitle').value = '';
  openModal('milestone');
}

function openTaskModalForGoal(goalId) {
  populateGoalSelect();
  document.getElementById('taskGoal').value = goalId;
  document.getElementById('taskTitle').value = '';
  openModal('task');
}

function deleteGoal(goalId) {
  if (!confirm('Hapus goal ini beserta semua milestone dan task-nya?')) return;
  
  state.goals = state.goals.filter(g => g.goal_id !== goalId);
  renderGoals();
  
  addToQueue('deleteGoal', { goal_id: goalId });
  showToast('Goal dihapus', 'success');
}

// ============================================
// UPDATE MENU BADGES
// ============================================
function updateMenuBadges() {
  // Sholat badge
  const sholatBadge = document.getElementById('menuSholatBadge');
  if (sholatBadge && state.dailySync?.stats) {
    sholatBadge.textContent = `${state.dailySync.stats.sholat_completed || 0}/8`;
  }
  
  // Habit badge
  const habitBadge = document.getElementById('menuHabitBadge');
  if (habitBadge && state.dailySync?.stats) {
    habitBadge.textContent = `${state.dailySync.stats.habits_completed || 0}/${state.dailySync.stats.habits_total || 11}`;
  }
  
  // Brain dump badge
  const brainBadge = document.getElementById('menuBrainDumpBadge');
  if (brainBadge) {
    brainBadge.textContent = (state.brainDumps || []).length;
  }
  
  // Don't list badge
  const dontBadge = document.getElementById('menuDontBadge');
  if (dontBadge) {
    dontBadge.textContent = (state.dontList || []).length;
  }
  
  // Learning badge
  const learningBadge = document.getElementById('menuLearningBadge');
  if (learningBadge) {
    learningBadge.textContent = (state.learnings || []).length;
  }
}

// ============================================
// POMODORO SETTINGS
// ============================================
async function loadPomodoroSettings() {
  try {
    const settings = await apiGet('getPomodoroSettings');
    if (settings) {
      state.pomodoroSettings = {
        pomodoro: settings.pomodoro_duration || 25,
        deepWork: settings.deep_work_duration || 60,
        ultraFocus: settings.ultra_focus_duration || 90,
        shortBreak: settings.short_break || 5,
        dailyTarget: settings.daily_target || 8
      };
      updatePomodoroLabels();
    }
  } catch (err) {
    console.log('Using default pomodoro settings');
  }
}

function updatePomodoroLabels() {
  const s = state.pomodoroSettings;
  
  const label25 = document.getElementById('pomodoroLabel25');
  const label60 = document.getElementById('pomodoroLabel60');
  const label90 = document.getElementById('pomodoroLabel90');
  
  if (label25) label25.textContent = s.pomodoro + ' menit';
  if (label60) label60.textContent = s.deepWork + ' menit';
  if (label90) label90.textContent = s.ultraFocus + ' menit';
  
  // Update POMODORO_TYPES if exists
  if (typeof POMODORO_TYPES !== 'undefined') {
    if (POMODORO_TYPES.POMODORO_25) POMODORO_TYPES.POMODORO_25.duration = s.pomodoro * 60;
    if (POMODORO_TYPES.DEEP_WORK_60) POMODORO_TYPES.DEEP_WORK_60.duration = s.deepWork * 60;
    if (POMODORO_TYPES.DEEP_WORK_90) POMODORO_TYPES.DEEP_WORK_90.duration = s.ultraFocus * 60;
  }
}

function savePomodoroSettings() {
  const pomodoro = parseInt(document.getElementById('settingPomodoro')?.value) || 25;
  const deepWork = parseInt(document.getElementById('settingDeepWork')?.value) || 60;
  const ultraFocus = parseInt(document.getElementById('settingUltraFocus')?.value) || 90;
  const dailyTarget = parseInt(document.getElementById('settingDailyTarget')?.value) || 8;
  
  state.pomodoroSettings = { pomodoro, deepWork, ultraFocus, shortBreak: 5, dailyTarget };
  
  addToQueue('updatePomodoroSettings', {
    data: {
      pomodoro_duration: pomodoro,
      deep_work_duration: deepWork,
      ultra_focus_duration: ultraFocus,
      short_break: 5,
      daily_target: dailyTarget
    }
  });
  
  updatePomodoroLabels();
  closeModal('pomodoro-settings');
  showToast('Settings tersimpan! ✓', 'success');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  loadPomodoroSettings();
  loadJournalToday().then(() => renderHomeJournals());
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // SYNC saat app di-hide (pindah tab, minimize, tutup)
    if (state.pendingQueue.length > 0) {
      syncPendingQueue();
    }
  } else if (document.visibilityState === 'visible') {
    // Refresh jika sudah lama tidak aktif
    const lastActivity = state.cache.dailySync || 0;
    if (Date.now() - lastActivity > CONFIG.CACHE_DURATION) {
      loadDailySync(true);
    }
    updateSyncIndicator();
  }
});

// Sync sebelum user menutup halaman
window.addEventListener('beforeunload', () => {
  if (state.pendingQueue.length > 0) {
    // Gunakan sendBeacon untuk reliable sync saat close
    const data = JSON.stringify({
      action: 'batchSync',
      user_id: CONFIG.USER_ID,
      items: state.pendingQueue
    });
    navigator.sendBeacon(CONFIG.API_URL, data);
  }
});

// Sync periodik setiap 30 detik jika ada pending
setInterval(() => {
  if (state.pendingQueue.length > 0 && !state.isSyncing) {
    syncPendingQueue();
  }
}, 30000);
