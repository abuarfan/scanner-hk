// Variabel global penyimpan grafik agar tidak menumpuk saat tab diganti
let grafikKelulusan = null;
// ==================== ANALISIS BUTIR SOAL & DAYA PEMBEDA ====================
function tampilkanStatistik() {
    let wadah = document.getElementById('wadahStatistik');
    if(!wadah) return;

    let totalSiswa = riwayatData.length;
    if(totalSiswa === 0) { 
        wadah.innerHTML = '<div class="card" style="padding: 30px; text-align: center; color: var(--text-muted); font-weight: 600;">Belum ada data nilai. Silakan scan LJK terlebih dahulu.</div>'; 
        return; 
    }

    let batasKKM = parseFloat(document.getElementById('inputKKM').value);
    if (isNaN(batasKKM)) batasKKM = 75;

    let jmlLulus = 0; let jmlRemedial = 0; let totalNilai = 0; 
    let nilaiMin = riwayatData[0].nilai; let nilaiMax = riwayatData[0].nilai;

    riwayatData.forEach(d => { 
        if(d.nilai >= batasKKM) jmlLulus++; else jmlRemedial++; 
        totalNilai += d.nilai;
        if(d.nilai < nilaiMin) nilaiMin = d.nilai;
        if(d.nilai > nilaiMax) nilaiMax = d.nilai;
    });

    let rataRata = parseFloat((totalNilai / totalSiswa).toFixed(2));
    nilaiMin = parseFloat(nilaiMin.toFixed(2));
    nilaiMax = parseFloat(nilaiMax.toFixed(2));
    
    let persenLulus = Math.round((jmlLulus / totalSiswa) * 100);
    let persenRemedial = Math.round((jmlRemedial / totalSiswa) * 100);

    // 🔥 UI POLISH: Desain Ringkasan dengan Grafik Donat 🔥
    let htmlStat = `
    <div class="card" style="padding: 15px; margin-bottom: 15px;">
        <h4 style="margin-top:0; margin-bottom:15px; font-size:14px; text-align:center;">📊 Ringkasan Nilai Kelas</h4>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 15px;">
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Rata-rata</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${rataRata}</div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Tertinggi</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--success);">${nilaiMax}</div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Terendah</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--danger);">${nilaiMin}</div>
            </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 25px; background: var(--bg-input); padding: 20px 15px; border-radius: 12px; border: 1px solid var(--border);">
            
            <div style="position: relative; width: 100px; height: 100px; flex-shrink: 0;">
                <canvas id="chartKelulusan" style="width:100px !important; height:100px !important;"></canvas>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:var(--success); display:inline-block;"></span> Tuntas (≥ ${batasKKM})
                    </div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-main); margin-left: 16px;">
                        ${jmlLulus} <span style="font-size:12px; font-weight:600; color:var(--text-muted);">Siswa (${persenLulus}%)</span>
                    </div>
                </div>
                <div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:var(--danger); display:inline-block;"></span> Remedial (< ${batasKKM})
                    </div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-main); margin-left: 16px;">
                        ${jmlRemedial} <span style="font-size:12px; font-weight:600; color:var(--text-muted);">Siswa (${persenRemedial}%)</span>
                    </div>
                </div>
            </div>

        </div>
    </div>`;

    // 🔥 FITUR 4: ANALISIS DAYA PEMBEDA (Validitas Item) 🔥
    let sortedSiswa = [...riwayatData].sort((a, b) => b.nilai - a.nilai);
    let nGroup = Math.max(1, Math.round(totalSiswa * 0.30)); // Membagi 30% kelompok Atas & Bawah
    let upperGroup = sortedSiswa.slice(0, nGroup);
    let lowerGroup = sortedSiswa.slice(-nGroup);

    let kunciTokens = typeof parseKunci === 'function' ? parseKunci(document.getElementById('inputKunci').value) : [];

    function genTabelStat(start, end) {
        let t = `<table style="min-width:260px; font-size:11px; border-collapse: collapse; flex:1;">
            <thead>
                <tr>
                    <th style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">No</th>
                    <th style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">Salah</th>
                    <th style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">Daya Pembeda</th>
                    <th style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">Tingkat Kesukaran</th>
                </tr>
            </thead>
            <tbody>`;
        for(let i = start; i < end; i++) {
            let tk = i < kunciTokens.length ? kunciTokens[i] : null;
            if (!tk || tk.includes('X')) {
                t += `<tr style="opacity:0.4"><td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border);">${i+1}</td><td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border);">-</td><td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border);">-</td><td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border);">-</td></tr>`;
            } else {
                let salah = statistikSalah[i] ? statistikSalah[i] : 0;
                let colorSalah = salah > (totalSiswa / 2) ? 'var(--danger)' : (salah > 0 ? 'var(--warning)' : 'var(--success)');
                
                // Mesin Pengukur Daya Pembeda
                let upperCorrect = upperGroup.filter(s => s.rincian[i] && s.rincian[i].status === "Benar").length;
                let lowerCorrect = lowerGroup.filter(s => s.rincian[i] && s.rincian[i].status === "Benar").length;
                let dp = (upperCorrect / nGroup) - (lowerCorrect / nGroup);
                
                let kriteriaDP = "-"; let colorDP = "var(--text-muted)";
                if (totalSiswa < 6) { kriteriaDP = "Data Kurang"; } 
                else {
                    if (dp >= 0.3) { kriteriaDP = "👍 Baik"; colorDP = "var(--success)"; }
                    else if (dp >= 0.1) { kriteriaDP = "⚠️ Cukup"; colorDP = "var(--warning)"; }
                    else { kriteriaDP = "🗑️ Revisi"; colorDP = "var(--danger)"; } 
                }

                // 🔥 FITUR 2: MESIN PENGUKUR TINGKAT KESUKARAN 🔥
                let persenBenar = ((totalSiswa - salah) / totalSiswa) * 100;
                let kriteriaTK = "-"; let colorTK = "var(--text-muted)";
                if (persenBenar > 70) { kriteriaTK = "🟢 Mudah"; colorTK = "var(--success)"; }
                else if (persenBenar >= 30) { kriteriaTK = "🟡 Sedang"; colorTK = "var(--warning)"; }
                else { kriteriaTK = "🔴 Sukar"; colorTK = "var(--danger)"; }

                t += `<tr>
                        <td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">${i+1}</td>
                        <td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:${colorSalah}; font-weight:bold;">${salah}</td>
                        <td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:${colorDP}; font-weight:bold;">${kriteriaDP}</td>
                        <td style="padding:6px 2px; text-align:center; border-bottom:1px solid var(--border); color:${colorTK}; font-weight:bold;">${kriteriaTK}</td>
                      </tr>`;
            }
        }
        t += `</tbody></table>`;
        return t;
    }

    htmlStat += `
    <div class="card" style="padding: 15px;">
        <h4 style="margin-top:0; margin-bottom:5px; font-size:14px; text-align:center;">🔬 Analisis Validitas Soal</h4>
        <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-top:0; margin-bottom:15px;">Mendeteksi apakah soal mampu membedakan kemampuan siswa secara valid.</p>
        <div style="display:flex; overflow-x:auto; gap:15px; padding-bottom:10px; -webkit-overflow-scrolling:touch;">
            ${genTabelStat(0, 20)}
            ${genTabelStat(20, 40)}
            ${genTabelStat(40, 60)}
        </div>
    </div>`;

    wadah.innerHTML = htmlStat;
    
    // Render Grafik Kelulusan setelah HTML disuntikkan
    setTimeout(() => {
        let ctx = document.getElementById('chartKelulusan');
        if (ctx) {
            // Hancurkan grafik lama jika sudah ada (mencegah error canvas menumpuk)
            if (grafikKelulusan) grafikKelulusan.destroy(); 
            
            // Render grafik donat baru
            grafikKelulusan = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Tuntas', 'Remedial'],
                    datasets: [{
                        data: [jmlLulus, jmlRemedial],
                        backgroundColor: ['#34C759', '#FF3B30'], // Warna Success & Danger Apple
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Ketebalan cincin donat
                    plugins: {
                        legend: { display: false }, // Sembunyikan legenda bawaan
                        tooltip: {
                            callbacks: {
                                label: function(context) { return ' ' + context.label + ': ' + context.raw + ' Siswa'; }
                            }
                        }
                    }
                }
            });
        }
    }, 100);
}

// ==================== FITUR 5: MESIN CETAK RAPOR PDF ====================
function cetakRapor(event, idSiswa) {
    if(event) event.stopPropagation();
    let siswa = riwayatData.find(d => d.id === idSiswa);
    if(!siswa) return;

    let mapel = document.getElementById('pilihProfil').value || "Ujian Kelas";
    let kkm = document.getElementById('inputKKM').value || 75;
    let isLulus = siswa.nilai >= parseFloat(kkm);
    let status = isLulus ? "TUNTAS / LULUS" : "REMEDIAL / TIDAK LULUS";
    let colorStatus = isLulus ? "#2E7D32" : "#C62828"; // Hijau Tua / Merah Tua untuk Print

    let htmlRincian = '';
    for(let i=0; i<60; i++) {
        let r = siswa.rincian[i];
        if(!r || r.status === "DIABAIKAN") continue;
        
        let bgColor = r.status === "Benar" ? "#E8F5E9" : (r.status === "Salah" ? "#FFEBEE" : "#FFF3E0");
        let textColor = r.status === "Benar" ? "#2E7D32" : (r.status === "Salah" ? "#C62828" : "#EF6C00");
        let icon = r.status === "Benar" ? "✓" : "✗";
        let ans = r.status === "Benar" ? r.jawaban : `<s>${r.jawaban}</s> (${r.kunci})`;
        
        htmlRincian += `
        <div style="padding:8px; border:1px solid #ddd; background:${bgColor}; color:${textColor}; border-radius:6px; font-size:12px; text-align:center;">
            <b>No.${r.nomor}</b><br><span style="font-size:14px;">${icon} ${ans}</span>
        </div>`;
    }

    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Rapor_${siswa.nama.replace(/\s+/g, '_')}_${mapel}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;}
                .header h3 { margin: 0; font-size: 16px; font-weight: normal; color: #555; }
                .identitas { width: 100%; margin-bottom: 30px; font-size: 15px; }
                .identitas td { padding: 6px 0; }
                .skor-box { text-align: center; padding: 30px; border: 3px solid ${colorStatus}; border-radius: 12px; margin-bottom: 30px; background-color: #fafafa; }
                .skor-box h1 { font-size: 72px; margin: 10px 0; color: ${colorStatus}; }
                .grid-rincian { display: grid; grid-template-columns: repeat(10, 1fr); gap: 10px; margin-top: 20px; }
                @media print {
                    body { padding: 0; }
                    .skor-box { border: 3px solid #000; background-color: transparent !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
                    .skor-box h1 { color: #000; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>LAPORAN HASIL UJIAN</h1>
                <h3>Mata Pelajaran: <b>${mapel}</b></h3>
            </div>
            
            <table class="identitas">
                <tr><td width="150"><b>Nama Siswa</b></td><td>: ${siswa.nama}</td></tr>
                <tr><td><b>NIS / ID Peserta</b></td><td>: ${siswa.id}</td></tr>
            </table>

            <div class="skor-box">
                <div style="font-weight:bold; font-size:18px; color:#555; text-transform:uppercase;">Nilai Akhir</div>
                <h1>${siswa.nilai}</h1>
                <div style="font-size:18px; font-weight:bold; color:${colorStatus}; letter-spacing: 1px;">STATUS: ${status}</div>
                <div style="margin-top:20px; font-size:15px; color:#444;">
                    Jawaban Benar: <b>${siswa.benar}</b> &nbsp;|&nbsp; Salah: <b>${siswa.salah}</b> &nbsp;|&nbsp; Kosong: <b>${siswa.kosong}</b> &nbsp;|&nbsp; Ganda: <b>${siswa.ganda}</b>
                </div>
            </div>

            <h3 style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-top: 40px; color:#333;">Detail Koreksi Jawaban</h3>
            <div class="grid-rincian">${htmlRincian}</div>
            
            <div style="margin-top: 60px; text-align: right; font-size: 15px;">
                <p>..................................., 20...</p>
                <p>Guru Mata Pelajaran</p>
                <br><br><br>
                <p><b>_______________________</b></p>
            </div>
            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 800); }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==================== RADAR INDIKASI KECURANGAN (SUB-TAB) ====================
function tampilkanInvestigasi() {
    let wInv = document.getElementById('wadahInvestigasi');
    if(!wInv) return;

    if (!riwayatData || riwayatData.length < 2) {
        wInv.innerHTML = '<div class="card" style="padding: 30px; text-align: center; color: var(--text-muted); font-weight: 600;">Minimal butuh 2 data siswa untuk dianalisis.</div>';
        return;
    }

    let laporanCurang = [];
    for (let i = 0; i < riwayatData.length; i++) {
        for (let j = i + 1; j < riwayatData.length; j++) {
            let s1 = riwayatData[i]; 
            let s2 = riwayatData[j];
            let salahSama = 0; 
            let detailSoal = [];

            for (let k = 0; k < 60; k++) {
                let r1 = s1.rincian[k]; let r2 = s2.rincian[k];
                // 🔥 FIX: Gunakan toUpperCase() agar kebal dari perbedaan huruf besar/kecil 🔥
                if (r1 && r2 && (r1.status.toUpperCase() === "SALAH" || r1.status.toUpperCase() === "GANDA") && r1.status === r2.status && r1.jawaban === r2.jawaban) {
                    salahSama++; 
                    detailSoal.push(`No.${k+1}(${r1.jawaban})`);
                }
            }

            if (salahSama >= 4) { 
                laporanCurang.push({ nama1: s1.nama, nama2: s2.nama, jumlahSama: salahSama, detail: detailSoal.join(', ') });
            }
        }
    }

    let htmlReport = `<div class="card" style="padding: 15px;">
        <h4 style="margin-top:0; margin-bottom:15px; font-size:14px; text-align:center; color:var(--danger);">🚨 Radar Indikasi Nyontek</h4>`;

    if (laporanCurang.length === 0) {
        htmlReport += `<div style="background:var(--bg-input); padding:15px; border-radius:12px; border:1px solid var(--success); text-align:center;">
            <span style="font-size:35px;">😇</span><br>
            <b style="color:var(--success); font-size:16px;">Kelas Jujur & Aman!</b><br>
            <p style="font-size:13px; margin:5px 0 0 0; color:var(--text-muted);">Tidak ditemukan indikasi kecurangan antar siswa.</p>
        </div>`;
    } else {
        laporanCurang.sort((a, b) => b.jumlahSama - a.jumlahSama);
        htmlReport += `<p style="font-size:13px; margin-top:0; color:var(--text-main);">Ditemukan pasangan dengan pola jawaban <b>SALAH</b> yang identik (≥4 Soal):</p>
        <div style="padding-right: 5px;">`;
        
        laporanCurang.forEach((item, idx) => { 
            htmlReport += `<div style="background:var(--bg-input); padding:12px; margin-bottom:10px; border-left:4px solid var(--danger); border-radius:8px; font-size:13px;">
                <b style="color:var(--text-main); font-size:14px;">${idx+1}. ${item.nama1} 🤝 ${item.nama2}</b><br>
                <span style="color:var(--danger); font-weight:bold;">${item.jumlahSama} Jawaban Salah Persis Sama:</span><br>
                <span style="color:var(--text-muted); font-size:12px;">${item.detail}</span>
            </div>`;
        });
        htmlReport += `</div>`;
    }
    htmlReport += `</div>`;
    wInv.innerHTML = htmlReport;
}

// ==================== EXPORT EXCEL PRO (MULTI-SHEET) ====================
function downloadExcel() {
    if (!riwayatData || riwayatData.length === 0) {
        Toast.fire({ icon: 'warning', title: 'Belum ada data untuk didownload!' });
        return;
    }

    if (typeof simpanPengaturan === 'function') simpanPengaturan(true);

    Toast.fire({ icon: 'info', title: 'Mempersiapkan Laporan Lengkap...' });

    let wb = XLSX.utils.book_new();
    let totalSiswa = riwayatData.length;
    let kunciTokens = typeof parseKunci === 'function' ? parseKunci(document.getElementById('inputKunci').value) : [];

    let tipePenilaian = document.getElementById('sistemPenilaian').value;
    let labelNilai = "Nilai Akhir";
    if (tipePenilaian === 'utbk') labelNilai = "Nilai Akhir (Sistem UTBK)";
    else if (tipePenilaian === 'bobot') labelNilai = "Nilai Akhir (Sistem Bobot)";
    else labelNilai = "Nilai Akhir (Sistem Standar)";

    // --- SHEET 1: RINGKASAN KELAS ---
    let batasKKM = parseFloat(document.getElementById('inputKKM').value);
    if (isNaN(batasKKM)) batasKKM = 75;

    let jmlLulus = 0; let jmlRemedial = 0; let totalNilai = 0; 
    let nilaiMin = riwayatData[0].nilai; let nilaiMax = riwayatData[0].nilai;

    riwayatData.forEach(d => { 
        if(d.nilai >= batasKKM) jmlLulus++; else jmlRemedial++; 
        totalNilai += d.nilai;
        if(d.nilai < nilaiMin) nilaiMin = d.nilai;
        if(d.nilai > nilaiMax) nilaiMax = d.nilai;
    });

    let rataRata = parseFloat((totalNilai / totalSiswa).toFixed(2));
    let persenLulus = Math.round((jmlLulus / totalSiswa) * 100);
    let persenRemedial = Math.round((jmlRemedial / totalSiswa) * 100);

    let dataRingkasan = [
        { "Statistik Kelas": "Total Siswa Scan", "Hasil": `${totalSiswa} Siswa` },
        { "Statistik Kelas": "Rata-Rata Kelas", "Hasil": rataRata },
        { "Statistik Kelas": "Nilai Tertinggi", "Hasil": parseFloat(nilaiMax.toFixed(2)) },
        { "Statistik Kelas": "Nilai Terendah", "Hasil": parseFloat(nilaiMin.toFixed(2)) },
        { "Statistik Kelas": `Tuntas (≥ ${batasKKM})`, "Hasil": `${jmlLulus} Siswa (${persenLulus}%)` },
        { "Statistik Kelas": `Remedial (< ${batasKKM})`, "Hasil": `${jmlRemedial} Siswa (${persenRemedial}%)` }
    ];
    let wsRingkasan = XLSX.utils.json_to_sheet(dataRingkasan);
    XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan Kelas");

    // --- SHEET 2: REKAP NILAI ---
    let dataNilai = riwayatData.map(d => {
        let row = { "ID / NIS": d.id, "Nama Siswa": d.nama, "Benar": d.benar, "Salah": d.salah, "Kosong": d.kosong, "Ganda": d.ganda };
        row[labelNilai] = d.nilai; 
        return row;
    });
    let wsNilai = XLSX.utils.json_to_sheet(dataNilai);
    XLSX.utils.book_append_sheet(wb, wsNilai, "Rekap Nilai");

    // --- PERSIAPAN UNTUK SHEET 3: SORTING KELOMPOK ATAS & BAWAH ---
    let sortedSiswa = [...riwayatData].sort((a, b) => b.nilai - a.nilai);
    let nGroup = Math.max(1, Math.round(totalSiswa * 0.30)); 
    let upperGroup = sortedSiswa.slice(0, nGroup);
    let lowerGroup = sortedSiswa.slice(-nGroup);

    // --- SHEET 3: ANALISIS BUTIR SOAL (UPDATED FITUR BARU) ---
    let dataAnalisis = [];
    for (let i = 0; i < 60; i++) {
        let tk = i < kunciTokens.length ? kunciTokens[i] : null;
        if (!tk || tk.includes('X')) continue; 
        let kunciTeks = tk.includes('*') ? 'BONUS' : tk.join('/');
        let jmlBenar = 0; let jmlSalah = 0; let jmlKosong = 0; let jmlGanda = 0;

        riwayatData.forEach(siswa => {
            let r = siswa.rincian[i];
            if (r) { 
                let st = r.status.toUpperCase(); // Antisipasi beda kapitalisasi
                if (st === "BENAR") jmlBenar++; else if (st === "SALAH") jmlSalah++; else if (st === "KOSONG") jmlKosong++; else if (st === "GANDA") jmlGanda++; 
            }
        });

        // 1. Kalkulasi Daya Pembeda
        let upperCorrect = upperGroup.filter(s => s.rincian[i] && s.rincian[i].status.toUpperCase() === "BENAR").length;
        let lowerCorrect = lowerGroup.filter(s => s.rincian[i] && s.rincian[i].status.toUpperCase() === "BENAR").length;
        let dp = (upperCorrect / nGroup) - (lowerCorrect / nGroup);
        
        let kriteriaDP = "-"; 
        if (totalSiswa >= 6) {
            if (dp >= 0.3) kriteriaDP = "Baik";
            else if (dp >= 0.1) kriteriaDP = "Cukup";
            else kriteriaDP = "Revisi/Buang";
        } else { kriteriaDP = "Data Kurang"; }

        // 2. Kalkulasi Tingkat Kesukaran
        let persenBenar = (jmlBenar / totalSiswa) * 100;
        let kriteriaTK = "-";
        if (persenBenar > 70) kriteriaTK = "Mudah";
        else if (persenBenar >= 30) kriteriaTK = "Sedang";
        else kriteriaTK = "Sukar";

        dataAnalisis.push({ 
            "No. Soal": i + 1, 
            "Kunci": kunciTeks, 
            "Menjawab Benar": jmlBenar, 
            "Menjawab Salah": jmlSalah, 
            "Kosong": jmlKosong, 
            "Ganda": jmlGanda, 
            "Daya Serap (%)": Math.round(persenBenar) + "%",
            "Daya Pembeda (Point Biserial)": isNaN(dp) ? "-" : dp.toFixed(2), // Angka desimal
            "Status DP": kriteriaDP,
            "Tingkat Kesukaran": kriteriaTK
        });
    }
    let wsAnalisis = XLSX.utils.json_to_sheet(dataAnalisis);
    XLSX.utils.book_append_sheet(wb, wsAnalisis, "Analisis Soal");

    // --- SHEET 4: INVESTIGASI NYONTEK ---
    let laporanCurang = [];
    for (let i = 0; i < riwayatData.length; i++) {
        for (let j = i + 1; j < riwayatData.length; j++) {
            let s1 = riwayatData[i]; let s2 = riwayatData[j];
            let salahSama = 0; let detailSoal = [];
            for (let k = 0; k < 60; k++) {
                let r1 = s1.rincian[k]; let r2 = s2.rincian[k];
                if (r1 && r2 && (r1.status.toUpperCase() === "SALAH" || r1.status.toUpperCase() === "GANDA") && r1.status === r2.status && r1.jawaban === r2.jawaban) {
                    salahSama++; detailSoal.push(`No.${k+1}(${r1.jawaban})`);
                }
            }
            if (salahSama >= 4) laporanCurang.push({ "Siswa 1": s1.nama, "Siswa 2": s2.nama, "Kemiripan Jawaban Salah": salahSama, "Rincian Soal (Jawaban)": detailSoal.join(', ') });
        }
    }
    laporanCurang.sort((a, b) => b["Kemiripan Jawaban Salah"] - a["Kemiripan Jawaban Salah"]);
    let dataNyontek = laporanCurang.length > 0 ? laporanCurang : [{"Keterangan": "Kelas Jujur & Aman! Tidak ditemukan indikasi kecurangan antar siswa."}];
    let wsNyontek = XLSX.utils.json_to_sheet(dataNyontek);
    XLSX.utils.book_append_sheet(wb, wsNyontek, "Deteksi Kecurangan");

    // --- SHEET 5: MATRIKS JAWABAN SISWA ---
    let dataDetail = riwayatData.map(d => {
        let row = { "ID / NIS": d.id, "Nama Siswa": d.nama };
        for(let i = 0; i < 60; i++) {
            let tk = i < kunciTokens.length ? kunciTokens[i] : null;
            if (!tk || tk.includes('X')) continue; 
            row[`Soal ${i+1}`] = d.rincian[i] ? d.rincian[i].jawaban : "-";
        }
        return row;
    });
    let wsDetail = XLSX.utils.json_to_sheet(dataDetail);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Matriks Jawaban");

    // === DOWNLOAD FILE EXCEL ===
    let namaMapel = document.getElementById('pilihProfil').value || "Tes_LJK";
    let namaFile = `Laporan_Pro_${namaMapel.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    XLSX.writeFile(wb, namaFile);
    Toast.fire({ icon: 'success', title: 'File Excel Berhasil Diunduh!' });
}

// ==================== FITUR MESIN CETAK REKAP KELAS (PDF) ====================
function cetakRekapKelas() {
    if (!riwayatData || riwayatData.length === 0) return Toast.fire({icon: 'warning', title: 'Belum ada data!'});

    let mapel = document.getElementById('pilihProfil').value || "Ujian Kelas";
    let kkm = document.getElementById('inputKKM').value || 75;
    let totalSiswa = riwayatData.length;
    
    // Selalu urutkan dari nilai tertinggi ke terendah saat di-print
    let sortedRiwayat = [...riwayatData].sort((a, b) => b.nilai - a.nilai);
    
    let barisTabel = sortedRiwayat.map((d, i) => {
        let status = d.nilai >= kkm ? "TUNTAS" : "REMEDIAL";
        let color = d.nilai >= kkm ? "green" : "red";
        return `<tr>
            <td style="text-align:center;">${i+1}</td>
            <td style="text-align:center;">${d.id}</td>
            <td>${d.nama}</td>
            <td style="text-align:center;">${d.benar}</td>
            <td style="text-align:center;">${d.salah}</td>
            <td style="text-align:center; font-weight:bold; font-size:16px;">${d.nilai}</td>
            <td style="text-align:center; color:${color}; font-weight:bold;">${status}</td>
        </tr>`;
    }).join('');

    let htmlPdf = `<html>
    <head>
        <title>Rekap_Kelas_${mapel.replace(/\s+/g, '_')}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0 0 5px 0; font-size: 22px; text-transform: uppercase; }
            .info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { border: 1px solid #999; padding: 10px; }
            th { background-color: #eee; text-transform: uppercase; font-size: 12px; }
            @media print { body { padding: 0; } th { -webkit-print-color-adjust: exact; background-color: #eee !important; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>REKAPITULASI HASIL UJIAN</h1>
            <h3>Mata Pelajaran: ${mapel}</h3>
        </div>
        
        <div class="info">
            <span>Total Peserta: ${totalSiswa} Siswa</span>
            <span>Batas KKM: ${kkm}</span>
        </div>

        <table>
            <thead>
                <tr><th>Rank</th><th>NIS</th><th>Nama Siswa</th><th>Benar</th><th>Salah</th><th>Skor Akhir</th><th>Keterangan</th></tr>
            </thead>
            <tbody>${barisTabel}</tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right; float: right; width: 250px;">
            <p>..................................., 20...</p>
            <p>Guru Mata Pelajaran</p>
            <br><br><br>
            <p><b>_______________________</b></p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();},800);}<\/script>
    </body></html>`;
    
    let win = window.open('', '_blank');
    win.document.write(htmlPdf);
    win.document.close();
}