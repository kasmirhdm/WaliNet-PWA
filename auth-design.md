# WaliNet Admin & Karyawan

Rancangan akses:
- Admin: login dengan username/password; dapat mengelola pelanggan, pembayaran, paket, laporan, dan akun karyawan.
- Karyawan: login dengan akun yang dibuat Admin; hak akses dapat dibatasi.
- Pelanggan: tidak masuk panel admin; hanya menggunakan halaman Cek Tagihan.

Catatan keamanan: password produksi tidak disimpan di frontend atau Google Sheet sebagai plaintext. Autentikasi produksi sebaiknya dilakukan melalui backend/Google Apps Script dengan password yang di-hash dan session/token.
