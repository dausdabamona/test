# 🌙 Sync Planner - Produktivitas Islami untuk ASN

Aplikasi produktivitas berbasis sunnah Rasulullah ﷺ untuk Aparatur Sipil Negara (ASN).

## ✨ Fitur Utama

### 🏔️ Piramida Visi & Goal
- **Visi 10 Tahun** - Tujuan jangka panjang kehidupan
- **Target 3 Tahun** - Milestone menuju visi
- **Target 1 Tahun** - Rencana tahunan yang terukur
- **Goal 12 Minggu** - Sprint intensif untuk hasil nyata

### ⚖️ Pairwise Comparison
Metode ilmiah untuk menentukan prioritas dengan membandingkan setiap pasangan goal. Hasil prioritas otomatis tersimpan dan bisa diubah menjadi task di Kanban.

### 📊 Kanban Board
- 4 kolom: Backlog, To Do, In Progress, Done
- Filter per goal
- Prioritas dari hasil pairwise ditandai khusus
- Quick move antar kolom

### 📿 Habit Sunnah Rasulullah ﷺ
Amalan harian berdasarkan sunnah yang disesuaikan untuk ASN:
- Sholat Tahajud (03:30)
- Subuh Berjamaah (04:30)
- Dzikir Pagi (05:00)
- Tilawah Al-Quran (05:30)
- Sholat Dhuha (07:00)
- Rawatib Dzuhur (12:00)
- Dzikir Sore (16:00)
- Maghrib & Isya Berjamaah
- Sholat Witir (21:00)
- Muhasabah/Evaluasi Diri (21:30)

### 🕌 Tracking Sholat
Pantau sholat wajib dan sunnah dengan detail:
- Jam pelaksanaan
- Lokasi (Masjid/Musholla/Rumah)
- Status berjamaah

### 🍅 Pomodoro Timer
- Pomodoro 25 menit
- Deep Work 60 menit
- Ultra Focus 90 menit
- Terhubung dengan goal prioritas

### 📈 Statistik & Progress
- Sesi fokus mingguan
- Streak harian
- Completion rate
- Detail per tipe pomodoro

## 🚀 Cara Menggunakan

### Deploy ke GitHub Pages

1. **Fork repository ini** atau buat repository baru

2. **Upload semua file:**
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `icons/` (folder dengan icon)

3. **Aktifkan GitHub Pages:**
   - Settings → Pages
   - Source: main branch
   - Save

4. **Akses aplikasi:**
   ```
   https://[username].github.io/[repo-name]
   ```

### Install di HP (PWA)

**Android (Chrome):**
1. Buka URL di Chrome
2. Tap menu ⋮ → "Add to Home screen"
3. Beri nama → Add

**iPhone (Safari):**
1. Buka URL di Safari
2. Tap Share 📤 → "Add to Home Screen"
3. Beri nama → Add

## ⚙️ Konfigurasi

Edit bagian CONFIG di `index.html`:

```javascript
const CONFIG = {
  API_URL: 'YOUR_APPS_SCRIPT_URL',
  USER_ID: 'YOUR_USER_ID'
};
```

## 🏗️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (No framework)
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **PWA:** Service Worker untuk offline support

## 📱 Screenshot

```
┌────────────────────────────────────┐
│  🌙 Sync Planner                   │
│  Jumat, 28 November 2025           │
├────────────────────────────────────┤
│                                    │
│  🕌 Sholat & Ibadah                │
│  ┌────┬────┬────┬────┐             │
│  │🌙  │🌅  │☀️  │🌞  │             │
│  │    │ ✓  │ ✓  │    │             │
│  └────┴────┴────┴────┘             │
│                                    │
│  ⚡ Aksi Cepat                      │
│  ┌──────┬──────┬──────┬──────┐     │
│  │ 🍅   │ ⚖️   │ 📋   │ 🎯   │     │
│  │Fokus │Prior │Task  │Visi  │     │
│  └──────┴──────┴──────┴──────┘     │
│                                    │
│  📿 Sunnah Rasulullah ﷺ           │
│  ┌──────────────────────────┐      │
│  │ ☐ Sholat Tahajud   03:30 │      │
│  │ ✓ Subuh Berjamaah  04:30 │      │
│  │ ✓ Dzikir Pagi      05:00 │      │
│  │ ☐ Sholat Dhuha     07:00 │      │
│  └──────────────────────────┘      │
│                                    │
├────────────────────────────────────┤
│ 🏠   📊   🎯   📈   ⚙️           │
└────────────────────────────────────┘
```

## 🤲 Doa Penutup

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ

*"Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka."* (QS. Al-Baqarah: 201)

---

**Dibuat untuk produktivitas yang berkah 🌙**

© 2025 Sync Planner
