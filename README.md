# WaliNet PWA

Web mobile-first untuk pencatatan pelanggan, pembayaran, tagihan, laporan bulanan, dan laporan tunggakan.

## Arsitektur
GitHub Pages → Google Apps Script → Google Sheets

## Fitur awal
- Dashboard
- Pelanggan
- Pembayaran
- Laporan bulanan
- Laporan tunggakan
- PWA / install ke layar utama HP

## Google Sheets
Template Apps Script tersedia di `google-apps-script/Code.gs`. Isi `SPREADSHEET_ID`, deploy sebagai Web App, lalu masukkan URL Web App ke `APPS_SCRIPT_URL` pada `app.js`.

Jangan menaruh credential rahasia Google di frontend.

## GitHub Pages
Workflow `.github/workflows/pages.yml` akan menjalankan deployment otomatis setiap ada push ke `main`, setelah GitHub Pages pada repository menggunakan source **GitHub Actions**.