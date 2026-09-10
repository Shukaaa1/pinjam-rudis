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
    nama: 'VERI GALIH SETIYO AJI',
    nim: '4131230098',
    email: 'galih_4131230098@pknstan.ac.id',
    prodi: 'Sarjana Terapan Manajemen Keuangan Negara',
    kelas: '4-01',
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

// Load Bookings from localStorage or Seed
function getBookings() {
    const saved = localStorage.getItem('pinjam_rudis_bookings');
    if (!saved) {
        localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(SEED_BOOKINGS));
        return SEED_BOOKINGS;
    }
    return JSON.parse(saved);
}

// Save Bookings to localStorage and Dispatch Event
function saveBookings(bookings) {
    localStorage.setItem('pinjam_rudis_bookings', JSON.stringify(bookings));
    window.dispatchEvent(new Event('storage'));
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Set default date picker to today
    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }

    renderMatrixGrid();
    renderMyBookings();
    
    // Auto sync when storage changes (Cross-Tab Live Sync)
    window.addEventListener('storage', () => {
        renderMatrixGrid();
        renderMyBookings();
        if (typeof renderAdminTable === 'function') renderAdminTable();
        if (typeof renderAdminRoomGrid === 'function') renderAdminRoomGrid();
    });
});

// Navigation Tab Switcher
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

    event.currentTarget.classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');

    if (tabId === 'tab-matrix') renderMatrixGrid();
    if (tabId === 'tab-history') renderMyBookings();
}

// Render Matrix Grid Availability
function renderMatrixGrid() {
    const gridBody = document.getElementById('matrix-grid-body');
    if (!gridBody) return;

    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    const bookings = getBookings();

    let html = '';
    MASTER_ROOMS.forEach(room => {
        html += `<tr>`;
        html += `<td class="room-label">
                    <div><strong>${room.name}</strong></div>
                    <small style="color:#6c757d;">${room.desc}</small>
                 </td>`;

        TIME_SLOTS.forEach(slot => {
            // Find active booking matching room, date, and slot
            const activeBooking = bookings.find(b => 
                b.roomId === room.id && 
                b.date === filterDate && 
                isSlotOccupied(b.slot, b.durasi, slot) &&
                ['Menunggu Kunci', 'Sedang Digunakan'].includes(b.status)
            );

            if (activeBooking) {
                if (activeBooking.status === 'Sedang Digunakan') {
                    html += `<td>
                                <button class="slot-btn slot-booked" title="Terpakai oleh ${activeBooking.nama}">
                                    <i class="fa fa-lock"></i> Terpakai
                                </button>
                             </td>`;
                } else {
                    html += `<td>
                                <button class="slot-btn slot-pending" title="Menunggu pengambilan kunci">
                                    <i class="fa fa-clock"></i> Dipesan
                                </button>
                             </td>`;
                }
            } else {
                html += `<td>
                            <button class="slot-btn slot-available" onclick="openBookingModal('${room.id}', '${room.name}', '${slot}', ${room.cap})">
                                <i class="fa fa-plus-circle"></i> ${slot}
                            </button>
                         </td>`;
            }
        });

        html += `</tr>`;
    });

    gridBody.innerHTML = html;
}

// Helper check if slot is within duration
function isSlotOccupied(startSlot, durasiHours, targetSlot) {
    const startIndex = TIME_SLOTS.indexOf(startSlot);
    const targetIndex = TIME_SLOTS.indexOf(targetSlot);
    if (startIndex === -1 || targetIndex === -1) return false;
    return targetIndex >= startIndex && targetIndex < (startIndex + durasiHours);
}

// Open Booking Modal with Selected Data
let selectedSlotData = null;
function openBookingModal(roomId, roomName, slot, roomCap) {
    const filterDate = document.getElementById('filter-date')?.value || getTodayDateString();
    selectedSlotData = { roomId, roomName, slot, date: filterDate, roomCap };

    document.getElementById('target-room-slot').value = `${roomName} (${filterDate} - Jam ${slot})`;
    document.getElementById('room-cap-hint').innerText = `Kapasitas maksimal ruangan ini: ${roomCap} orang (Minimal 3 orang).`;
    
    const modal = document.getElementById('booking-modal');
    modal.classList.remove('hidden');
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

// Submit New Booking Form
function handleFormSubmit(e) {
    e.preventDefault();
    if (!selectedSlotData) return;

    const hp = document.getElementById('input-hp').value;
    const jumlah = parseInt(document.getElementById('input-jumlah').value);
    const durasi = parseInt(document.getElementById('input-durasi').value);
    const keperluan = document.getElementById('input-keperluan').value;

    if (jumlah < 3) {
        alert('Sesuai aturan, peminjaman minimal 3 orang per kelompok.');
        return;
    }
    if (jumlah > selectedSlotData.roomCap) {
        alert(`Jumlah anggota melebihi kapasitas ruangan (Maksimal ${selectedSlotData.roomCap} orang).`);
        return;
    }

    const bookings = getBookings();

    const newBooking = {
        id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
        nama: CURRENT_USER.nama,
        nim: CURRENT_USER.nim,
        prodi: CURRENT_USER.prodi,
        kelas: CURRENT_USER.kelas,
        hp: hp,
        roomId: selectedSlotData.roomId,
        roomName: selectedSlotData.roomName,
        date: selectedSlotData.date,
        slot: selectedSlotData.slot,
        durasi: durasi,
        jumlah: jumlah,
        keperluan: keperluan,
        status: 'Menunggu Kunci',
        ktmVerified: false,
        createdAt: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    saveBookings(bookings);

    closeModal('booking-modal');
    alert(`Pemesanan Berhasil!\nKode Booking Anda: ${newBooking.id}\nSilakan ambil kunci di Meja Resepsionis (Gedung P Lantai 1) 5 menit sebelum jadwal.`);
    
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

    let html = '';
    bookings.forEach(b => {
        let badgeClass = 'badge-secondary';
        if (b.status === 'Menunggu Kunci') badgeClass = 'badge-warning';
        if (b.status === 'Sedang Digunakan') badgeClass = 'badge-success';
        if (b.status === 'Selesai') badgeClass = 'badge-info';
        if (b.status === 'Dibatalkan' || b.status === 'Gugur (>15m)') badgeClass = 'badge-danger';

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
                    <td><span class="badge ${badgeClass}">${b.status}</span></td>
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

    let html = '';
    filtered.forEach(b => {
        let statusBadge = `<span class="badge badge-secondary">${b.status}</span>`;
        if (b.status === 'Menunggu Kunci') statusBadge = `<span class="badge badge-warning"><i class="fa fa-clock"></i> Menunggu Kunci</span>`;
        if (b.status === 'Sedang Digunakan') statusBadge = `<span class="badge badge-success"><i class="fa fa-key"></i> Kunci Diserahkan</span>`;
        if (b.status === 'Selesai') statusBadge = `<span class="badge badge-info"><i class="fa fa-check-double"></i> Selesai</span>`;
        if (b.status === 'Dibatalkan' || b.status === 'Gugur (>15m)') statusBadge = `<span class="badge badge-danger">${b.status}</span>`;

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
