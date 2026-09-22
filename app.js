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

// ==========================================
// SYSTEM TIME & PRESENTATION SIMULATION STATE
// ==========================================
let SYSTEM_TIME = {
    isSimulated: false,
    simulatedTime: null,
    setAt: null
};

// Returns current Date object, respecting simulation offset if active
function getSystemNow() {
    if (SYSTEM_TIME.isSimulated && SYSTEM_TIME.simulatedTime && SYSTEM_TIME.setAt) {
        const elapsed = Date.now() - SYSTEM_TIME.setAt;
        return new Date(new Date(SYSTEM_TIME.simulatedTime).getTime() + elapsed);
    }
    return new Date();
}

// Helper Date string YYYY-MM-DD in local time
function getTodayDateString() {
    const now = getSystemNow();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

// User Logged In Mock Data (Dynamically updated from login session)
let CURRENT_USER = {
    nama: 'Ahmad Fauzi Rahman',
    nim: '2301100101',
    email: 'fauzi_2301100101@pknstan.ac.id',
    prodi: 'D III Pajak',
    kelas: '3-01',
    hp: '081211110001'
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
        nama: 'Ahmad Fauzi Rahman',
        nim: '2301100101',
        prodi: 'D III Pajak',
        kelas: '3-01',
        hp: '081211110001',
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
        nama: 'Bagas Aditya Pratama',
        nim: '2301100103',
        prodi: 'D III Kebendaharaan Negara',
        kelas: '3-02',
        hp: '081211110003',
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

const MIN_REMAINING_MINUTES = 20;

// Helper to calculate end slot time string
function getBookingEndSlotString(startSlot, durasiHours) {
    const startIndex = TIME_SLOTS.indexOf(startSlot);
    if (startIndex === -1) return '';
    const lastIndex = Math.min(TIME_SLOTS.length - 1, startIndex + parseInt(durasiHours || 1, 10) - 1);
    const endMap = {
        '08.00': '09.00',
        '09.00': '10.00',
        '10.00': '11.00',
        '11.00': '12.00',
        '13.00': '14.00',
        '14.00': '15.00',
        '15.00': '16.00'
    };
    return endMap[TIME_SLOTS[lastIndex]] || '';
}

// Helper to calculate absolute end Date object for a booking slot
function getSlotEndDateTime(dateStr, slotStr, durasiHours) {
    const startDateTime = getSlotDateTime(dateStr, slotStr);
    if (!startDateTime) return null;
    const durasi = parseInt(durasiHours || 1, 10);
    const startIndex = TIME_SLOTS.indexOf(slotStr);
    if (startIndex === -1) {
        return new Date(startDateTime.getTime() + durasi * 60 * 60 * 1000);
    }
    const lastIndex = Math.min(TIME_SLOTS.length - 1, startIndex + durasi - 1);
    const endSlotStr = TIME_SLOTS[lastIndex];
    const endSlotStartDt = getSlotDateTime(dateStr, endSlotStr);
    if (!endSlotStartDt) {
        return new Date(startDateTime.getTime() + durasi * 60 * 60 * 1000);
    }
    return new Date(endSlotStartDt.getTime() + 60 * 60 * 1000);
}

// Helper to get remaining minutes until the end of a booking slot
function getSlotRemainingMinutes(dateStr, slotStr, durasiHours = 1) {
    if (!dateStr || !slotStr) return 0;
    const todayStr = getTodayDateString();
    if (dateStr < todayStr) return 0;
    if (dateStr > todayStr) return 9999;

    const endDt = getSlotEndDateTime(dateStr, slotStr, durasiHours);
    if (!endDt) return 0;
    const now = getSystemNow();
    return Math.floor((endDt.getTime() - now.getTime()) / 60000);
}

// Helper to check if a specific date and slot have already passed relative to current time
// Rule: Ongoing slots remain available if there is still enough time (minimal 20 menit)
function isSlotInPast(dateStr, slotStr) {
    if (!dateStr || !slotStr) return false;
    const todayStr = getTodayDateString();
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    const now = getSystemNow();
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

    const now = getSystemNow();
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
    const now = getSystemNow();
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

    // Realtime System Time Sync from Server
    socket.on('time:sync', (timeData) => {
        if (timeData) {
            SYSTEM_TIME.isSimulated = Boolean(timeData.isSimulated);
            SYSTEM_TIME.simulatedTime = timeData.simulatedTime;
            SYSTEM_TIME.setAt = Date.now();
            updateSimulationUIState();
            triggerAllUIRenders();
        }
    });

    // Realtime Notification from Admin to Student
    const processedStudentNotifIds = new Set();
    let lastStudentNotifSoundTime = 0;

    socket.on('student:notification_received', (notif) => {
        if (!notif) return;
        const isForMe = (notif.targetNim === 'all' || notif.targetNim === CURRENT_USER.nim);
        if (!isForMe) return;

        // Cegah pemrosesan ganda jika menerima notifikasi yang sama dalam waktu singkat
        if (notif.id && processedStudentNotifIds.has(notif.id)) return;
        const now = Date.now();
        if (now - lastStudentNotifSoundTime < 1500) return;

        if (notif.id) {
            processedStudentNotifIds.add(notif.id);
            if (processedStudentNotifIds.size > 50) {
                const firstVal = processedStudentNotifIds.values().next().value;
                processedStudentNotifIds.delete(firstVal);
            }
        }
        lastStudentNotifSoundTime = now;

        playChimeSound('notification');
        sendSystemNotification(notif.title, notif.message);

        const modal = document.getElementById('modal-admin-notification');
        if (modal) {
            const titleEl = document.getElementById('admin-notif-title');
            const msgEl = document.getElementById('admin-notif-message');
            const timeEl = document.getElementById('admin-notif-time');
            if (titleEl) titleEl.textContent = notif.title;
            if (msgEl) msgEl.textContent = notif.message;
            if (timeEl) {
                const dt = notif.createdAt ? new Date(notif.createdAt) : getSystemNow();
                timeEl.textContent = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            }
            modal.classList.remove('hidden');
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
    if (typeof updateSimulationUIState === 'function') updateSimulationUIState();
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

// Fetch fresh system time from server
async function fetchSystemTimeFromServer() {
    try {
        const res = await fetch('/api/time');
        if (res.ok) {
            const timeData = await res.json();
            SYSTEM_TIME.isSimulated = Boolean(timeData.isSimulated);
            SYSTEM_TIME.simulatedTime = timeData.simulatedTime;
            SYSTEM_TIME.setAt = Date.now();
            updateSimulationUIState();
            triggerAllUIRenders();
        }
    } catch (err) {
        // Fallback local
    }
}

// Save Bookings to localStorage, Server API, and Dispatch Realtime Event
function saveBookings(bookings) {
    try {
        localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    } catch (e) {
        console.warn('[Storage] LocalStorage quota penuh, menyimpan metadata berkas tanpa base64:', e);
        try {
            const trimmed = bookings.map(b => {
                if (b.suratTugas && b.suratTugas.fileData) {
                    return { ...b, suratTugas: { ...b.suratTugas, fileData: null } };
                }
                return b;
            });
            localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(trimmed));
        } catch (err2) {}
    }
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
    if (!slotSelect || !slotSelect.options) return;

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
            const now = getSystemNow();
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

// ==========================================
// TIME SIMULATION CONTROLLERS & UI UPDATERS
// ==========================================

function updateSimulationUIState() {
    const now = getSystemNow();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.') + ' WIB';
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', dateOptions);

    // Header Clock Widget
    const headerTimeEl = document.getElementById('header-clock-time');
    const headerBadgeEl = document.getElementById('header-clock-mode-badge');
    if (headerTimeEl) headerTimeEl.textContent = timeStr;
    if (headerBadgeEl) {
        if (SYSTEM_TIME.isSimulated) {
            headerBadgeEl.textContent = 'Simulasi';
            headerBadgeEl.style.background = '#f59e0b';
            headerBadgeEl.style.color = '#0f172a';
        } else {
            headerBadgeEl.textContent = 'Realtime';
            headerBadgeEl.style.background = '#10b981';
            headerBadgeEl.style.color = '#ffffff';
        }
    }

    // Sidebar badge
    const sidebarSimBadge = document.getElementById('sidebar-sim-badge');
    if (sidebarSimBadge) {
        sidebarSimBadge.style.display = SYSTEM_TIME.isSimulated ? 'inline-block' : 'none';
    }

    // Active Simulation Banner
    const simBanner = document.getElementById('simulation-active-banner');
    const bannerSimTime = document.getElementById('banner-sim-time');
    if (simBanner) {
        if (SYSTEM_TIME.isSimulated) {
            simBanner.classList.remove('hidden');
            if (bannerSimTime) bannerSimTime.textContent = `${dateStr} pukul ${timeStr}`;
        } else {
            simBanner.classList.add('hidden');
        }
    }

    // Simulation Tab Clock View
    const simClock = document.getElementById('sim-display-clock');
    const simDate = document.getElementById('sim-display-date');
    const simBadge = document.getElementById('sim-status-badge');
    if (simClock) {
        simClock.textContent = timeStr;
        if (SYSTEM_TIME.isSimulated) {
            simClock.classList.add('simulated');
        } else {
            simClock.classList.remove('simulated');
        }
    }
    if (simDate) simDate.textContent = dateStr;
    if (simBadge) {
        if (SYSTEM_TIME.isSimulated) {
            simBadge.innerHTML = '<i class="fa fa-flask"></i> Mode Simulasi Presentasi Aktif';
            simBadge.style.background = '#f59e0b';
            simBadge.style.color = '#0f172a';
        } else {
            simBadge.innerHTML = '<i class="fa fa-check-circle"></i> Mode Waktu Nyata (Realtime)';
            simBadge.style.background = '#10b981';
            simBadge.style.color = '#ffffff';
        }
    }

    // Pre-populate manual date and time input if empty
    const dateInput = document.getElementById('sim-input-date');
    const timeInput = document.getElementById('sim-input-time');
    if (dateInput && document.activeElement !== dateInput && !dateInput.value) {
        dateInput.value = getTodayDateString();
    }
    if (timeInput && document.activeElement !== timeInput && !timeInput.value) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hh}:${mm}`;
    }
}
window.updateSimulationUIState = updateSimulationUIState;

async function setSimulationTime(dateTimeStr) {
    if (!dateTimeStr) return;
    const targetDt = new Date(dateTimeStr);
    if (isNaN(targetDt.getTime())) {
        alert('Format tanggal/waktu simulasi tidak valid.');
        return;
    }

    const payload = {
        isSimulated: true,
        simulatedTime: targetDt.toISOString()
    };

    SYSTEM_TIME.isSimulated = true;
    SYSTEM_TIME.simulatedTime = payload.simulatedTime;
    SYSTEM_TIME.setAt = Date.now();

    if (socket && socket.connected) {
        socket.emit('setSystemTime', payload);
    }
    fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});

    checkAutoExpireBookings(false);
    updateSimulationUIState();
    triggerAllUIRenders();
}
window.setSimulationTime = setSimulationTime;

async function advanceSimulationTime(minutes) {
    const current = getSystemNow();
    const newDt = new Date(current.getTime() + minutes * 60 * 1000);
    await setSimulationTime(newDt.toISOString());
}
window.advanceSimulationTime = advanceSimulationTime;

async function resetSimulationTime() {
    const payload = {
        isSimulated: false,
        simulatedTime: null
    };

    SYSTEM_TIME.isSimulated = false;
    SYSTEM_TIME.simulatedTime = null;
    SYSTEM_TIME.setAt = null;

    if (socket && socket.connected) {
        socket.emit('setSystemTime', payload);
    }
    fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});

    // Reset date picker to today
    const simDateInput = document.getElementById('sim-input-date');
    const simTimeInput = document.getElementById('sim-input-time');
    const now = new Date();
    if (simDateInput) simDateInput.value = getTodayDateString();
    if (simTimeInput) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        simTimeInput.value = `${hh}:${mm}`;
    }

    checkAutoExpireBookings(false);
    updateSimulationUIState();
    triggerAllUIRenders();
}
window.resetSimulationTime = resetSimulationTime;

function applyPresetTime(timeSlotStr) {
    // timeSlotStr is HH:mm (e.g. "08:50")
    const dateStr = document.getElementById('sim-input-date')?.value || getTodayDateString();
    const timeParts = timeSlotStr.replace('.', ':').split(':');
    const hh = parseInt(timeParts[0], 10);
    const mm = parseInt(timeParts[1] || '0', 10);

    const parts = dateStr.split('-');
    const targetDt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), hh, mm, 0, 0);
    setSimulationTime(targetDt.toISOString());
}
window.applyPresetTime = applyPresetTime;

function handleCustomSimTimeSubmit(e) {
    e.preventDefault();
    const dateVal = document.getElementById('sim-input-date')?.value;
    const timeVal = document.getElementById('sim-input-time')?.value;
    if (!dateVal || !timeVal) {
        alert('Harap pilih tanggal dan jam terlebih dahulu.');
        return;
    }
    const [hh, mm] = timeVal.split(':').map(Number);
    const parts = dateVal.split('-').map(Number);
    const targetDt = new Date(parts[0], parts[1] - 1, parts[2], hh, mm, 0, 0);
    setSimulationTime(targetDt.toISOString());
}
window.handleCustomSimTimeSubmit = handleCustomSimTimeSubmit;

// Sidebar & Tab Switchers
function toggleAdminSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
}
window.toggleAdminSidebar = toggleAdminSidebar;

function switchAdminTab(tabName) {
    const tabDashboard = document.getElementById('tab-admin-dashboard');
    const tabSimulasi = document.getElementById('tab-admin-simulasi');
    const navDashboard = document.getElementById('nav-item-dashboard');
    const navSimulasi = document.getElementById('nav-item-simulasi');

    if (tabName === 'simulasi') {
        if (tabDashboard) tabDashboard.classList.add('hidden');
        if (tabSimulasi) tabSimulasi.classList.remove('hidden');
        if (navDashboard) navDashboard.classList.remove('active');
        if (navSimulasi) navSimulasi.classList.add('active');
    } else {
        if (tabDashboard) tabDashboard.classList.remove('hidden');
        if (tabSimulasi) tabSimulasi.classList.add('hidden');
        if (navDashboard) navDashboard.classList.add('active');
        if (navSimulasi) navSimulasi.classList.remove('active');
        renderAdminTable();
        renderAdminRoomGrid();
    }

    // Close sidebar on click
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
}
window.switchAdminTab = switchAdminTab;

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCurrentUser();

    // Fetch latest bookings & system time from server immediately
    fetchBookingsFromServer();
    fetchSystemTimeFromServer();

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
    updateSimulationUIState();

    // 1-second interval for clock ticking and countdowns
    setInterval(() => {
        updateActiveSessionBanner();
        updateSimulationUIState();
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
                const now = getSystemNow();
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

// Helper to read uploaded file as Base64 Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Update dynamic options for ST Hours select dropdown
function updateSTHoursOptions() {
    const slot = document.getElementById('input-slot')?.value;
    const stSelect = document.getElementById('input-durasi-jam');
    if (!stSelect) return;

    const currentVal = stSelect.value;
    const startIndex = TIME_SLOTS.indexOf(slot);
    const maxSlots = startIndex !== -1 ? (TIME_SLOTS.length - startIndex) : 3;

    stSelect.innerHTML = '';
    for (let h = 3; h <= maxSlots; h++) {
        const opt = document.createElement('option');
        opt.value = String(h);
        const endStr = getBookingEndSlotString(slot, h);
        const spansBreak = (startIndex <= 3 && (startIndex + h) > 4);
        const note = spansBreak ? ' (Termasuk jeda 12.00 - 13.00)' : '';
        opt.textContent = `${h} Jam (s.d. ${endStr})${note}`;
        stSelect.appendChild(opt);
    }

    if (currentVal && stSelect.querySelector(`option[value="${currentVal}"]`)) {
        stSelect.value = currentVal;
    }
}

function handleDurasiChange() {
    const durasiSelect = document.getElementById('input-durasi');
    const isST = (durasiSelect?.value === 'surat_tugas' || durasiSelect?.value === '3');
    const stHoursGroup = document.getElementById('st-hours-group');
    const docGroup = document.getElementById('doc-upload-group');
    const docInput = document.getElementById('input-doc');

    if (stHoursGroup) {
        if (isST) {
            stHoursGroup.classList.remove('hidden');
            updateSTHoursOptions();
        } else {
            stHoursGroup.classList.add('hidden');
        }
    }

    if (docGroup) {
        if (isST) {
            docGroup.classList.remove('hidden');
            if (docInput) docInput.required = true;
        } else {
            docGroup.classList.add('hidden');
            if (docInput) {
                docInput.required = false;
                docInput.value = '';
                docInput.style.borderColor = '';
                const docStatus = document.getElementById('doc-file-status');
                if (docStatus) docStatus.textContent = '';
            }
        }
    }
}

function handleDocFileChange(input) {
    const statusEl = document.getElementById('doc-file-status');
    if (!input.files || input.files.length === 0) {
        if (statusEl) {
            statusEl.textContent = 'Belum ada berkas dipilih';
            statusEl.style.color = '#dc2626';
        }
        return;
    }

    const file = input.files[0];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
        alert('Peringatan: Ukuran berkas terlalu besar. Maksimal 5 MB.');
        input.value = '';
        if (statusEl) {
            statusEl.textContent = 'Ukuran berkas melebihi 5 MB';
            statusEl.style.color = '#dc2626';
        }
        return;
    }

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidExt) {
        alert('Peringatan: Format berkas tidak didukung. Harap unggah berkas PDF, PNG, atau JPG.');
        input.value = '';
        if (statusEl) {
            statusEl.textContent = 'Format tidak sesuai';
            statusEl.style.color = '#dc2626';
        }
        return;
    }

    input.style.borderColor = '#16a34a';
    if (statusEl) {
        const sizeKb = Math.round(file.size / 1024);
        statusEl.innerHTML = `<i class="fa fa-check-circle"></i> ${file.name} (${sizeKb} KB)`;
        statusEl.style.color = '#15803d';
    }
}
window.handleDocFileChange = handleDocFileChange;

function handleDurasiSelectChange() {
    handleDurasiChange();
    validateTimeSlotConstraints();
}

// Dynamic Time Constraints Validation & Live Conflict Feedback
function validateTimeSlotConstraints() {
    const slot = document.getElementById('input-slot')?.value;
    const durasiSelect = document.getElementById('input-durasi');
    const submitBtn = document.getElementById('btn-submit-booking');
    const notice = document.getElementById('time-constraint-notice');
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    const roomId = document.getElementById('input-room')?.value;
    const room = MASTER_ROOMS.find(r => r.id === roomId);

    if (!durasiSelect) return;

    const opt1 = durasiSelect.querySelector('option[value="1"]');
    const opt2 = durasiSelect.querySelector('option[value="2"]');
    const optST = durasiSelect.querySelector('option[value="surat_tugas"]') || durasiSelect.querySelector('option[value="3"]');

    if (opt1) opt1.disabled = false;

    const startIndex = TIME_SLOTS.indexOf(slot);
    const maxPossibleSlots = startIndex !== -1 ? (TIME_SLOTS.length - startIndex) : 1;

    // Rule: 11.00 & 15.00 limit to 1 hour max
    if (slot === '11.00' || slot === '15.00') {
        if (durasiSelect.value !== '1') durasiSelect.value = '1';
        if (opt2) opt2.disabled = true;
        if (optST) optST.disabled = true;
    } else if (slot === '14.00' || maxPossibleSlots < 3) {
        // Slot 14.00 only has 2 slots left until 16.00 closing
        if (durasiSelect.value === 'surat_tugas' || durasiSelect.value === '3') {
            durasiSelect.value = '2';
        }
        if (opt2) opt2.disabled = false;
        if (optST) optST.disabled = true;
    } else {
        if (opt2) opt2.disabled = false;
        if (optST) optST.disabled = false;
    }

    handleDurasiChange();

    const isST = (durasiSelect.value === 'surat_tugas' || durasiSelect.value === '3');
    let durasi = 1;
    if (isST) {
        const stJamSelect = document.getElementById('input-durasi-jam');
        durasi = parseInt(stJamSelect?.value || '3', 10);
    } else {
        durasi = parseInt(durasiSelect.value || '1', 10);
    }

    let errorMessage = '';
    let warningMessage = '';

    // Constraint 2: Past Time Slot Check
    if (isSlotInPast(filterDate, slot)) {
        errorMessage = `Waktu peminjaman jam ${slot} pada tanggal ${filterDate} sudah terlewat. Silakan pilih waktu yang akan datang.`;
    }

    // Ongoing Slot Rule: Minimum 20 minutes remaining threshold
    const isToday = (filterDate === getTodayDateString());
    const slotStartDt = getSlotDateTime(filterDate, slot);
    const now = getSystemNow();
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
                    durasi = 2;
                }
                const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                warningMessage = `Sisa waktu menuju jam 11.00 saat ini (${nowStr}) hanya ${rem1} menit (< 20 menit). Durasi 1 Jam tidak diperbolehkan. Durasi otomatis dialihkan ke 2 Jam (selesai tetap pukul 12.00, sisa waktu efektif ~${rem2} menit).`;
            } else {
                errorMessage = `Sisa waktu untuk slot jam ${slot} hanya tersisa ${rem1} menit (< 20 menit) sebelum jam ${slot === '11.00' ? 'istirahat (12.00)' : 'tutup (16.00)'}. Pemesanan tidak dapat dilakukan.`;
            }
        } else {
            const endHourStr = getBookingEndSlotString(slot, durasi);
            const effMin = getSlotRemainingMinutes(filterDate, slot, durasi);
            warningMessage = `Pemesanan Sesi Jam Berjalan: Selesai pukul ${endHourStr} (sisa waktu efektif ~${effMin} menit). Pengambilan kunci maksimal 15 menit sejak pemesanan dibuat.`;
        }
    }

    // Constraint: Satu orang tidak boleh memesan 2 ruangan di hari yang sama sebelum pemesanan sebelumnya selesai
    if (!errorMessage) {
        const bookings = getBookings();
        const activeBookingOnSameDay = bookings.find(b =>
            b.nim === CURRENT_USER.nim &&
            b.date === filterDate &&
            ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)
        );

        if (activeBookingOnSameDay) {
            const statusLabel = activeBookingOnSameDay.status === 'Menunggu Kunci'
                ? 'Menunggu Serah Terima Kunci'
                : 'Sedang Digunakan (Kunci Belum Kembali)';
            errorMessage = `Anda masih memiliki pemesanan aktif di ${activeBookingOnSameDay.roomName} pada tanggal ini (Jam ${activeBookingOnSameDay.slot}, Status: ${statusLabel}). Sesuai ketentuan, satu mahasiswa tidak boleh memesan ruangan lain di hari yang sama sebelum pemesanan sebelumnya selesai (kunci dikembalikan dan sesi diselesaikan oleh petugas).`;
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

    // Informational notes
    if (!errorMessage) {
        if (slot === '11.00') {
            warningMessage = 'Catatan: Pada slot jam 11.00, durasi maksimal hanya 1 jam karena pukul 12.00 - 13.00 adalah jam istirahat dan sterilisasi ruangan.';
        } else if (slot === '15.00') {
            warningMessage = 'Catatan: Pada slot jam 15.00, durasi maksimal hanya 1 jam karena ruang diskusi tutup pada pukul 16.00.';
        } else if (slot === '14.00') {
            warningMessage = 'Catatan: Pada slot jam 14.00, peminjaman Surat Tugas (> 2 jam) tidak tersedia karena ruang diskusi tutup pukul 16.00.';
        } else if (isST) {
            const endStr = getBookingEndSlotString(slot, durasi);
            warningMessage = `Peminjaman Surat Tugas (${durasi} Jam): Selesai dijadwalkan pukul ${endStr}. Pastikan Anda melampirkan berkas Surat Tugas yang sah.`;
        }
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
    if (modalId === 'modal-warning-5m' && typeof stopWarningChime === 'function') {
        stopWarningChime();
    }
}

// Pratinjau Dokumen Surat Tugas
function viewSuratTugas(bookingId) {
    const b = getBookings().find(item => item.id === bookingId);
    if (!b || !b.suratTugas) {
        alert('Berkas Surat Tugas tidak ditemukan untuk peminjaman ini.');
        return;
    }

    const doc = b.suratTugas;
    const modal = document.getElementById('modal-doc-preview');
    const bodyEl = document.getElementById('doc-preview-body');
    const titleEl = document.getElementById('doc-preview-title');
    const downloadBtn = document.getElementById('btn-download-doc');

    if (!modal || !bodyEl) {
        if (doc.fileData) {
            const win = window.open(doc.fileData);
            if (!win) alert(`Nama berkas: ${doc.fileName}`);
        } else {
            alert(`Surat Tugas: ${doc.fileName}`);
        }
        return;
    }

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa fa-file-alt" style="color:#0f766e; margin-right:6px;"></i> Berkas ST: ${doc.fileName}`;
    }

    if (downloadBtn) {
        downloadBtn.href = doc.fileData || '#';
        downloadBtn.download = doc.fileName || `Surat_Tugas_${b.id}`;
        downloadBtn.style.display = doc.fileData ? 'inline-block' : 'none';
    }

    const sizeKb = Math.round((doc.fileSize || 0) / 1024);
    let previewHtml = `
        <div style="margin-bottom:12px; font-size:0.85rem; color:#475569; text-align:left; background:#f1f5f9; padding:10px 12px; border-radius:6px;">
            <div><strong>Pemohon:</strong> ${b.nama} (${b.nim} - ${b.kelas})</div>
            <div><strong>Ruangan & Jadwal:</strong> ${b.roomName} | ${b.date}, Jam ${b.slot} (Durasi ${b.durasi} Jam)</div>
            <div><strong>Nama Berkas:</strong> ${doc.fileName} (${sizeKb} KB)</div>
        </div>
    `;

    if (doc.fileData) {
        if (doc.fileType && doc.fileType.includes('pdf')) {
            previewHtml += `<iframe src="${doc.fileData}" style="width:100%; height:450px; border:1px solid #cbd5e1; border-radius:6px;" title="Pratinjau PDF Surat Tugas"></iframe>`;
        } else {
            previewHtml += `<img src="${doc.fileData}" style="max-width:100%; max-height:450px; object-fit:contain; border-radius:6px; border:1px solid #cbd5e1;" alt="Pratinjau Surat Tugas">`;
        }
    } else {
        previewHtml += `<div style="padding:30px 20px; color:#64748b;">Pratinjau visual tidak tersedia untuk berkas ini.</div>`;
    }

    bodyEl.innerHTML = previewHtml;
    modal.classList.remove('hidden');
}
window.viewSuratTugas = viewSuratTugas;

/// Submit New Booking Form
async function handleFormSubmit(e) {
    e.preventDefault();

    const roomId = document.getElementById('input-room').value;
    const slot = document.getElementById('input-slot').value;
    const room = MASTER_ROOMS.find(r => r.id === roomId);
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();

    const hp = document.getElementById('input-hp').value;
    const jumlah = parseInt(document.getElementById('input-jumlah').value, 10);
    const durasiRaw = document.getElementById('input-durasi').value;
    const isSuratTugas = (durasiRaw === 'surat_tugas' || durasiRaw === '3');
    const keperluan = document.getElementById('input-keperluan').value;

    let durasi = parseInt(durasiRaw, 10);
    if (isSuratTugas) {
        const stJamEl = document.getElementById('input-durasi-jam');
        durasi = parseInt(stJamEl?.value || '3', 10);
        if (isNaN(durasi) || durasi < 3) {
            alert('Peminjaman dengan Surat Tugas harus memiliki durasi minimal 3 jam.');
            return;
        }
    }

    if (!room) {
        alert('Ruangan tidak valid.');
        return;
    }

    // Constraint: Past Time Slot Check
    if (isSlotInPast(filterDate, slot)) {
        alert(`Pemesanan Ditolak: Jam ${slot} pada tanggal ${filterDate} sudah terlewat. Silakan pilih waktu yang akan datang.`);
        return;
    }

    // Surat Tugas File Validation (Mandatory for Surat Tugas)
    const docInput = document.getElementById('input-doc');
    let suratTugasData = null;

    if (isSuratTugas) {
        if (!docInput || !docInput.files || docInput.files.length === 0) {
            alert('Pemesanan Ditolak: Anda wajib melampirkan / mengunggah file berkas Surat Tugas untuk peminjaman jenis Surat Tugas.');
            if (docInput) {
                docInput.style.borderColor = '#dc2626';
                docInput.focus();
            }
            return;
        }

        const file = docInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert('Pemesanan Ditolak: Ukuran file Surat Tugas melebihi batas maksimal 5 MB.');
            return;
        }

        let fileData = null;
        try {
            fileData = await readFileAsDataURL(file);
        } catch (err) {
            console.warn('Gagal mengonversi berkas dokumen ke data URL:', err);
        }

        suratTugasData = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            fileData: fileData,
            uploadedAt: new Date().toISOString()
        };
    }

    // Constraint: Minimum 20 minutes remaining threshold for ongoing slot booking
    if (filterDate === getTodayDateString()) {
        const remMin = getSlotRemainingMinutes(filterDate, slot, durasi);
        const slotStartDt = getSlotDateTime(filterDate, slot);
        const now = getSystemNow();
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

    // Constraint: Satu orang tidak boleh memesan 2 ruangan di hari yang sama sebelum pemesanan sebelumnya selesai
    const activeBookingOnSameDay = bookings.find(b =>
        b.nim === CURRENT_USER.nim &&
        b.date === filterDate &&
        ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)
    );

    if (activeBookingOnSameDay) {
        const statusLabel = activeBookingOnSameDay.status === 'Menunggu Kunci'
            ? 'Menunggu Serah Terima Kunci'
            : 'Sedang Digunakan (Kunci Belum Kembali)';
        alert(`Pemesanan Ditolak:\n\n` +
              `Anda masih memiliki pemesanan aktif di ${activeBookingOnSameDay.roomName} pada tanggal ${activeBookingOnSameDay.date} (Jam ${activeBookingOnSameDay.slot}, Durasi ${activeBookingOnSameDay.durasi} Jam, Status: ${statusLabel}).\n\n` +
              `Sesuai ketentuan, satu mahasiswa tidak boleh memesan ruangan lain di hari yang sama sebelum pemesanan sebelumnya selesai.\n\n` +
              `Silakan selesaikan sesi peminjaman Anda sebelumnya (kembalikan kunci fisik ke resepsionis dan selesaikan pemesanan) sebelum membuat pemesanan baru.`);
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
        jenisDurasi: isSuratTugas ? 'Surat Tugas' : 'Reguler',
        suratTugas: suratTugasData,
        jumlah: jumlah,
        keperluan: keperluan,
        status: 'Menunggu Kunci',
        ktmVerified: false,
        createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    saveBookings(bookings);

    const successMsg = isSuratTugas
        ? `🎉 Pemesanan Berhasil dengan Surat Tugas (${durasi} Jam)!\nBerkas surat tugas telah tersimpan. Silakan ambil kunci di Resepsionis Lt. 1 dengan menyerahkan KTM 5 menit sebelum jam ${slot}.`
        : `🎉 Pemesanan Berhasil! Silakan ambil kunci di Resepsionis Lt. 1 dengan menyerahkan KTM 5 menit sebelum jam ${slot}.`;

    alert(successMsg);

    closeModal('booking-modal');
    const bookingForm = document.getElementById('form-booking');
    if (bookingForm) bookingForm.reset();
    handleDurasiChange();

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

    const now = getSystemNow();
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

        let durasiCol = `${b.durasi} Jam`;
        if (b.suratTugas) {
            durasiCol += `<br><button type="button" class="badge" style="background:#0f766e; color:#fff; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:0.72rem; margin-top:4px;" onclick="viewSuratTugas('${b.id}')" title="Klik untuk melihat berkas Surat Tugas"><i class="fa fa-file-alt"></i> Berkas ST</button>`;
        }

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td><strong>${b.roomName}</strong></td>
                    <td>${b.date}<br><small style="color:#6c757d;">Jam ${b.slot}</small></td>
                    <td>${durasiCol}</td>
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

    const now = getSystemNow();
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

        let roomCellHtml = `<strong>${b.roomName}</strong><br><small style="color:#6c757d;">Tgl: ${b.date} | Jam ${b.slot} (${b.durasi} Jam)</small>`;
        if (b.suratTugas) {
            roomCellHtml += `<br><button type="button" class="btn btn-outline-info btn-sm" style="padding:2px 8px; font-size:0.75rem; margin-top:4px;" onclick="viewSuratTugas('${b.id}')" title="Lihat Berkas Surat Tugas / Nota Dinas"><i class="fa fa-file-alt"></i> Berkas ST</button>`;
        }

        const notifyBtn = `<button class="btn btn-outline-info btn-sm" onclick="openNotifyModal('${b.id}')" title="Kirim Notifikasi / Pengingat ke Mahasiswa ini" style="padding:4px 8px; font-size:0.75rem;"><i class="fa fa-bell"></i> Notifikasi</button>`;
        const fullActionBtns = actionBtns 
            ? `<div style="display:flex; flex-direction:column; gap:4px; align-items:center;">${actionBtns}${notifyBtn}</div>`
            : notifyBtn;

        html += `<tr>
                    <td><strong>${b.id}</strong></td>
                    <td><strong>${b.nama}</strong><br><small style="color:#6c757d;">NIM: ${b.nim} | HP: ${b.hp}</small></td>
                    <td>${b.prodi}<br><small style="color:#6c757d;">Kelas: ${b.kelas}</small></td>
                    <td>${roomCellHtml}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:center;">${fullActionBtns}</td>
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

    const now = getSystemNow();

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
        target.gugurAt = getSystemNow().toISOString();
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

// Daftar kandidat file suara kustom di folder /sounds/
// Format yang didukung: MP3, WAV, OGG.
// Pengguna cukup meletakkan file audio ke folder sounds/ dengan nama berikut:
const CUSTOM_SOUND_MAP = {
    notification: [
        '/sounds/notification.mp3',
        '/sounds/notification.wav',
        '/sounds/notification.ogg',
        '/sounds/warning.mp3'
    ],
    warning: [
        '/sounds/warning.mp3',
        '/sounds/warning.wav',
        '/sounds/warning.ogg',
        '/sounds/notification.mp3'
    ],
    urgent: [
        '/sounds/urgent.mp3',
        '/sounds/urgent.wav',
        '/sounds/urgent.ogg',
        '/sounds/alarm.mp3'
    ]
};

// Cache status ketersediaan file suara agar tidak berulang kali memicu 404 saat file belum diunggah
const soundAvailabilityCache = {};

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

// Buka kunci AudioContext dan Audio element saat interaksi pertama pengguna
function initAudioAutoplayUnlock() {
    const unlock = () => {
        getAudioContext();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
}
initAudioAutoplayUnlock();

// Synthesizer Web Audio API bawaan (fallback otomatis jika file audio kustom belum diunggah)
function playSynthesizedChime(type = 'warning') {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        if (type === 'notification') {
            // Melodi bel dua nada untuk notifikasi masuk (C5: 523.25 Hz, G5: 783.99 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gain1.gain.setValueAtTime(0.18, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.45);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(783.99, now + 0.18);
            gain2.gain.setValueAtTime(0.20, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.18);
            osc2.stop(now + 0.75);
        } else if (type === 'warning') {
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
        console.warn('Synthesized chime error:', e);
    }
}

// Memutar file audio kustom dengan fallback berurutan dan fallback synthesizer
function playCustomAudio(candidates, onFallback) {
    if (!candidates || !candidates.length) {
        if (typeof onFallback === 'function') onFallback();
        return;
    }

    // Jika ada kandidat yang sudah terverifikasi sebelumnya, langsung putar
    const verifiedUrl = candidates.find(u => soundAvailabilityCache[u] === true);
    if (verifiedUrl) {
        const audio = new Audio(verifiedUrl);
        audio.volume = 0.85;
        const p = audio.play();
        if (p !== undefined) {
            p.catch(err => {
                console.warn('Gagal memutar audio terverifikasi:', err);
                if (typeof onFallback === 'function') onFallback();
            });
        }
        return;
    }

    // Periksa kandidat yang belum pernah gagal (belum diuji)
    const pendingCandidates = candidates.filter(u => soundAvailabilityCache[u] !== false);
    if (!pendingCandidates.length) {
        // Semua kandidat sudah pernah dicoba dan tidak ada, langsung fallback tanpa delay
        if (typeof onFallback === 'function') onFallback();
        return;
    }

    let fallbackInvoked = false;
    const triggerFallbackOnce = () => {
        if (!fallbackInvoked) {
            fallbackInvoked = true;
            if (typeof onFallback === 'function') onFallback();
        }
    };

    const tryCandidate = (index) => {
        if (index >= pendingCandidates.length) {
            triggerFallbackOnce();
            return;
        }

        const url = pendingCandidates[index];
        const audio = new Audio(url);
        audio.volume = 0.85;

        let handled = false;
        const markFailedAndNext = () => {
            if (handled) return;
            handled = true;
            soundAvailabilityCache[url] = false;
            tryCandidate(index + 1);
        };

        audio.onerror = markFailedAndNext;

        const p = audio.play();
        if (p !== undefined) {
            p.then(() => {
                if (!handled) {
                    handled = true;
                    soundAvailabilityCache[url] = true;
                }
            }).catch(() => {
                markFailedAndNext();
            });
        }
    };

    tryCandidate(0);
}

// Memutar nada tunggal (tepat 1 kali) baik melalui file kustom maupun synthesizer
function playSingleChime(type = 'notification') {
    if (!soundEnabled) return;
    try {
        getAudioContext();

        const candidates = CUSTOM_SOUND_MAP[type] || CUSTOM_SOUND_MAP['warning'] || [];
        if (!candidates.length) {
            playSynthesizedChime(type);
            return;
        }

        playCustomAudio(candidates, () => {
            playSynthesizedChime(type);
        });
    } catch (e) {
        console.warn('Audio playback error:', e);
        playSynthesizedChime(type);
    }
}
window.playSingleChime = playSingleChime;

// Pengendali suara peringatan (semua suara diputar tepat 1 kali saja agar nyaman)
function stopWarningChime() {
    // Fungsi pembantu kompatibilitas saat modal ditutup
}
window.stopWarningChime = stopWarningChime;

// Fungsi utama: memutar suara notifikasi tepat 1 kali saja untuk semua tipe (notification, warning, urgent)
function playChimeSound(type = 'notification') {
    if (!soundEnabled) return;
    playSingleChime(type);
}

// Expose helper pengujian audio di console browser
window.playChimeSound = playChimeSound;
window.playSynthesizedChime = playSynthesizedChime;
window.testNotificationSound = function(type = 'notification') {
    getAudioContext();
    playChimeSound(type);
};
window.resetSoundCache = function() {
    for (const key in soundAvailabilityCache) {
        delete soundAvailabilityCache[key];
    }
    console.log('Cache sound notifikasi di-reset. File audio baru akan dicek kembali.');
};

function toggleAudioChime() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btn-audio-toggle');
    if (soundEnabled) {
        getAudioContext();
        playSingleChime('notification'); // Uji nada tepat 1 kali saat mengaktifkan suara
        if (btn) btn.innerHTML = '<i class="fa fa-volume-up"></i> Suara Aktif';
    } else {
        stopExpiredChimeLoop();
        stopWarningChime();
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
    // Strictly filter active booking for the current logged-in student only
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && b.status === 'Sedang Digunakan');

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
    const now = getSystemNow();
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

            // Periodic browser notification reminder & repeat chime every 15 seconds while expired
            const nowTs = Date.now();
            if (nowTs - lastBrowserNotifTime > 15000) {
                sendSystemNotification('WAKTU PEMINJAMAN HABIS!', `Pemberitahuan Berulang: Waktu pemakaian ${active.roomName} telah habis. Segera rapikan ruangan dan kembalikan kunci fisik ke resepsionis Lt. 1.`);
                if (!isAlarmMuted && soundEnabled) {
                    playChimeSound('urgent');
                }
                lastBrowserNotifTime = nowTs;
            }
        }
    }
}

// ==========================================
// ADMIN SIMULATION & NOTIFICATION HANDLERS
// ==========================================

// Trigger 5-Minute Warning Simulation from Admin Panel
function adminTrigger5mSimulation() {
    const bookings = getBookings();
    let target = bookings.find(b => b.status === 'Sedang Digunakan');
    if (!target) {
        target = bookings.find(b => b.status === 'Menunggu Kunci');
        if (target) {
            target.status = 'Sedang Digunakan';
            target.ktmVerified = true;
            target.startedAt = getSystemNow().toISOString();
        }
    }
    if (!target) {
        alert('Tidak ada data peminjaman untuk diuji. Silakan buat pemesanan terlebih dahulu di portal mahasiswa.');
        return;
    }
    const now = getSystemNow();
    target.scheduledEndAt = new Date(now.getTime() + (4 * 60 + 55) * 1000).toISOString();
    target.warned5m = false;
    target.warnedEnd = false;
    saveBookings(bookings);
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('updateBookings', bookings);
    }
    triggerAllUIRenders();
    alert(`Simulasi Sisa 5 Menit Berhasil Diaktifkan!\n\nRuangan: ${target.roomName}\nPemesan: ${target.nama} (${target.nim})\nStatus: Waktu selesai diatur sisa 5 menit dari sekarang.\n\nPeriksa portal mahasiswa yang login dengan akun ${target.nama} (${target.nim}) untuk melihat banner sisa waktu dan mendengar bel peringatan.`);
}
window.adminTrigger5mSimulation = adminTrigger5mSimulation;

// Trigger Expired / Session Ended Warning Simulation from Admin Panel
function adminTriggerEndSimulation() {
    const bookings = getBookings();
    let target = bookings.find(b => b.status === 'Sedang Digunakan');
    if (!target) {
        target = bookings.find(b => b.status === 'Menunggu Kunci');
        if (target) {
            target.status = 'Sedang Digunakan';
            target.ktmVerified = true;
            target.startedAt = getSystemNow().toISOString();
        }
    }
    if (!target) {
        alert('Tidak ada data peminjaman untuk diuji. Silakan buat pemesanan terlebih dahulu di portal mahasiswa.');
        return;
    }
    const now = getSystemNow();
    target.scheduledEndAt = new Date(now.getTime() - 2000).toISOString();
    target.warnedEnd = false;
    target.warned5m = true;
    isAlarmMuted = false;
    saveBookings(bookings);
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('updateBookings', bookings);
    }
    triggerAllUIRenders();
    alert(`Simulasi Waktu Habis & Alarm Berulang Berhasil Diaktifkan!\n\nRuangan: ${target.roomName}\nPemesan: ${target.nama} (${target.nim})\nStatus: Waktu telah LEWAT (Overdue).\n\nPortal mahasiswa yang bersangkutan akan memutar bel darurat berulang dan menampilkan popup pengembalian kunci.`);
}
window.adminTriggerEndSimulation = adminTriggerEndSimulation;

// Open Notification Modal for Specific Booking / Student
function openNotifyModal(bookingId) {
    const bookings = getBookings();
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const nimInput = document.getElementById('admin-notif-target-nim');
    const bIdInput = document.getElementById('admin-notif-target-booking-id');
    const infoEl = document.getElementById('admin-notif-target-info');
    const titleInput = document.getElementById('admin-notif-input-title');
    const msgInput = document.getElementById('admin-notif-input-message');

    if (nimInput) nimInput.value = target.nim;
    if (bIdInput) bIdInput.value = target.id;
    if (infoEl) {
        infoEl.innerHTML = `<i class="fa fa-user"></i> <strong>Target Mahasiswa:</strong> ${target.nama} (NIM: ${target.nim}) &bull; Ruangan: <strong>${target.roomName}</strong> (Jam ${target.slot})`;
        infoEl.style.background = '#eff6ff';
        infoEl.style.color = '#1e40af';
        infoEl.style.borderColor = '#bfdbfe';
    }
    if (titleInput) titleInput.value = `Pemberitahuan: ${target.roomName}`;
    if (msgInput) msgInput.value = '';

    const modal = document.getElementById('modal-send-student-notification');
    if (modal) modal.classList.remove('hidden');
}
window.openNotifyModal = openNotifyModal;

// Open Broadcast Notification Modal for All Active Students
function openBroadcastNotifyModal() {
    const nimInput = document.getElementById('admin-notif-target-nim');
    const bIdInput = document.getElementById('admin-notif-target-booking-id');
    const infoEl = document.getElementById('admin-notif-target-info');
    const titleInput = document.getElementById('admin-notif-input-title');
    const msgInput = document.getElementById('admin-notif-input-message');

    if (nimInput) nimInput.value = 'all';
    if (bIdInput) bIdInput.value = '';
    if (infoEl) {
        infoEl.innerHTML = `<i class="fa fa-bullhorn"></i> <strong>Target:</strong> Seluruh Mahasiswa yang sedang aktif di Portal Civitas`;
        infoEl.style.background = '#fef3c7';
        infoEl.style.color = '#92400e';
        infoEl.style.borderColor = '#fde68a';
    }
    if (titleInput) titleInput.value = 'Pengumuman Petugas Resepsionis Perpustakaan';
    if (msgInput) msgInput.value = '';

    const modal = document.getElementById('modal-send-student-notification');
    if (modal) modal.classList.remove('hidden');
}
window.openBroadcastNotifyModal = openBroadcastNotifyModal;

// Quick Template Filler for Receptionist Messages
function applyNotificationTemplate(tplKey) {
    const titleInput = document.getElementById('admin-notif-input-title');
    const msgInput = document.getElementById('admin-notif-input-message');
    const targetNim = document.getElementById('admin-notif-target-nim')?.value;
    const bookings = getBookings();
    const target = bookings.find(b => b.nim === targetNim);
    const roomName = target ? target.roomName : 'ruang diskusi';

    if (tplKey === 'kunci') {
        if (titleInput) titleInput.value = 'Peringatan: Kunci Fisik Belum Diambil';
        if (msgInput) msgInput.value = `Yth. Pemohon peminjaman ${roomName},\nKunci fisik ruangan Anda belum diambil di meja resepsionis Lt. 1. Sesuai ketentuan, batas toleransi pengambilan kunci adalah 15 menit dari jadwal mulai. Harap segera mengambil kunci fisik sebelum pemesanan otomatis gugur.`;
    } else if (tplKey === 'sisa10') {
        if (titleInput) titleInput.value = 'Pengingat: Waktu Diskusi Tersisa 10 Menit';
        if (msgInput) msgInput.value = `Pemberitahuan kepada peminjam ${roomName}:\nWaktu sesi diskusi Anda tersisa 10 menit. Mohon bersiap menyelesaikan kegiatan, merapikan meja & kursi, mematikan pendingin ruangan (AC) & infokus, dan mengembalikan kunci fisik ke meja resepsionis Lt. 1.`;
    } else if (tplKey === 'habis') {
        if (titleInput) titleInput.value = 'WAKTU SELESAI: Harap Kembalikan Kunci Fisik';
        if (msgInput) msgInput.value = `Waktu peminjaman ${roomName} telah berakhir.\nMohon segera mengosongkan ruangan dan menyerahkan kunci fisik ke petugas resepsionis di Lt. 1 sekarang juga.`;
    } else if (tplKey === 'panggilan') {
        if (titleInput) titleInput.value = 'Panggilan Petugas Resepsionis Gedung P';
        if (msgInput) msgInput.value = `Diharapkan perwakilan kelompok peminjam ${roomName} dapat segera menemui petugas resepsionis di meja layanan Gedung P Lantai 1 perihal administrasi peminjaman.`;
    }
}
window.applyNotificationTemplate = applyNotificationTemplate;

// Submit Admin Notification via Socket.IO and REST API
function submitAdminNotification() {
    const targetNim = document.getElementById('admin-notif-target-nim')?.value || 'all';
    const targetBookingId = document.getElementById('admin-notif-target-booking-id')?.value || null;
    const title = document.getElementById('admin-notif-input-title')?.value.trim();
    const message = document.getElementById('admin-notif-input-message')?.value.trim();

    if (!message) {
        alert('Silakan tulis isi pesan terlebih dahulu sebelum mengirim.');
        return;
    }

    const payload = {
        targetNim,
        targetBookingId,
        title: title || 'Pemberitahuan Petugas Resepsionis',
        message,
        sender: 'Petugas Resepsionis Lt. 1',
        createdAt: getSystemNow().toISOString()
    };

    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('admin:send_notification', payload);
    } else {
        fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.warn('HTTP Notification send warning:', err));
    }

    closeModal('modal-send-student-notification');
    alert('Notifikasi berhasil dikirimkan ke mahasiswa secara realtime!');
}
window.submitAdminNotification = submitAdminNotification;

// Cancel current active session directly
function cancelActiveSession() {
    const bookings = getBookings();
    const active = bookings.find(b => b.nim === CURRENT_USER.nim && ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status));
    if (active) {
        cancelBooking(active.id);
    } else {
        alert('Tidak ada sesi peminjaman aktif yang dapat dibatalkan.');
    }
}
window.cancelActiveSession = cancelActiveSession;

// Detail Kapasitas Ruang Diskusi (Hotspot Denah Interaktif)
const ROOM_CAPACITY_DETAILS = {
    'RD-01': {
        name: 'Ruang Diskusi 1 (RD-01)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    },
    'RD-02': {
        name: 'Ruang Diskusi 2 (RD-02)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    },
    'RD-03': {
        name: 'Ruang Diskusi 3 (RD-03)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    },
    'RD-04': {
        name: 'Ruang Diskusi 4 (RD-04)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    },
    'RD-05': {
        name: 'Ruang Diskusi 5 (RD-05)',
        min: 5,
        max: 10,
        desc: 'Maksimal 10 Mahasiswa (Minimal 5 Mahasiswa)',
        facilities: 'Meja rapat diskusi panjang, kursi ergonomis, papan tulis whiteboard besar, AC split 2 PK, dan stopkontak meja.'
    },
    'RD-06': {
        name: 'Ruang Diskusi 6 (RD-06)',
        min: 5,
        max: 10,
        desc: 'Maksimal 10 Mahasiswa (Minimal 5 Mahasiswa)',
        facilities: 'Meja rapat diskusi panjang, kursi ergonomis, papan tulis whiteboard besar, AC split 2 PK, dan stopkontak meja.'
    },
    'RD-07': {
        name: 'Ruang Diskusi 7 (RD-07 Lesehan)',
        min: 10,
        max: 20,
        desc: 'Maksimal 20 Mahasiswa (Minimal 10 Mahasiswa)',
        facilities: 'Konsep Lesehan dengan karpet beludru tebal bersih, meja lesehan panjang, stopkontak melingkar, bantal duduk, dan AC sentral. Cocok untuk diskusi kelompok besar/mentoring massal.'
    },
    'RD-08': {
        name: 'Ruang Diskusi 8 (RD-08)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    },
    'RD-09': {
        name: 'Ruang Diskusi 9 (RD-09)',
        min: 3,
        max: 8,
        desc: 'Maksimal 8 Mahasiswa (Minimal 3 Mahasiswa)',
        facilities: 'Meja diskusi kayu, kursi putar ergonomis, papan tulis whiteboard kaca + spidol & penghapus, AC split, dan colokan stopkontak.'
    }
};

function showRoomCapacityModal(roomId) {
    const info = ROOM_CAPACITY_DETAILS[roomId] || {
        name: `Ruang Diskusi (${roomId})`,
        min: 3,
        max: 8,
        desc: 'Kapasitas Standar Ruang Diskusi',
        facilities: 'Meja diskusi, kursi, papan tulis, AC, dan stopkontak.'
    };

    const titleEl = document.getElementById('modal-capacity-room-name');
    const numberEl = document.getElementById('modal-capacity-number');
    const ruleEl = document.getElementById('modal-capacity-rule');
    const facilitiesEl = document.getElementById('modal-capacity-facilities');
    const modal = document.getElementById('modal-room-capacity');

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa fa-door-open" style="color:#0284c7;"></i> <span>${info.name}</span>`;
    }
    if (numberEl) {
        numberEl.innerHTML = `<i class="fa fa-users" style="color:#0284c7; font-size:1.4rem; margin-right:6px;"></i> ${info.min} s.d. ${info.max} Orang`;
    }
    if (ruleEl) {
        ruleEl.textContent = info.desc;
    }
    if (facilitiesEl) {
        facilitiesEl.innerHTML = `<strong>Fasilitas:</strong> ${info.facilities}`;
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
}
window.showRoomCapacityModal = showRoomCapacityModal;


