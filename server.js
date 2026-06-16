const express = require('express');
const loki = require('lokijs');
const ExcelJS = require('exceljs');

const app = express();

// 1. INISIALISASI DATABASE (VERSI RAMAH VERCEL - IN MEMORY)
const db = new loki('peminjaman.db');
let logPinjam = db.addCollection("logPinjam");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// DAFTAR MASTER BARANG SEBAGAI VALIDASI
const DATA_BARANG = {
    laptop: ["Laptop A", "Laptop B", "Laptop C", "Laptop D", "Laptop E"],
    flashdisk: ["FD Gantungan Merah", "FD Gantungan Ungu", "FD Gantungan Hitam", "FD Gantungan Abu-Abu", "FD Gantungan Kuning"],
    tablet: ["Tablet A", "Tablet B"],
    aksesoris: ["Converter HDMI to VGA"]
};

app.get('/', (req, res) => {
    res.send(renderFormPeminjaman());
});

// 2. PROSES LOGIKA PINJAM / KEMBALI BARANG
app.post('/transaksi', (req, res) => {
    const { namaKaryawan, namaSekolah, aksi, barangDibatalkan } = req.body;
    
    // Sinkronisasi Jam Indonesia (WIB)
  // Paksa Vercel Menggunakan Zona Waktu Asia/Jakarta (WIB)
    const sekarang = new Date();
    const tanggal = sekarang.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
    const jamMenit = sekarang.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
    const waktuLengkap = jamMenit.replace('.', ':') + ' WIB';

    if (!namaKaryawan) return res.redirect('/');

    if (aksi === "Pinjam") {
        if (!namaSekolah) {
            return res.send(`<script>alert('Nama Sekolah Tujuan wajib diisi!'); window.location.href='/';</script>`);
        }

        let barangDipilih = [];
        DATA_BARANG.laptop.forEach(item => { if (req.body[item]) barangDipilih.push(item); });
        DATA_BARANG.flashdisk.forEach(item => { if (req.body[item]) barangDipilih.push(item); });
        DATA_BARANG.tablet.forEach(item => { if (req.body[item]) barangDipilih.push(item); });
        DATA_BARANG.aksesoris.forEach(item => { if (req.body[item]) barangDipilih.push(item); });

        if (barangDipilih.length === 0) {
            return res.send(`<script>alert('Pilih minimal 1 barang yang ingin dibawa!'); window.location.href='/';</script>`);
        }

        for (let barang of barangDipilih) {
            let adaYangPinjam = logPinjam.findOne({ namaBarang: barang, status: "DIBAWA KELUAR" });
            if (adaYangPinjam) {
                return res.send(`<script>alert('${barang} saat ini sedang dibawa keluar oleh ${adaYangPinjam.peminjam} ke ${adaYangPinjam.sekolah}!'); window.location.href='/';</script>`);
            }
        }

        barangDipilih.forEach(barang => {
            logPinjam.insert({
                peminjam: namaKaryawan,
                sekolah: namaSekolah,
                namaBarang: barang,
                tanggalPinjam: tanggal,
                jamPinjam: jamMenit,
                tanggalKembali: "-",
                jamKembali: "-",
                status: "DIBAWA KELUAR",
                timestamp: sekarang.getTime()
            });
        });

        res.send(`<script>alert('Berhasil mencatat barang keluar! Selamat mengajar.'); window.location.href='/';</script>`);

    } else if (aksi === "Kembali") {
        let barangKembali = [];
        if (Array.isArray(barangDibatalkan)) {
            barangKembali = barangDibatalkan;
        } else if (barangDibatalkan) {
            barangKembali = [barangDibatalkan];
        }

        if (barangKembali.length === 0) {
            return res.send(`<script>alert('Pilih minimal 1 barang yang ingin dikembalikan!'); window.location.href='/';</script>`);
        }

        barangKembali.forEach(idDoc => {
            let record = logPinjam.get(Number(idDoc));
            if (record && record.status === "DIBAWA KELUAR") {
                record.status = "KEMBALI DI GUDANG";
                record.tanggalKembali = tanggal;
                record.jamKembali = jamMenit;
                logPinjam.update(record);
            }
        });

        res.send(`<script>alert('Barang berhasil dikembalikan ke gudang kantor!'); window.location.href='/';</script>`);
    }
});

app.get('/list-pinjaman/:karyawan', (req, res) => {
    const list = logPinjam.find({ peminjam: req.params.karyawan, status: "DIBAWA KELUAR" });
    res.json(list);
});

// 3. LOGIN ADMIN
app.get('/login', (req, res) => res.send(renderLoginAdmin()));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'nasgorenak' && password === '123') {
        res.redirect('/admin-dashboard');
    } else {
        res.send(`<script>alert('Username/Password salah!'); window.location.href='/login';</script>`);
    }
});

// 4. DASHBOARD ADMIN
app.get('/admin-dashboard', (req, res) => {
    const listLog = logPinjam.chain().simplesort('timestamp', true).data();
    res.send(renderDashboardAdmin(listLog));
});

// 5. DOWNLOAD DATA EXCEL
app.get('/download-excel', async (req, res) => {
    const listLog = logPinjam.chain().simplesort('timestamp', false).data();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Log Logistik Sekolah');

    worksheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama Instruktur', key: 'peminjam', width: 22 },
        { header: 'Sekolah Tujuan', key: 'sekolah', width: 25 },
        { header: 'Nama Alat/Barang', key: 'namaBarang', width: 25 },
        { header: 'Tgl Pinjam', key: 'tanggalPinjam', width: 15 },
        { header: 'Jam Pinjam', key: 'jamPinjam', width: 15 },
        { header: 'Tgl Kembali', key: 'tanggalKembali', width: 15 },
        { header: 'Jam Kembali', key: 'jamKembali', width: 15 },
        { header: 'Status Aset', key: 'status', width: 22 }
    ];

    listLog.forEach((data, index) => {
        worksheet.addRow({
            no: index + 1,
            peminjam: data.peminjam,
            sekolah: data.sekolah,
            namaBarang: data.namaBarang,
            tanggalPinjam: data.tanggalPinjam,
            jamPinjam: data.jamPinjam,
            tanggalKembali: data.tanggalKembali,
            jamKembali: data.jamKembali,
            status: data.status
        });
    });

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7F1D1D' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Log_Peminjaman_Alat_Kantor.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// 6. TRUNCATE DATA
app.get('/clear-data', (req, res) => {
    logPinjam.clear();
    res.send(`<script>alert('Log peminjaman dibersihkan!'); window.location.href='/admin-dashboard';</script>`);
});

// ==================== TAMPILAN FRONT-END (NEON RED MODE) ====================

function renderFormPeminjaman() {
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logistik Alat Kantor - Sekolah</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            :root { --bg-color: #0b0c10; --card-bg: rgba(28, 15, 15, 0.8); --border-color: rgba(239, 68, 68, 0.15); --text-primary: #f9fafb; --text-muted: #9ca3af; --accent-red: #ef4444; --accent-amber: #f59e0b; }
            body { background-color: var(--bg-color); color: var(--text-primary); font-family: 'Inter', sans-serif; min-height: 100vh; background-image: radial-gradient(at 0% 0%, rgba(239, 68, 68, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(245, 94, 11, 0.05) 0px, transparent 50%); padding: 40px 10px; } 
            .card { background: var(--card-bg) !important; backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.05); }
            .main-title { font-size: 1.6rem; background: linear-gradient(to right, #ffffff, #fca5a5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; letter-spacing: -0.5px; }
            .form-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px; }
            .form-control { background-color: rgba(15, 11, 11, 0.6); border: 1px solid var(--border-color); color: #ffffff; border-radius: 12px; padding: 0.65rem 1rem; }
            .form-control:focus { background-color: rgba(15, 11, 11, 0.8); border-color: var(--accent-red); color: #fff; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15); }
            .category-title { font-size: 0.85rem; color: var(--accent-red); font-weight: bold; border-left: 3px solid var(--accent-red); padding-left: 8px; margin-top: 18px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .grid-barang { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
            .item-check { background: rgba(255,255,255,0.01); border: 1px solid rgba(255, 255, 255, 0.05); padding: 11px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; }
            .item-check:hover { background: rgba(239, 68, 68, 0.03); border-color: rgba(239, 68, 68, 0.3); }
            .item-check input { cursor: pointer; accent-color: var(--accent-red); }
            .btn-outline-danger { border-color: var(--border-color); color: var(--text-muted); }
            .btn-check:checked + .btn-outline-danger { background-color: var(--accent-red); border-color: var(--accent-red); color: #ffffff; font-weight: 600; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25); }
            .btn-check:checked + .btn-outline-warning { background-color: var(--accent-amber); border-color: var(--accent-amber); color: #000000; font-weight: 600; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25); }
            .btn-action { font-weight: 700; border-radius: 12px; padding: 0.75rem; border: none; transition: all 0.3s ease; }
            .btn-pinjam { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: #ffffff; }
            .btn-pinjam:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35); }
            .btn-kembali { background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); color: #000000; }
            .btn-kembali:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(245, 158, 11, 0.35); }
            hr { border-color: rgba(255, 255, 255, 0.06); }
        </style>
    </head>
    <body>
    <div class="container d-flex justify-content-center">
        <div class="card p-4 text-white w-100" style="max-width: 500px;">
            <h3 class="text-center mb-1 main-title">🚨 LOGISTIK ALAT KANTOR</h3>
            <p class="text-center text-muted small mb-4">Peminjaman Aset Keluar ke Sekolah</p>
            
            <form action="/transaksi" method="POST">
                <div class="mb-3">
                    <label class="form-label">NAMA KARYAWAN / INSTRUKTUR</label>
                    <input type="text" class="form-control" name="namaKaryawan" id="inputNama" required autocomplete="off" placeholder="Tulis nama kamu..." oninput="pantauPinjamanKaryawan()">
                </div>

                <div class="mb-4">
                    <label class="form-label">AKSI LOGISTIK</label>
                   <div class="mb-4">
                    <label class="form-label">AKSI LOGISTIK</label>
                    <div class="d-flex gap-2">
                        <input type="radio" class="btn-check" name="aksi" id="modePinjam" value="Pinjam" checked onclick="pilihMode(true)">
                        <label class="btn btn-outline-danger w-100 py-2" for="modePinjam">🚩 Bawa Keluar</label>
                        
                        <input type="radio" class="btn-check" name="aksi" id="modeKembali" value="Kembali" onclick="pilihMode(false)">
                        <label class="btn btn-outline-warning w-100 py-2" for="modeKembali">📥 Kembalikan</label>
                    </div>
                </div>

                <div id="panelPinjam">
                    <div class="mb-3">
                        <label class="form-label">SEKOLAH TUJUAN</label>
                        <input type="text" class="form-control" name="namaSekolah" id="inputSekolah" autocomplete="off" placeholder="Contoh: SDIT Al-Barkah">
                    </div>

                    <label class="form-label">PILIH BARANG YANG DIBAWA</label>
                    
                    <div class="category-title">💻 LAPTOP</div>
                    <div class="grid-barang">
                        ${DATA_BARANG.laptop.map(l => `<label class="item-check"><input type="checkbox" name="${l}"> ${l}</label>`).join('')}
                    </div>

                    <div class="category-title">💾 FLASHDISK (GANTUNGAN)</div>
                    <div class="grid-barang">
                        ${DATA_BARANG.flashdisk.map(f => `<label class="item-check"><input type="checkbox" name="${f}"> ${f.replace('FD Gantungan ', '')}</label>`).join('')}
                    </div>

                    <div class="category-title">📱 TABLET</div>
                    <div class="grid-barang">
                        ${DATA_BARANG.tablet.map(t => `<label class="item-check"><input type="checkbox" name="${t}"> ${t}</label>`).join('')}
                    </div>

                    <div class="category-title">🔌 AKSESORIS</div>
                    <div>
                        ${DATA_BARANG.aksesoris.map(a => `<label class="item-check w-100"><input type="checkbox" name="${a}"> ${a}</label>`).join('')}
                    </div>

                    <button type="submit" class="btn btn-action btn-pinjam w-100 mt-4">Konfirmasi Bawa Keluar</button>
                </div>

                <div id="panelKembali" style="display: none;">
                    <div class="alert alert-danger bg-danger bg-opacity-10 border-0 text-white small mb-3">
                        💡 Ketik nama kamu di atas untuk memunculkan barang apa saja yang sedang kamu bawa saat ini.
                    </div>
                    <label class="form-label text-warning">CENTANG BARANG YANG MAU DIKEMBALIKAN</label>
                    <div id="boxBarangDibawa" class="d-flex flex-column gap-2 mt-2">
                        <span class="text-muted small italic">Belum ada barang terdeteksi...</span>
                    </div>
                    <button type="submit" class="btn btn-action btn-kembali w-100 mt-4">Proses Pengembalian</button>
                </div>
            </form>
            <hr>
            <div class="text-center"><a href="/login" style="color:var(--text-muted);" class="text-decoration-none small">Masuk Panel Admin / Monitoring</a></div>
        </div>
    </div>

    <script>
        function pilihMode(isPinjam) {
            document.getElementById('panelPinjam').style.display = isPinjam ? 'block' : 'none';
            document.getElementById('panelKembali').style.display = isPinjam ? 'none' : 'block';
            if(!isPinjam) pantauPinjamanKaryawan();
        }

        async function pantauPinjamanKaryawan() {
            const nama = document.getElementById('inputNama').value.trim();
            const box = document.getElementById('boxBarangDibawa');
            if(!nama) {
                box.innerHTML = '<span class="text-muted small italic">Ketik nama kamu untuk melihat barang...</span>';
                return;
            }

            try {
                const res = await fetch('/list-pinjaman/' + encodeURIComponent(nama));
                const data = await res.json();
                if(data.length === 0) {
                    box.innerHTML = '<span class="text-warning small">Kamu tidak tercatat sedang membawa barang apa pun.</span>';
                } else {
                    box.innerHTML = data.map(item => \`
                        <label class="item-check d-flex justify-content-between">
                            <span><input type="checkbox" name="barangDibatalkan" value="\${item.$loki}"> <strong>\${item.namaBarang}</strong></span>
                            <span class="text-muted" style="font-size:11px;">📍 \${item.sekolah}</span>
                        </label>
                    \`).join('');
                }
            } catch(e) {
                box.innerHTML = '<span class="text-danger small">Gagal memuat inventory.</span>';
            }
        }
    </script>
    </body></html>`;
}

function renderLoginAdmin() {
    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Login Admin</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="bg-dark d-flex align-items-center justify-content-center" style="height: 100vh;"><div class="card p-4 bg-white" style="width: 100%; max-width: 380px; border-radius: 12px;"><h4 class="text-center mb-3 fw-bold">Admin Inventory</h4><form action="/login" method="POST"><div class="mb-3"><label class="form-label">Username</label><input type="text" class="form-control" name="username" value="nasgorenak" required></div><div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" name="password" value="123" required></div><button type="submit" class="btn btn-primary w-100">Masuk Monitor</button></form><a href="/" class="d-block text-center mt-3 text-decoration-none text-muted small">Kembali</a></div></body></html>`;
}

function renderDashboardAdmin(listLog) {
    let rows = listLog.map((log, index) => {
        let isKeluar = log.status === "DIBAWA KELUAR";
        let badgeStatus = isKeluar ? "bg-danger" : "bg-success";
        return `
            <tr>
                <td>${index + 1}</td>
                <td class="fw-bold text-danger">${log.peminjam}</td>
                <td><span class="badge bg-dark">${log.sekolah}</span></td>
                <td class="fw-semibold">${log.namaBarang}</td>
                <td class="text-secondary small">${log.tanggalPinjam}<br>${log.jamPinjam}</td>
                <td class="text-secondary small">${log.tanggalKembali}<br>${log.jamKembali}</td>
                <td><span class="badge ${badgeStatus}">${log.status}</span></td>
            </tr>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><title>Monitor Logistik Kantor</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head>
    <body class="bg-light">
    <div class="container py-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="fw-bold">🖥️ Monitoring Aset & Logistik Sekolah</h2>
            <div>
                <a href="/download-excel" class="btn btn-danger me-2 fw-bold">📥 Cetak Berita Acara (Excel)</a>
                <a href="/clear-data" class="btn btn-outline-dark" onclick="return confirm('Hapus semua riwayat log?')">Reset Log</a>
                <a href="/" class="btn btn-secondary ms-2">Form Utama</a>
            </div>
        </div>
        <div class="card p-4 bg-white border-0 shadow-sm" style="border-radius: 12px;">
            <div class="table-responsive">
                <table class="table table-striped align-middle">
                    <thead class="table-dark" style="background-color:#7F1D1D !important;"><tr><th>#</th><th>Instruktur</th><th>Sekolah Tujuan</th><th>Nama Alat/Barang</th><th>Waktu Keluar</th><th>Waktu Kembali</th><th>Status Gudang</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="7" class="text-center text-muted">Seluruh aset aman terdata di dalam gudang kantor.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    </div>
    </body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Logistik Aktif di Port ${PORT}!`);
});