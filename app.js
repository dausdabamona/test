// ============================================
// SYNC PLANNER - MAIN JAVASCRIPT
// ============================================

// CONFIG - GANTI DENGAN DATA ANDA
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwXXj7eYC9rzwoAe1V3PoXSOw2R7QVdJh2AfJ_gTzQkUQptISjNXISOkxymvhEPsKyAAw/exec',
  USER_ID: 'b85b0e08-d379-40ba-81dc-5a16f23a8a37'
};

// STATE
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
  currentHabitFilter: 'all'
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

// ============================================
// API FUNCTIONS
// ============================================
async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.append('action', action);
  url.searchParams.append('user_id', CONFIG.USER_ID);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.append(k, v); });
  
  const response = await fetch(url.toString());
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'API Error');
  return data.data;
}

async function apiPost(action, body = {}) {
  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, user_id: CONFIG.USER_ID, ...body })
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'API Error');
  return data.data;
}

// ============================================
// UI FUNCTIONS
// ============================================
function showPage(pageName, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageName)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  
  if (pageName === 'kanban') loadKanban();
  if (pageName === 'goals') loadGoals();
  if (pageName === 'stats') loadStats('week');
  if (pageName === 'habits') renderHabitsFull();
  if (pageName === 'pairwise') initPairwise();
  if (pageName === 'vision') loadVisions();
  if (pageName === 'settings') {
    document.getElementById('settingUserId').textContent = CONFIG.USER_ID;
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
  if (name === 'pomodoro') populatePomodoroGoals();
}

function closeModal(name) {
  document.getElementById('modal-' + name)?.classList.remove('active');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : 'ℹ️ ') + message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================
// DATA LOADING
// ============================================
async function loadAllData() {
  showToast('Memuat data...', 'info');
  try {
    await Promise.all([loadDailySync(), loadGoals(), loadVisions()]);
    showToast('Data berhasil dimuat', 'success');
  } catch (err) {
    showToast('Gagal memuat: ' + err.message, 'error');
  }
}

async function loadDailySync() {
  try {
    document.getElementById('settingApiStatus').textContent = 'Loading...';
    state.dailySync = await apiGet('getDailySync');
    document.getElementById('settingApiStatus').textContent = '✅ Connected';
    renderDailySync();
  } catch (err) {
    document.getElementById('settingApiStatus').textContent = '❌ ' + err.message;
    throw err;
  }
}

async function loadGoals() {
  try {
    state.goals = await apiGet('getGoals');
    renderGoals();
    renderTodayFocus();
  } catch (err) {
    console.error('Failed to load goals:', err);
  }
}

async function loadKanban() {
  try {
    state.kanban = await apiGet('getKanban', { goal_id: state.selectedGoalFilter });
    renderKanban();
    renderKanbanTabs();
  } catch (err) {
    document.getElementById('kanbanBoard').innerHTML = '<div class="empty-state"><span class="icon">❌</span><p>Gagal memuat</p></div>';
  }
}

async function loadVisions() {
  try {
    state.visions = await apiGet('getVisions');
    renderVisions();
  } catch (err) {
    console.error('Failed to load visions:', err);
  }
}

async function loadStats(period) {
  try {
    state.pomodoroStats = await apiGet('getPomodoroStats', { period });
    renderStats();
  } catch (err) {
    document.getElementById('statsContainer').innerHTML = '<div class="empty-state"><span class="icon">❌</span><p>Gagal memuat</p></div>';
  }
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
    const data = sholatData[s.id] || { done: false };
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

function filterHabits(filter) {
  state.currentHabitFilter = filter;
  document.querySelectorAll('#page-habits .tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderHabitsFull();
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!state.goals || state.goals.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">🎯</span><p>Belum ada goal</p></div>';
    return;
  }
  
  container.innerHTML = state.goals.map((g, idx) => {
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
  const topGoals = state.goals.filter(g => g.priority_rank && g.priority_rank <= 3).slice(0, 3);
  
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
      `<button class="tab-btn ${state.selectedGoalFilter === g.goal_id ? 'active' : ''}" onclick="filterKanban('${g.goal_id}')">${escapeHtml(g.title.substring(0, 12))}...</button>`
    ).join('');
  }
  document.getElementById('kanbanTabs').innerHTML = html;
}

function renderVisions() {
  const visions = state.visions || [];
  const spiritual = visions.find(v => v.bidang === 'SPIRITUAL');
  const karir = visions.find(v => v.bidang === 'KARIR');
  
  if (spiritual?.vision_10_tahun || karir?.vision_10_tahun) {
    let content = '';
    if (spiritual?.vision_10_tahun) content += `<strong>Spiritual:</strong> ${escapeHtml(spiritual.vision_10_tahun)}<br>`;
    if (karir?.vision_10_tahun) content += `<strong>Karir:</strong> ${escapeHtml(karir.vision_10_tahun)}`;
    document.getElementById('vision10Content').innerHTML = content;
  }
  
  if (state.goals?.length > 0) {
    document.getElementById('visionQuarterContent').innerHTML = `${state.goals.length} goal aktif`;
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
// PAIRWISE COMPARISON
// ============================================
function initPairwise() {
  const goals = state.goals.filter(g => g.status === 'active');
  
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
  const { comparisons, currentPair, items } = state.pairwise;
  
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
  const ranked = items.sort((a, b) => results[b.goal_id] - results[a.goal_id]);
  
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

async function savePairwiseResults() {
  try {
    const { results, items } = state.pairwise;
    const ranked = items.sort((a, b) => results[b.goal_id] - results[a.goal_id]);
    const rankings = ranked.map((g, i) => ({ goal_id: g.goal_id, rank: i + 1 }));
    
    await apiPost('savePairwise', { rankings });
    showToast('Prioritas tersimpan!', 'success');
    await loadGoals();
    renderTodayFocus();
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
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

async function submitSholat() {
  const btn = document.getElementById('btnSholat');
  btn.disabled = true;
  try {
    await apiPost('logSholat', {
      waktu_sholat: state.selectedSholat,
      options: {
        jam: document.getElementById('sholatJam').value,
        lokasi: document.getElementById('sholatLokasi').value,
        berjamaah: document.getElementById('sholatBerjamaah').checked
      }
    });
    showToast('Tersimpan ✓', 'success');
    closeModal('sholat');
    await loadDailySync();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function toggleHabitRosul(habitId, isCompleted) {
  if (isCompleted) { showToast('Sudah selesai', 'info'); return; }
  try {
    await apiPost('checkHabit', { habit_id: habitId });
    showToast('Alhamdulillah! ✓', 'success');
    await loadDailySync();
  } catch (err) { showToast(err.message, 'error'); }
}

async function submitGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { showToast('Isi judul', 'error'); return; }
  
  const btn = document.getElementById('btnGoal');
  btn.disabled = true;
  try {
    await apiPost('createGoal', {
      data: {
        title,
        description: document.getElementById('goalDesc').value.trim(),
        quarter: parseInt(document.getElementById('goalQuarter').value),
        year: parseInt(document.getElementById('goalYear').value)
      }
    });
    showToast('Goal tersimpan!', 'success');
    closeModal('goal');
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalDesc').value = '';
    await loadGoals();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

function populateGoalSelect() {
  const select = document.getElementById('taskGoal');
  select.innerHTML = '<option value="">-- Pilih Goal --</option>';
  state.goals?.forEach(g => {
    select.innerHTML += `<option value="${g.goal_id}">${escapeHtml(g.title)}</option>`;
  });
}

function populatePomodoroGoals() {
  const select = document.getElementById('pomodoroGoal');
  select.innerHTML = '<option value="">-- Pilih --</option>';
  state.goals?.slice(0, 5).forEach(g => {
    select.innerHTML += `<option value="${g.goal_id}">${escapeHtml(g.title)}</option>`;
  });
}

function selectPomodoroGoal() {
  const goal = state.goals?.find(g => g.goal_id === document.getElementById('pomodoroGoal').value);
  if (goal) document.getElementById('pomodoroTask').value = goal.title;
}

function openAddTask(status) {
  openModal('task');
  document.getElementById('taskStatus').value = status;
}

async function submitTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { showToast('Isi judul', 'error'); return; }
  
  const btn = document.getElementById('btnTask');
  btn.disabled = true;
  try {
    await apiPost('createTask', {
      goal_id: document.getElementById('taskGoal').value || '',
      data: {
        title,
        description: document.getElementById('taskDesc').value.trim(),
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value,
        due_date: document.getElementById('taskDueDate').value
      }
    });
    showToast('Task tersimpan!', 'success');
    closeModal('task');
    document.getElementById('taskTitle').value = '';
    await loadKanban();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function moveTask(taskId, newStatus) {
  try {
    await apiPost('moveTask', { task_id: taskId, status: newStatus });
    showToast('Dipindahkan!', 'success');
    await loadKanban();
  } catch (err) { showToast(err.message, 'error'); }
}

function filterKanban(goalId) {
  state.selectedGoalFilter = goalId;
  loadKanban();
}

function viewGoalDetail(goalId) {
  state.selectedGoalFilter = goalId;
  showPage('kanban');
}

async function startPomodoro() {
  const task = document.getElementById('pomodoroTask').value.trim();
  if (!task) { showToast('Isi task', 'error'); return; }
  
  const btn = document.getElementById('btnPomodoro');
  btn.disabled = true;
  try {
    await apiPost('startPomodoro', {
      options: {
        type: document.getElementById('pomodoroType').value,
        planned_task: task
      }
    });
    showToast('Pomodoro dimulai! 🍅', 'success');
    closeModal('pomodoro');
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function saveVision(level) {
  showToast('Visi tersimpan!', 'success');
  closeModal('vision-' + level);
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

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', loadAllData);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
