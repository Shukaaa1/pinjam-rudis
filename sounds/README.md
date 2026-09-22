# Panduan File Suara Notifikasi Kustom

Folder ini digunakan untuk menyimpan file audio notifikasi kustom.
Jika file belum diunggah, sistem secara otomatis menggunakan nada synthesizer Web Audio API bawaan.

## Nama File yang Didukung

Anda cukup meletakkan file audio ke dalam folder ini dengan salah satu nama berikut:

1. **Notifikasi Masuk (Admin ke Mahasiswa):**
   - `notification.mp3` (paling direkomendasikan)
   - `notification.wav`
   - `notification.ogg`

2. **Peringatan 5 Menit Terakhir:**
   - `warning.mp3`
   - `warning.wav`
   - `warning.ogg`

3. **Alarm Waktu Habis (Sesi Selesai):**
   - `urgent.mp3`
   - `urgent.wav`
   - `urgent.ogg`
   - `alarm.mp3`

## Cara Menguji Suara

Setelah meletakkan file audio di folder ini:
1. Buka browser pada portal mahasiswa (http://localhost:3000/portal).
2. Tekan tombol `F12` untuk membuka Console Developer Tools.
3. Jalankan perintah uji:
   - `testNotificationSound('notification')` untuk notifikasi pesan masuk.
   - `testNotificationSound('warning')` untuk peringatan 5 menit.
   - `testNotificationSound('urgent')` untuk alarm waktu habis.
4. Anda juga dapat menggunakan tombol Suara Aktif / Uji Nada pada bilah countdown sesi aktif di portal mahasiswa.

Jika Anda baru saja mengganti file audio dan ingin browser mengecek ulang tanpa refresh total, jalankan:
`resetSoundCache()` di Console browser.
