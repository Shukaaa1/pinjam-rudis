/**
 * Shared Application Logic & State Management
 * Peminjaman Ruang Diskusi Civitas PKN STAN
 */

// Master Data Ruang Diskusi
const MASTER_ROOMS = [
    { id: 'RD-01', name: 'Ruang Diskusi 1', cap: 8, desc: 'Maks. 8 Orang' },
    { id: 'RD-02', name: 'Ruang Diskusi 2', cap: 8, desc: 'Maks. 8 Orang' },
    { id: 'RD-03', name: 'Ruang Diskusi 3', cap: 8, desc: 'Maks. 8 Orang' },
    { id: 'RD-04', name: 'Ruang Diskusi 4', cap: 8, desc: 'Maks. 8 Orang' },
    { id: 'RD-05', name: 'Ruang Diskusi 5', cap: 10, desc: 'Maks. 10 Orang' },
    { id: 'RD-06', name: 'Ruang Diskusi 6', cap: 10, desc: 'Maks. 10 Orang' },
    { id: 'RD-07', name: 'Ruang Diskusi 7 (Lesehan)', cap: 20, desc: 'Maks. 20 Orang' },
    { id: 'RD-08', name: 'Ruang Diskusi 8', cap: 8, desc: 'Maks. 8 Orang' },
    { id: 'RD-09', name: 'Ruang Diskusi 9', cap: 8, desc: 'Maks. 8 Orang' }
];

const TIME_SLOTS = ['08.00', '09.00', '10.00', '11.00', '13.00', '14.00', '15.00', '16.00'];

// User Logged In Mock Data
const CURRENT_USER = {
    nama: 'RADEN MAS GALIH CHONDRO KIRONO MANGUN KUSUMO',
    nim: '4131230001',
    email: 'radenmas_4131230001@pknstan.ac.id',
    prodi: 'Sarjana Terapan Manajemen Keuangan Dinasti',
    kelas: '6 Sisfo 5',
    hp: '081234567890'
};

// Initial Seed Data for Booking Transactions
const SEED_BOOKINGS = [
    {
        id: 'BK-1001',
        nama: 'Ahmad Fauzi',
        nim: '2301100234',
        prodi: 'D III Pajak',
        kelas: '3-02',
        hp: '081987654321',
        roomId: 'RD-01',
        roomName: 'Ruang Diskusi 1',
        date: getTodayDateString(),
        slot: '09.00',
        durasi: 2,
        jumlah: 5,
        keperluan: 'Mentoring Pajak Penghasilan',
        status: 'Sedang Digunakan', // Menunggu Kunci, Sedang Digunakan, Selesai, Dibatalkan, Gugur (>15m)
        ktmVerified: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'BK-1002',
        nama: 'Siti Rahmawati',
        nim: '2301100551',
        prodi: 'D III Akuntansi',
        kelas: '2-05',
        hp: '085211223344',
        roomId: 'RD-05',
        roomName: 'Ruang Diskusi 5',
        date: getTodayDateString(),
        slot: '10.00',
        durasi: 1,
        jumlah: 6,
        keperluan: 'Diskusi Kelompok Audit',
        status: 'Menunggu Kunci',
        ktmVerified: false,
        createdAt: new Date().toISOString()
    }
];

// Helper Date string YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Helper to parse date (YYYY-MM-DD) and slot (HH.MM) into Date object
function getSlotDateTime(dateStr, slotStr) {
    if (!dateStr || !slotStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const timeParts = slotStr.replace('.', ':').split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1] || '0', 10);
    
    return new Date(year, month, day, hour, minute, 0, 0);
}

// Check and auto-expire bookings that exceeded 15-minute tolerance without key pickup
function checkAutoExpireBookings(notify = false) {
    const saved = localStorage.getItem('pinjam_rudis_bookings');
    if (!saved) return false;
    
    let bookings;
    try {
        bookings = JSON.parse(saved);
    } catch (e) {
        return false;
    }
    
    if (!Array.isArray(bookings) || bookings.length === 0) return false;

    const now = new Date();
    const GRACE_PERIOD_MS = 15 * 60 * 1000; // Toleransi 15 menit
    let changed = false;
    let expiredCount = 0;

    bookings.forEach(b => {
        if (b.status === 'Menunggu Kunci') {
            const startDateTime = getSlotDateTime(b.date, b.slot);
            if (startDateTime) {
                const deadline = new Date(startDateTime.getTime() + GRACE_PERIOD_MS);
                if (now > deadline) {
                    b.status = 'Gugur (>15m)';
                    b.gugurReason = 'Otomatis gugur oleh sistem: Kunci tidak diambil dalam batas toleransi 15 menit.';
                    b.gugurAt = now.toISOString();
                    changed = true;
                    expiredCount++;
                }
            }
        }
    });

    if (changed) {
        localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
        if (typeof renderMatrixGrid === 'function') renderMatrixGrid();
        if (typeof renderMyBookings === 'function') renderMyBookings();
        if (typeof renderAdminTable === 'function') renderAdminTable();
        if (typeof renderAdminRoomGrid === 'function') renderAdminRoomGrid();
        window.dispatchEvent(new Event('storage'));
        
        if (notify && expiredCount > 0) {
            console.log(`[Auto-Expire] ${expiredCount} pemesanan otomatis digugurkan karena lewat 15 menit.`);
        }
        return true;
    }
    return false;
}

// Manual trigger helper for testing / admin button
function triggerManualExpiryCheck() {
    const updated = checkAutoExpireBookings(true);
    if (updated) {
        alert('Pengecekan selesai: Pemesanan yang melewati batas toleransi 15 menit berhasil digugurkan secara otomatis.');
    } else {
        alert('Pengecekan selesai: Tidak ada pemesanan yang melewati batas toleransi 15 menit saat ini.');
    }
}

// Load Bookings from localStorage or Seed with real-time auto-expiry check
function getBookings() {
    const saved = localStorage.getItem('pinjam_rudis_bookings');
    let bookings;
    if (!saved) {
        bookings = SEED_BOOKINGS;
        localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    } else {
        try {
            bookings = JSON.parse(saved);
        } catch (e) {
            bookings = SEED_BOOKINGS;
        }
    }

    // Auto-check inline to ensure returned bookings always reflect 15-minute tolerance
    const now = new Date();
    const GRACE_PERIOD_MS = 15 * 60 * 1000;
    let changed = false;
    bookings.forEach(b => {
        if (b.status === 'Menunggu Kunci') {
            const startDateTime = getSlotDateTime(b.date, b.slot);
            if (startDateTime) {
                const deadline = new Date(startDateTime.getTime() + GRACE_PERIOD_MS);
                if (now > deadline) {
                    b.status = 'Gugur (>15m)';
                    b.gugurReason = 'Otomatis gugur oleh sistem: Kunci tidak diambil dalam batas toleransi 15 menit.';
                    b.gugurAt = now.toISOString();
                    changed = true;
                }
            }
        }
    });

    if (changed) {
        localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    }

    return bookings;
}

// Save Bookings to localStorage and Dispatch Event
function saveBookings(bookings) {
    localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    window.dispatchEvent(new Event('storage'));
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Run initial auto-expire check
    checkAutoExpireBookings(false);

    // Set default date picker to today
    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }

    populateRoomDropdown();
    renderMatrixGrid();
    renderMyBookings();
    validateTimeSlotConstraints();

    // Periodic auto-expiry check every 10 seconds
    setInterval(() => {
        checkAutoExpireBookings(true);
    }, 10000);

    // Auto sync when storage changes (Cross-Tab Live Sync)
    window.addEventListener('storage', () => {
        renderMatrixGrid();
        renderMyBookings();
        if (typeof renderAdminTable === 'function') renderAdminTable();
        if (typeof renderAdminRoomGrid === 'function') renderAdminRoomGrid();
    });
});

// Populate Room Select Dropdown
function populateRoomDropdown() {
    const roomSelect = document.getElementById('input-room');
    if (!roomSelect) return;

    let optionsHtml = '';
    MASTER_ROOMS.forEach(room => {
        optionsHtml += `<option value="${room.id}">${room.name} (${room.desc})</option>`;
    });
    roomSelect.innerHTML = optionsHtml;
}

// Render Matrix Grid Availability (Clean Gantt Chart View without + buttons)
function renderMatrixGrid() {
    const gridBody = document.getElementById('matrix-grid-body');
    if (!gridBody) return;

    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    const bookings = getBookings();

    const selectedRoomId = document.getElementById('input-room')?.value || MASTER_ROOMS[0].id;
    const selectedSlot = document.getElementById('input-slot')?.value || '08.00';

    let html = '';
    MASTER_ROOMS.forEach(room => {
        html += `<tr>`;
        html += `<td class="room-label">
                    <div><strong>${room.name}</strong></div>
                    <small style="color:#6c757d;">${room.desc}</small>
                 </td>`;

        TIME_SLOTS.forEach((slot) => {
            // Check if active booking exists for this room, date, and slot
            const activeBooking = bookings.find(b =>
                b.roomId === room.id &&
                b.date === filterDate &&
                isSlotOccupied(b.slot, b.durasi, slot) &&
                ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)
            );

            if (activeBooking) {
                const isStartSlot = activeBooking.slot === slot;
                const isBooked = activeBooking.status === 'Sedang Digunakan';
                const cellClass = isBooked ? 'gantt-cell-booked' : 'gantt-cell-pending';
                const icon = isBooked ? 'fa-lock' : 'fa-clock';
                const label = isBooked ? 'Terpakai' : 'Dipesan';

                if (isStartSlot) {
                    html += `<td class="${cellClass}" title="${label} oleh ${activeBooking.nama} (${activeBooking.slot} - ${activeBooking.durasi} Jam)">
                                &nbsp;
                             </td>`;
                } else {
                    html += `<td class="${cellClass}" style="border-left:none;" title="Lanjutan ${label.toLowerCase()} oleh ${activeBooking.nama}">
                                &nbsp;
                             </td>`;
                }
            } else {
                const isSelected = (room.id === selectedRoomId && slot === selectedSlot);
                const activeClass = isSelected ? 'gantt-available-cell-selected' : '';

                html += `<td class="gantt-available-cell ${activeClass}" 
                             title="Tersedia - Klik untuk pilih ${room.name} Jam ${slot}"
                             onclick="selectSlotFromGrid('${room.id}', '${slot}')"
                             style="text-align: center; vertical-align: middle;">
                             <span class="gantt-add-btn"><i class="fa fa-plus"></i> Pesan</span>
                         </td>`;
            }

            if (slot === '11.00') {
                html += `<td class="gantt-break-cell" title="12.00 - 13.00 Jam Istirahat & Sterilisasi Ruangan">
                            <i class="fa fa-utensils"></i> Istirahat
                         </td>`;
            }
        });

        html += `</tr>`;
    });

    gridBody.innerHTML = html;
}

// Select slot directly by clicking a clean cell in Gantt table
function selectSlotFromGrid(roomId, slot) {
    const roomSelect = document.getElementById('input-room');
    const slotSelect = document.getElementById('input-slot');

    if (roomSelect) roomSelect.value = roomId;
    if (slotSelect) slotSelect.value = slot;

    handleRoomSelectChange();
    handleTimeSlotSelectChange();
    renderMatrixGrid();

    // Show the booking modal
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function handleRoomSelectChange() {
    const roomId = document.getElementById('input-room')?.value;
    const room = MASTER_ROOMS.find(r => r.id === roomId);
    if (room) {
        document.getElementById('room-cap-hint').innerText = `Maksimal kapasitas ${room.name}: ${room.cap} orang (Min 3 orang).`;
    }
    renderMatrixGrid();
}

function handleTimeSlotSelectChange() {
    validateTimeSlotConstraints();
    renderMatrixGrid();
}

// Dynamic Time Constraints Validation (11.00 & 15.00 limit to 1 hour max)
function validateTimeSlotConstraints() {
    const slot = document.getElementById('input-slot')?.value;
    const durasiSelect = document.getElementById('input-durasi');
    if (!durasiSelect) return;

    const opt2 = durasiSelect.querySelector('option[value="2"]');
    const opt3 = durasiSelect.querySelector('option[value="3"]');
    const notice = document.getElementById('time-constraint-notice');

    if (slot === '11.00' || slot === '15.00') {
        durasiSelect.value = "1";
        if (opt2) opt2.disabled = true;
        if (opt3) opt3.disabled = true;

        const hintText = slot === '11.00'
            ? '⏰ Catatan: Pada slot jam 11.00, durasi maksimal hanya 1 jam karena pukul 12.00 - 13.00 adalah jam istirahat.'
            : '⏰ Catatan: Pada slot jam 15.00, durasi maksimal hanya 1 jam karena ruang diskusi tutup pada pukul 16.00.';

        if (notice) {
            notice.innerText = hintText;
            notice.classList.remove('hidden');
        }
    } else {
        if (opt2) opt2.disabled = false;
        if (opt3) opt3.disabled = false;
        if (notice) notice.classList.add('hidden');
    }

    handleDurasiChange();
}

// Helper check if slot is within duration
function isSlotOccupied(startSlot, durasiHours, targetSlot) {
    const startIndex = TIME_SLOTS.indexOf(startSlot);
    const targetIndex = TIME_SLOTS.indexOf(targetSlot);
    if (startIndex === -1 || targetIndex === -1) return false;
    return targetIndex >= startIndex && targetIndex < (startIndex + durasiHours);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function handleDurasiChange() {
    const durasi = document.getElementById('input-durasi').value;
    const docGroup = document.getElementById('doc-upload-group');
    if (durasi === '3') {
        docGroup.classList.remove('hidden');
    } else {
        docGroup.classList.add('hidden');
    }
}

/// Submit New Booking Form
function handleFormSubmit(e) {
    e.preventDefault();

    const roomId = document.getElementById('input-room').value;
    const slot = document.getElementById('input-slot').value;
    const room = MASTER_ROOMS.find(r => r.id === roomId);
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();

    const hp = document.getElementById('input-hp').value;
    const jumlah = parseInt(document.getElementById('input-jumlah').value);
    const durasi = parseInt(document.getElementById('input-durasi').value);
    const keperluan = document.getElementById('input-keperluan').value;

    if (!room) {
        alert('Ruangan tidak valid.');
        return;
    }

    if (jumlah < 3) {
        alert('Sesuai aturan, peminjaman minimal 3 orang per kelompok.');
        return;
    }
    if (jumlah > room.cap) {
        alert(`Jumlah anggota melebihi kapasitas ruangan (Maksimal ${room.cap} orang).`);
        return;
    }

    const bookings = getBookings();

    // Check overlap for target slot & duration
    const isOverlap = bookings.some(b =>
        b.roomId === roomId &&
        b.date === filterDate &&
        ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status) &&
        TIME_SLOTS.some(s => isSlotOccupied(b.slot, b.durasi, s) && isSlotOccupied(slot, durasi, s))
    );

    if (isOverlap) {
        alert('Maaf, slot waktu yang Anda pilih bertabrakan dengan peminjaman lain pada ruangan ini.');
        return;
    }

    const newBooking = {
        id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
        nama: CURRENT_USER.nama,
        nim: CURRENT_USER.nim,
        prodi: CURRENT_USER.prodi,
        kelas: CURRENT_USER.kelas,
        hp: hp,
        roomId: room.id,
        roomName: room.name,
        date: filterDate,
        slot: slot,
        durasi: durasi,
        jumlah: jumlah,
        keperluan: keperluan,
        status: 'Menunggu Kunci',
        ktmVerified: false,
        createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    saveBookings(bookings);

    alert(`🎉 Pemesanan Berhasil! Silakan ambil kunci di Resepsionis Lt. 1 dengan menyerahkan KTM 5 menit sebelum jam ${slot}.`);

    closeModal('booking-modal');
    renderMatrixGrid();
    renderMyBookings();
}

// Render Student History
function renderMyBookings() {
    const body = document.getElementById('my-bookings-body');
    if (!body) return;

    const bookings = getBookings().filter(b => b.nim === CURRENT_USER.nim);

    if (bookings.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">Belum ada riwayat peminjaman.</td></tr>`;
        return;
    }

    const now = new Date();
    const GRACE_PERIOD_MS = 15 * 60 * 1000;

    let html = '';
    bookings.forEach(b => {
        let badgeClass = 'badge-secondary';
        let statusSubtext = '';

        if (b.status === 'Menunggu Kunci') {
            badgeClass = 'badge-warning';
            const startDateTime = getSlotDateTime(b.date, b.slot);
            if (startDateTime) {
                const deadline = new Date(startDateTime.getTime() + GRACE_PERIOD_MS);
                if (now >= startDateTime && now <= deadline) {
                    const remainingMin = Math.max(1, Math.ceil((deadline - now) / 60000));
                    statusSubtext = `<br><small style="color:#b58105; font-weight:600;"><i class="fa fa-stopwatch"></i> Ambil kunci s.d ${deadline.toTimeString().substring(0, 5)} (sisa ${remainingMin}m)</small>`;
                } else if (now < startDateTime) {
                    statusSubtext = `<br><small style="color:#6c757d;">Ambil kunci 5 menit sebelum ${b.slot}</small>`;
                }
            }
        } else if (b.status === 'Sedang Digunakan') {
            badgeClass = 'badge-success';
        } else if (b.status === 'Selesai') {
            badgeClass = 'badge-info';
        } else if (b.status === 'Gugur (>15m)') {
            badgeClass = 'badge-danger';
            statusSubtext = `<br><small style="color:#dc3545;">Gugur: kunci tidak diambil >15 menit</small>`;
        } else if (b.status === 'Dibatalkan') {
            badgeClass = 'badge-danger';
        }

        let cancelBtn = '';
        if (['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)) {
            cancelBtn = `<button class="btn btn-danger btn-sm" onclick="cancelBooking('${b.id}')"><i class="fa fa-times"></i> Batalkan</button>`;
        }

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td>${b.roomName}</td>
                    <td>${b.date}<br><small style="color:#6c757d;">Jam ${b.slot}</small></td>
                    <td>${b.durasi} Jam</td>
                    <td>${b.keperluan}</td>
                    <td><span class="badge ${badgeClass}">${b.status}</span>${statusSubtext}</td>
                    <td>${cancelBtn}</td>
                 </tr>`;
    });

    body.innerHTML = html;
}

// Cancel Booking Action
function cancelBooking(bookingId) {
    if (!confirm('Apakah Anda yakin ingin membatalkan peminjaman ruangan ini?')) return;

    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        target.status = 'Dibatalkan';
        saveBookings(bookings);
        renderMatrixGrid();
        renderMyBookings();
        alert('Peminjaman berhasil dibatalkan. Ruangan kembali tersedia untuk pemesan lain.');
    }
}

// --- ADMIN / RESEPSIONIS DASHBOARD FUNCTIONS --- //

function renderAdminTable() {
    const body = document.getElementById('admin-table-body');
    if (!body) return;

    const query = document.getElementById('admin-search')?.value.toLowerCase() || '';
    const bookings = getBookings();

    const filtered = bookings.filter(b =>
        b.nama.toLowerCase().includes(query) ||
        b.nim.toLowerCase().includes(query) ||
        b.roomName.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query)
    );

    // Update Stats
    document.getElementById('stat-total').innerText = bookings.length;
    document.getElementById('stat-pending').innerText = bookings.filter(b => b.status === 'Menunggu Kunci').length;
    document.getElementById('stat-active').innerText = bookings.filter(b => b.status === 'Sedang Digunakan').length;
    document.getElementById('stat-cancelled').innerText = bookings.filter(b => ['Dibatalkan', 'Gugur (>15m)'].includes(b.status)).length;

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">Tidak ada data peminjaman ditemukan.</td></tr>`;
        return;
    }

    const now = new Date();
    const GRACE_PERIOD_MS = 15 * 60 * 1000;

    let html = '';
    filtered.forEach(b => {
        let statusBadge = `<span class="badge badge-secondary">${b.status}</span>`;
        if (b.status === 'Menunggu Kunci') {
            const startDateTime = getSlotDateTime(b.date, b.slot);
            let toleranceNote = '';
            if (startDateTime) {
                const deadline = new Date(startDateTime.getTime() + GRACE_PERIOD_MS);
                if (now >= startDateTime && now <= deadline) {
                    const remainingMin = Math.max(1, Math.ceil((deadline - now) / 60000));
                    toleranceNote = `<br><small style="color:#b58105; font-weight:600;"><i class="fa fa-stopwatch"></i> Toleransi: sisa ${remainingMin} menit</small>`;
                } else if (now < startDateTime) {
                    toleranceNote = `<br><small style="color:#6c757d;">Mulai jam ${b.slot}</small>`;
                }
            }
            statusBadge = `<span class="badge badge-warning"><i class="fa fa-clock"></i> Menunggu Kunci</span>${toleranceNote}`;
        } else if (b.status === 'Sedang Digunakan') {
            statusBadge = `<span class="badge badge-success"><i class="fa fa-key"></i> Kunci Diserahkan</span>`;
        } else if (b.status === 'Selesai') {
            statusBadge = `<span class="badge badge-info"><i class="fa fa-check-double"></i> Selesai</span>`;
        } else if (b.status === 'Gugur (>15m)') {
            const reason = b.gugurReason ? `<br><small style="color:#dc3545;">${b.gugurReason}</small>` : `<br><small style="color:#dc3545;">Otomatis dibatalkan (>15m)</small>`;
            statusBadge = `<span class="badge badge-danger"><i class="fa fa-user-slash"></i> Gugur (>15m)</span>${reason}`;
        } else if (b.status === 'Dibatalkan') {
            statusBadge = `<span class="badge badge-danger">${b.status}</span>`;
        }

        let actionBtns = '';
        if (b.status === 'Menunggu Kunci') {
            actionBtns = `
                <button class="btn btn-success btn-sm" onclick="adminHandoverKey('${b.id}')"><i class="fa fa-key"></i> Serahkan Kunci</button>
                <button class="btn btn-danger btn-sm" onclick="adminMarkGugur('${b.id}')" title="Terlambat >15 Menit"><i class="fa fa-user-slash"></i> Gugurkan</button>
            `;
        } else if (b.status === 'Sedang Digunakan') {
            actionBtns = `
                <button class="btn btn-primary btn-sm" onclick="adminReturnKey('${b.id}')"><i class="fa fa-box"></i> Terima Kunci & Selesai</button>
            `;
        }

        const ktmCheckbox = `<label style="font-size:0.8rem; cursor:pointer;">
                                <input type="checkbox" ${b.ktmVerified ? 'checked' : ''} onchange="toggleKtmVerification('${b.id}', this.checked)"> KTM Diverifikasi
                             </label>`;

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td><strong>${b.nama}</strong><br><small style="color:#6c757d;">NIM: ${b.nim} | HP: ${b.hp}</small></td>
                    <td>${b.prodi}<br><small style="color:#6c757d;">Kelas: ${b.kelas}</small></td>
                    <td><strong>${b.roomName}</strong><br><small style="color:#6c757d;">Tgl: ${b.date} | Jam ${b.slot} (${b.durasi} Jam)</small></td>
                    <td>${ktmCheckbox}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:center;">${actionBtns}</td>
                 </tr>`;
    });

    body.innerHTML = html;
}

function toggleKtmVerification(bookingId, isChecked) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        target.ktmVerified = isChecked;
        saveBookings(bookings);
    }
}

function adminHandoverKey(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        if (!target.ktmVerified) {
            if (!confirm('KTM mahasiswa belum dicentang sebagai terverifikasi. Apakah Anda yakin ingin tetap menyerahkan kunci?')) {
                return;
            }
            target.ktmVerified = true;
        }
        target.status = 'Sedang Digunakan';
        saveBookings(bookings);
        renderAdminTable();
        renderAdminRoomGrid();
        alert(`Kunci untuk ${target.roomName} telah diserahkan kepada ${target.nama}. Status diperbarui menjadi "Sedang Digunakan".`);
    }
}

function adminReturnKey(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        target.status = 'Selesai';
        saveBookings(bookings);
        renderAdminTable();
        renderAdminRoomGrid();
        alert(`Kunci ${target.roomName} telah dikembalikan. KTM dapat dikembalikan ke mahasiswa. Ruangan kembali Kosong.`);
    }
}

function adminMarkGugur(bookingId) {
    if (!confirm('Gugurkan peminjaman ini karena pemesan terlambat hadir >15 menit dari jadwal?')) return;

    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        target.status = 'Gugur (>15m)';
        target.gugurReason = 'Digugurkan manual oleh petugas resepsionis (terlambat >15 menit).';
        target.gugurAt = new Date().toISOString();
        saveBookings(bookings);
        renderAdminTable();
        renderAdminRoomGrid();
        alert(`Peminjaman ${target.id} digugurkan. Ruangan langsung dialihkan menjadi tersedia.`);
    }
}

function renderAdminRoomGrid() {
    const gridContainer = document.getElementById('admin-room-grid');
    if (!gridContainer) return;

    const bookings = getBookings();
    const today = getTodayDateString();

    let html = '';
    MASTER_ROOMS.forEach(room => {
        // Active booking for this room today
        const active = bookings.find(b => b.roomId === room.id && b.date === today && ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status));

        let cardBg = '#f8f9fa';
        let border = '1px solid #ced4da';
        let statusText = '<span style="color:#28a745; font-weight:bold;"><i class="fa fa-check-circle"></i> Kosong / Tersedia</span>';
        let info = '-';

        if (active) {
            if (active.status === 'Sedang Digunakan') {
                cardBg = '#fff5f5';
                border = '1px solid #f5c2c7';
                statusText = '<span style="color:#d92550; font-weight:bold;"><i class="fa fa-door-closed"></i> Terpakai</span>';
                info = `Digunakan oleh: <strong>${active.nama}</strong> (${active.slot} - ${active.durasi} Jam)`;
            } else {
                cardBg = '#fffdf0';
                border = '1px solid #ffecb5';
                statusText = '<span style="color:#b58105; font-weight:bold;"><i class="fa fa-clock"></i> Dipesan (Menunggu Kunci)</span>';
                info = `Pemesan: <strong>${active.nama}</strong> (${active.slot})`;
            }
        }

        html += `
            <div style="background:${cardBg}; border:${border}; padding:15px; border-radius:6px;">
                <div style="display:flex; justify-shadow:space-between; justify-content:space-between; align-items:center;">
                    <h5 style="margin:0; font-size:1rem;">${room.name}</h5>
                    <small style="color:#888;">${room.desc}</small>
                </div>
                <div style="margin-top:10px; font-size:0.85rem;">
                    Status: ${statusText}
                </div>
                <div style="margin-top:5px; font-size:0.8rem; color:#555;">
                    ${info}
                </div>
            </div>
        `;
    });

    gridContainer.innerHTML = html;
}
