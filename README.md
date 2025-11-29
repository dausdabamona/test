# 📱 Sync Planner - Panduan Install di HP

## 🚀 Cara Deploy ke Netlify (Paling Mudah)

### Langkah 1: Buka Netlify
1. Buka https://app.netlify.com
2. Login dengan GitHub/Google/Email

### Langkah 2: Deploy
1. Di dashboard, klik **"Add new site"** → **"Deploy manually"**
2. **Drag & drop folder `frontend`** ke area upload
3. Tunggu beberapa detik
4. Dapat URL seperti: `https://random-name.netlify.app`

### Langkah 3: (Opsional) Custom Domain
1. Klik **"Domain settings"**
2. Klik **"Add custom domain"**
3. Atau rename: **"Options"** → **"Edit site name"**
   - Contoh: `sync-planner-firdaus.netlify.app`

---

## 📱 Cara Install di HP (Setelah Deploy)

### Android (Chrome):
1. Buka URL Netlify di Chrome
2. Tap menu **⋮** (3 titik) di kanan atas
3. Pilih **"Add to Home screen"** atau **"Install app"**
4. Beri nama → **"Add"**
5. ✅ Icon akan muncul di Home screen!

### iPhone (Safari):
1. Buka URL di **Safari** (HARUS Safari!)
2. Tap icon **Share** (kotak dengan panah ke atas)
3. Scroll ke bawah, pilih **"Add to Home Screen"**
4. Beri nama → **"Add"**
5. ✅ Icon akan muncul di Home screen!

---

## 🔧 Alternatif: GitHub Pages

### Langkah 1: Buat Repository
1. Buka https://github.com/new
2. Nama repository: `sync-planner`
3. Pilih **Public**
4. Klik **"Create repository"**

### Langkah 2: Upload Files
1. Klik **"uploading an existing file"**
2. Drag & drop SEMUA file dari folder `frontend`
3. Klik **"Commit changes"**

### Langkah 3: Aktifkan GitHub Pages
1. Buka **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/root**
4. Klik **Save**
5. Tunggu 1-2 menit
6. URL: `https://username.github.io/sync-planner/`

---

## ⚠️ Troubleshooting

### Error 404
- Pastikan `index.html` ada di ROOT folder (bukan di subfolder)
- Clear cache browser: Chrome → Settings → Clear browsing data

### Tidak bisa install di HP
- Pastikan akses via **HTTPS** (bukan http)
- Untuk iPhone HARUS pakai **Safari**
- Untuk Android pakai **Chrome**

### Data tidak sync
- Pastikan ada koneksi internet
- Cek URL API di app.js sudah benar
- Refresh halaman

---

## 📋 Struktur File yang Harus Di-upload

```
sync-planner/
├── index.html      ← File utama
├── app.js          ← JavaScript
├── sw.js           ← Service Worker
├── manifest.json   ← PWA config
├── icon-72.png
├── icon-96.png
├── icon-128.png
├── icon-144.png
├── icon-152.png
├── icon-192.png
├── icon-384.png
└── icon-512.png
```

---

## 🎯 Tips

1. **Bookmark URL** sebelum install, untuk backup
2. **Test di laptop dulu** sebelum install di HP
3. Jika ada update, **clear cache** di HP:
   - Android: Settings → Apps → Chrome → Clear cache
   - iPhone: Settings → Safari → Clear History and Website Data

---

Selamat menggunakan! 🚀
