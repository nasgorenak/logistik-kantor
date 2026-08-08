const express = require('express');
const app = express();

// Halaman Utama - Status Maintenance Minimalis
app.get('/', (req, res) => {
    res.send(renderMaintenancePage());
});

// Redirect semua route tak dikenal ke halaman utama
app.get('*', (req, res) => {
    res.redirect('/');
});

function renderMaintenancePage() {
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sistem Dalam Pemeliharaan - Minimalist Earth Tone</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
        <style>
            :root { 
                --bg-earth: #f4efe6;          /* Cream Soft Background */
                --card-bg: #faf7f2;          /* Off-white Warm Card */
                --sage-green: #556b2f;       /* Forest / Sage Green Accent */
                --brown-wood: #6b4423;       /* Warm Brown Accent */
                --text-dark: #2c2523;        /* Dark Espresso Text */
                --text-muted: #786c66;       /* Soft Taupe Muted */
                --border-color: #e2d7c7;     /* Minimalist Border */
            }
            
            body { 
                background-color: var(--bg-earth); 
                color: var(--text-dark); 
                font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                min-height: 100vh; 
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px 16px;
                margin: 0;
            } 
            
            .card-minimalist { 
                background-color: var(--card-bg); 
                border: 1px solid var(--border-color); 
                border-radius: 28px; 
                box-shadow: 0 15px 35px rgba(107, 68, 35, 0.06); 
                max-width: 440px;
                width: 100%;
                text-align: center;
                padding: 3rem 2.2rem;
            }

            .badge-status {
                background-color: rgba(85, 107, 47, 0.1);
                border: 1px solid rgba(85, 107, 47, 0.25);
                color: var(--sage-green);
                font-size: 0.72rem;
                font-weight: 700;
                padding: 6px 16px;
                border-radius: 50px;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 1.5rem;
            }

            .status-dot {
                width: 7px;
                height: 7px;
                background-color: var(--sage-green);
                border-radius: 50%;
                display: inline-block;
            }

            .title { 
                font-size: 1.5rem; 
                color: var(--brown-wood);
                font-weight: 800; 
                letter-spacing: -0.3px;
                margin-bottom: 0.8rem;
            }

            .desc {
                color: var(--text-muted);
                font-size: 0.92rem;
                line-height: 1.6;
                margin-bottom: 2rem;
            }

            .btn-instagram {
                background-color: var(--sage-green);
                color: #ffffff;
                font-weight: 600;
                font-size: 0.9rem;
                padding: 0.8rem 1.6rem;
                border-radius: 16px;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.25s ease;
                border: none;
                box-shadow: 0 4px 14px rgba(85, 107, 47, 0.2);
                width: 100%;
            }

            .btn-instagram:hover {
                background-color: var(--brown-wood);
                color: #ffffff;
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(107, 68, 35, 0.25);
            }

            .footer-text {
                color: var(--text-muted);
                font-size: 0.78rem;
                margin-top: 2rem;
                border-top: 1px dashed var(--border-color);
                padding-top: 1.2rem;
            }
        </style>
    </head>
    <body>
        <div class="card-minimalist">
            <div>
                <span class="badge-status">
                    <span class="status-dot"></span> System Maintenance
                </span>
            </div>
            
            <h3 class="title">Sedang Dalam Pemeliharaan</h3>
            
            <p class="desc">
                Layanan sedang diperbarui untuk peningkatan performa dan kenyamanan. Untuk informasi lebih lanjut atau pertanyaan, silakan hubungi lewat Instagram.
            </p>

            <a href="https://instagram.com/mieftahadib" target="_blank" class="btn-instagram">
                <i class="bi bi-instagram fs-5"></i>
                <span>Ikuti di Instagram</span>
            </a>

            <div class="footer-text">
                &copy; Logistik Kantor &bull; Mifta
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}