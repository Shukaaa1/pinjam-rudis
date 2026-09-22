/**
 * Server Backend & Realtime Engine
 * Peminjaman Ruang Diskusi Civitas PKN STAN & Portal Admin Resepsionis
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'bookings.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to read bookings safely
function readBookings() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const seed = [
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
                    status: 'Sedang Digunakan',
                    ktmVerified: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'BK-1002',
                    nama: 'Annisa Putri Rahmadani',
                    nim: '2301100102',
                    prodi: 'D III Akuntansi',
                    kelas: '3-04',
                    hp: '081211110002',
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
            fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
            fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
            return seed;
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('[Storage Error] Gagal membaca data booking:', err);
        return [];
    }
}

// Helper to write bookings
function writeBookings(data) {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[Storage Error] Gagal menyimpan data booking:', err);
        return false;
    }
}

// State Simulasi Waktu Sistem untuk Presentasi
let systemTimeState = {
    isSimulated: false,
    simulatedTime: null,
    setAt: null
};

function getSystemNow() {
    if (systemTimeState.isSimulated && systemTimeState.simulatedTime && systemTimeState.setAt) {
        const elapsed = Date.now() - systemTimeState.setAt;
        return new Date(new Date(systemTimeState.simulatedTime).getTime() + elapsed);
    }
    return new Date();
}

function getTodayDateString() {
    const today = getSystemNow();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getSystemTimePayload() {
    const now = getSystemNow();
    return {
        isSimulated: systemTimeState.isSimulated,
        simulatedTime: systemTimeState.simulatedTime,
        currentTime: now.toISOString(),
        currentDate: getTodayDateString()
    };
}

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

// Check auto-expiry (15-minute key pickup grace period)
function checkAutoExpire() {
    const bookings = readBookings();
    if (!Array.isArray(bookings) || bookings.length === 0) return false;

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
        writeBookings(bookings);
        io.emit('bookings:sync', bookings);
        console.log(`[Auto-Expire] Pemesanan yang melewati batas toleransi 15 menit telah diperbarui.`);
        return true;
    }
    return false;
}

// Background auto-expire runner every 10 seconds
setInterval(checkAutoExpire, 10000);

// API Endpoints for System Time Simulation
app.get('/api/time', (req, res) => {
    res.json(getSystemTimePayload());
});

app.post('/api/time', (req, res) => {
    const { isSimulated, simulatedTime } = req.body;
    if (isSimulated && simulatedTime) {
        systemTimeState = {
            isSimulated: true,
            simulatedTime: new Date(simulatedTime).toISOString(),
            setAt: Date.now()
        };
    } else {
        systemTimeState = {
            isSimulated: false,
            simulatedTime: null,
            setAt: null
        };
    }
    checkAutoExpire();
    const payload = getSystemTimePayload();
    io.emit('time:sync', payload);
    console.log(`[System-Time] Mode waktu diperbarui:`, payload);
    return res.json({ success: true, ...payload });
});

// API Endpoints
app.get('/api/bookings', (req, res) => {
    checkAutoExpire();
    res.json(readBookings());
});

app.post('/api/bookings', (req, res) => {
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Body harus berupa array bookings' });
    }
    const success = writeBookings(req.body);
    if (success) {
        io.emit('bookings:sync', req.body);
        return res.json({ success: true, count: req.body.length });
    } else {
        return res.status(500).json({ error: 'Gagal menyimpan data ke server' });
    }
});

// Static files
app.use('/adminrudis', express.static(path.join(__dirname, 'adminrudis')));
app.use(express.static(path.join(__dirname)));

// Root route: open Student Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Portal Civitas route
app.get('/portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO Events
io.on('connection', (socket) => {
    console.log(`[Socket Connected] Klien terhubung: ${socket.id}`);

    // Send latest data and system time on connect
    socket.emit('bookings:sync', readBookings());
    socket.emit('time:sync', getSystemTimePayload());

    // Listen for system time simulation updates
    socket.on('setSystemTime', (data) => {
        if (data && data.isSimulated && data.simulatedTime) {
            systemTimeState = {
                isSimulated: true,
                simulatedTime: new Date(data.simulatedTime).toISOString(),
                setAt: Date.now()
            };
        } else {
            systemTimeState = {
                isSimulated: false,
                simulatedTime: null,
                setAt: null
            };
        }
        checkAutoExpire();
        const payload = getSystemTimePayload();
        io.emit('time:sync', payload);
        console.log(`[Socket] Waktu sistem diperbarui via socket:`, payload);
    });

    // Listen for client data updates
    socket.on('updateBookings', (newBookings) => {
        if (Array.isArray(newBookings)) {
            writeBookings(newBookings);
            // Broadcast to all other clients
            socket.broadcast.emit('bookings:sync', newBookings);
            // Also confirm back
            socket.emit('bookings:sync', newBookings);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket Disconnected] Klien terputus: ${socket.id}`);
    });
});

// Helper to get local IP
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

server.listen(PORT, () => {
    const localIp = getLocalIpAddress();
    console.log('================================================================');
    console.log('🚀 SERVER PEMINJAMAN RUANG DISKUSI PKN STAN BERJALAN');
    console.log(`👉 Akses Lokal (Laptop):       http://localhost:${PORT}`);
    console.log(`👉 Akses Jaringan Wi-Fi/LAN:   http://${localIp}:${PORT}`);
    console.log(`👉 Portal Mahasiswa Civitas:   http://${localIp}:${PORT}/portal`);
    console.log(`👉 Portal Admin Resepsionis:   http://${localIp}:${PORT}/adminrudis/login.html`);
    console.log('================================================================');
});
