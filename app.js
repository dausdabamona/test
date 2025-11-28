// ============================================
// SYNC PLANNER v2.1 - OPTIMIZED VERSION
// ============================================

// CONFIG
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwXXj7eYC9rzwoAe1V3PoXSOw2R7QVdJh2AfJ_gTzQkUQptISjNXISOkxymvhEPsKyAAw/exec',
  USER_ID: '339926ce-f54b-46e5-8740-865ba7555929',
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
    pomodoro: false
  },
  // QUEUE SYSTEM - Pending actions untuk sync ke server
  pendingQueue: [],
  isSyncing: false
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
  url.searchParams.append('user_id', CONFIG.USER_ID);
  Object.entries(params).forEach(([k, v]) => { 
    if (v !== undefined && v !== '') url.searchParams.append(k, v); 
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
  
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
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

async function apiPost(action, body = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
  
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, user_id: CONFIG.USER_ID, ...body }),
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
    case 'settings':
      document.getElementById('settingUserId').textContent = CONFIG.USER_ID;
      document.getElementById('settingPendingCount').textContent = state.pendingQueue.length;
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
    if (!silent) document.getElementById('settingApiStatus').textContent = 'Loading...';
    state.dailySync = await apiGet('getDailySync');
    state.cache.dailySync = Date.now();
    if (!silent) document.getElementById('settingApiStatus').textContent = '✅ Connected';
    renderDailySync();
  } catch (err) {
    if (!silent) document.getElementById('settingApiStatus').textContent = '❌ ' + err.message;
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
  document.getElementById('sholatGrid').innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1;">
      <span class="icon">📴</span>
      <p>Mode Offline</p>
    </div>`;
}

// ============================================
// RENDERING
// ============================================
function renderDailySync() {
  const data = state.dailySync;
  if (!data) return;
  
  document.getElementById('currentDate').textContent = data.day + ', ' + formatDate(data.date);
  document.getElementById('sholatCount').textContent = data.stats.sholat_completed + '/8';
  document.getElementById('habitCount').textContent = data.stats.habits_completed + '/' + data.stats.habits_total;
  document.getElementById('pomodoroCount').textContent = data.stats.pomodoros_completed;
  document.getElementById('focusMinutes').textContent = data.stats.focus_minutes + 'm';
  
  renderSholatGrid(data.sholat);
  renderHabitRosul(data.habits);
}

function renderSholatGrid(sholatData) {
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
  
  document.getElementById('sholatGrid').innerHTML = sholatList.map(s => {
    const data = sholatData?.[s.id] || { done: false };
    return `<div class="sholat-item ${data.done ? 'done' : ''}" onclick="openSholatModal('${s.id}')">
      <span class="icon">${s.icon}</span>
      <span class="name">${s.name}</span>
      ${data.jam_pelaksanaan ? `<span class="time">${data.jam_pelaksanaan}</span>` : ''}
    </div>`;
  }).join('');
}

function renderHabitRosul(habits) {
  const container = document.getElementById('habitRosulList');
  const todayHabits = HABIT_ROSUL.slice(0, 4).map(hr => {
    const dbHabit = habits?.find(h => h.name.toLowerCase().includes(hr.id.replace('_', ' ')));
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
  
  return `<div class="task-card priority-${task.priority || 'medium'}">
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="task-label priority-${task.priority}">${task.priority || 'medium'}</span>
      ${task.due_date ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDateShort(task.due_date)}</span>` : ''}
    </div>
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
  
  // Add to queue
  addToQueue('savePairwise', { rankings });
  
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
  select.innerHTML = '<option value="">-- Pilih Goal --</option>';
  (state.goals || []).forEach(g => {
    select.innerHTML += `<option value="${g.goal_id}">${escapeHtml(g.title)}</option>`;
  });
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

function submitTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { showToast('Isi judul', 'error'); return; }
  
  const taskData = {
    title,
    description: document.getElementById('taskDesc').value.trim(),
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    due_date: document.getElementById('taskDueDate').value
  };
  const goalId = document.getElementById('taskGoal').value || '';
  
  // Generate temporary ID
  const tempId = 'temp_' + Date.now();
  
  // Update local state langsung
  const newTask = {
    task_id: tempId,
    goal_id: goalId,
    ...taskData,
    created_at: new Date().toISOString()
  };
  
  if (!state.kanban) state.kanban = { backlog: [], todo: [], progress: [], done: [] };
  const status = taskData.status || 'backlog';
  if (!state.kanban[status]) state.kanban[status] = [];
  state.kanban[status].unshift(newTask);
  
  // Add to queue
  addToQueue('createTask', { goal_id: goalId, data: taskData });
  
  // Clear form & close modal
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
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
  state.pageLoaded = { home: false, kanban: false, goals: false, stats: false, habits: false, vision: false, pairwise: false, pomodoro: false };
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
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', loadAllData);

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
