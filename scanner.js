// ==================== CAMERA & AUTO-SCAN ====================
let videoTrack = null;     
let isSenterNyala = false; 
let gagalScanCount = 0;

function bersihkanMemoriCV(...mats) {
    mats.forEach(mat => { if (mat && typeof mat.delete === 'function') { try { mat.delete(); } catch(e) {} } });
}

async function mulaiKamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: false, // Mematikan mic agar tidak muncul notif blokir
            video: { facingMode: "environment" } 
        });
        
        videoElement.srcObject = stream;
        videoTrack = stream.getVideoTracks()[0];
        
        document.getElementById('wadahKamera').style.display = 'block';
        document.getElementById('btnNyalakan').style.display = 'none';
        document.getElementById('btnAmbil').style.display = 'flex';
        document.getElementById('kanvasHasil').style.display = 'none';
        document.getElementById('hasilUjian').innerHTML = '';
        
        // MEMUNCULKAN TOMBOL SENTER
        setTimeout(() => {
            if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                try {
                    const capabilities = videoTrack.getCapabilities();
                    let btnSenter = document.getElementById('btnSenter');
                    if (capabilities.torch && btnSenter) {
                        btnSenter.style.display = 'flex';
                    }
                } catch(e) { console.log("Senter tidak didukung"); }
            }
        }, 500);

        toggleAutoScan();
    } catch (error) { 
        // NOTIF ERROR DIHAPUS
        console.warn("Info Kamera:", error);
    }
}

async function toggleSenter() {
    if (!videoTrack) return;
    try {
        isSenterNyala = !isSenterNyala;
        await videoTrack.applyConstraints({ advanced: [{ torch: isSenterNyala }] });
        let btnSenter = document.getElementById('btnSenter');
        if(btnSenter) btnSenter.innerHTML = isSenterNyala ? '💡' : '🔦';
    } catch (err) {
        console.error('Senter gagal dinyalakan:', err);
    }
}

function toggleAutoScan() {
    if(autoScanTimer) clearInterval(autoScanTimer);
    let isAuto = document.getElementById('cbAutoScan').checked;
    let btnAmbil = document.getElementById('btnAmbil');
    let wadahKamera = document.getElementById('wadahKamera');
    
    if(wadahKamera && wadahKamera.style.display === 'block') {
        btnAmbil.style.display = 'flex';
        
        if(isAuto) {
            gagalScanCount = 0; 
            
            // 🔥 TAMPILAN AUTO-SCAN (Elegan, putus-putus, seolah sedang "bekerja") 🔥
            btnAmbil.innerHTML = "⚡ Memindai Otomatis...";
            btnAmbil.disabled = true;
            btnAmbil.style.backgroundColor = "var(--bg-input)";
            btnAmbil.style.color = "var(--primary)";
            btnAmbil.style.border = "2px dashed var(--primary)";
            btnAmbil.style.boxShadow = "none";
            btnAmbil.style.opacity = "0.9";
            
            autoScanTimer = setInterval(ambilFotoOtomatis, 1000); 
        } else {
            // 🔥 TAMPILAN MANUAL (Solid, tegas, memancing untuk diklik) 🔥
            btnAmbil.innerHTML = "📸 Jepret Manual";
            btnAmbil.disabled = false;
            btnAmbil.style.backgroundColor = "var(--primary)";
            btnAmbil.style.color = "white";
            btnAmbil.style.border = "none";
            btnAmbil.style.boxShadow = "0 4px 12px rgba(0, 122, 255, 0.3)";
            btnAmbil.style.opacity = "1";
        }
    } else { 
        btnAmbil.style.display = 'none'; 
    }
}

function ambilFotoOtomatis() {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
        canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        // 🔥 PERBAIKAN: Kirim kode 'auto', bukan true. (Bip merah akan diam!) 🔥
        let hasil = prosesDeteksiKertas('auto'); 
        
        // 🔥 FITUR AUTO-STOP SETELAH 5X GAGAL 🔥
        if (hasil === 'failed') {
            gagalScanCount++;
            if (gagalScanCount >= 7) {
                matikanKameraUI(); // Matikan hardware kamera
                document.getElementById('cbAutoScan').checked = false; // Matikan saklar UI
                toggleAutoScan(); // Kembalikan tombol ke mode Jepret Manual
                
                Swal.fire({ 
                    icon: 'warning', 
                    title: 'Kamera Ditutup', 
                    text: 'Auto-Scan dihentikan karena tidak menemukan LJK 7 kali berturut-turut. Pastikan kertas lurus dan tidak terhalang bayangan.' 
                });
                gagalScanCount = 0;
            }
        } else {
            gagalScanCount = 0; // Reset hitungan menjadi 0 jika LJK berhasil discan
        }
    }
}

function ambilFotoManual() {
    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    matikanKameraUI(); prosesDeteksiKertas(false); 
}

function matikanKameraUI() {
    if(autoScanTimer) clearInterval(autoScanTimer);
    
    if (videoTrack) {
        try {
            if (isSenterNyala) {
                videoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(e=>console.log(e));
            }
        } catch(e) {}
        videoTrack.stop(); 
        videoTrack = null;
    }
    isSenterNyala = false;
    
    let btnSenter = document.getElementById('btnSenter');
    if(btnSenter) {
        btnSenter.style.display = 'none';
        btnSenter.innerHTML = '🔦';
    }
    
    document.getElementById('wadahKamera').style.display = 'none';
    document.getElementById('btnAmbil').style.display = 'none';
    document.getElementById('btnNyalakan').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('inputFoto').addEventListener('change', async function(e) {
        let files = e.target.files; if (files.length === 0) return;
        matikanKameraUI();
        let ditambahkan = 0; let diperbarui = 0; let gagal = 0; let fileGagal = [];
        Toast.fire({ icon: 'info', title: `Memproses ${files.length} LJK...` });

        for (let i = 0; i < files.length; i++) {
            await new Promise((resolve) => {
                let reader = new FileReader();
                reader.onload = function(event) {
                    let img = new Image();
                    img.onload = function() {
                        const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
                        let skala = 1; if (img.width > 800) { skala = 800 / img.width; }
                        canvasElement.width = img.width * skala; canvasElement.height = img.height * skala;
                        ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
                        
                        const statusProses = prosesDeteksiKertas('upload');
                        if (statusProses === 'added') ditambahkan++; else if (statusProses === 'updated') diperbarui++;
                        else { gagal++; fileGagal.push(files[i].name); }
                        resolve(); 
                    }
                    img.onerror = function() { gagal++; fileGagal.push(files[i].name); resolve(); }
                    img.src = event.target.result;
                }
                reader.onerror = function() { gagal++; fileGagal.push(files[i].name); resolve(); }
                reader.readAsDataURL(files[i]);
            });
        }
        e.target.value = '';
        const totalDiproses = ditambahkan + diperbarui + gagal;
        const detailGagal = fileGagal.length ? `<br><br><small><b>File gagal:</b><br>${fileGagal.join('<br>')}</small>` : '';
        Swal.fire({ icon: gagal > 0 ? 'warning' : 'success', title: 'Selesai!', html: `Diproses ${totalDiproses} LJK.<br>Data baru: <b>${ditambahkan}</b><br>Update/ID duplikat: <b>${diperbarui}</b><br>Gagal terbaca: <b>${gagal}</b>${detailGagal}` });
    });
});

// ==================== OPENCV ENGINE DENGAN PARSER AJAIB ====================
function prosesDeteksiKertas(scanMode = 'manual') {
    let isAutoMode = (scanMode === 'auto');
    if (typeof cv === 'undefined') { if(!isAutoMode) Toast.fire({ icon: 'info', title: 'OpenCV sedang dimuat...' }); return 'failed'; }
    
    let kunciStr = document.getElementById('inputKunci').value;
    let KUNCI_TOKENS = parseKunci(kunciStr);
    
    if (KUNCI_TOKENS.length === 0 && !isAutoMode) { Toast.fire({ icon: 'warning', title: 'Kunci jawaban kosong!' }); }

    let src = cv.imread(canvasElement); let dst = new cv.Mat(); let gambarHasil = src.clone();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0); cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY_INV);
    
    let contours = new cv.MatVector(); let hierarchy = new cv.Mat(); 
    cv.findContours(dst, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let kumpulanTitik = []; 
    for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i); let area = cv.contourArea(cnt); let rect = cv.boundingRect(cnt);
        let rasio = rect.width / rect.height; let kepadatan = area / (rect.width * rect.height);
        if (area > 100 && area < 5000 && rasio > 0.6 && rasio < 1.4 && kepadatan > 0.81) {
            kumpulanTitik.push({ x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2) });
        }
        cnt.delete(); 
    }

    if (kumpulanTitik.length >= 4) {
        let minX = Math.min(...kumpulanTitik.map(p => p.x)); let maxX = Math.max(...kumpulanTitik.map(p => p.x));
        let minY = Math.min(...kumpulanTitik.map(p => p.y)); let maxY = Math.max(...kumpulanTitik.map(p => p.y));
        let kiriAtas = kumpulanTitik.reduce((a, b) => Math.hypot(b.x - minX, b.y - minY) < Math.hypot(a.x - minX, a.y - minY) ? b : a);
        let kananAtas = kumpulanTitik.reduce((a, b) => Math.hypot(b.x - maxX, b.y - minY) < Math.hypot(a.x - maxX, a.y - minY) ? b : a);
        let kiriBawah = kumpulanTitik.reduce((a, b) => Math.hypot(b.x - minX, b.y - maxY) < Math.hypot(a.x - minX, a.y - maxY) ? b : a);
        let kananBawah = kumpulanTitik.reduce((a, b) => Math.hypot(b.x - maxX, b.y - maxY) < Math.hypot(a.x - maxX, a.y - maxY) ? b : a);

        let d1 = Math.hypot(kiriAtas.x - kananAtas.x, kiriAtas.y - kananAtas.y); let d2 = Math.hypot(kananAtas.x - kananBawah.x, kananAtas.y - kananBawah.y);
        let d3 = Math.hypot(kananBawah.x - kiriBawah.x, kananBawah.y - kiriBawah.y); let d4 = Math.hypot(kiriBawah.x - kiriAtas.x, kiriBawah.y - kiriAtas.y);

        if (d1 > 50 && d2 > 50 && d3 > 50 && d4 > 50) {

            let lebarMaksimal = Math.max(d1, d3); let tinggiMaksimal = Math.max(d2, d4);
            let titikAsal = cv.matFromArray(4, 1, cv.CV_32FC2, [kiriAtas.x, kiriAtas.y, kananAtas.x, kananAtas.y, kananBawah.x, kananBawah.y, kiriBawah.x, kiriBawah.y]);
            let titikTujuan = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, lebarMaksimal - 1, 0, lebarMaksimal - 1, tinggiMaksimal - 1, 0, tinggiMaksimal - 1]);

            let matriksTransformasi = cv.getPerspectiveTransform(titikAsal, titikTujuan); let gambarPotongan = new cv.Mat();
            cv.warpPerspective(src, gambarPotongan, matriksTransformasi, new cv.Size(lebarMaksimal, tinggiMaksimal), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

            let dstPotongan = new cv.Mat(); cv.cvtColor(gambarPotongan, dstPotongan, cv.COLOR_RGBA2GRAY, 0); cv.threshold(dstPotongan, dstPotongan, 120, 255, cv.THRESH_BINARY_INV);
            let contoursPotongan = new cv.MatVector(); let hierarchyPotongan = new cv.Mat();
            cv.findContours(dstPotongan, contoursPotongan, hierarchyPotongan, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

            let semuaBulatanHitam = [];
            for (let j = 0; j < contoursPotongan.size(); ++j) {
                let cnt2 = contoursPotongan.get(j); let rect2 = cv.boundingRect(cnt2); let area2 = cv.contourArea(cnt2);
                let rasio2 = rect2.width / rect2.height; let kepadatan2 = area2 / (rect2.width * rect2.height);
                if (area2 > 10 && area2 < 1200 && rasio2 > 0.5 && rasio2 < 1.5 && kepadatan2 > 0.30 && kepadatan2 < 0.90) {
                    let roi = dstPotongan.roi(rect2); let whitePixels = cv.countNonZero(roi); 
                    if ((whitePixels / (rect2.width * rect2.height)) > 0.50) semuaBulatanHitam.push({ x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height / 2, r: (rect2.width + rect2.height) / 4 });
                    roi.delete();
                }
                cnt2.delete();
            }

            let idSiswaArray = ['-', '-', '-', '-', '-'];
            let hasilPGFinalRaw = Array.from({length: 60}, () => []); 
            let kunciAbjad = ['A', 'B', 'C', 'D', 'E'];
            let warnaOrange = new cv.Scalar(255, 165, 0, 255);

            semuaBulatanHitam.forEach(b => {
                let pX = b.x / lebarMaksimal; let pY = b.y / tinggiMaksimal;
                if (pY < 0.13 || pY > 0.97 || pX < 0.05 || pX > 0.95) return; 

                let rawRow = (pY - 0.180) / 0.0318; let row = Math.round(rawRow);
                if (row < 0) row = 0; if (row > 24) row = 24;

                if (pX < 0.38) { 
                    let col = Math.round((pX - 0.122) / 0.046);
                    if (col < 0) col = 0; if (col > 4) col = 4;
                    if (row >= 3 && row <= 12) { 
                        idSiswaArray[col] = (row - 3).toString();
                        cv.circle(gambarPotongan, new cv.Point(b.x, b.y), b.r, warnaOrange, 3);
                    } else if (row >= 15 && row <= 24) { 
                        let noSoal = row - 15; 
                        hasilPGFinalRaw[noSoal].push({ huruf: kunciAbjad[col], pt: new cv.Point(b.x, b.y), r: b.r });
                    }
                } else if (pX < 0.68) { 
                    let col = Math.round((pX - 0.438) / 0.046);
                    if (col < 0) col = 0; if (col > 4) col = 4;
                    let noSoal = row + 10; 
                    if (noSoal >= 10 && noSoal < 35) {
                        hasilPGFinalRaw[noSoal].push({ huruf: kunciAbjad[col], pt: new cv.Point(b.x, b.y), r: b.r });
                    }
                } else { 
                    let col = Math.round((pX - 0.753) / 0.046);
                    if (col < 0) col = 0; if (col > 4) col = 4;
                    let noSoal = row + 35; 
                    if (noSoal >= 35 && noSoal < 60) {
                        hasilPGFinalRaw[noSoal].push({ huruf: kunciAbjad[col], pt: new cv.Point(b.x, b.y), r: b.r });
                    }
                }
            });

            let idSiswaFinal = idSiswaArray.join(''); const idValid = /^\d{5}$/.test(idSiswaFinal);
            
            if (!idValid) {
                if(!isAutoMode) { putarSuara(false); Toast.fire({ icon: 'warning', title: 'ID siswa tidak valid / tidak lengkap.' }); }
                bersihkanMemoriCV(titikAsal, titikTujuan, matriksTransformasi, gambarPotongan, dstPotongan, contoursPotongan, hierarchyPotongan, src, dst, gambarHasil, contours, hierarchy);
                return 'failed';
            }

            let hasilPGFinal = []; 
            let warnaBenarCV = new cv.Scalar(0, 200, 0, 255); 
            let warnaSalahCV = new cv.Scalar(255, 0, 0, 255);
            let warnaAbaikanCV = new cv.Scalar(180, 180, 180, 255); 
            
            let jumlahBenar = 0; let jumlahSalah = 0; let jumlahKosong = 0; let jumlahGanda = 0; 
            let totalSoalAktif = KUNCI_TOKENS.filter(t => !t.includes('X')).length;

            for(let i=0; i<60; i++) { 
                let ansData = hasilPGFinalRaw[i]; let arrHuruf = ansData.map(a => a.huruf).sort();
                let jawabanTeks = arrHuruf.length === 0 ? "Kosong" : (arrHuruf.length > 1 ? "GANDA" : arrHuruf.join('')); 
                
                let targetToken = i < KUNCI_TOKENS.length ? KUNCI_TOKENS[i] : null;
                let warnaLingkaran = warnaBenarCV; 
                let status = "";
                let jwbBenarTeks = targetToken ? targetToken.join('/') : "-";

                if (!targetToken || targetToken.includes('X')) {
                    warnaLingkaran = warnaAbaikanCV; status = "DIABAIKAN"; jwbBenarTeks = !targetToken ? "-" : "X";
                } 
                else if (targetToken.includes('*')) {
                    warnaLingkaran = warnaBenarCV; status = "BENAR"; jwbBenarTeks = "BONUS"; jumlahBenar++;
                } 
                else {
                    if (arrHuruf.length === 0) {
                        warnaLingkaran = warnaSalahCV; status = "KOSONG"; jumlahKosong++;
                    } else if (arrHuruf.length > 1) {
                        warnaLingkaran = warnaOrange; status = "GANDA"; jumlahGanda++;
                    } else if (targetToken.includes(jawabanTeks)) {
                        warnaLingkaran = warnaBenarCV; status = "BENAR"; jumlahBenar++;
                    } else {
                        warnaLingkaran = warnaSalahCV; status = "SALAH"; jumlahSalah++;
                    }
                }
                
                ansData.forEach(bulatan => { cv.circle(gambarPotongan, bulatan.pt, bulatan.r + 2, warnaLingkaran, 3); });
                hasilPGFinal.push({ nomor: i + 1, jawaban: jawabanTeks, kunci: jwbBenarTeks, status: status }); 
            }

            let nilaiAkhir = hitungNilaiAkhir(hasilPGFinal, totalSoalAktif);
            let namaSiswa = dbSiswa[idSiswaFinal] || "Tidak Terdaftar";
            let dataBaru = { id: idSiswaFinal, nama: namaSiswa, benar: jumlahBenar, salah: jumlahSalah, kosong: jumlahKosong, ganda: jumlahGanda, nilai: nilaiAkhir, rincian: hasilPGFinal };
            
            let indexAda = riwayatData.findIndex(d => d.id === idSiswaFinal); let statusProses = indexAda !== -1 ? 'updated' : 'added';
            if(indexAda !== -1) { riwayatData[indexAda] = dataBaru; } else { riwayatData.push(dataBaru); }
            
            // PENTING: Panggil simpanRiwayat agar statistik grafik diperbarui secara absolut!
            simpanRiwayat();

            // Reset UI Analisis (Aman untuk Sub-Tab Baru)
            let wStat = document.getElementById('wadahStatistik'); if(wStat) wStat.innerHTML = '';
            
            let kanvasPotongan = document.getElementById('kanvasHasil'); kanvasPotongan.style.display = 'block';
            cv.imshow('kanvasHasil', gambarPotongan);

            // 🔥 UBAH parseInt MENJADI parseFloat AGAR WARNA NILAI (MERAH/HIJAU) SINKRON 🔥
            let batasKKM = parseFloat(document.getElementById('inputKKM').value);
            if (isNaN(batasKKM)) batasKKM = 75;
            
            let warnaNilai = nilaiAkhir < batasKKM ? 'var(--danger)' : 'var(--success)';
            
            let htmlHasil = `
            <div class="score-card">
                <p style="margin:0; font-size:14px; font-weight:600; color:var(--primary);">${idSiswaFinal} - ${namaSiswa}</p>
                <h1 style="color:${warnaNilai};">${nilaiAkhir}</h1>
                <div class="stats-badge-wrap">
                    <span class="stats-badge" style="background:rgba(52, 199, 89, 0.1); color:var(--success);">Benar: ${jumlahBenar}</span>
                    <span class="stats-badge" style="background:rgba(255, 59, 48, 0.1); color:var(--danger);">Salah: ${jumlahSalah}</span>
                    <span class="stats-badge" style="background:rgba(255, 149, 0, 0.1); color:var(--warning);">Ganda: ${jumlahGanda}</span>
                    <span class="stats-badge" style="background:var(--bg-input); color:var(--text-muted);">Kosong: ${jumlahKosong}</span>
                </div>
            </div>`;
            
            bacaNilaiAI(namaSiswa, nilaiAkhir);
            
            // 🔥 SCROLL HORIZONTAL YANG FIX (Menggunakan TBODY agar tidak hilang) 🔥
            htmlHasil += `
            <div class="card" style="padding: 15px;">
                <h4 style="margin-top:0; margin-bottom:15px; font-size:13px; font-weight:700; color:var(--text-main); border-bottom:1px solid var(--border); padding-bottom:10px;">📄 Rincian Tes</h4>
                <div style="display:flex; overflow-x:auto; gap:20px; padding-bottom:10px; -webkit-overflow-scrolling:touch;">
                    <table style="min-width:120px; font-size:11px; border-collapse: collapse; flex:1;">
                        <tbody>`;
            for(let i=0; i<20; i++) htmlHasil += buatBarisTabel(hasilPGFinal[i]);
            htmlHasil += `      </tbody>
                    </table>
                    <table style="min-width:120px; font-size:11px; border-collapse: collapse; flex:1;">
                        <tbody>`;
            for(let i=20; i<40; i++) htmlHasil += buatBarisTabel(hasilPGFinal[i]);
            htmlHasil += `      </tbody>
                    </table>
                    <table style="min-width:120px; font-size:11px; border-collapse: collapse; flex:1;">
                        <tbody>`;
            for(let i=40; i<60; i++) htmlHasil += buatBarisTabel(hasilPGFinal[i]);
            htmlHasil += `      </tbody>
                    </table>
                </div>
            </div>`;
            
            document.getElementById('hasilUjian').innerHTML = htmlHasil;

            if(scanMode === 'auto') { matikanKameraUI(); }
            
            // 🔥 CEK JIKA SUARA AI MATI, BARU BUNYIKAN TONE BEEP 🔥
            if(!document.getElementById('cbSuaraAI').checked) { 
                putarSuara(true); 
            }

            bersihkanMemoriCV(titikAsal, titikTujuan, matriksTransformasi, gambarPotongan, dstPotongan, contoursPotongan, hierarchyPotongan, src, dst, gambarHasil, contours, hierarchy);
            return statusProses;
        } else { if(!isAutoMode) { putarSuara(false); Toast.fire({ icon: 'warning', title: 'LJK miring / terpotong!' }); } }
    } else { if(!isAutoMode) { putarSuara(false); Toast.fire({ icon: 'error', title: 'Kotak hitam tidak terlihat.' }); } }
    
    bersihkanMemoriCV(src, dst, gambarHasil, contours, hierarchy); return 'failed';
}