// ============================================
// SYNC PLANNER v3.0 - OPTIMIZED VERSION
// ============================================

// CONFIG
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxNuxFB-sCRcuLe6YzOR6kW21AIEo2ne9NQdGv5SV-ac8XALyHU_b_lFbtdiTqH2FXmkw/exec',
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
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
  
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await response.text();
    const data = JSON.parse(text);
    if (!data.success) throw new Error(data.error?.message || data.error || 'API Error');
    return data.data;
  } catch (err) {
    clearTimeout(timeoutId);
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
      if (!state.habitLogHistory) {
        loadHabitLogHistory(7);
      } else {
        renderHabitLogHistory();
      }
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
    case 'refleksi':
      renderRefleksiPage();
      state.pageLoaded.refleksi = true;
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

// Show pelajaran tab
function showPelajaranTab(tabName, btnEl) {
  // Update tab buttons
  document.querySelectorAll('.pelajaran-tab').forEach(tab => tab.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  
  // Update content
  document.querySelectorAll('.pelajaran-content').forEach(content => content.classList.remove('active'));
  document.getElementById('pelajaran-' + tabName)?.classList.add('active');
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
    
    // Load secondary data in background (non-blocking) - parallel
    Promise.all([
      loadGoals(true),
      loadKanban(false),
      loadDontList(),
      loadJournalToday()
    ]).then(() => {
      // After data loaded, render home components
      renderTodayFocus();
      renderHomeJournals();
    }).catch(() => {});
    
    // Load less critical in background
    loadVisions(true);
    loadBrainDumps(true);
    
  } catch (err) {
    showToast('Gagal memuat: ' + err.message, 'error');
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
    renderTodayFocus(); // Update home page too
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
    renderTodayFocus(); // Update home page too
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
    // Also load history
    loadPomodoroHistory();
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

async function loadPomodoroHistory(limit = 20) {
  try {
    const history = await apiGet('getPomodoroHistory', { limit });
    state.pomodoroHistory = history || [];
    renderPomodoroHistory();
  } catch (err) {
    console.error('Failed to load pomodoro history:', err);
  }
}

function renderPomodoroHistory() {
  const container = document.getElementById('pomodoroHistoryList');
  if (!container) return;
  
  const history = state.pomodoroHistory || [];
  
  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <span class="icon">🍅</span>
        <p style="color: var(--gray-500); font-size: 13px;">Belum ada riwayat sesi</p>
      </div>`;
    return;
  }
  
  // Group by date
  const grouped = {};
  history.forEach(s => {
    const date = s.date || 'Unknown';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  });
  
  let html = '';
  Object.entries(grouped).forEach(([date, sessions]) => {
    html += `<div class="history-date-header">${formatDate(date)}</div>`;
    sessions.forEach(s => {
      const typeLabel = POMODORO_TYPES[s.type]?.label || '🍅';
      const duration = s.duration_minutes || s.duration || 25;
      html += `
        <div class="history-item">
          <div class="history-item-icon">${typeLabel.split(' ')[0]}</div>
          <div class="history-item-content">
            <div class="history-item-task">${escapeHtml(s.actual_task || s.notes || s.planned_task || 'Sesi Fokus')}</div>
            <div class="history-item-meta">
              <span>${s.start_time || ''} - ${s.end_time || ''}</span>
              <span>${duration} menit</span>
            </div>
          </div>
        </div>`;
    });
  });
  
  container.innerHTML = html;
}

async function loadHabitLogHistory(days = 7) {
  try {
    const history = await apiGet('getHabitLogHistory', { days });
    state.habitLogHistory = history || [];
    renderHabitLogHistory();
  } catch (err) {
    console.error('Failed to load habit log history:', err);
  }
}

function renderHabitLogHistory() {
  const container = document.getElementById('habitLogHistoryList');
  if (!container) return;
  
  const history = state.habitLogHistory || [];
  
  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p style="color: var(--gray-500); font-size: 13px;">Belum ada riwayat</p>
      </div>`;
    return;
  }
  
  container.innerHTML = history.map(day => `
    <div class="habit-history-day">
      <div class="habit-history-date">
        <span class="day-name">${day.day}</span>
        <span class="date">${formatDate(day.date)}</span>
        <span class="count">${day.habits_completed} habit</span>
      </div>
      <div class="habit-history-items">
        ${day.habits.map(h => `
          <span class="habit-chip">✓ ${escapeHtml(h.name)}</span>
        `).join('')}
      </div>
    </div>
  `).join('');
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
  renderSholatMiniList(data.sholat);
  renderHabitRosul(data.habits);
  renderSunnahMiniList(data.habits);
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

// ============================================
// HOME MINI COMPONENTS
// ============================================
function renderSholatMiniList(sholatData) {
  const container = document.getElementById('sholatMiniList');
  const badge = document.getElementById('sholatBadge');
  if (!container) return;
  
  const sholatList = [
    { id: 'SUBUH', name: 'Subuh', icon: '🌅' },
    { id: 'DZUHUR', name: 'Dzuhur', icon: '🌞' },
    { id: 'ASHAR', name: 'Ashar', icon: '🌇' },
    { id: 'MAGHRIB', name: 'Maghrib', icon: '🌆' },
    { id: 'ISYA', name: 'Isya', icon: '🌃' },
    { id: 'TAHAJUD', name: 'Tahajud', icon: '🌙' },
    { id: 'DHUHA', name: 'Dhuha', icon: '☀️' },
    { id: 'WITIR', name: 'Witir', icon: '⭐' }
  ];
  
  // Handle array format from API
  const sholatMap = {};
  if (Array.isArray(sholatData)) {
    sholatData.forEach(s => {
      sholatMap[s.waktu] = { done: s.status === 'done' || s.status === true, ...s };
    });
  }
  
  let completedCount = 0;
  container.innerHTML = sholatList.map(s => {
    const data = sholatMap[s.id] || { done: false };
    if (data.done) completedCount++;
    return `<div class="sholat-row-item ${data.done ? 'done' : ''}" onclick="toggleSholat('${s.id}', ${data.done})">
      <span class="check">${data.done ? '✓' : ''}</span>
      <span class="sholat-icon">${s.icon}</span>
      <span class="sholat-name">${s.name}</span>
    </div>`;
  }).join('');
  
  if (badge) badge.textContent = `${completedCount}/8`;
}

// Toggle Sholat - langsung toggle tanpa modal
function toggleSholat(waktu, isDone) {
  // INSTANT UI UPDATE
  const clickedItem = event?.currentTarget;
  if (clickedItem) {
    if (isDone) {
      clickedItem.classList.remove('done');
      const checkbox = clickedItem.querySelector('.check');
      if (checkbox) checkbox.textContent = '';
    } else {
      clickedItem.classList.add('done');
      const checkbox = clickedItem.querySelector('.check');
      if (checkbox) checkbox.textContent = '✓';
    }
  }
  
  // Update badge
  const badge = document.getElementById('sholatBadge');
  if (badge) {
    const current = parseInt(badge.textContent.split('/')[0]) || 0;
    badge.textContent = `${isDone ? current - 1 : current + 1}/8`;
  }
  
  const newStatus = isDone ? 'pending' : 'done';
  const today = new Date().toISOString().split('T')[0];
  
  // Update local state properly
  if (state.dailySync) {
    if (!state.dailySync.sholat) {
      state.dailySync.sholat = [];
    }
    
    if (Array.isArray(state.dailySync.sholat)) {
      const existingIndex = state.dailySync.sholat.findIndex(s => s.waktu === waktu);
      if (existingIndex >= 0) {
        state.dailySync.sholat[existingIndex].status = newStatus;
      } else {
        state.dailySync.sholat.push({ waktu, status: newStatus, tanggal: today });
      }
    }
  }
  
  // ADD TO QUEUE - format untuk backend v3
  addToQueue('logSholat', {
    data: {
      waktu: waktu,
      tanggal: today,
      status: newStatus,
      lokasi: 'rumah',
      berjamaah: false,
      catatan: ''
    }
  });
  
  // SYNC IMMEDIATELY so data persists
  syncPendingQueue();
  
  showToast(isDone ? 'Dibatalkan' : 'Alhamdulillah! ✓', isDone ? 'info' : 'success');
}

function renderSunnahMiniList(habits) {
  const container = document.getElementById('sunnahMiniList');
  const badge = document.getElementById('sunnahBadge');
  if (!container) return;
  
  const habitsList = habits || [];
  let completedCount = 0;
  
  const html = habitsList.slice(0, 6).map(h => {
    if (h.completed) completedCount++;
    return `<div class="sunnah-mini-item ${h.completed ? 'done' : ''}" onclick="toggleHabitRosul('${h.habit_id}', ${h.completed})">
      <span class="check">${h.completed ? '✓' : ''}</span>
      <span>${escapeHtml(h.name)}</span>
    </div>`;
  }).join('');
  
  container.innerHTML = html || '<div style="padding: 8px; color: var(--gray-400); font-size: 11px;">Tidak ada sunnah</div>';
  if (badge) badge.textContent = `${completedCount}/${habitsList.length}`;
}

// Render Don't List Mini untuk Beranda dengan checklist
function renderDontListMini() {
  const container = document.getElementById('dontListMini');
  if (!container) return;
  
  const items = state.dontList || [];
  const today = new Date().toISOString().split('T')[0];
  
  if (items.length === 0) {
    container.innerHTML = `<div style="padding: 12px; text-align: center;">
      <p style="font-size: 12px; color: var(--gray-400);">Hal yang perlu dihindari</p>
      <button class="btn-submit btn-secondary" style="width: auto; margin-top: 8px; font-size: 11px;" onclick="showPage('dontlist')">+ Tambah</button>
    </div>`;
    return;
  }
  
  // Get today's violations from state
  const todayViolations = state.dontViolations || {};
  
  // Show up to 6 items instead of 4
  const displayItems = items.slice(0, 6);
  
  container.innerHTML = displayItems.map(item => {
    const itemId = item.dont_id || item.id;
    const isViolated = todayViolations[itemId] === true;
    const isObeyed = todayViolations[itemId] === false;
    // Support both 'title' (from backend) and 'item' (legacy)
    const itemText = item.title || item.item || item.content || '';
    
    return `
    <div class="dont-mini-item ${isViolated ? 'violated' : ''} ${isObeyed ? 'obeyed' : ''}">
      <div class="dont-item-text">
        <span class="icon">${isViolated ? '❌' : isObeyed ? '✅' : '🚫'}</span>
        <span>${escapeHtml(itemText)}</span>
      </div>
      <div class="dont-item-actions">
        <button class="dont-btn obey ${isObeyed ? 'active' : ''}" onclick="event.stopPropagation();markDontItem('${itemId}', false)" title="Dipatuhi">✓</button>
        <button class="dont-btn violate ${isViolated ? 'active' : ''}" onclick="event.stopPropagation();markDontItem('${itemId}', true)" title="Dilanggar">✗</button>
      </div>
    </div>`;
  }).join('') + 
  (items.length > 6 ? `<div style="font-size: 11px; color: var(--gray-400); text-align: center; padding: 4px;">+${items.length - 6} lainnya</div>` : '') +
  `<button class="btn-link" style="font-size: 11px; padding: 4px 0; margin-top: 4px;" onclick="showPage('dontlist')">Lihat Semua (${items.length}) →</button>`;
}

// Mark don't list item as obeyed or violated
function markDontItem(dontId, isViolated) {
  if (!state.dontViolations) state.dontViolations = {};
  
  // Toggle if same value
  if (state.dontViolations[dontId] === isViolated) {
    delete state.dontViolations[dontId];
  } else {
    state.dontViolations[dontId] = isViolated;
  }
  
  // Save to queue
  const today = new Date().toISOString().split('T')[0];
  addToQueue('logDontViolation', {
    dont_id: dontId,
    tanggal: today,
    violated: isViolated
  });
  
  renderDontListMini();
  showToast(isViolated ? 'Tercatat dilanggar' : 'Alhamdulillah dipatuhi! ✓', isViolated ? 'warning' : 'success');
}

function renderBrainDumpMini() {
  const container = document.getElementById('brainDumpMiniList');
  if (!container) return;
  
  // Get brain dumps from state or dailySync
  const dumps = state.brainDumps || [];
  
  if (dumps.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 16px;">
      <p style="font-size: 12px; color: var(--gray-400);">Tangkap ide & pikiran</p>
      <button class="btn-submit btn-secondary" style="width: auto; margin-top: 8px; font-size: 12px;" onclick="openModal('braindump')">+ Tambah</button>
    </div>`;
    return;
  }
  
  container.innerHTML = dumps.slice(0, 5).map(d => {
    const content = typeof d.content === 'string' ? d.content : (d.data?.content || d.content || '');
    return `<div class="brain-dump-item">${escapeHtml(content.substring(0, 80))}${content.length > 80 ? '...' : ''}</div>`;
  }).join('');
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
  
  // Get today's tasks (todo + progress, sorted by priority)
  const k = state.kanban;
  let todayTasks = [];
  
  if (k) {
    const board = k.board || k;
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, someday: 4 };
    
    todayTasks = [
      ...(board.todo || []),
      ...(board.progress || [])
    ]
    .filter(t => !t.due_date || new Date(t.due_date) <= new Date(new Date().setHours(23,59,59)))
    .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))
    .slice(0, 5);
  }
  
  if (todayTasks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="icon">✨</span>
      <p>Tidak ada task untuk hari ini</p>
      <button class="btn-submit" style="width: auto; margin-top: 12px;" onclick="openModal('task')">+ Tambah Task</button>
    </div>`;
    return;
  }
  
  const priorityIcons = { urgent: '🔥', high: '🔴', medium: '🟡', low: '🟢', someday: '⚪' };
  
  container.innerHTML = `
    ${todayTasks.map(t => {
      // Extract link from description or link field
      const linkMatch = t.description?.match(/🔗 Link: (https?:\/\/[^\s\n]+)/) || 
                        t.link?.match(/(https?:\/\/[^\s]+)/) ||
                        t.description?.match(/(https?:\/\/[^\s\n]+)/);
      const link = linkMatch ? linkMatch[1] : (t.link || '');
      
      return `
      <div class="today-task-item" style="padding: 12px; background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: 8px; border-left: 3px solid ${t.status === 'progress' ? 'var(--primary)' : 'var(--gray-300)'};">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 14px;">${priorityIcons[t.priority] || '🟡'}</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; font-size: 13px;">${escapeHtml(t.title)}</div>
            <div style="font-size: 11px; color: var(--gray-500); margin-top: 2px;">
              ${t.status === 'progress' ? '🔄 Progress' : '📋 To Do'}
              ${t.due_date ? ' • 📅 ' + formatDateShort(t.due_date) : ''}
              ${t.estimated_pomodoro ? ' • 🍅' + t.estimated_pomodoro : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          ${link ? `<a href="${escapeHtml(link)}" target="_blank" class="today-task-btn link-btn">🔗 Buka File</a>` : ''}
          <button onclick="startPomodoroForTask('${t.task_id}','${escapeHtml(t.title).replace(/'/g, "\\'")}',${t.estimated_pomodoro || 2})" class="today-task-btn pomo-btn">🍅 Fokus</button>
          <button onclick="moveTask('${t.task_id}','${t.status === 'progress' ? 'done' : 'progress'}')" class="today-task-btn ${t.status === 'progress' ? 'done-btn' : 'next-btn'}">${t.status === 'progress' ? '✓ Selesai' : '→ Mulai'}</button>
        </div>
      </div>`;
    }).join('')}
    <button class="btn-link" style="margin-top: 8px; text-align: center; display: block; width: 100%;" onclick="showPage('kanban')">Lihat Semua Task →</button>
  `;
}

function renderKanban() {
  const container = document.getElementById('kanbanBoard');
  if (!container) return;
  
  const k = state.kanban;
  
  if (!k) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📊</span><p>Tidak ada task</p></div>';
    return;
  }
  
  // Handle multiple formats: 
  // 1. {board: {backlog:[], todo:[], ...}} from API getKanban
  // 2. {backlog:[], todo:[], ...} direct format
  // 3. {todo:[], progress:[], done:[]} from API getTasks grouped
  let board;
  if (k.board) {
    board = k.board;
  } else if (k.backlog || k.todo || k.progress || k.done) {
    board = k;
  } else {
    board = { backlog: [], todo: [], progress: [], done: [] };
  }
  
  const columns = [
    { id: 'backlog', title: '📥 Backlog', tasks: board.backlog || [] },
    { id: 'todo', title: '📋 To Do', tasks: board.todo || [] },
    { id: 'progress', title: '🔄 Progress', tasks: board.progress || [] },
    { id: 'done', title: '✅ Done', tasks: board.done || [] }
  ];
  
  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
  
  if (totalTasks === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📋</span><p>Belum ada task</p><button class="btn-submit" style="width:auto;margin-top:12px" onclick="openModal(\'task\')">+ Tambah Task</button></div>';
    return;
  }
  
  container.innerHTML = columns.map(col => `
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
  
  // Check if has link - support multiple formats
  const linkMatch = task.description?.match(/🔗 Link: (https?:\/\/[^\s\n]+)/) || 
                    task.link?.match(/(https?:\/\/[^\s]+)/) ||
                    task.description?.match(/(https?:\/\/[^\s\n]+)/);
  const link = linkMatch ? linkMatch[1] : (task.link || '');
  
  // Priority icons
  const priorityIcons = {
    urgent: '🔥',
    high: '🔴',
    medium: '🟡',
    low: '🟢',
    someday: '⚪'
  };
  
  // Link button (prominent if has link)
  const linkHtml = link ? `
    <a href="${escapeHtml(link)}" target="_blank" class="task-link-btn" onclick="event.stopPropagation()" title="Buka Link">
      🔗 Buka File
    </a>` : '';
  
  // Pomodoro button (show on todo and progress)
  const pomodoroBtn = (currentStatus === 'todo' || currentStatus === 'progress') ? `
    <button class="task-pomo-btn" onclick="event.stopPropagation();startPomodoroForTask('${task.task_id}','${escapeHtml(task.title).replace(/'/g, "\\'")}',${task.estimated_pomodoro || 2})" title="Mulai Pomodoro">
      🍅 Fokus
    </button>` : '';
  
  // Actions based on status
  let actionsHtml = '';
  if (currentStatus === 'done') {
    actionsHtml = `
    <div class="task-actions">
      <button class="task-action-btn warning" onclick="event.stopPropagation();moveTask('${task.task_id}','progress')" title="Kembali ke Progress">↩</button>
      <button class="task-action-btn danger" onclick="event.stopPropagation();confirmDeleteTask('${task.task_id}')" title="Hapus">🗑</button>
    </div>`;
  } else {
    actionsHtml = `
    <div class="task-actions">
      ${nextStatus[currentStatus] ? `<button class="task-action-btn primary" onclick="event.stopPropagation();moveTask('${task.task_id}','${nextStatus[currentStatus]}')" title="Lanjutkan">→</button>` : ''}
      <button class="task-action-btn success" onclick="event.stopPropagation();moveTask('${task.task_id}','done')" title="Selesai">✓</button>
    </div>`;
  }
  
  return `<div class="task-card priority-${task.priority || 'medium'}">
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="task-label priority-${task.priority}">${priorityIcons[task.priority] || '🟡'}</span>
      ${task.due_date ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDateShort(task.due_date)}</span>` : ''}
      ${task.estimated_pomodoro ? `<span class="task-pomodoro">🍅 ${task.estimated_pomodoro}</span>` : ''}
    </div>
    ${isDelegated ? `<div class="task-delegate">👤 ${escapeHtml(delegatee)}</div>` : ''}
    <div class="task-quick-actions">
      ${linkHtml}
      ${pomodoroBtn}
    </div>
    ${actionsHtml}
  </div>`;
}

// Start Pomodoro langsung dari Task
function startPomodoroForTask(taskId, taskTitle, estimatedPomodoro) {
  // Cek apakah sudah ada pomodoro aktif
  if (state.pomodoro.active) {
    showToast('⚠️ Ada sesi fokus yang sedang berjalan. Hentikan dulu sebelum memulai yang baru.', 'warning');
    showPage('pomodoro');
    return;
  }
  
  // Set task sebagai current focus
  state.currentFocusTask = { task_id: taskId, title: taskTitle };
  
  // Start pomodoro dengan task
  startPomodoroTimer('POMODORO_25', taskTitle);
  
  // Move task to progress jika masih di todo
  const board = state.kanban?.board || state.kanban;
  if (board?.todo) {
    const taskInTodo = board.todo.find(t => t.task_id === taskId);
    if (taskInTodo) {
      moveTask(taskId, 'progress');
    }
  }
  
  // Go to pomodoro page
  showPage('pomodoro');
  showToast(`🍅 Fokus: ${taskTitle}`, 'success');
}

// Open task detail modal
function openTaskDetail(taskId) {
  // Find task
  const board = state.kanban?.board || state.kanban;
  let task = null;
  
  ['backlog', 'todo', 'progress', 'done'].forEach(status => {
    if (board?.[status]) {
      const found = board[status].find(t => t.task_id === taskId);
      if (found) task = found;
    }
  });
  
  if (!task) return;
  
  // For now, just show a simple action modal
  const actions = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button class="btn-submit" onclick="moveTask('${taskId}','backlog');closeModal('task-action')">📥 Pindah ke Backlog</button>
      <button class="btn-submit" onclick="moveTask('${taskId}','todo');closeModal('task-action')">📋 Pindah ke To Do</button>
      <button class="btn-submit" onclick="moveTask('${taskId}','progress');closeModal('task-action')">🔄 Pindah ke Progress</button>
      <button class="btn-submit" onclick="moveTask('${taskId}','done');closeModal('task-action')">✅ Pindah ke Done</button>
      <hr style="border: none; border-top: 1px solid var(--gray-200); margin: 8px 0;">
      <button class="btn-submit btn-danger" onclick="confirmDeleteTask('${taskId}');closeModal('task-action')">🗑 Hapus Task</button>
    </div>
  `;
  
  showActionModal('📋 ' + task.title, actions);
}

function showActionModal(title, content) {
  // Remove existing modal if any
  const existing = document.getElementById('modal-task-action');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-task-action';
  modal.onclick = (e) => { if (e.target === modal) closeModal('task-action'); };
  modal.innerHTML = `
    <div class="modal" style="max-width: 320px;">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="closeModal('task-action')">✕</button>
      </div>
      <div class="modal-body">${content}</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.classList.add('active');
}

function confirmDeleteTask(taskId) {
  if (confirm('Hapus task ini?')) {
    deleteTask(taskId);
  }
}

function deleteTask(taskId) {
  // Remove from local state
  if (state.kanban) {
    const board = state.kanban.board || state.kanban;
    ['backlog', 'todo', 'progress', 'done'].forEach(status => {
      if (board[status]) {
        const idx = board[status].findIndex(t => t.task_id === taskId);
        if (idx !== -1) board[status].splice(idx, 1);
      }
    });
  }
  
  // Add to queue
  addToQueue('deleteTask', { task_id: taskId });
  
  showToast('Task dihapus! ✓', 'success');
  renderKanban();
  renderTodayFocus();
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
  
  
  
  const v10 = document.getElementById('vision10Content');
  const v3 = document.getElementById('vision3Content');
  const v1 = document.getElementById('vision1Content');
  
  // Render Vision 10 Tahun - gabungkan semua bidang
  if (v10) {
    const content10 = visions
      .filter(v => v.vision_10_tahun)
      .map(v => `<div class="vision-item"><strong>${v.bidang}:</strong> ${escapeHtml(v.vision_10_tahun)}</div>`)
      .join('');
    
    if (content10) {
      v10.innerHTML = content10;
    } else {
      v10.innerHTML = '<span class="vision-empty">Tap untuk menentukan visi 10 tahun...</span>';
    }
    
    // Prefill modal visi 10 tahun
    visions.forEach(v => {
      if (v.vision_10_tahun) {
        const input = document.getElementById(`vision10${v.bidang.charAt(0) + v.bidang.slice(1).toLowerCase()}`);
        if (input) input.value = v.vision_10_tahun;
      }
    });
  }
  
  // Render Vision 3 Tahun
  if (v3) {
    const umum = visions.find(v => v.bidang === 'UMUM');
    const content3All = visions
      .filter(v => v.vision_3_tahun)
      .map(v => `<div class="vision-item"><strong>${v.bidang}:</strong> ${escapeHtml(v.vision_3_tahun)}</div>`)
      .join('');
    
    if (content3All) {
      v3.innerHTML = content3All;
    } else {
      v3.innerHTML = '<span class="vision-empty">Tap untuk menentukan target 3 tahun...</span>';
    }
    
    // Prefill modal (cari dari UMUM atau bidang pertama yang punya vision_3_tahun)
    const v3Data = umum?.vision_3_tahun || visions.find(v => v.vision_3_tahun)?.vision_3_tahun;
    const v3Input = document.getElementById('vision3Input');
    if (v3Input && v3Data) v3Input.value = v3Data;
  }
  
  // Render Vision 1 Tahun
  if (v1) {
    const umum = visions.find(v => v.bidang === 'UMUM');
    const content1All = visions
      .filter(v => v.vision_1_tahun)
      .map(v => `<div class="vision-item"><strong>${v.bidang}:</strong> ${escapeHtml(v.vision_1_tahun)}</div>`)
      .join('');
    
    if (content1All) {
      v1.innerHTML = content1All;
    } else {
      v1.innerHTML = '<span class="vision-empty">Tap untuk menentukan target 1 tahun...</span>';
    }
    
    // Prefill modal
    const v1Data = umum?.vision_1_tahun || visions.find(v => v.vision_1_tahun)?.vision_1_tahun;
    const v1Input = document.getElementById('vision1Input');
    if (v1Input && v1Data) v1Input.value = v1Data;
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
  if (!container) return;
  
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
  // Cek apakah sudah ada pomodoro aktif
  if (state.pomodoro.active) {
    showToast('⚠️ Ada sesi fokus yang sedang berjalan', 'warning');
    showPage('pomodoro');
    return;
  }
  startPomodoroTimer('POMODORO_25', title);
}

async function startPomodoroFromModal() {
  // Cek apakah sudah ada pomodoro aktif
  if (state.pomodoro.active) {
    showToast('⚠️ Ada sesi fokus yang sedang berjalan', 'warning');
    closeModal('pomodoro-start');
    showPage('pomodoro');
    return;
  }
  
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
  
  // Start timer (tidak log saat start, hanya saat complete)
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
  const durationMinutes = Math.floor(typeInfo.duration / 60);
  
  // Play notification sound
  playNotificationSound();
  
  // Show completion
  showToast(`${typeInfo.label} selesai! 🎉`, 'success');
  
  // Add to queue - gunakan logPomodoro untuk backend v3
  addToQueue('logPomodoro', {
    data: {
      type: state.pomodoro.type,
      duration: durationMinutes,
      task_id: state.currentFocusTask?.task_id || '',
      goal_id: state.currentFocusTask?.goal_id || '',
      started_at: new Date(state.pomodoro.startTime).toISOString(),
      completed_at: new Date().toISOString(),
      status: 'completed',
      notes: state.pomodoro.task
    }
  });
  
  // SYNC IMMEDIATELY after pomodoro completes
  syncPendingQueue();
  
  // Update local stats
  if (state.dailySync?.stats) {
    state.dailySync.stats.pomodoro_count = (state.dailySync.stats.pomodoro_count || 0) + 1;
    state.dailySync.stats.pomodoro_minutes = (state.dailySync.stats.pomodoro_minutes || 0) + durationMinutes;
    
    const countEl = document.getElementById('pomodoroCount');
    const minutesEl = document.getElementById('focusMinutes');
    if (countEl) countEl.textContent = state.dailySync.stats.pomodoro_count;
    if (minutesEl) minutesEl.textContent = state.dailySync.stats.pomodoro_minutes + 'm';
  }
  
  // Reset state
  state.pomodoro.active = false;
  state.currentFocusTask = null;
  
  // Show completion screen
  const container = document.getElementById('pomodoroContainer');
  if (container) {
    container.innerHTML = `
      <div class="pomodoro-complete">
        <div class="complete-icon">🎉</div>
        <h2>Sesi Selesai!</h2>
        <p>Kamu telah fokus selama ${durationMinutes} menit</p>
        <p style="color: var(--gray-600); margin-top: 8px;">Task: ${escapeHtml(state.pomodoro.task)}</p>
        <p style="color: var(--success); margin-top: 8px; font-size: 12px;">✓ Tersimpan ke database</p>
        <button class="btn-submit" style="margin-top: 24px;" onclick="renderPomodoroPage()">
          🍅 Mulai Sesi Baru
        </button>
      </div>
    `;
  }
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
  // Check if already done - sholat is array in v3
  const sholatArray = state.dailySync?.sholat || [];
  const existing = Array.isArray(sholatArray) 
    ? sholatArray.find(s => s.waktu === waktu)
    : null;
  
  if (existing && (existing.status === 'done' || existing.status === true)) {
    // Already done - offer to cancel
    if (confirm(`${waktu} sudah dicatat. Batalkan?`)) {
      toggleSholatDirect(waktu, true);
    }
    return;
  }
  
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
    const nameEl = item.querySelector('.name');
    if (nameEl && nameEl.textContent.toUpperCase() === waktu) {
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
  
  // Update local state (array format untuk v3)
  if (state.dailySync) {
    if (!Array.isArray(state.dailySync.sholat)) {
      state.dailySync.sholat = [];
    }
    
    const existing = state.dailySync.sholat.find(s => s.waktu === waktu);
    if (existing) {
      existing.status = 'done';
      existing.lokasi = lokasi;
      existing.berjamaah = berjamaah;
    } else {
      state.dailySync.sholat.push({ 
        waktu, 
        status: 'done', 
        lokasi, 
        berjamaah,
        jam_pelaksanaan: jam 
      });
    }
    
    // Update stats di header
    if (state.dailySync.stats) {
      const wajibList = ['SUBUH', 'DZUHUR', 'ASHAR', 'MAGHRIB', 'ISYA'];
      const completedWajib = state.dailySync.sholat.filter(s => 
        wajibList.includes(s.waktu) && (s.status === 'done' || s.status === true)
      ).length;
      state.dailySync.stats.sholat_completed = completedWajib;
      
      const sholatCountEl = document.getElementById('sholatCount');
      if (sholatCountEl) {
        sholatCountEl.textContent = completedWajib + '/5';
      }
    }
  }
  
  // ADD TO QUEUE - format untuk backend v3
  addToQueue('logSholat', {
    data: {
      waktu: waktu,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'done',
      lokasi: lokasi,
      berjamaah: berjamaah,
      catatan: 'Jam: ' + jam
    }
  });
  
  // SYNC IMMEDIATELY
  syncPendingQueue();
  
  closeModal('sholat');
  showToast('Alhamdulillah! ' + waktu + ' ✓', 'success');
}

// Direct toggle without modal (for quick toggle)
function toggleSholatDirect(waktu, isDone) {
  // Update UI
  const sholatItems = document.querySelectorAll('.sholat-item');
  sholatItems.forEach(item => {
    const nameEl = item.querySelector('.name');
    if (nameEl && nameEl.textContent.toUpperCase() === waktu) {
      if (isDone) {
        item.classList.remove('done');
        const timeEl = item.querySelector('.time');
        if (timeEl) timeEl.remove();
      } else {
        item.classList.add('done');
      }
    }
  });
  
  const newStatus = isDone ? 'pending' : 'done';
  const today = new Date().toISOString().split('T')[0];
  
  // Update state properly
  if (state.dailySync) {
    if (!state.dailySync.sholat) {
      state.dailySync.sholat = [];
    }
    
    if (Array.isArray(state.dailySync.sholat)) {
      const existingIndex = state.dailySync.sholat.findIndex(s => s.waktu === waktu);
      if (existingIndex >= 0) {
        state.dailySync.sholat[existingIndex].status = newStatus;
      } else {
        state.dailySync.sholat.push({ waktu, status: newStatus, tanggal: today });
      }
    }
  }
  
  // Send to backend
  addToQueue('logSholat', {
    data: {
      waktu: waktu,
      tanggal: today,
      status: newStatus,
      lokasi: 'rumah',
      berjamaah: false,
      catatan: ''
    }
  });
  
  // SYNC IMMEDIATELY
  syncPendingQueue();
  
  showToast(isDone ? 'Dibatalkan' : 'Alhamdulillah! ' + waktu + ' ✓', isDone ? 'info' : 'success');
}

function toggleHabitRosul(habitId, isCompleted) {
  if (!habitId || habitId === 'undefined') {
    showToast('Habit belum tersinkron', 'info');
    return;
  }
  
  // INSTANT UI UPDATE
  const clickedItem = event?.currentTarget;
  if (clickedItem) {
    if (isCompleted) {
      clickedItem.classList.remove('done');
      const checkbox = clickedItem.querySelector('.habit-rosul-checkbox, .check');
      if (checkbox) checkbox.textContent = '';
    } else {
      clickedItem.classList.add('done');
      const checkbox = clickedItem.querySelector('.habit-rosul-checkbox, .check');
      if (checkbox) checkbox.textContent = '✓';
    }
  }
  
  // Update local state langsung
  if (state.dailySync?.habits) {
    const habit = state.dailySync.habits.find(h => h.habit_id === habitId);
    if (habit) {
      habit.completed = !isCompleted;
      
      // Update stats di header
      if (state.dailySync.stats) {
        if (isCompleted) {
          state.dailySync.stats.habits_completed--;
        } else {
          state.dailySync.stats.habits_completed++;
        }
        const habitCountEl = document.getElementById('habitCount');
        const sunnahBadge = document.getElementById('sunnahBadge');
        if (habitCountEl) {
          habitCountEl.textContent = state.dailySync.stats.habits_completed + '/' + state.dailySync.stats.habits_total;
        }
        if (sunnahBadge) {
          sunnahBadge.textContent = state.dailySync.stats.habits_completed + '/' + state.dailySync.stats.habits_total;
        }
      }
    }
  }
  
  // ADD TO QUEUE - gunakan toggleHabit yang ada di backend v3
  addToQueue('toggleHabit', { 
    habit_id: habitId,
    tanggal: new Date().toISOString().split('T')[0]
  });
  
  // SYNC IMMEDIATELY
  syncPendingQueue();
  
  showToast(isCompleted ? 'Dibatalkan' : 'Alhamdulillah! ✓', isCompleted ? 'info' : 'success');
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
  
  const goalId = document.getElementById('taskGoal')?.value || '';
  const milestoneId = document.getElementById('taskMilestone')?.value || '';
  
  const taskData = {
    title,
    description,
    priority: document.getElementById('taskPriority')?.value || 'medium',
    status: document.getElementById('taskStatus')?.value || 'todo',
    due_date: document.getElementById('taskDueDate')?.value || '',
    estimated_pomodoro: parseInt(document.getElementById('taskEstPomodoro')?.value) || 2,
    tags: delegateTo ? `delegated:${delegateTo}` : (assigneeType === 'self' ? 'self' : '')
  };
  
  // Generate temporary ID
  const tempId = 'temp_' + Date.now();
  
  // Create new task object for optimistic UI
  const newTask = {
    task_id: tempId,
    goal_id: goalId,
    milestone_id: milestoneId,
    ...taskData,
    created_at: new Date().toISOString()
  };
  
  // === OPTIMISTIC UI: Update semua state SEBELUM close modal ===
  
  // 1. Update kanban state
  if (!state.kanban) state.kanban = { board: { backlog: [], todo: [], progress: [], done: [] } };
  const status = taskData.status || 'todo';
  if (state.kanban.board) {
    if (!state.kanban.board[status]) state.kanban.board[status] = [];
    state.kanban.board[status].unshift(newTask);
  } else {
    if (!state.kanban[status]) state.kanban[status] = [];
    state.kanban[status].unshift(newTask);
  }
  
  // 2. Update goalTasks state jika task punya goal
  if (goalId) {
    if (!state.goalTasks) state.goalTasks = [];
    state.goalTasks.unshift(newTask);
  }
  
  // === RENDER UI LANGSUNG (sebelum sync ke server) ===
  
  // Close modal first
  closeModal('task');
  
  // Render goal detail IMMEDIATELY jika di halaman goal-detail
  if (goalId && state.selectedGoalId === goalId) {
    const goal = state.goals?.find(g => g.goal_id === goalId);
    if (goal) {
      renderGoalDetail(goal, state.goalTasks);
    }
  }
  
  // Re-render kanban and today focus
  renderKanban();
  renderTodayFocus();
  
  // Show success toast
  showToast('Task ditambahkan! ✓', 'success');
  
  // === SYNC KE SERVER (background, non-blocking) ===
  addToQueue('addTask', { 
    data: {
      ...taskData,
      goal_id: goalId,
      milestone_id: milestoneId
    }
  });
  syncPendingQueue(); // Fire and forget
  
  // Clear form
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  const linkEl = document.getElementById('taskLink');
  const delegateEl = document.getElementById('taskDelegateTo');
  const assigneeEl = document.getElementById('taskAssignee');
  if (linkEl) linkEl.value = '';
  if (delegateEl) delegateEl.value = '';
  if (assigneeEl) assigneeEl.value = 'self';
  toggleDelegateInput('self');
  
  // Clear the addTaskGoalId
  state.addTaskGoalId = null;
}

function moveTask(taskId, newStatus) {
  // Update local state langsung
  if (state.kanban) {
    let movedTask = null;
    const board = state.kanban.board || state.kanban;
    
    // Cari dan hapus task dari status lama
    ['backlog', 'todo', 'progress', 'done'].forEach(status => {
      if (board[status]) {
        const idx = board[status].findIndex(t => t.task_id === taskId);
        if (idx !== -1) {
          movedTask = board[status].splice(idx, 1)[0];
        }
      }
    });
    
    // Tambah ke status baru
    if (movedTask) {
      movedTask.status = newStatus;
      if (!board[newStatus]) board[newStatus] = [];
      board[newStatus].unshift(movedTask);
    }
  }
  
  // Add to queue
  addToQueue('moveTask', { task_id: taskId, status: newStatus });
  
  showToast('Dipindahkan! ✓', 'success');
  
  // Re-render kanban and today focus
  renderKanban();
  renderTodayFocus();
}

function filterKanban(goalId) {
  state.selectedGoalFilter = goalId;
  state.cache.kanban = 0; // Force refresh for different filter
  loadKanban(true);
}

async function viewGoalDetail(goalId) {
  state.selectedGoalId = goalId;
  
  // Find goal from state
  const goal = state.goals?.find(g => g.goal_id === goalId);
  if (!goal) {
    showToast('Goal tidak ditemukan', 'error');
    return;
  }
  
  // Initialize goalTasks
  state.goalTasks = [];
  
  // Show goal detail page immediately with loading state
  showPage('goal-detail');
  
  // Render immediately with empty tasks (will update when loaded)
  renderGoalDetail(goal, []);
  
  // Load goal tasks from API in background
  try {
    const tasks = await apiGet('getTasks');
    const goalTasks = (tasks || []).filter(t => t.goal_id === goalId);
    state.goalTasks = goalTasks;
    
    // Re-render with loaded tasks
    renderGoalDetail(goal, goalTasks);
  } catch (err) {
    console.error('Failed to load goal tasks:', err);
  }
}

function renderGoalDetail(goal, tasks) {
  const container = document.getElementById('goalDetailContent');
  if (!container) return;
  
  // Group tasks by status
  const todoTasks = tasks.filter(t => t.status === 'todo' || t.status === 'backlog');
  const progressTasks = tasks.filter(t => t.status === 'progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  
  // Calculate progress
  const totalTasks = tasks.length;
  const completedTasks = doneTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Milestones
  const milestones = goal.milestones || [];
  const completedMilestones = milestones.filter(m => m.completed === true || m.completed === 'true').length;
  
  container.innerHTML = `
    <div class="goal-detail-header">
      <button class="back-btn" onclick="showPage('goals')">← Kembali</button>
      <div class="goal-detail-actions">
        <button class="edit-btn" onclick="openEditGoal('${goal.goal_id}')">✏️ Edit</button>
        <button class="delete-btn" onclick="confirmDeleteGoal('${goal.goal_id}')">🗑️</button>
      </div>
    </div>
    
    <div class="goal-detail-info">
      <h2 class="goal-detail-title">${escapeHtml(goal.title)}</h2>
      <div class="goal-detail-meta">
        <span class="goal-quarter-badge">Q${goal.quarter} ${goal.year}</span>
        ${goal.deadline ? `<span class="goal-deadline">📅 ${formatDate(goal.deadline)}</span>` : ''}
      </div>
      ${goal.description ? `<p class="goal-detail-desc">${escapeHtml(goal.description)}</p>` : ''}
    </div>
    
    <div class="goal-detail-progress">
      <div class="progress-header">
        <span>Progress</span>
        <span class="progress-percent">${progress}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-stats">
        <span>✅ ${completedTasks}/${totalTasks} tasks</span>
        <span>🏁 ${completedMilestones}/${milestones.length} milestones</span>
      </div>
    </div>
    
    ${milestones.length > 0 ? `
    <div class="goal-section">
      <h3 class="section-title">🏁 Milestones</h3>
      <div class="milestone-list">
        ${milestones.map(m => `
          <div class="milestone-item ${m.completed ? 'done' : ''}" onclick="toggleMilestone('${m.milestone_id}', ${m.completed ? true : false})">
            <div class="milestone-check">${m.completed ? '✓' : ''}</div>
            <div class="milestone-info">
              <div class="milestone-title">${escapeHtml(m.title)}</div>
              <div class="milestone-week">Minggu ${m.week || 1}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <div class="goal-section">
      <div class="section-header">
        <h3 class="section-title">📋 Tasks</h3>
        <button class="add-task-mini-btn" onclick="openAddTaskForGoal('${goal.goal_id}')">+ Task</button>
      </div>
      
      ${tasks.length === 0 ? `
        <div class="empty-state" style="padding: 20px;">
          <p>Belum ada task untuk goal ini</p>
          <button class="btn-submit" style="width: auto; margin-top: 12px;" onclick="openAddTaskForGoal('${goal.goal_id}')">+ Tambah Task</button>
        </div>
      ` : `
        <!-- Progress Tasks -->
        ${progressTasks.length > 0 ? `
          <div class="task-group">
            <div class="task-group-header">🔄 Sedang Dikerjakan (${progressTasks.length})</div>
            ${progressTasks.map(t => renderGoalTaskItem(t)).join('')}
          </div>
        ` : ''}
        
        <!-- Todo Tasks -->
        ${todoTasks.length > 0 ? `
          <div class="task-group">
            <div class="task-group-header">📥 To Do (${todoTasks.length})</div>
            ${todoTasks.map(t => renderGoalTaskItem(t)).join('')}
          </div>
        ` : ''}
        
        <!-- Done Tasks -->
        ${doneTasks.length > 0 ? `
          <div class="task-group">
            <div class="task-group-header collapsed" onclick="toggleTaskGroup(this)">
              ✅ Selesai (${doneTasks.length}) <span class="toggle-icon">▼</span>
            </div>
            <div class="task-group-items" style="display: none;">
              ${doneTasks.map(t => renderGoalTaskItem(t)).join('')}
            </div>
          </div>
        ` : ''}
      `}
    </div>
  `;
}

function renderGoalTaskItem(task) {
  const priorityColors = { high: '#e53e3e', medium: '#dd6b20', low: '#38a169' };
  const statusIcons = { todo: '○', backlog: '○', progress: '◐', done: '●' };
  const isDone = task.status === 'done';
  
  return `
    <div class="goal-task-item ${isDone ? 'done' : ''}" data-task-id="${task.task_id}">
      <button class="task-status-btn ${task.status}" onclick="cycleTaskStatus('${task.task_id}', '${task.status}')" title="Ubah status">
        ${statusIcons[task.status] || '○'}
      </button>
      <div class="task-content">
        <div class="task-title-row">
          <span class="task-title ${isDone ? 'completed' : ''}">${escapeHtml(task.title)}</span>
          <span class="task-priority" style="background: ${priorityColors[task.priority] || priorityColors.medium}">
            ${task.priority === 'high' ? '🔴' : task.priority === 'low' ? '🟢' : '🟡'}
          </span>
        </div>
        <div class="task-meta-row">
          ${task.due_date ? `<span class="task-due">📅 ${formatDateShort(task.due_date)}</span>` : ''}
          ${task.estimated_pomodoro ? `<span class="task-pomo">🍅 ${task.estimated_pomodoro}</span>` : ''}
          <span class="task-status-label">${task.status}</span>
        </div>
      </div>
      <div class="task-actions-mini">
        ${!isDone ? `<button class="task-done-btn" onclick="quickDoneTask('${task.task_id}')" title="Selesai">✓</button>` : ''}
        <button class="task-menu-btn" onclick="openTaskMenu('${task.task_id}')" title="Menu">⋮</button>
      </div>
    </div>
  `;
}

function cycleTaskStatus(taskId, currentStatus) {
  // Cycle: todo → progress → done → todo
  const nextStatus = {
    'backlog': 'todo',
    'todo': 'progress',
    'progress': 'done',
    'done': 'todo'
  };
  
  const newStatus = nextStatus[currentStatus] || 'progress';
  
  // Update UI immediately
  const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskItem) {
    const statusBtn = taskItem.querySelector('.task-status-btn');
    const statusLabel = taskItem.querySelector('.task-status-label');
    const statusIcons = { todo: '○', backlog: '○', progress: '◐', done: '●' };
    
    statusBtn.className = `task-status-btn ${newStatus}`;
    statusBtn.textContent = statusIcons[newStatus];
    statusBtn.setAttribute('onclick', `cycleTaskStatus('${taskId}', '${newStatus}')`);
    
    if (statusLabel) statusLabel.textContent = newStatus;
    
    if (newStatus === 'done') {
      taskItem.classList.add('done');
      taskItem.querySelector('.task-title')?.classList.add('completed');
    } else {
      taskItem.classList.remove('done');
      taskItem.querySelector('.task-title')?.classList.remove('completed');
    }
  }
  
  // Update state
  if (state.goalTasks) {
    const task = state.goalTasks.find(t => t.task_id === taskId);
    if (task) task.status = newStatus;
  }
  
  // Send to backend
  addToQueue('moveTask', {
    task_id: taskId,
    status: newStatus,
    order_index: 0
  });
  
  showToast(`Task → ${newStatus}`, 'success');
  
  // Refresh after delay
  setTimeout(() => {
    if (state.selectedGoalId) {
      const goal = state.goals?.find(g => g.goal_id === state.selectedGoalId);
      if (goal) renderGoalDetail(goal, state.goalTasks || []);
    }
  }, 500);
}

function quickDoneTask(taskId) {
  cycleTaskStatus(taskId, 'progress'); // Will move to done
  
  // If current status is not progress, force to done
  setTimeout(() => {
    const task = state.goalTasks?.find(t => t.task_id === taskId);
    if (task && task.status !== 'done') {
      addToQueue('moveTask', { task_id: taskId, status: 'done', order_index: 0 });
      task.status = 'done';
      
      const goal = state.goals?.find(g => g.goal_id === state.selectedGoalId);
      if (goal) renderGoalDetail(goal, state.goalTasks || []);
    }
  }, 100);
}

function toggleMilestone(milestoneId, isCompleted) {
  // Update UI immediately
  const milestoneItem = document.querySelector(`[onclick*="${milestoneId}"]`);
  if (milestoneItem) {
    if (isCompleted) {
      milestoneItem.classList.remove('done');
      milestoneItem.querySelector('.milestone-check').textContent = '';
    } else {
      milestoneItem.classList.add('done');
      milestoneItem.querySelector('.milestone-check').textContent = '✓';
    }
  }
  
  // Update state
  const goal = state.goals?.find(g => g.goal_id === state.selectedGoalId);
  if (goal?.milestones) {
    const milestone = goal.milestones.find(m => m.milestone_id === milestoneId);
    if (milestone) milestone.completed = !isCompleted;
  }
  
  // Send to backend
  addToQueue('toggleMilestone', {
    milestone_id: milestoneId,
    completed: !isCompleted
  });
  
  showToast(isCompleted ? 'Milestone dibatalkan' : 'Milestone selesai! ✓', isCompleted ? 'info' : 'success');
}

function toggleTaskGroup(header) {
  const items = header.nextElementSibling;
  const icon = header.querySelector('.toggle-icon');
  
  if (items.style.display === 'none') {
    items.style.display = 'block';
    header.classList.remove('collapsed');
    if (icon) icon.textContent = '▲';
  } else {
    items.style.display = 'none';
    header.classList.add('collapsed');
    if (icon) icon.textContent = '▼';
  }
}

function openAddTaskForGoal(goalId) {
  state.addTaskGoalId = goalId;
  document.getElementById('taskGoal').value = goalId;
  openModal('task');
}

function openEditGoal(goalId) {
  const goal = state.goals?.find(g => g.goal_id === goalId);
  if (!goal) return;
  
  state.editingGoalId = goalId;
  document.getElementById('goalTitle').value = goal.title || '';
  document.getElementById('goalDesc').value = goal.description || '';
  document.getElementById('goalDeadline').value = goal.deadline || '';
  
  openModal('goal');
}

function confirmDeleteGoal(goalId) {
  if (confirm('Hapus goal ini? Semua milestones dan tasks terkait akan terhapus.')) {
    addToQueue('deleteGoal', { goal_id: goalId });
    
    // Remove from state
    state.goals = state.goals?.filter(g => g.goal_id !== goalId) || [];
    
    showToast('Goal dihapus', 'success');
    showPage('goals');
  }
}

function saveVision(level) {
  // Visi 10 tahun: simpan per bidang (SPIRITUAL, KARIR, RELASI, KESEHATAN)
  if (level === '10') {
    const bidangData = {
      SPIRITUAL: document.getElementById('vision10Spiritual')?.value.trim(),
      KARIR: document.getElementById('vision10Karir')?.value.trim(),
      RELASI: document.getElementById('vision10Relasi')?.value.trim(),
      KESEHATAN: document.getElementById('vision10Kesehatan')?.value.trim()
    };
    
    // Simpan setiap bidang yang ada isinya
    let hasSaved = false;
    for (const [bidang, content] of Object.entries(bidangData)) {
      if (content) {
        addToQueue('saveVision', { 
          data: {
            bidang: bidang,
            vision_10_tahun: content
          }
        });
        hasSaved = true;
        
        // Update local state
        if (!state.visions) state.visions = [];
        const existing = state.visions.find(v => v.bidang === bidang);
        if (existing) {
          existing.vision_10_tahun = content;
        } else {
          state.visions.push({ bidang, vision_10_tahun: content });
        }
      }
    }
    
    if (!hasSaved) {
      showToast('Isi minimal satu bidang', 'error');
      return;
    }
  } 
  // Visi 3 tahun & 1 tahun: simpan sebagai bidang UMUM
  else if (level === '3' || level === '1') {
    const content = document.getElementById(`vision${level}Input`)?.value.trim();
    if (!content) {
      showToast('Isi visi terlebih dahulu', 'error');
      return;
    }
    
    const fieldName = level === '3' ? 'vision_3_tahun' : 'vision_1_tahun';
    
    addToQueue('saveVision', {
      data: {
        bidang: 'UMUM',
        [fieldName]: content
      }
    });
    
    // Update local state
    if (!state.visions) state.visions = [];
    const existing = state.visions.find(v => v.bidang === 'UMUM');
    if (existing) {
      existing[fieldName] = content;
    } else {
      state.visions.push({ bidang: 'UMUM', [fieldName]: content });
    }
  }
  
  closeModal('vision-' + level);
  showToast('Visi tersimpan! ✓', 'success');
  renderVisions();
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

async function loadBrainDumps(silent = false) {
  try {
    const data = await apiGet('getBrainDumps', { date: todayString() });
    state.brainDumps = data || [];
    renderBrainDumps();
    renderBrainDumpMini();
  } catch (err) {
    if (!silent) console.error('Failed to load brain dumps:', err);
    state.brainDumps = [];
    renderBrainDumps();
    renderBrainDumpMini();
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
  
  addToQueue('saveBrainDump', { content: content });
  
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
    // Try dedicated endpoint first
    const data = await apiGet('getJournalToday');
    
    state.journals = { morning: null, evening: null };
    
    // Backend returns { morning: {...}, evening: {...} }
    if (data) {
      // Handle morning journal
      if (data.morning) {
        let content = {};
        try {
          content = typeof data.morning.content === 'string' ? JSON.parse(data.morning.content) : (data.morning.content || {});
        } catch (e) {
          content = {};
        }
        state.journals.morning = { ...data.morning, parsed: content };
      }
      
      // Handle evening journal
      if (data.evening) {
        let content = {};
        try {
          content = typeof data.evening.content === 'string' ? JSON.parse(data.evening.content) : (data.evening.content || {});
        } catch (e) {
          content = {};
        }
        state.journals.evening = { ...data.evening, parsed: content };
      }
    }
    
    renderJournal();
  } catch (err) {
    console.error('Failed to load journal from dedicated endpoint, using dailySync:', err);
    
    // Fallback: use dailySync journals if available
    if (state.dailySync?.journals) {
      state.journals = { morning: null, evening: null };
      
      if (state.dailySync.journals.morning) {
        let content = {};
        try {
          const m = state.dailySync.journals.morning;
          content = typeof m.content === 'string' ? JSON.parse(m.content) : (m.content || {});
        } catch (e) {
          content = {};
        }
        state.journals.morning = { ...state.dailySync.journals.morning, parsed: content };
      }
      
      if (state.dailySync.journals.evening) {
        let content = {};
        try {
          const e = state.dailySync.journals.evening;
          content = typeof e.content === 'string' ? JSON.parse(e.content) : (e.content || {});
        } catch (e2) {
          content = {};
        }
        state.journals.evening = { ...state.dailySync.journals.evening, parsed: content };
      }
    }
    
    renderJournal();
  }
}

function renderJournal() {
  const morningStatus = document.getElementById('journalMorningStatus');
  const eveningStatus = document.getElementById('journalEveningStatus');
  const morningContent = document.getElementById('journalMorningContent');
  const eveningContent = document.getElementById('journalEveningContent');
  
  if (!morningStatus || !eveningStatus) return;
  
  // Parse journal content helper
  function parseJournalContent(journal) {
    if (!journal) return null;
    
    // Check parsed first
    if (journal.parsed) return journal.parsed;
    
    let content = journal.content;
    // Try to parse if it's a string
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (e) {
        return { text: content };
      }
    }
    return content || {};
  }
  
  // Mood emoji helper
  function getMoodEmoji(mood) {
    const moods = { '1': '😫', '2': '😢', '3': '😐', '4': '🙂', '5': '😊' };
    return moods[mood] || '😐';
  }
  
  // State label helper
  function getStateLabel(state) {
    const states = {
      'confident': '💪 Percaya Diri',
      'focused': '🎯 Fokus',
      'calm': '🧘 Tenang',
      'energetic': '🔥 Energik',
      'creative': '🎨 Kreatif',
      'grateful': '🙏 Bersyukur'
    };
    return states[state] || state;
  }
  
  // Emotion label helper
  function getEmotionLabel(emotion) {
    const emotions = {
      'anxiety': '😰 Cemas',
      'anger': '😠 Marah',
      'sadness': '😢 Sedih',
      'fear': '😨 Takut',
      'guilt': '😔 Bersalah',
      'none': '😌 Netral'
    };
    return emotions[emotion] || emotion;
  }
  
  // Get morning journal from state.journals OR dailySync
  let morningData = state.journals?.morning;
  if (!morningData && state.dailySync?.journals?.morning) {
    morningData = state.dailySync.journals.morning;
  }
  
  const morningParsed = parseJournalContent(morningData);
  
  if (morningParsed && (morningParsed.gratitude || morningParsed.focus || morningParsed.affirmation || morningParsed.mood)) {
    morningStatus.textContent = '✓ Ditulis';
    morningStatus.className = 'status done';
    morningContent.innerHTML = `
      <div class="journal-saved-content">
        ${morningParsed.mood || morningParsed.energy ? `
          <div class="journal-item mood-energy-display">
            ${morningParsed.mood ? `<span class="mood-badge">${getMoodEmoji(morningParsed.mood)}</span>` : ''}
            ${morningParsed.energy ? `<span class="energy-badge">⚡ ${morningParsed.energy}/10</span>` : ''}
            ${morningParsed.desired_state ? `<span class="state-badge">${getStateLabel(morningParsed.desired_state)}</span>` : ''}
          </div>
        ` : ''}
        ${morningParsed.gratitude ? `
          <div class="journal-item">
            <div class="journal-label">🙏 Syukur:</div>
            <div class="journal-text">${escapeHtml(morningParsed.gratitude)}</div>
          </div>
        ` : ''}
        ${morningParsed.affirmation ? `
          <div class="journal-item">
            <div class="journal-label">✨ Afirmasi:</div>
            <div class="journal-text">${escapeHtml(morningParsed.affirmation)}</div>
          </div>
        ` : ''}
        ${morningParsed.focus ? `
          <div class="journal-item">
            <div class="journal-label">🎯 Fokus:</div>
            <div class="journal-text">${escapeHtml(morningParsed.focus)}</div>
          </div>
        ` : ''}
      </div>
      <button class="btn-submit btn-secondary" style="margin-top: 12px;" onclick="openJournalForm('morning')">✏️ Edit</button>
    `;
  } else {
    morningStatus.textContent = 'Belum ditulis';
    morningStatus.className = 'status pending';
    morningContent.innerHTML = `
      <div class="content" style="color: var(--gray-400); font-style: italic;">
        Mulai hari dengan check-in mood, gratitude, dan afirmasi positif...
      </div>
      <button class="btn-submit" style="margin-top: 12px;" onclick="openJournalForm('morning')">✏️ Tulis Jurnal Pagi</button>
    `;
  }
  
  // Get evening journal from state.journals OR dailySync
  let eveningData = state.journals?.evening;
  if (!eveningData && state.dailySync?.journals?.evening) {
    eveningData = state.dailySync.journals.evening;
  }
  
  const eveningParsed = parseJournalContent(eveningData);
  
  if (eveningParsed && (eveningParsed.wins || eveningParsed.sedona_emotion || eveningParsed.lesson || eveningParsed.plan || eveningParsed.mood)) {
    eveningStatus.textContent = '✓ Ditulis';
    eveningStatus.className = 'status done';
    eveningContent.innerHTML = `
      <div class="journal-saved-content">
        ${eveningParsed.mood || eveningParsed.energy ? `
          <div class="journal-item mood-energy-display">
            ${eveningParsed.mood ? `<span class="mood-badge">${getMoodEmoji(eveningParsed.mood)}</span>` : ''}
            ${eveningParsed.energy ? `<span class="energy-badge">⚡ ${eveningParsed.energy}/10</span>` : ''}
          </div>
        ` : ''}
        ${eveningParsed.wins ? `
          <div class="journal-item">
            <div class="journal-label">🏆 Wins:</div>
            <div class="journal-text">${escapeHtml(eveningParsed.wins)}</div>
          </div>
        ` : ''}
        ${eveningParsed.sedona_emotion && eveningParsed.sedona_emotion !== 'none' ? `
          <div class="journal-item sedona-summary">
            <div class="journal-label">🌊 Sedona:</div>
            <div class="journal-text">
              ${getEmotionLabel(eveningParsed.sedona_emotion)}
              ${eveningParsed.sedona_release === 'yes' ? ' → 🕊️ Dilepaskan' : eveningParsed.sedona_release === 'partial' ? ' → 🌱 Proses' : ''}
            </div>
          </div>
        ` : ''}
        ${eveningParsed.reframe ? `
          <div class="journal-item">
            <div class="journal-label">🔄 Reframe:</div>
            <div class="journal-text">${escapeHtml(eveningParsed.reframe)}</div>
          </div>
        ` : ''}
        ${eveningParsed.lesson ? `
          <div class="journal-item">
            <div class="journal-label">💡 Pelajaran:</div>
            <div class="journal-text">${escapeHtml(eveningParsed.lesson)}</div>
          </div>
        ` : ''}
        ${eveningParsed.plan ? `
          <div class="journal-item">
            <div class="journal-label">📋 Rencana:</div>
            <div class="journal-text">${escapeHtml(eveningParsed.plan)}</div>
          </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn-submit btn-secondary" style="flex:1;" onclick="openJournalForm('evening')">✏️ Edit</button>
        <button class="btn-submit btn-secondary" style="flex:1;" onclick="showPage('refleksi')">📊 Refleksi</button>
      </div>
    `;
  } else {
    eveningStatus.textContent = 'Belum ditulis';
    eveningStatus.className = 'status pending';
    eveningContent.innerHTML = `
      <div class="content" style="color: var(--gray-400); font-style: italic;">
        Refleksi dengan Sedona Method dan NLP Reframing...
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn-submit" style="flex:1;" onclick="openJournalForm('evening')">✏️ Tulis</button>
        <button class="btn-submit btn-secondary" style="flex:1;" onclick="showPage('refleksi')">📊 Refleksi</button>
      </div>
    `;
  }
}

function openJournalForm(type) {
  // Get journal from state.journals OR dailySync
  let journal = state.journals?.[type];
  if (!journal && state.dailySync?.journals?.[type]) {
    journal = state.dailySync.journals[type];
  }
  
  let parsed = {};
  
  if (journal) {
    // Check parsed first
    if (journal.parsed) {
      parsed = journal.parsed;
    } else if (journal.content) {
      try {
        parsed = typeof journal.content === 'string' ? JSON.parse(journal.content) : journal.content;
      } catch (e) {
        parsed = {};
      }
    }
  }
  
  if (type === 'morning') {
    // ===== JURNAL PAGI dengan NLP =====
    document.getElementById('journalMorningContent').innerHTML = `
      <div class="journal-form journal-enhanced">
        <!-- Step 1: Mood & Energy Check-in -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🌅</span>
            <span class="section-title">Check-in Pagi</span>
          </div>
          
          <div class="mood-energy-row">
            <div class="mood-selector">
              <label class="form-label-sm">Mood saat ini:</label>
              <div class="mood-options" id="morningMoodOptions">
                <button type="button" class="mood-btn ${parsed.mood === '1' ? 'selected' : ''}" data-mood="1" onclick="selectMood('morning', '1')">😫</button>
                <button type="button" class="mood-btn ${parsed.mood === '2' ? 'selected' : ''}" data-mood="2" onclick="selectMood('morning', '2')">😢</button>
                <button type="button" class="mood-btn ${parsed.mood === '3' ? 'selected' : ''}" data-mood="3" onclick="selectMood('morning', '3')">😐</button>
                <button type="button" class="mood-btn ${parsed.mood === '4' ? 'selected' : ''}" data-mood="4" onclick="selectMood('morning', '4')">🙂</button>
                <button type="button" class="mood-btn ${parsed.mood === '5' ? 'selected' : ''}" data-mood="5" onclick="selectMood('morning', '5')">😊</button>
              </div>
              <input type="hidden" id="journalMorningMood" value="${parsed.mood || ''}">
            </div>
            
            <div class="energy-selector">
              <label class="form-label-sm">Energi: <span id="morningEnergyValue">${parsed.energy || '5'}</span>/10</label>
              <input type="range" class="energy-slider" id="journalMorningEnergy" min="1" max="10" value="${parsed.energy || '5'}" oninput="document.getElementById('morningEnergyValue').textContent = this.value">
            </div>
          </div>
        </div>
        
        <!-- Step 2: NLP State Selection (Anchoring) -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">⚡</span>
            <span class="section-title">State yang Diinginkan</span>
            <span class="section-hint">(NLP Anchoring)</span>
          </div>
          <p class="helper-text">Pilih state/kondisi mental yang ingin kamu rasakan hari ini:</p>
          <div class="state-options" id="desiredStateOptions">
            <button type="button" class="state-btn ${parsed.desired_state === 'confident' ? 'selected' : ''}" onclick="selectState('confident')">💪 Percaya Diri</button>
            <button type="button" class="state-btn ${parsed.desired_state === 'focused' ? 'selected' : ''}" onclick="selectState('focused')">🎯 Fokus</button>
            <button type="button" class="state-btn ${parsed.desired_state === 'calm' ? 'selected' : ''}" onclick="selectState('calm')">🧘 Tenang</button>
            <button type="button" class="state-btn ${parsed.desired_state === 'energetic' ? 'selected' : ''}" onclick="selectState('energetic')">🔥 Energik</button>
            <button type="button" class="state-btn ${parsed.desired_state === 'creative' ? 'selected' : ''}" onclick="selectState('creative')">🎨 Kreatif</button>
            <button type="button" class="state-btn ${parsed.desired_state === 'grateful' ? 'selected' : ''}" onclick="selectState('grateful')">🙏 Bersyukur</button>
          </div>
          <input type="hidden" id="journalDesiredState" value="${parsed.desired_state || ''}">
        </div>
        
        <!-- Step 3: Gratitude -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🙏</span>
            <span class="section-title">Syukur Pagi</span>
          </div>
          <p class="helper-text">Sebutkan 3 hal yang kamu syukuri pagi ini:</p>
          <textarea id="journalGratitude" placeholder="1. Masih diberi kesehatan&#10;2. Keluarga yang sehat&#10;3. Kesempatan baru hari ini">${escapeHtml(parsed.gratitude || '')}</textarea>
        </div>
        
        <!-- Step 4: NLP Affirmation -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">✨</span>
            <span class="section-title">Afirmasi Positif</span>
            <span class="section-hint">(Present, Positive, Personal)</span>
          </div>
          <p class="helper-text">Tulis dalam bentuk "Saya adalah..." atau "Saya mampu...":</p>
          <textarea id="journalAffirmation" placeholder="Saya adalah pribadi yang produktif dan fokus.&#10;Saya mampu menyelesaikan semua tugas dengan baik.&#10;Saya layak mendapatkan kesuksesan.">${escapeHtml(parsed.affirmation || '')}</textarea>
        </div>
        
        <!-- Step 5: Visualization & Focus -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🎯</span>
            <span class="section-title">Visualisasi & Fokus</span>
          </div>
          <p class="helper-text">Bayangkan hari idealmu. Apa yang akan kamu capai?</p>
          <textarea id="journalFocus" placeholder="Hari ini saya akan:&#10;1. Menyelesaikan laporan dengan fokus penuh&#10;2. Hadir 100% dalam setiap percakapan&#10;3. Menjaga energi positif sepanjang hari">${escapeHtml(parsed.focus || '')}</textarea>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn-submit" style="flex:1;" onclick="submitJournal('morning')">💾 Simpan Jurnal Pagi</button>
          <button class="btn-submit btn-secondary" style="flex:1;" onclick="renderJournal()">Batal</button>
        </div>
      </div>
    `;
  } else {
    // ===== JURNAL MALAM dengan Sedona Method =====
    document.getElementById('journalEveningContent').innerHTML = `
      <div class="journal-form journal-enhanced">
        <!-- Step 1: Mood & Energy Check-in -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🌙</span>
            <span class="section-title">Check-in Malam</span>
          </div>
          
          <div class="mood-energy-row">
            <div class="mood-selector">
              <label class="form-label-sm">Mood saat ini:</label>
              <div class="mood-options" id="eveningMoodOptions">
                <button type="button" class="mood-btn ${parsed.mood === '1' ? 'selected' : ''}" data-mood="1" onclick="selectMood('evening', '1')">😫</button>
                <button type="button" class="mood-btn ${parsed.mood === '2' ? 'selected' : ''}" data-mood="2" onclick="selectMood('evening', '2')">😢</button>
                <button type="button" class="mood-btn ${parsed.mood === '3' ? 'selected' : ''}" data-mood="3" onclick="selectMood('evening', '3')">😐</button>
                <button type="button" class="mood-btn ${parsed.mood === '4' ? 'selected' : ''}" data-mood="4" onclick="selectMood('evening', '4')">🙂</button>
                <button type="button" class="mood-btn ${parsed.mood === '5' ? 'selected' : ''}" data-mood="5" onclick="selectMood('evening', '5')">😊</button>
              </div>
              <input type="hidden" id="journalEveningMood" value="${parsed.mood || ''}">
            </div>
            
            <div class="energy-selector">
              <label class="form-label-sm">Energi: <span id="eveningEnergyValue">${parsed.energy || '5'}</span>/10</label>
              <input type="range" class="energy-slider" id="journalEveningEnergy" min="1" max="10" value="${parsed.energy || '5'}" oninput="document.getElementById('eveningEnergyValue').textContent = this.value">
            </div>
          </div>
        </div>
        
        <!-- Step 2: Wins & Gratitude -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🏆</span>
            <span class="section-title">Wins Hari Ini</span>
          </div>
          <p class="helper-text">Apa yang berjalan baik? Sekecil apapun itu:</p>
          <textarea id="journalWins" placeholder="1. Berhasil menyelesaikan meeting tepat waktu&#10;2. Tidak tergoda membuka sosmed saat kerja&#10;3. Makan siang tepat waktu">${escapeHtml(parsed.wins || '')}</textarea>
        </div>
        
        <!-- Step 3: Sedona Method - Release -->
        <div class="journal-section sedona-section">
          <div class="section-header">
            <span class="section-icon">🌊</span>
            <span class="section-title">Sedona Method</span>
            <span class="section-hint">(Lepaskan Emosi)</span>
          </div>
          
          <div class="sedona-steps">
            <div class="sedona-step">
              <label class="form-label-sm">1️⃣ Apa yang kamu rasakan saat ini? (Identify)</label>
              <div class="emotion-options" id="emotionOptions">
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'anxiety' ? 'selected' : ''}" onclick="selectEmotion('anxiety')">😰 Cemas</button>
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'anger' ? 'selected' : ''}" onclick="selectEmotion('anger')">😠 Marah</button>
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'sadness' ? 'selected' : ''}" onclick="selectEmotion('sadness')">😢 Sedih</button>
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'fear' ? 'selected' : ''}" onclick="selectEmotion('fear')">😨 Takut</button>
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'guilt' ? 'selected' : ''}" onclick="selectEmotion('guilt')">😔 Bersalah</button>
                <button type="button" class="emotion-btn ${parsed.sedona_emotion === 'none' ? 'selected' : ''}" onclick="selectEmotion('none')">😌 Netral</button>
              </div>
              <input type="hidden" id="journalSedonaEmotion" value="${parsed.sedona_emotion || ''}">
            </div>
            
            <div class="sedona-step">
              <label class="form-label-sm">2️⃣ Ceritakan lebih detail (apa yang memicunya?):</label>
              <textarea id="journalSedonaDetail" placeholder="Saya merasa cemas karena...">${escapeHtml(parsed.sedona_detail || '')}</textarea>
            </div>
            
            <div class="sedona-step">
              <label class="form-label-sm">3️⃣ Bisakah kamu menerima perasaan ini? (Accept)</label>
              <div class="accept-options">
                <button type="button" class="accept-btn ${parsed.sedona_accept === 'yes' ? 'selected' : ''}" onclick="selectAccept('yes')">✅ Ya, saya terima</button>
                <button type="button" class="accept-btn ${parsed.sedona_accept === 'partial' ? 'selected' : ''}" onclick="selectAccept('partial')">🤔 Sebagian</button>
                <button type="button" class="accept-btn ${parsed.sedona_accept === 'no' ? 'selected' : ''}" onclick="selectAccept('no')">❌ Belum bisa</button>
              </div>
              <input type="hidden" id="journalSedonaAccept" value="${parsed.sedona_accept || ''}">
            </div>
            
            <div class="sedona-step">
              <label class="form-label-sm">4️⃣ Bisakah kamu melepaskannya? (Release)</label>
              <div class="release-options">
                <button type="button" class="release-btn ${parsed.sedona_release === 'yes' ? 'selected' : ''}" onclick="selectRelease('yes')">🕊️ Ya, saya lepaskan</button>
                <button type="button" class="release-btn ${parsed.sedona_release === 'partial' ? 'selected' : ''}" onclick="selectRelease('partial')">🌱 Sedikit demi sedikit</button>
                <button type="button" class="release-btn ${parsed.sedona_release === 'no' ? 'selected' : ''}" onclick="selectRelease('no')">🔒 Belum siap</button>
              </div>
              <input type="hidden" id="journalSedonaRelease" value="${parsed.sedona_release || ''}">
            </div>
          </div>
        </div>
        
        <!-- Step 4: NLP Reframing -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">🔄</span>
            <span class="section-title">Reframing</span>
            <span class="section-hint">(NLP - Ubah Perspektif)</span>
          </div>
          <p class="helper-text">Jika ada hal negatif, bagaimana sudut pandang lain yang lebih memberdayakan?</p>
          <textarea id="journalReframe" placeholder="Daripada berpikir 'Saya gagal...'&#10;Saya memilih berpikir 'Ini adalah kesempatan belajar...'&#10;&#10;Atau: 'Apa hikmah dari kejadian ini?'">${escapeHtml(parsed.reframe || '')}</textarea>
        </div>
        
        <!-- Step 5: Lesson & Plan -->
        <div class="journal-section">
          <div class="section-header">
            <span class="section-icon">💡</span>
            <span class="section-title">Pelajaran & Rencana</span>
          </div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label-sm">Pelajaran hari ini:</label>
            <textarea id="journalLesson" placeholder="Apa yang saya pelajari hari ini...">${escapeHtml(parsed.lesson || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label-sm">Rencana untuk besok:</label>
            <textarea id="journalPlan" placeholder="3 hal yang akan saya fokuskan besok...">${escapeHtml(parsed.plan || '')}</textarea>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn-submit" style="flex:1;" onclick="submitJournal('evening')">💾 Simpan Jurnal Malam</button>
          <button class="btn-submit btn-secondary" style="flex:1;" onclick="renderJournal()">Batal</button>
        </div>
      </div>
    `;
  }
}

// Helper functions for journal form
function selectMood(type, mood) {
  const container = document.getElementById(type === 'morning' ? 'morningMoodOptions' : 'eveningMoodOptions');
  const input = document.getElementById(type === 'morning' ? 'journalMorningMood' : 'journalEveningMood');
  
  container.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
  container.querySelector(`[data-mood="${mood}"]`).classList.add('selected');
  input.value = mood;
}

function selectState(state) {
  const container = document.getElementById('desiredStateOptions');
  const input = document.getElementById('journalDesiredState');
  
  container.querySelectorAll('.state-btn').forEach(btn => btn.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  input.value = state;
}

function selectEmotion(emotion) {
  const container = document.getElementById('emotionOptions');
  const input = document.getElementById('journalSedonaEmotion');
  
  container.querySelectorAll('.emotion-btn').forEach(btn => btn.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  input.value = emotion;
}

function selectAccept(value) {
  const container = event.currentTarget.parentElement;
  const input = document.getElementById('journalSedonaAccept');
  
  container.querySelectorAll('.accept-btn').forEach(btn => btn.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  input.value = value;
}

function selectRelease(value) {
  const container = event.currentTarget.parentElement;
  const input = document.getElementById('journalSedonaRelease');
  
  container.querySelectorAll('.release-btn').forEach(btn => btn.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  input.value = value;
}

function submitJournal(type) {
  let content = {};
  const today = new Date().toISOString().split('T')[0];
  
  if (type === 'morning') {
    content = {
      // Mood & Energy
      mood: document.getElementById('journalMorningMood')?.value || '',
      energy: document.getElementById('journalMorningEnergy')?.value || '',
      // NLP State
      desired_state: document.getElementById('journalDesiredState')?.value || '',
      // Gratitude & Affirmation
      gratitude: document.getElementById('journalGratitude')?.value.trim() || '',
      affirmation: document.getElementById('journalAffirmation')?.value.trim() || '',
      // Focus
      focus: document.getElementById('journalFocus')?.value.trim() || ''
    };
  } else {
    content = {
      // Mood & Energy
      mood: document.getElementById('journalEveningMood')?.value || '',
      energy: document.getElementById('journalEveningEnergy')?.value || '',
      // Wins
      wins: document.getElementById('journalWins')?.value.trim() || '',
      // Sedona Method
      sedona_emotion: document.getElementById('journalSedonaEmotion')?.value || '',
      sedona_detail: document.getElementById('journalSedonaDetail')?.value.trim() || '',
      sedona_accept: document.getElementById('journalSedonaAccept')?.value || '',
      sedona_release: document.getElementById('journalSedonaRelease')?.value || '',
      // NLP Reframe
      reframe: document.getElementById('journalReframe')?.value.trim() || '',
      // Lesson & Plan
      lesson: document.getElementById('journalLesson')?.value.trim() || '',
      plan: document.getElementById('journalPlan')?.value.trim() || ''
    };
  }
  
  const hasContent = Object.values(content).some(v => v);
  if (!hasContent) {
    showToast('Isi minimal satu field', 'error');
    return;
  }
  
  // Update local state with both content string and parsed object
  state.journals = state.journals || { morning: null, evening: null };
  state.journals[type] = {
    content: JSON.stringify(content),
    parsed: content,  // Store parsed for immediate display
    tanggal: today,
    type: type === 'morning' ? 'MORNING_JOURNAL' : 'EVENING_JOURNAL'
  };
  
  // Also update dailySync if exists (for consistency)
  if (state.dailySync) {
    state.dailySync.journals = state.dailySync.journals || {};
    state.dailySync.journals[type] = state.journals[type];
  }
  
  // ADD TO QUEUE - gunakan saveJournal yang ada di backend
  addToQueue('saveJournal', { 
    data: {
      tanggal: today,
      type: type === 'morning' ? 'MORNING_JOURNAL' : 'EVENING_JOURNAL',
      content: JSON.stringify(content)
    }
  });
  
  // Sync immediately
  syncPendingQueue();
  
  renderJournal();
  showToast('Jurnal tersimpan! ✓', 'success');
}

// ============================================
// BATCH 1: DON'T LIST FUNCTIONS
// ============================================
async function loadDontList() {
  // Skip if already loaded and cache valid
  if (state.dontList?.length > 0 && isCacheValid('dontList')) {
    renderDontList();
    renderDontListMini();
    return;
  }
  
  try {
    const data = await apiGet('getDontList');
    state.dontList = data || [];
    state.cache.dontList = Date.now();
    renderDontList();
    renderDontListMini();
  } catch (err) {
    state.dontList = [];
    renderDontList();
    renderDontListMini();
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
    'KEBIASAAN': { icon: '🔄', title: 'Kebiasaan', items: [] },
    'OTHER': { icon: '📋', title: 'Lainnya', items: [] }
  };
  
  items.forEach(item => {
    const cat = item.category || 'OTHER';
    if (categories[cat]) {
      categories[cat].items.push(item);
    } else {
      categories['OTHER'].items.push(item);
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
          ${cat.items.map(item => {
            // Support both 'title' (from backend) and 'item' (legacy)
            const itemText = item.title || item.item || item.content || '';
            return `
            <div class="dont-item" data-id="${item.dont_id}">
              <span class="icon">🚫</span>
              <div class="content">
                <div class="item-text">${escapeHtml(itemText)}</div>
                ${item.reason ? `<div class="item-reason">${escapeHtml(item.reason)}</div>` : ''}
              </div>
              <div class="actions">
                <button onclick="deleteDontItem('${item.dont_id}')" title="Hapus">🗑️</button>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  });
  
  // Show total count
  html = `<div style="margin-bottom: 12px; font-size: 12px; color: var(--gray-500);">Total: ${items.length} item</div>` + html;
  
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
    title: item,  // Use 'title' for backend compatibility
    item: item,   // Keep 'item' for frontend compatibility
    reason: reason,
    category: category,
    active: true
  };
  state.dontList = [newItem, ...(state.dontList || [])];
  
  addToQueue('addDontItem', { 
    data: { title: item, reason, category }  // Send 'title' to backend
  });
  syncPendingQueue();
  
  document.getElementById('dontItemText').value = '';
  document.getElementById('dontItemReason').value = '';
  closeModal('dont-add');
  
  renderDontList();
  renderDontListMini();
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
  
  addToQueue('saveBrainDump', { content: content });
  
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
  // Just call renderJournal since it handles everything now
  renderJournal();
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
// REFLEKSI PAGE - untuk Jurnal Malam
// ============================================
function renderRefleksiPage() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = new Date();
  const dayNum = today.getDay() === 0 ? 7 : today.getDay();
  
  // Set day label
  const dayLabel = document.getElementById('refleksiHariIni');
  if (dayLabel) dayLabel.textContent = days[today.getDay()];
  
  // Best Week Template
  const bestWeekContainer = document.getElementById('refleksiBestWeek');
  if (bestWeekContainer) {
    const jadwal = state.bestWeek?.[dayNum] || [];
    if (jadwal.length > 0) {
      bestWeekContainer.innerHTML = jadwal.map(j => `
        <div class="refleksi-schedule-item">
          <span class="time">${j.jam || j.time || ''}</span>
          <span class="activity">${escapeHtml(j.aktivitas || j.activity || '')}</span>
        </div>
      `).join('');
    } else {
      bestWeekContainer.innerHTML = `<div style="padding: 12px; text-align: center;">
        <p style="color: var(--gray-400); font-size: 12px;">Belum ada jadwal ideal untuk hari ini</p>
        <button class="btn-link" onclick="showPage('bestweek')">Atur Best Week →</button>
      </div>`;
    }
  }
  
  // Stats Ibadah
  const sholatStat = document.getElementById('refleksiSholat');
  const sunnahStat = document.getElementById('refleksiSunnah');
  const pomoStat = document.getElementById('refleksiPomodoro');
  
  if (sholatStat) {
    sholatStat.textContent = (state.dailySync?.stats?.sholat_completed || 0) + '/8';
  }
  if (sunnahStat) {
    sholatStat.textContent = (state.dailySync?.stats?.habits_completed || 0) + '/' + (state.dailySync?.stats?.habits_total || 11);
  }
  if (pomoStat) {
    pomoStat.textContent = state.dailySync?.stats?.pomodoro_count || 0;
  }
  
  // Don't List dengan status
  const dontContainer = document.getElementById('refleksiDontList');
  const dontBadge = document.getElementById('refleksiDontBadge');
  if (dontContainer) {
    const items = state.dontList || [];
    const violations = state.dontViolations || {};
    
    if (items.length > 0) {
      const obeyed = items.filter(i => violations[i.dont_id || i.id] === false).length;
      const violated = items.filter(i => violations[i.dont_id || i.id] === true).length;
      if (dontBadge) dontBadge.textContent = `${obeyed}✓ ${violated}✗`;
      
      dontContainer.innerHTML = items.map(item => {
        const itemId = item.dont_id || item.id;
        const status = violations[itemId];
        const statusClass = status === true ? 'violated' : status === false ? 'obeyed' : '';
        const icon = status === true ? '❌' : status === false ? '✅' : '⚪';
        return `<div class="refleksi-dont-item ${statusClass}">
          ${icon} ${escapeHtml(item.item || item.content)}
        </div>`;
      }).join('');
    } else {
      dontContainer.innerHTML = '<p style="padding: 12px; color: var(--gray-400); font-size: 12px;">Belum ada don\'t list</p>';
    }
  }
  
  // Task Selesai Hari Ini
  const taskContainer = document.getElementById('refleksiTaskDone');
  if (taskContainer) {
    const board = state.kanban?.board || state.kanban || {};
    const doneTasks = board.done || [];
    
    // Filter task selesai hari ini (simple check)
    const todayTasks = doneTasks.slice(0, 10);
    
    if (todayTasks.length > 0) {
      taskContainer.innerHTML = todayTasks.map(t => `
        <div class="refleksi-task-item">✅ ${escapeHtml(t.title)}</div>
      `).join('');
    } else {
      taskContainer.innerHTML = '<p style="padding: 12px; color: var(--gray-400); font-size: 12px;">Belum ada task selesai</p>';
    }
  }
  
  // Jurnal Pagi
  const jurnalContainer = document.getElementById('refleksiJurnalPagi');
  if (jurnalContainer) {
    let morningData = state.journals?.morning;
    if (!morningData && state.dailySync?.journals?.morning) {
      morningData = state.dailySync.journals.morning;
    }
    
    if (morningData) {
      let m = {};
      if (typeof morningData.content === 'string') {
        try { m = JSON.parse(morningData.content); } catch(e) { m = {}; }
      } else if (morningData.parsed) {
        m = morningData.parsed;
      } else if (morningData.content) {
        m = morningData.content;
      }
      
      if (m.gratitude || m.focus || m.affirmation) {
        jurnalContainer.innerHTML = `
          <div class="journal-display" style="padding: 12px;">
            ${m.gratitude ? `<div class="journal-item"><span class="label">🙏 Syukur:</span> ${escapeHtml(m.gratitude)}</div>` : ''}
            ${m.focus ? `<div class="journal-item"><span class="label">🎯 Fokus:</span> ${escapeHtml(m.focus)}</div>` : ''}
            ${m.affirmation ? `<div class="journal-item"><span class="label">✨ Afirmasi:</span> ${escapeHtml(m.affirmation)}</div>` : ''}
          </div>
        `;
      } else {
        jurnalContainer.innerHTML = '<p style="padding: 12px; color: var(--gray-400); font-size: 12px;">Jurnal pagi belum ditulis</p>';
      }
    } else {
      jurnalContainer.innerHTML = '<p style="padding: 12px; color: var(--gray-400); font-size: 12px;">Jurnal pagi belum ditulis</p>';
    }
  }
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
