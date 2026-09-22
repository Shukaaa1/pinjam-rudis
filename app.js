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

const TIME_SLOTS = ['08.00', '09.00', '10.00', '11.00', '13.00', '14.00', '15.00'];

// User Logged In Mock Data (Dynamically updated from login session)
let CURRENT_USER = {
    nama: 'VERI GALIH SETIYO AJI',
    nim: '4131230098',
    email: 'galih_4131230098@pknstan.ac.id',
    prodi: 'Sarjana Terapan Akuntansi Sektor Publik',
    kelas: '6 Sisfo 5',
    hp: '081234567890'
};

function initCurrentUser() {
    try {
        const raw = sessionStorage.getItem('current_civitas_user') || localStorage.getItem('current_civitas_user');
        if (raw) {
            const parsed = JSON.parse(raw);
            Object.assign(CURRENT_USER, parsed);
        }
    } catch (e) {}
}
initCurrentUser();

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
    },
    {
        id: 'BK-2344',
        nama: 'VERI GALIH SETIYO AJI',
        nim: '4131230098',
        prodi: 'Sarjana Terapan Akuntansi Sektor Publik',
        kelas: '6 Sisfo 5',
        hp: '081234567890',
        roomId: 'RD-03',
        roomName: 'Ruang Diskusi 3',
        date: getTodayDateString(),
        slot: '14.00',
        durasi: 2,
        jumlah: 4,
        keperluan: 'Diskusi Proyek Sistem Informasi Akuntansi',
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

const MIN_REMAINING_MINUTES = 20;

// Helper to calculate absolute end Date object for a booking slot
function getSlotEndDateTime(dateStr, slotStr, durasiHours) {
    const startDateTime = getSlotDateTime(dateStr, slotStr);
    if (!startDateTime) return null;
    const durasi = parseInt(durasiHours || 1, 10);
    return new Date(startDateTime.getTime() + durasi * 60 * 60 * 1000);
}

// Helper to get remaining minutes until the end of a booking slot
function getSlotRemainingMinutes(dateStr, slotStr, durasiHours = 1) {
    if (!dateStr || !slotStr) return 0;
    const todayStr = getTodayDateString();
    if (dateStr < todayStr) return 0;
    if (dateStr > todayStr) return 9999;

    const endDt = getSlotEndDateTime(dateStr, slotStr, durasiHours);
    if (!endDt) return 0;
    const now = new Date();
    return Math.floor((endDt.getTime() - now.getTime()) / 60000);
}

// Helper to check if a specific date and slot have already passed relative to current time
// Rule: Ongoing slots remain available if there is still enough time (minimal 20 menit)
function isSlotInPast(dateStr, slotStr) {
    if (!dateStr || !slotStr) return false;
    const todayStr = getTodayDateString();
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    const now = new Date();
    const slotEnd1h = getSlotEndDateTime(dateStr, slotStr, 1);
    if (!slotEnd1h) return false;

    // Slot 11.00 (ends 12.00) and 15.00 (ends 16.00) are limited to 1 hour max.
    // If remaining time is < 20 minutes before break/close (i.e. past 11.40 or 15.40), slot is in past.
    if (slotStr === '11.00' || slotStr === '15.00') {
        const remainingMin = Math.floor((slotEnd1h.getTime() - now.getTime()) / 60000);
        return remainingMin < MIN_REMAINING_MINUTES;
    }

    // For other hourly slots (e.g. 10.00):
    // Once the 1-hour window has completely elapsed (now >= 11.00), slot is in past.
    if (now.getTime() >= slotEnd1h.getTime()) {
        return true;
    }

    // During the slot hour (e.g. 10.00 - 10.59), the slot is NOT in past.
    return false;
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
                const baseTime = b.createdAt ? Math.max(startDateTime.getTime(), new Date(b.createdAt).getTime()) : startDateTime.getTime();
                const deadline = new Date(baseTime + GRACE_PERIOD_MS);
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
                const baseTime = b.createdAt ? Math.max(startDateTime.getTime(), new Date(b.createdAt).getTime()) : startDateTime.getTime();
                const deadline = new Date(baseTime + GRACE_PERIOD_MS);
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

// Socket.IO Realtime Client Setup
let socket = null;
if (typeof io !== 'undefined') {
    socket = io();
    socket.on('connect', () => {
        updateRealtimeStatus(true);
        console.log('[Realtime] Terhubung ke server Socket.IO:', socket.id);
    });

    socket.on('disconnect', () => {
        updateRealtimeStatus(false);
        console.warn('[Realtime] Terputus dari server Socket.IO');
    });

    socket.on('bookings:sync', (serverBookings) => {
        if (Array.isArray(serverBookings)) {
            localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(serverBookings));
            triggerAllUIRenders();
        }
    });
}

function updateRealtimeStatus(connected) {
    const badge = document.getElementById('realtime-status-badge');
    const text = document.getElementById('realtime-status-text');
    if (!badge || !text) return;

    if (connected) {
        badge.classList.remove('offline', 'disconnected');
        text.textContent = 'Realtime Terhubung';
    } else {
        badge.classList.add('offline', 'disconnected');
        text.textContent = 'Mode Offline (Lokal)';
    }
}

function triggerAllUIRenders() {
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    if (typeof updateSlotDropdownOptions === 'function') updateSlotDropdownOptions(filterDate);
    if (typeof renderMatrixGrid === 'function') renderMatrixGrid();
    if (typeof renderMyBookings === 'function') renderMyBookings();
    if (typeof updateActiveSessionBanner === 'function') updateActiveSessionBanner();
    if (typeof renderAdminTable === 'function') renderAdminTable();
    if (typeof renderAdminRoomGrid === 'function') renderAdminRoomGrid();
    if (typeof validateTimeSlotConstraints === 'function') validateTimeSlotConstraints();
}

// Fetch fresh bookings from server
async function fetchBookingsFromServer() {
    try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(data));
                triggerAllUIRenders();
            }
        }
    } catch (err) {
        console.log('[Offline Fallback] Server belum aktif, menggunakan data browser lokal.');
    }
}

// Save Bookings to localStorage, Server API, and Dispatch Realtime Event
function saveBookings(bookings) {
    localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    window.dispatchEvent(new Event('storage'));

    // Emit via Socket.IO if connected
    if (socket && socket.connected) {
        socket.emit('updateBookings', bookings);
    } else {
        // Fallback HTTP POST
        fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookings)
        }).catch(err => {
            console.warn('[Storage] Gagal push ke server HTTP:', err);
        });
    }
}

// Update Slot Dropdown Options based on selected date (disable past slots)
function updateSlotDropdownOptions(selectedDate) {
    const slotSelect = document.getElementById('input-slot');
    if (!slotSelect) return;

    const dateStr = selectedDate || document.getElementById('filter-date')?.value || getTodayDateString();
    let firstAvailableValue = null;

    Array.from(slotSelect.options).forEach(opt => {
        const slotVal = opt.value;
        const past = isSlotInPast(dateStr, slotVal);
        if (past) {
            opt.disabled = true;
            opt.textContent = `${slotVal} (Waktu Lewat)`;
        } else {
            opt.disabled = false;
            const startDt = getSlotDateTime(dateStr, slotVal);
            const now = new Date();
            const isOngoing = (dateStr === getTodayDateString() && startDt && now >= startDt);
            opt.textContent = isOngoing ? `${slotVal} (Jam Berjalan)` : slotVal;
            if (!firstAvailableValue) {
                firstAvailableValue = slotVal;
            }
        }
    });

    // If current selected option is disabled, switch to first available option
    if (slotSelect.selectedOptions[0]?.disabled && firstAvailableValue) {
        slotSelect.value = firstAvailableValue;
    }
}

// Handler when filter date changes
function handleFilterDateChange() {
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    updateSlotDropdownOptions(filterDate);
    renderMatrixGrid();
    validateTimeSlotConstraints();
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCurrentUser();

    // Fetch latest bookings from server immediately
    fetchBookingsFromServer();

    // Run initial auto-expire check
    checkAutoExpireBookings(false);

    // Set default date picker to today and min to today
    const dateInput = document.getElementById('filter-date');
    const todayStr = getTodayDateString();
    if (dateInput) {
        dateInput.value = todayStr;
        dateInput.min = todayStr;
    }

    populateRoomDropdown();
    updateSlotDropdownOptions(todayStr);
    renderMatrixGrid();
    renderMyBookings();
    validateTimeSlotConstraints();
    updateActiveSessionBanner();

    // 1-second interval for active session live countdown
    setInterval(() => {
        updateActiveSessionBanner();
    }, 1000);

    // Periodic auto-expiry check & slot refresh every 10 seconds
    setInterval(() => {
        checkAutoExpireBookings(true);
        const currentDate = document.getElementById('filter-date')?.value || getTodayDateString();
        updateSlotDropdownOptions(currentDate);
        renderMatrixGrid();
    }, 10000);

    // Auto sync when storage changes (Cross-Tab Live Sync)
    window.addEventListener('storage', () => {
        triggerAllUIRenders();
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
                const isMine = (activeBooking.nim === CURRENT_USER.nim);
                const cellClass = isBooked ? 'gantt-cell-booked' : 'gantt-cell-pending';
                const label = isBooked ? 'Terpakai' : 'Dipesan';
                const userTitle = isMine ? `Pesanan Anda (${activeBooking.status}) - Klik untuk kelola / batalkan` : `${label} oleh ${activeBooking.nama} (${activeBooking.slot} - ${activeBooking.durasi} Jam)`;
                const clickAttr = isMine ? `onclick="handleMyBookingClick('${activeBooking.id}')" style="cursor:pointer;"` : '';
                const myTag = isMine && isStartSlot ? `<span class="badge" style="background:#0f2b48; color:#fff; font-size:0.68rem; padding:2px 5px; border-radius:3px; display:inline-block;"><i class="fa fa-user"></i> Anda</span>` : '&nbsp;';

                if (isStartSlot) {
                    html += `<td class="${cellClass}" ${clickAttr} title="${userTitle}">
                                ${myTag}
                             </td>`;
                } else {
                    html += `<td class="${cellClass}" style="border-left:none;" ${clickAttr} title="Lanjutan ${userTitle}">
                                &nbsp;
                             </td>`;
                }
            } else if (isSlotInPast(filterDate, slot)) {
                html += `<td class="gantt-cell-past" 
                             title="Waktu peminjaman telah terlewat (Jam ${slot}). Tidak dapat dipesan.">
                             <span class="gantt-past-badge"><i class="fa fa-ban"></i> Lewat</span>
                         </td>`;
            } else {
                const isSelected = (room.id === selectedRoomId && slot === selectedSlot);
                const activeClass = isSelected ? 'gantt-available-cell-selected' : '';
                const now = new Date();
                const startDt = getSlotDateTime(filterDate, slot);
                const slotEnd1h = getSlotEndDateTime(filterDate, slot, 1);
                const isOngoing = (filterDate === getTodayDateString() && startDt && now >= startDt && now < slotEnd1h);
                const btnLabel = isOngoing ? 'Sisa Jam' : 'Pesan';
                const btnIcon = isOngoing ? 'fa-hourglass-half' : 'fa-plus';
                const cellTitle = isOngoing
                    ? `Tersedia (Sesi Jam Berjalan) - Klik untuk pilih ${room.name} Jam ${slot} (Min. sisa 20 menit)`
                    : `Tersedia - Klik untuk pilih ${room.name} Jam ${slot}`;

                html += `<td class="gantt-available-cell ${activeClass}" 
                             title="${cellTitle}"
                             onclick="selectSlotFromGrid('${room.id}', '${slot}')"
                             style="text-align: center; vertical-align: middle;">
                             <span class="gantt-add-btn"><i class="fa ${btnIcon}"></i> ${btnLabel}</span>
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
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    if (isSlotInPast(filterDate, slot)) {
        alert(`Slot waktu ${slot} pada tanggal ${filterDate} sudah terlewat dan tidak dapat dipesan.`);
        return;
    }

    const roomSelect = document.getElementById('input-room');
    const slotSelect = document.getElementById('input-slot');

    if (roomSelect) roomSelect.value = roomId;
    if (slotSelect) slotSelect.value = slot;

    updateSlotDropdownOptions(filterDate);
    handleRoomSelectChange();
    handleTimeSlotSelectChange();
    renderMatrixGrid();

    // Populate user profile info in form
    const namaEl = document.getElementById('form-nama');
    const nimEl = document.getElementById('form-nim');
    const prodiEl = document.getElementById('form-prodi');
    const kelasEl = document.getElementById('form-kelas');
    if (namaEl) namaEl.textContent = CURRENT_USER.nama;
    if (nimEl) nimEl.textContent = CURRENT_USER.nim;
    if (prodiEl) prodiEl.textContent = CURRENT_USER.prodi;
    if (kelasEl) kelasEl.textContent = CURRENT_USER.kelas;

    // Show the booking modal
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Handle click on user's own booking directly from the grid
function handleMyBookingClick(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const confirmMsg = `Detail Pemesanan Anda:\n\n` +
        `• Kode: ${target.id}\n` +
        `• Ruangan: ${target.roomName}\n` +
        `• Jadwal: ${target.date}, Jam ${target.slot} (${target.durasi} Jam)\n` +
        `• Status: ${target.status}\n\n` +
        `Apakah Anda ingin membatalkan peminjaman ruangan ini?`;

    if (confirm(confirmMsg)) {
        cancelBooking(bookingId);
    }
}
window.handleMyBookingClick = handleMyBookingClick;

function handleRoomSelectChange() {
    const roomId = document.getElementById('input-room')?.value;
    const room = MASTER_ROOMS.find(r => r.id === roomId);
    if (room) {
        document.getElementById('room-cap-hint').innerText = `Maksimal kapasitas ${room.name}: ${room.cap} orang (Min 3 orang).`;
    }
    validateTimeSlotConstraints();
    renderMatrixGrid();
}

function handleTimeSlotSelectChange() {
    validateTimeSlotConstraints();
    renderMatrixGrid();
}

// Dynamic Time Constraints Validation & Live Conflict Feedback
function validateTimeSlotConstraints() {
    const slot = document.getElementById('input-slot')?.value;
    const durasiSelect = document.getElementById('input-durasi');
    const submitBtn = document.getElementById('btn-submit-booking');
    const notice = document.getElementById('time-constraint-notice');
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    const roomId = document.getElementById('input-room')?.value;
    const durasi = parseInt(durasiSelect?.value || '1', 10);
    const room = MASTER_ROOMS.find(r => r.id === roomId);

    if (!durasiSelect) return;

    const opt1 = durasiSelect.querySelector('option[value="1"]');
    const opt2 = durasiSelect.querySelector('option[value="2"]');
    const opt3 = durasiSelect.querySelector('option[value="3"]');

    if (opt1) opt1.disabled = false;

    // Rule: 11.00 & 15.00 limit to 1 hour max
    if (slot === '11.00' || slot === '15.00') {
        durasiSelect.value = "1";
        if (opt2) opt2.disabled = true;
        if (opt3) opt3.disabled = true;
    } else {
        if (opt2) opt2.disabled = false;
        if (opt3) opt3.disabled = false;
    }

    handleDurasiChange();

    let errorMessage = '';
    let warningMessage = '';

    // Constraint 2: Past Time Slot Check
    if (isSlotInPast(filterDate, slot)) {
        errorMessage = `Waktu peminjaman jam ${slot} pada tanggal ${filterDate} sudah terlewat. Silakan pilih waktu yang akan datang.`;
    }

    // Ongoing Slot Rule: Minimum 20 minutes remaining threshold
    const isToday = (filterDate === getTodayDateString());
    const slotStartDt = getSlotDateTime(filterDate, slot);
    const now = new Date();
    const isOngoing = isToday && slotStartDt && (now >= slotStartDt) && (now < getSlotEndDateTime(filterDate, slot, 1));

    if (!errorMessage && isOngoing) {
        const rem1 = getSlotRemainingMinutes(filterDate, slot, 1);
        const rem2 = getSlotRemainingMinutes(filterDate, slot, 2);

        if (rem1 < MIN_REMAINING_MINUTES) {
            // 1 Hour is NOT allowed because remaining time is less than 20 minutes
            if (opt1) opt1.disabled = true;

            if (slot !== '11.00' && slot !== '15.00') {
                if (durasiSelect.value === '1') {
                    durasiSelect.value = '2';
                }
                const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                warningMessage = `Sisa waktu menuju jam 11.00 saat ini (${nowStr}) hanya ${rem1} menit (< 20 menit). Durasi 1 Jam tidak diperbolehkan. Durasi otomatis dialihkan ke 2 Jam (selesai tetap pukul 12.00, sisa waktu efektif ~${rem2} menit).`;
            } else {
                errorMessage = `Sisa waktu untuk slot jam ${slot} hanya tersisa ${rem1} menit (< 20 menit) sebelum jam ${slot === '11.00' ? 'istirahat (12.00)' : 'tutup (16.00)'}. Pemesanan tidak dapat dilakukan.`;
            }
        } else {
            const endHourStr = durasi === 2 ? '12.00' : '11.00';
            const effMin = durasi === 2 ? rem2 : rem1;
            warningMessage = `Pemesanan Sesi Jam Berjalan: Selesai tetap pukul ${endHourStr} (sisa waktu efektif ~${effMin} menit). Pengambilan kunci maksimal 15 menit sejak pemesanan dibuat.`;
        }
    }

    // Constraint 1: Mahasiswa tidak bisa meminjam lebih dari 1 ruangan di waktu yang sama
    if (!errorMessage) {
        const bookings = getBookings();
        const studentConflict = bookings.find(b =>
            b.nim === CURRENT_USER.nim &&
            b.date === filterDate &&
            ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status) &&
            TIME_SLOTS.some(s => isSlotOccupied(b.slot, b.durasi, s) && isSlotOccupied(slot, durasi, s))
        );

        if (studentConflict) {
            errorMessage = `Anda sudah memiliki peminjaman aktif di ${studentConflict.roomName} pada jam ${studentConflict.slot} (${studentConflict.durasi} Jam). Setiap mahasiswa tidak dapat meminjam lebih dari 1 ruangan di waktu bersamaan.`;
        }
    }

    // Room Conflict Check (Another student booked this room at the same time)
    if (!errorMessage && roomId) {
        const bookings = getBookings();
        const roomConflict = bookings.find(b =>
            b.roomId === roomId &&
            b.date === filterDate &&
            ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status) &&
            TIME_SLOTS.some(s => isSlotOccupied(b.slot, b.durasi, s) && isSlotOccupied(slot, durasi, s))
        );
        if (roomConflict) {
            errorMessage = `${room ? room.name : 'Ruangan ini'} sudah dipesan pada slot waktu tersebut (${roomConflict.slot}, ${roomConflict.durasi} Jam). Silakan pilih ruangan atau slot lain.`;
        }
    }

    // Informational note for 11.00 / 15.00
    if (!errorMessage && (slot === '11.00' || slot === '15.00')) {
        warningMessage = slot === '11.00'
            ? 'Catatan: Pada slot jam 11.00, durasi maksimal hanya 1 jam karena pukul 12.00 - 13.00 adalah jam istirahat.'
            : 'Catatan: Pada slot jam 15.00, durasi maksimal hanya 1 jam karena ruang diskusi tutup pada pukul 16.00.';
    }

    if (notice) {
        if (errorMessage) {
            notice.innerHTML = `<i class="fa fa-exclamation-triangle" style="margin-right:6px;"></i> ${errorMessage}`;
            notice.style.background = '#f8d7da';
            notice.style.color = '#721c24';
            notice.style.borderColor = '#f5c6cb';
            notice.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = true;
        } else if (warningMessage) {
            notice.innerHTML = `<i class="fa fa-clock" style="margin-right:6px;"></i> ${warningMessage}`;
            notice.style.background = '#fff3cd';
            notice.style.color = '#856404';
            notice.style.borderColor = '#ffeeba';
            notice.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = false;
        } else {
            notice.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    }
}

// Helper check if slot is within duration
function isSlotOccupied(startSlot, durasiHours, targetSlot) {
    const startIndex = TIME_SLOTS.indexOf(startSlot);
    const targetIndex = TIME_SLOTS.indexOf(targetSlot);
    if (startIndex === -1 || targetIndex === -1) return false;
    return targetIndex >= startIndex && targetIndex < (startIndex + durasiHours);
}

// Switch Tab Function
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    const buttons = document.querySelectorAll('.nav-tabs-custom .tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.remove('hidden');
    }

    buttons.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(tabId)) {
            btn.classList.add('active');
        }
    });

    if (tabId === 'tab-history') {
        renderMyBookings();
    } else if (tabId === 'tab-matrix') {
        renderMatrixGrid();
    }
}
window.switchTab = switchTab;

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
    if (modalId === 'modal-session-ended' && typeof stopExpiredChimeLoop === 'function') {
        stopExpiredChimeLoop();
    }
}

function handleDurasiChange() {
    const durasi = document.getElementById('input-durasi')?.value;
    const docGroup = document.getElementById('doc-upload-group');
    if (docGroup) {
        if (durasi === '3') {
            docGroup.classList.remove('hidden');
        } else {
            docGroup.classList.add('hidden');
        }
    }
}

function handleDurasiSelectChange() {
    handleDurasiChange();
    validateTimeSlotConstraints();
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

    // Constraint 2: Past Time Slot Check
    if (isSlotInPast(filterDate, slot)) {
        alert(`Pemesanan Ditolak: Jam ${slot} pada tanggal ${filterDate} sudah terlewat. Silakan pilih waktu yang akan datang.`);
        return;
    }

    // Constraint: Minimum 20 minutes remaining threshold for ongoing slot booking
    if (filterDate === getTodayDateString()) {
        const remMin = getSlotRemainingMinutes(filterDate, slot, durasi);
        const slotStartDt = getSlotDateTime(filterDate, slot);
        const now = new Date();
        if (slotStartDt && now >= slotStartDt && remMin < MIN_REMAINING_MINUTES) {
            alert(`Pemesanan Ditolak: Sisa waktu sesi hanya tersisa ${remMin} menit (< 20 menit). Sesuai aturan, pemesanan sesi jam berjalan membutuhkan minimal 20 menit sisa waktu efektif. Silakan pilih durasi 2 jam (jika tersedia) atau pilih slot jam berikutnya.`);
            return;
        }
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

    // Constraint 1: Mahasiswa tidak bisa meminjam lebih dari 1 ruangan di waktu yang sama
    const studentConflict = bookings.find(b =>
        b.nim === CURRENT_USER.nim &&
        b.date === filterDate &&
        ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status) &&
        TIME_SLOTS.some(s => isSlotOccupied(b.slot, b.durasi, s) && isSlotOccupied(slot, durasi, s))
    );

    if (studentConflict) {
        alert(`Pemesanan Ditolak:\nAnda sudah memiliki peminjaman aktif untuk ${studentConflict.roomName} pada jam ${studentConflict.slot} (Durasi ${studentConflict.durasi} Jam).\n\nSesuai aturan, setiap mahasiswa tidak diperbolehkan meminjam lebih dari 1 ruangan pada waktu yang bersamaan.`);
        return;
    }

    // Check overlap for target slot & duration on the same room
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
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px 16px; color:#6c757d;">
            <i class="fa fa-folder-open" style="font-size: 2.2rem; margin-bottom: 12px; color:#adb5bd; display:block;"></i>
            Belum ada riwayat peminjaman untuk akun <strong>${CURRENT_USER.nama}</strong> (${CURRENT_USER.nim}).<br>
            <button type="button" class="btn btn-primary btn-sm" onclick="switchTab('tab-matrix')" style="margin-top: 14px; font-weight:600;">
                <i class="fa fa-calendar-plus"></i> Buat Pemesanan Baru
            </button>
        </td></tr>`;
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
                const baseTime = b.createdAt ? Math.max(startDateTime.getTime(), new Date(b.createdAt).getTime()) : startDateTime.getTime();
                const deadline = new Date(baseTime + GRACE_PERIOD_MS);
                if (now >= new Date(baseTime) && now <= deadline) {
                    const remainingMin = Math.max(1, Math.ceil((deadline - now) / 60000));
                    statusSubtext = `<br><small style="color:#b58105; font-weight:600;"><i class="fa fa-stopwatch"></i> Ambil kunci s.d ${deadline.toTimeString().substring(0, 5)} (sisa ${remainingMin}m)</small>`;
                } else if (now < startDateTime) {
                    statusSubtext = `<br><small style="color:#6c757d;">Ambil kunci 5 menit sebelum ${b.slot}</small>`;
                }
            }
        } else if (b.status === 'Sedang Digunakan') {
            badgeClass = 'badge-success';
            statusSubtext = `<br><small style="color:#28a745;"><i class="fa fa-key"></i> Kunci aktif digunakan</small>`;
        } else if (b.status === 'Selesai') {
            badgeClass = 'badge-info';
        } else if (b.status === 'Gugur (>15m)') {
            badgeClass = 'badge-danger';
            statusSubtext = `<br><small style="color:#dc3545;">Gugur: kunci tidak diambil >15 menit</small>`;
        } else if (b.status === 'Dibatalkan') {
            badgeClass = 'badge-danger';
            if (b.cancelledAt) {
                const cancelTime = new Date(b.cancelledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                statusSubtext = `<br><small style="color:#6c757d;">Dibatalkan pukul ${cancelTime}</small>`;
            }
        }

        let cancelBtn = '<span style="color:#adb5bd; font-size:0.85rem;">-</span>';
        if (['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)) {
            cancelBtn = `<button type="button" class="btn btn-danger btn-sm" onclick="cancelBooking('${b.id}')" title="Batalkan Peminjaman Ruangan">
                            <i class="fa fa-times"></i> Batalkan
                         </button>`;
        }

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td><strong>${b.roomName}</strong></td>
                    <td>${b.date}<br><small style="color:#6c757d;">Jam ${b.slot}</small></td>
                    <td>${b.durasi} Jam</td>
                    <td>${b.keperluan || '-'}</td>
                    <td><span class="badge ${badgeClass}">${b.status}</span>${statusSubtext}</td>
                    <td style="text-align:center;">${cancelBtn}</td>
                 </tr>`;
    });

    body.innerHTML = html;
}

// Cancel Booking Action
function cancelBooking(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (!target) {
        alert('Data peminjaman tidak ditemukan.');
        return;
    }

    const confirmMsg = `Konfirmasi Pembatalan Peminjaman:\n\n` +
        `• Kode Booking: ${target.id}\n` +
        `• Ruangan: ${target.roomName}\n` +
        `• Jadwal: ${target.date}, Pukul ${target.slot} (${target.durasi} Jam)\n` +
        `• Pemesan: ${target.nama}\n\n` +
        `Apakah Anda yakin ingin membatalkan peminjaman ruangan ini? Ruangan akan langsung kembali dibuka untuk mahasiswa lain.`;

    if (!confirm(confirmMsg)) return;

    target.status = 'Dibatalkan';
    target.cancelledAt = new Date().toISOString();
    saveBookings(bookings);
    if (typeof stopExpiredChimeLoop === 'function') stopExpiredChimeLoop();
    triggerAllUIRenders();

    alert(`Peminjaman ${target.id} (${target.roomName}) berhasil dibatalkan.\nRuangan telah kembali tersedia untuk pemesan lain.`);
}
window.cancelBooking = cancelBooking;

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
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">Tidak ada data peminjaman ditemukan.</td></tr>`;
        return;
    }

    const now = new Date();
    const GRACE_PERIOD_MS = 15 * 60 * 1000;

    let html = '';
    filtered.forEach(b => {
        let statusBadge = `<span class="badge badge-secondary">${b.status}</span>`;
        let isTooEarly = false;
        let earliestStr = '';
        let isKeyNotReturned = false;
        let unreturnedBooking = null;

        if (b.status === 'Menunggu Kunci') {
            const startDateTime = getSlotDateTime(b.date, b.slot);
            let toleranceNote = '';
            if (startDateTime) {
                const earliestHandoverTime = new Date(startDateTime.getTime() - 10 * 60 * 1000);
                if (now < earliestHandoverTime) {
                    isTooEarly = true;
                    const hh = String(earliestHandoverTime.getHours()).padStart(2, '0');
                    const mm = String(earliestHandoverTime.getMinutes()).padStart(2, '0');
                    earliestStr = `${hh}.${mm}`;
                }

                const baseTime = b.createdAt ? Math.max(startDateTime.getTime(), new Date(b.createdAt).getTime()) : startDateTime.getTime();
                const deadline = new Date(baseTime + GRACE_PERIOD_MS);
                if (now >= new Date(baseTime) && now <= deadline) {
                    const remainingMin = Math.max(1, Math.ceil((deadline - now) / 60000));
                    toleranceNote = `<br><small style="color:#b58105; font-weight:600;"><i class="fa fa-stopwatch"></i> Toleransi: sisa ${remainingMin} menit</small>`;
                } else if (now < startDateTime) {
                    toleranceNote = `<br><small style="color:#6c757d;">Mulai jam ${b.slot}</small>`;
                }
            }

            // Check if another borrower currently has the physical key for the same room
            unreturnedBooking = bookings.find(other => 
                other.roomId === b.roomId && 
                other.id !== b.id && 
                other.status === 'Sedang Digunakan'
            );
            if (unreturnedBooking) {
                isKeyNotReturned = true;
            }

            let constraintNote = '';
            if (isKeyNotReturned) {
                constraintNote = `<br><small style="color:#dc3545; font-weight:600;"><i class="fa fa-exclamation-triangle"></i> Kunci fisik masih di: ${unreturnedBooking.nama}</small>`;
            } else if (isTooEarly) {
                constraintNote = `<br><small style="color:#4a5568; font-weight:500;"><i class="fa fa-hourglass-start"></i> Ambil kunci mulai ${earliestStr} (H-10m)</small>`;
            }

            statusBadge = `<span class="badge badge-warning"><i class="fa fa-clock"></i> Menunggu Kunci</span>${toleranceNote}${constraintNote}`;
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
            if (isKeyNotReturned) {
                actionBtns = `
                    <button class="btn btn-warning btn-sm" onclick="adminHandoverKey('${b.id}')" title="Kunci belum dikembalikan oleh ${unreturnedBooking.nama} (Slot ${unreturnedBooking.slot})"><i class="fa fa-exclamation-triangle"></i> Kunci Belum Kembali</button>
                    <button class="btn btn-danger btn-sm" onclick="adminMarkGugur('${b.id}')" title="Terlambat >15 Menit"><i class="fa fa-user-slash"></i> Gugurkan</button>
                `;
            } else if (isTooEarly) {
                actionBtns = `
                    <button class="btn btn-secondary btn-sm" onclick="adminHandoverKey('${b.id}')" title="Kunci baru dapat diserahkan paling cepat 10 menit sebelum jadwal (pukul ${earliestStr})"><i class="fa fa-clock"></i> Belum Waktunya (H-10m)</button>
                    <button class="btn btn-danger btn-sm" onclick="adminMarkGugur('${b.id}')" title="Terlambat >15 Menit"><i class="fa fa-user-slash"></i> Gugurkan</button>
                `;
            } else {
                actionBtns = `
                    <button class="btn btn-success btn-sm" onclick="adminHandoverKey('${b.id}')"><i class="fa fa-key"></i> Serahkan Kunci</button>
                    <button class="btn btn-danger btn-sm" onclick="adminMarkGugur('${b.id}')" title="Terlambat >15 Menit"><i class="fa fa-user-slash"></i> Gugurkan</button>
                `;
            }
        } else if (b.status === 'Sedang Digunakan') {
            actionBtns = `
                <button class="btn btn-primary btn-sm" onclick="adminReturnKey('${b.id}')"><i class="fa fa-box"></i> Terima Kunci & Selesai</button>
            `;
        }

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td><strong>${b.nama}</strong><br><small style="color:#6c757d;">NIM: ${b.nim} | HP: ${b.hp}</small></td>
                    <td>${b.prodi}<br><small style="color:#6c757d;">Kelas: ${b.kelas}</small></td>
                    <td><strong>${b.roomName}</strong><br><small style="color:#6c757d;">Tgl: ${b.date} | Jam ${b.slot} (${b.durasi} Jam)</small></td>
                    <td>${statusBadge}</td>
                    <td style="text-align:center;">${actionBtns}</td>
                 </tr>`;
    });

    body.innerHTML = html;
}

function adminHandoverKey(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (!target) {
        alert('Data peminjaman tidak ditemukan.');
        return;
    }

    if (target.status !== 'Menunggu Kunci') {
        alert(`Peminjaman ini sudah berstatus "${target.status}" dan tidak dapat diserahkan kuncinya lagi.`);
        return;
    }

    const now = new Date();

    // Constraint 1: Waktu pengambilan kunci minimal 10 menit sebelum digunakan (H-10 menit)
    const startDateTime = getSlotDateTime(target.date, target.slot);
    if (startDateTime) {
        const earliestHandover = new Date(startDateTime.getTime() - 10 * 60 * 1000);
        if (now < earliestHandover) {
            const hh = String(earliestHandover.getHours()).padStart(2, '0');
            const mm = String(earliestHandover.getMinutes()).padStart(2, '0');
            const earliestStr = `${hh}.${mm}`;
            alert(`[Penyerahan Kunci Ditolak - Belum Waktunya]\n\n` +
                  `Kunci ${target.roomName} hanya dapat diambil paling cepat 10 menit sebelum jadwal sesi dimulai.\n\n` +
                  `• Ruangan: ${target.roomName}\n` +
                  `• Jadwal Penggunaan: ${target.date}, Pukul ${target.slot}\n` +
                  `• Pengambilan Kunci Dibuka: Pukul ${earliestStr} WIB (H-10 Menit)\n` +
                  `• Pemesan: ${target.nama} (${target.nim})\n\n` +
                  `Harap informasikan kepada peminjam untuk menunggu dan kembali ke resepsionis pada pukul ${earliestStr}.`);
            return;
        }
    }

    // Constraint 2: Kunci ruangan yang sama belum dikembalikan oleh peminjam sebelumnya
    const unreturned = bookings.find(b => b.roomId === target.roomId && b.id !== target.id && b.status === 'Sedang Digunakan');
    if (unreturned) {
        alert(`[Penyerahan Kunci Ditolak - Kunci Belum Kembali]\n\n` +
              `Petugas tidak dapat menyerahkan kunci ${target.roomName} kepada ${target.nama} karena kunci fisik saat ini MASIH DIGUNAKAN oleh peminjam sebelumnya:\n\n` +
              `• Pemegang Kunci: ${unreturned.nama} (NIM: ${unreturned.nim})\n` +
              `• Kelas / Prodi: ${unreturned.kelas || '-'} / ${unreturned.prodi || '-'}\n` +
              `• Slot Pemakaian: Pukul ${unreturned.slot} (${unreturned.durasi} Jam)\n` +
              `• Kode Booking: ${unreturned.id}\n\n` +
              `Langkah Tindakan Petugas Resepsionis:\n` +
              `1. Hubungi atau tunggu peminjam sebelumnya (${unreturned.nama}) untuk mengembalikan kunci fisik ruangan ke meja resepsionis.\n` +
              `2. Klik tombol "Terima Kunci & Selesai" pada baris peminjaman ${unreturned.nama}.\n` +
              `3. Setelah kunci fisik tercatat kembali di resepsionis, barulah kunci dapat diserahkan kepada peminjam berikutnya (${target.nama}).`);
        return;
    }

    target.status = 'Sedang Digunakan';
    target.startedAt = now.toISOString();

    // Calculate absolute scheduled end time based on slot & duration
    const scheduledEnd = getSlotEndDateTime(target.date, target.slot, target.durasi);
    target.scheduledEndAt = scheduledEnd ? scheduledEnd.toISOString() : new Date(now.getTime() + target.durasi * 3600000).toISOString();
    target.warned5m = false;
    target.warnedEnd = false;

    saveBookings(bookings);
    renderAdminTable();
    renderAdminRoomGrid();
    if (typeof updateActiveSessionBanner === 'function') updateActiveSessionBanner();
    alert(`Kunci untuk ${target.roomName} berhasil diserahkan kepada ${target.nama}.\n\nSesi pemakaian resmi dimulai dan status ruangan diperbarui menjadi "Sedang Digunakan".`);
}

function adminReturnKey(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
        target.status = 'Selesai';
        saveBookings(bookings);
        if (typeof stopExpiredChimeLoop === 'function') stopExpiredChimeLoop();
        renderAdminTable();
        renderAdminRoomGrid();
        if (typeof updateActiveSessionBanner === 'function') updateActiveSessionBanner();
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
        if (typeof updateActiveSessionBanner === 'function') updateActiveSessionBanner();
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
        // Prioritize in-use booking first, then waiting booking
        const inUse = bookings.find(b => b.roomId === room.id && b.date === today && b.status === 'Sedang Digunakan');
        const waiting = bookings.find(b => b.roomId === room.id && b.date === today && b.status === 'Menunggu Kunci');

        let cardBg = '#f8f9fa';
        let border = '1px solid #ced4da';
        let statusText = '<span style="color:#28a745; font-weight:bold;"><i class="fa fa-check-circle"></i> Kosong / Tersedia</span>';
        let info = '-';

        if (inUse) {
            cardBg = '#fff5f5';
            border = '1px solid #f5c2c7';
            statusText = '<span style="color:#d92550; font-weight:bold;"><i class="fa fa-door-closed"></i> Terpakai (Kunci di Luar)</span>';
            let nextInfo = '';
            if (waiting) {
                nextInfo = `<br><span style="color:#b58105; font-size:0.75rem;"><i class="fa fa-user-clock"></i> Peminjam berikutnya: ${waiting.nama} (${waiting.slot}) - Kunci tertahan</span>`;
            }
            info = `Digunakan oleh: <strong>${inUse.nama}</strong> (${inUse.slot} - ${inUse.durasi} Jam)${nextInfo}`;
        } else if (waiting) {
            cardBg = '#fffdf0';
            border = '1px solid #ffecb5';
            statusText = '<span style="color:#b58105; font-weight:bold;"><i class="fa fa-clock"></i> Dipesan (Menunggu Kunci)</span>';
            info = `Pemesan: <strong>${waiting.nama}</strong> (${waiting.slot})`;
        }

        html += `
            <div style="background:${cardBg}; border:${border}; padding:15px; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
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

// ==========================================
// ACTIVE SESSION & LIVE COUNTDOWN TIMER
// ==========================================

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Play gentle synthesized chime using Web Audio API
function playChimeSound(type = 'warning') {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        if (type === 'warning') {
            // Melodic two-tone chime for 5-minute reminder (F5: 698.46 Hz, A5: 880 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(698.46, now);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.5);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.25);
            gain2.gain.setValueAtTime(0.18, now + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.25);
            osc2.stop(now + 0.8);
        } else if (type === 'urgent') {
            // 3-tone chime for session finished (E5: 659.25 Hz, G5: 783.99 Hz, C6: 1046.50 Hz)
            [659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const startTime = now + idx * 0.22;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.6);
            });
        }
    } catch (e) {
        console.warn('Audio playback error:', e);
    }
}

function toggleAudioChime() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btn-audio-toggle');
    if (soundEnabled) {
        getAudioContext();
        playChimeSound('warning');
        if (btn) btn.innerHTML = '<i class="fa fa-volume-up"></i> Suara Aktif';
    } else {
        stopExpiredChimeLoop();
        if (btn) btn.innerHTML = '<i class="fa fa-volume-mute"></i> Suara Senyap';
    }
}

// Format duration helper (HH:MM:SS)
function formatDuration(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = n => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

// Expired chime looping state & controllers
let expiredChimeInterval = null;
let isAlarmMuted = false;
let lastBrowserNotifTime = 0;

function startExpiredChimeLoop() {
    if (expiredChimeInterval || isAlarmMuted || !soundEnabled) return;
    getAudioContext();
    playChimeSound('urgent');
    expiredChimeInterval = setInterval(() => {
        if (!isAlarmMuted && soundEnabled) {
            playChimeSound('urgent');
        } else {
            stopExpiredChimeLoop();
        }
    }, 4000);
    updateMuteButtonUI();
}

function stopExpiredChimeLoop() {
    if (expiredChimeInterval) {
        clearInterval(expiredChimeInterval);
        expiredChimeInterval = null;
    }
    updateMuteButtonUI();
}

function toggleMuteExpiredAlarm() {
    isAlarmMuted = !isAlarmMuted;
    if (isAlarmMuted) {
        stopExpiredChimeLoop();
    } else {
        const bookings = getBookings();
        const active = bookings.find(b => b.nim === CURRENT_USER.nim && b.status === 'Sedang Digunakan')
            || bookings.find(b => b.status === 'Sedang Digunakan');
        if (active && active.scheduledEndAt && new Date(active.scheduledEndAt) <= new Date()) {
            startExpiredChimeLoop();
        }
    }
    updateMuteButtonUI();
}
window.toggleMuteExpiredAlarm = toggleMuteExpiredAlarm;

function updateMuteButtonUI() {
    const bannerBtn = document.getElementById('btn-expired-mute');
    const modalBtn = document.getElementById('btn-modal-mute-alarm');
    const labelText = isAlarmMuted ? 'Bunyikan Alarm' : 'Senyapkan Alarm';
    const iconClass = isAlarmMuted ? 'fa fa-bell' : 'fa fa-volume-mute';

    if (bannerBtn) {
        bannerBtn.innerHTML = `<i class="${iconClass}"></i> ${labelText}`;
        bannerBtn.className = isAlarmMuted ? 'btn btn-outline-warning btn-sm' : 'btn btn-danger btn-sm';
    }
    if (modalBtn) {
        modalBtn.innerHTML = `<i class="${iconClass}"></i> ${labelText}`;
        modalBtn.className = isAlarmMuted ? 'btn btn-warning' : 'btn btn-outline-secondary';
    }
}

// Modal helper for 5-minute warning
function showWarning5mModal(booking) {
    const modal = document.getElementById('modal-warning-5m');
    if (!modal) return;
    const roomSpan = document.getElementById('warning-5m-room-name');
    if (roomSpan) roomSpan.innerText = booking.roomName;
    modal.classList.remove('hidden');
}

// Modal helper for session ended
function showSessionEndedModal(booking) {
    const modal = document.getElementById('modal-session-ended');
    if (!modal) return;
    const roomSpan = document.getElementById('ended-room-name');
    if (roomSpan) roomSpan.innerText = booking.roomName;
    updateMuteButtonUI();
    modal.classList.remove('hidden');
}

// Browser notification helper
function sendSystemNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: body,
                icon: 'https://portal.pknstan.ac.id/assets/plugins/images/stan_ico.ico'
            });
        } catch (e) {
            console.warn('Browser notification error:', e);
        }
    }
}

// Live Active Session Banner updater
function updateActiveSessionBanner() {
    const widget = document.getElementById('active-session-widget');
    if (!widget) return;

    const bookings = getBookings();
    // Prioritize current user's active booking, fallback to any active booking for demo
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && b.status === 'Sedang Digunakan')
        || bookings.find(b => b.status === 'Sedang Digunakan');

    if (!active) {
        widget.classList.add('hidden');
        stopExpiredChimeLoop();
        const muteBtn = document.getElementById('btn-expired-mute');
        if (muteBtn) muteBtn.classList.add('hidden');
        return;
    }

    widget.classList.remove('hidden');

    // Ensure scheduledEndAt is present
    if (!active.scheduledEndAt) {
        const endDt = getSlotEndDateTime(active.date, active.slot, active.durasi);
        active.scheduledEndAt = endDt ? endDt.toISOString() : new Date().toISOString();
        saveBookings(bookings);
    }

    const endDateTime = new Date(active.scheduledEndAt);
    const now = new Date();
    const remainingMs = endDateTime - now;

    const roomEl = document.getElementById('active-session-room');
    const metaEl = document.getElementById('active-session-meta');
    const countdownEl = document.getElementById('active-session-countdown');
    const iconEl = document.getElementById('countdown-icon');
    const labelEl = document.getElementById('countdown-label');
    const muteBtn = document.getElementById('btn-expired-mute');

    if (roomEl) roomEl.innerText = active.roomName;
    if (metaEl) {
        const slotEndStr = endDateTime.toTimeString().substring(0, 5).replace(':', '.');
        metaEl.innerText = `Jadwal: ${active.slot} - ${slotEndStr} (${active.durasi} Jam) | Pemesan: ${active.nama}`;
    }

    const cancelBtn = document.getElementById('btn-active-cancel');
    if (cancelBtn) {
        if (active.nim === CURRENT_USER.nim) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => cancelBooking(active.id);
        } else {
            cancelBtn.classList.add('hidden');
        }
    }

    if (remainingMs > 5 * 60 * 1000) {
        // Normal state (> 5 mins)
        widget.classList.remove('warning-5m', 'expired');
        stopExpiredChimeLoop();
        isAlarmMuted = false;
        if (muteBtn) muteBtn.classList.add('hidden');
        if (labelEl) {
            labelEl.innerText = 'Sisa Waktu';
            labelEl.style.color = '#6c757d';
        }
        if (iconEl) {
            iconEl.className = 'fa fa-stopwatch';
            iconEl.style.color = '#3f6ad8';
        }
        if (countdownEl) {
            countdownEl.innerText = formatDuration(remainingMs);
        }
    } else if (remainingMs > 0 && remainingMs <= 5 * 60 * 1000) {
        // 5-minute warning state
        widget.classList.add('warning-5m');
        widget.classList.remove('expired');
        stopExpiredChimeLoop();
        isAlarmMuted = false;
        if (muteBtn) muteBtn.classList.add('hidden');
        if (labelEl) {
            labelEl.innerText = 'Sisa Waktu';
            labelEl.style.color = '#b58105';
        }
        if (iconEl) {
            iconEl.className = 'fa fa-exclamation-triangle';
            iconEl.style.color = '#b58105';
        }
        if (countdownEl) {
            countdownEl.innerText = formatDuration(remainingMs);
        }

        // Trigger 5-minute alert once
        if (!active.warned5m) {
            active.warned5m = true;
            saveBookings(bookings);
            playChimeSound('warning');
            showWarning5mModal(active);
            sendSystemNotification('Peringatan 5 Menit Terakhir', `Waktu peminjaman ${active.roomName} tersisa 5 menit.`);
        }
    } else {
        // Expired state (<= 0)
        widget.classList.remove('warning-5m');
        widget.classList.add('expired');
        if (muteBtn) muteBtn.classList.remove('hidden');
        if (labelEl) {
            labelEl.innerText = 'Waktu Lewat';
            labelEl.style.color = '#d92550';
        }
        if (iconEl) {
            iconEl.className = 'fa fa-clock';
            iconEl.style.color = '#d92550';
        }
        const overdueMs = Math.max(0, -remainingMs);
        if (countdownEl) {
            countdownEl.innerText = '-' + formatDuration(overdueMs);
        }

        // Trigger finished alert & start continuous chime loop
        if (!active.warnedEnd) {
            active.warnedEnd = true;
            saveBookings(bookings);
            isAlarmMuted = false;
            showSessionEndedModal(active);
            startExpiredChimeLoop();
            sendSystemNotification('Waktu Peminjaman Berakhir', `Waktu peminjaman ${active.roomName} telah habis. Silakan kembalikan kunci.`);
            lastBrowserNotifTime = Date.now();
        } else {
            // Keep chime loop active if modal is open and not muted
            const modal = document.getElementById('modal-session-ended');
            const isModalOpen = modal && !modal.classList.contains('hidden');
            if (isModalOpen && !isAlarmMuted && !expiredChimeInterval) {
                startExpiredChimeLoop();
            }

            // Periodic browser notification reminder every 60 seconds while expired
            const nowTs = Date.now();
            if (nowTs - lastBrowserNotifTime > 60000) {
                sendSystemNotification('Waktu Peminjaman Lewat', `Waktu ${active.roomName} telah lewat. Mohon segera serahkan kunci ke resepsionis.`);
                lastBrowserNotifTime = nowTs;
            }
        }
    }
}

// Simulation helpers for instant user testing
function simulate5mWarning() {
    const bookings = getBookings();
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && b.status === 'Sedang Digunakan')
        || bookings.find(b => b.status === 'Sedang Digunakan');
    if (!active) {
        alert('Tidak ada sesi aktif. Pastikan ada peminjaman berstatus "Sedang Digunakan".');
        return;
    }
    const now = new Date();
    active.scheduledEndAt = new Date(now.getTime() + (4 * 60 + 55) * 1000).toISOString();
    active.warned5m = false; // Reset flag to trigger
    saveBookings(bookings);
    updateActiveSessionBanner();
}

function simulateEndWarning() {
    const bookings = getBookings();
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && b.status === 'Sedang Digunakan')
        || bookings.find(b => b.status === 'Sedang Digunakan');
    if (!active) {
        alert('Tidak ada sesi aktif. Pastikan ada peminjaman berstatus "Sedang Digunakan".');
        return;
    }
    const now = new Date();
    active.scheduledEndAt = new Date(now.getTime() - 2000).toISOString();
    active.warnedEnd = false; // Reset flag to trigger
    isAlarmMuted = false;
    stopExpiredChimeLoop();
    saveBookings(bookings);
    updateActiveSessionBanner();
}

// Cancel current active session directly
function cancelActiveSession() {
    const bookings = getBookings();
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status))
        || bookings.find(b => ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status));
    if (active) {
        cancelBooking(active.id);
    } else {
        alert('Tidak ada sesi peminjaman aktif yang dapat dibatalkan.');
    }
}
window.cancelActiveSession = cancelActiveSession;

