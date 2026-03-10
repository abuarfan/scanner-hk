// ==================== ANALISIS BUTIR SOAL (VERSI TABEL SUB-TAB) ====================
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

    let htmlStat = `
    <div class="card" style="padding: 15px; margin-bottom: 15px;">
        <h4 style="margin-top:0; margin-bottom:15px; font-size:14px; text-align:center;">📊 Ringkasan Nilai Kelas</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; min-width: 25%; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Rata-rata</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${rataRata}</div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; min-width: 25%; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Tertinggi</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--success);">${nilaiMax}</div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; min-width: 25%; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Terendah</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--danger);">${nilaiMin}</div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; min-width: 40%; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Tuntas (≥ ${batasKKM})</div>
                <div style="font-size: 16px; font-weight: bold; color: var(--success);">${jmlLulus} <span style="font-size:12px; font-weight:normal;">Siswa (${persenLulus}%)</span></div>
            </div>
            <div style="background: var(--bg-input); padding: 10px; border-radius: 8px; flex: 1; min-width: 40%; text-align: center; border: 1px solid var(--border);">
                <div style="font-size: 11px; color: var(--text-muted);">Remedial (< ${batasKKM})</div>
                <div style="font-size: 16px; font-weight: bold; color: var(--danger);">${jmlRemedial} <span style="font-size:12px; font-weight:normal;">Siswa (${persenRemedial}%)</span></div>
            </div>
        </div>
    </div>`;

    let kunciTokens = typeof parseKunci === 'function' ? parseKunci(document.getElementById('inputKunci').value) : [];

    function genTabelStat(start, end) {
        let t = `<table style="min-width:100px; font-size:12px; border-collapse: collapse; flex:1;">
            <thead>
                <tr>
                    <th style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">No</th>
                    <th style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">Salah</th>
                </tr>
            </thead>
            <tbody>`;
        for(let i = start; i < end; i++) {
            let tk = i < kunciTokens.length ? kunciTokens[i] : null;
            if (!tk || tk.includes('X')) {
                t += `<tr style="opacity:0.4"><td style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border);">${i+1}</td><td style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border);">-</td></tr>`;
            } else {
                let salah = statistikSalah[i] ? statistikSalah[i] : 0;
                let color = salah > (totalSiswa / 2) ? 'var(--danger)' : (salah > 0 ? 'var(--warning)' : 'var(--success)');
                t += `<tr><td style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border); color:var(--text-muted);">${i+1}</td><td style="padding:6px 0; text-align:center; border-bottom:1px solid var(--border); color:${color}; font-weight:bold;">${salah}</td></tr>`;
            }
        }
        t += `</tbody></table>`;
        return t;
    }

    htmlStat += `
    <div class="card" style="padding: 15px;">
        <h4 style="margin-top:0; margin-bottom:15px; font-size:14px; text-align:center;">Statistik Siswa Menjawab Salah</h4>
        <div style="display:flex; overflow-x:auto; gap:20px; padding-bottom:10px; -webkit-overflow-scrolling:touch;">
            ${genTabelStat(0, 20)}
            ${genTabelStat(20, 40)}
            ${genTabelStat(40, 60)}
        </div>
    </div>`;

    wadah.innerHTML = htmlStat;
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
                if (r1 && r2 && (r1.status === "SALAH" || r1.status === "GANDA") && r1.status === r2.status && r1.jawaban === r2.jawaban) {
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
        <div style="max-height: 350px; overflow-y: auto; padding-right: 5px;">`;
        
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

    // --- SHEET 1: RINGKASAN KELAS (BARU) ---
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

    // --- SHEET 3: ANALISIS BUTIR SOAL ---
    let dataAnalisis = [];
    for (let i = 0; i < 60; i++) {
        let tk = i < kunciTokens.length ? kunciTokens[i] : null;
        if (!tk || tk.includes('X')) continue; 
        let kunciTeks = tk.includes('*') ? 'BONUS' : tk.join('/');
        let jmlBenar = 0; let jmlSalah = 0; let jmlKosong = 0; let jmlGanda = 0;

        riwayatData.forEach(siswa => {
            let r = siswa.rincian[i];
            if (r) { if (r.status === "BENAR") jmlBenar++; else if (r.status === "SALAH") jmlSalah++; else if (r.status === "KOSONG") jmlKosong++; else if (r.status === "GANDA") jmlGanda++; }
        });
        dataAnalisis.push({ "No. Soal": i + 1, "Kunci": kunciTeks, "Menjawab Benar": jmlBenar, "Menjawab Salah": jmlSalah, "Kosong": jmlKosong, "Ganda": jmlGanda, "Daya Serap (%)": Math.round((jmlBenar / totalSiswa) * 100) + "%" });
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
                if (r1 && r2 && (r1.status === "SALAH" || r1.status === "GANDA") && r1.status === r2.status && r1.jawaban === r2.jawaban) {
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