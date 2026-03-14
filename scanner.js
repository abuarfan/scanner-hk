// ==================== CAMERA & AUTO-SCAN ====================
let videoTrack = null;     
let isSenterNyala = false; 
let gagalScanCount = 0;
let daftarKameraBelakang = []; 
let indexKameraAktif = 0;

function bersihkanMemoriCV(...mats) {
    mats.forEach(mat => { if (mat && typeof mat.delete === 'function') { try { mat.delete(); } catch(e) {} } });
}

async function mulaiKamera() {
    try {
        let constraintVideo = { facingMode: "environment" };

        // 🎯 Jika kita sudah punya daftar lensa dan memilih ID spesifik
        if (daftarKameraBelakang.length > 0 && daftarKameraBelakang[indexKameraAktif]) {
            constraintVideo = { deviceId: { exact: daftarKameraBelakang[indexKameraAktif].deviceId } };
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: false, 
            video: constraintVideo 
        });
        
        videoElement.srcObject = stream;
        videoTrack = stream.getVideoTracks()[0];

        // 🌟 JAMU ANTI BURAM: Paksa hardware mengaktifkan sensor Auto-Focus! 🌟
        try {
            await videoTrack.applyConstraints({
                advanced: [{ focusMode: "continuous" }]
            });
        } catch(err) { console.log("Lensa ini tidak merespon paksaan fokus manual."); }
        
        // 🔍 Deteksi jumlah lensa belakang saat pertama kali nyala
        if (daftarKameraBelakang.length === 0) {
            let devices = await navigator.mediaDevices.enumerateDevices();
            // Kumpulkan kamera yang namanya punya unsur "back", "belakang", atau "environment"
            daftarKameraBelakang = devices.filter(d => 
                d.kind === 'videoinput' && 
                (d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('belakang'))
            );
            
            // Fallback: Jika HP pelit label, tangkap saja semua kamera yang ada
            if (daftarKameraBelakang.length === 0) {
                daftarKameraBelakang = devices.filter(d => d.kind === 'videoinput');
            }
        }

        // Tampilkan tombol Switch jika HP ini ternyata punya banyak lensa
        let btnSwitch = document.getElementById('btnSwitchKamera');
        if (btnSwitch) {
            btnSwitch.style.display = daftarKameraBelakang.length > 1 ? 'flex' : 'none';
        }
        
        document.getElementById('wadahKamera').style.display = 'block';
        document.getElementById('btnNyalakan').style.display = 'none';
        document.getElementById('btnAmbil').style.display = 'flex';
        document.getElementById('kanvasHasil').style.display = 'none';
        document.getElementById('hasilUjian').innerHTML = '';
        
        setTimeout(async () => {
            if (videoTrack && isSenterNyala) {
                try { await videoTrack.applyConstraints({ advanced: [{ torch: true }] }); } 
                catch(e) { console.log("Senter tidak didukung lensa ini"); }
            }
        }, 500);

        toggleAutoScan();
    } catch (error) { 
        console.warn("Info Kamera:", error);
    }
}

async function toggleSenter() {
    isSenterNyala = !isSenterNyala;
    let btnSenter = document.getElementById('btnSenter');
    
    // 🔥 Ubah warna SVG menjadi Kuning jika nyala, default jika mati
    if(btnSenter) {
        if (isSenterNyala) {
            btnSenter.style.color = "var(--warning)";
            btnSenter.style.borderColor = "var(--warning)";
        } else {
            btnSenter.style.color = "var(--text-main)";
            btnSenter.style.borderColor = "var(--border)";
        }
    }

    if (videoTrack) {
        try { await videoTrack.applyConstraints({ advanced: [{ torch: isSenterNyala }] }); } 
        catch (err) { console.error('Senter gagal dinyalakan:', err); }
    }
}

// 🔥 FUNGSI PEMINDAH LENSA KAMERA 🔥
async function gantiLensaKamera() {
    if (daftarKameraBelakang.length <= 1) return;
    
    // Geser index ke kamera berikutnya
    indexKameraAktif++;
    if (indexKameraAktif >= daftarKameraBelakang.length) indexKameraAktif = 0;
    
    Toast.fire({ icon: 'info', title: `Beralih ke Lensa ${indexKameraAktif + 1}...` });
    
    // Matikan hardware kamera yang sedang aktif
    if (videoTrack) videoTrack.stop();
    if (autoScanTimer) clearInterval(autoScanTimer);
    
    // Reset memori Senter karena lensa baru butuh perintah baru
    isSenterNyala = false; 
    let btnSenter = document.getElementById('btnSenter');
    if(btnSenter) {
        btnSenter.style.color = "var(--text-main)";
        btnSenter.style.borderColor = "var(--border)";
    }

    // Nyalakan ulang menggunakan lensa baru
    mulaiKamera();
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
            
            // 🔥 TAMPILAN AUTO-SCAN (SVG Petir Premium) 🔥
            btnAmbil.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Memindai...`;
            btnAmbil.disabled = true;
            btnAmbil.style.backgroundColor = "var(--bg-input)";
            btnAmbil.style.color = "var(--primary)";
            btnAmbil.style.border = "2px dashed var(--primary)";
            btnAmbil.style.boxShadow = "none";
            btnAmbil.style.opacity = "0.9";
            
            autoScanTimer = setInterval(ambilFotoOtomatis, 1000); 
        } else {
            // 🔥 TAMPILAN MANUAL (Dikembalikan ke SVG Kamera Premium, bukan emoji!) 🔥
            btnAmbil.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg> Jepret Manual`;
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
                    text: 'Auto-Scan dihentikan karena LJK tidak terbaca. Pastikan 4 kotak hitam di LJK masuk ke dalam bingkai.' 
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
    
    // 🔥 PERBAIKAN: Kita TIDAK mereset isSenterNyala agar memori pilihan pengguna tersimpan.
    // Tombol UI akan tetap 💡 jika pengguna membiarkannya menyala.
    
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
function prosesDeteksiKertas(scanMode = 'manual', manualPoints = null) {
    let isAutoMode = (scanMode === 'auto');
    if (typeof cv === 'undefined') { if(!isAutoMode) Toast.fire({ icon: 'info', title: 'OpenCV sedang dimuat...' }); return 'failed'; }
    
    let kunciStr = document.getElementById('inputKunci').value;
    let KUNCI_TOKENS = parseKunci(kunciStr);
    
    if (KUNCI_TOKENS.length === 0 && !isAutoMode) { Toast.fire({ icon: 'warning', title: 'Kunci jawaban kosong!' }); }

    let src = cv.imread(canvasElement); let dst = new cv.Mat(); let gambarHasil = src.clone();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0); cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY_INV);
    
    let contours = new cv.MatVector(); let hierarchy = new cv.Mat(); 
    let kumpulanTitik = []; 

    // 🔥 JARING PENGAMAN: Jika user pakai titik manual, bypass sistem otomatis OpenCV 🔥
    if (manualPoints) {
        kumpulanTitik = manualPoints;
    } else {
        cv.findContours(dst, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i); let area = cv.contourArea(cnt); let rect = cv.boundingRect(cnt);
            let rasio = rect.width / rect.height; let kepadatan = area / (rect.width * rect.height);
            if (area > 100 && area < 5000 && rasio > 0.6 && rasio < 1.4 && kepadatan > 0.81) {
                kumpulanTitik.push({ x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2) });
            }
            cnt.delete(); 
        }
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

                // 🔥 KALIBRASI FINAL (0.194) 🔥
                let rawRow = (pY - 0.194) / 0.0318; let row = Math.round(rawRow);
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
                let jawabanTeks = arrHuruf.length === 0 ? "Kosong" : (arrHuruf.length > 1 ? "Ganda" : arrHuruf.join('')); 
                
                let targetToken = i < KUNCI_TOKENS.length ? KUNCI_TOKENS[i] : null;
                let warnaLingkaran = warnaBenarCV; 
                let status = "";
                let jwbBenarTeks = targetToken ? targetToken.join('/') : "-";

                if (!targetToken || targetToken.includes('X')) {
                    warnaLingkaran = warnaAbaikanCV; status = "DIABAIKAN"; jwbBenarTeks = !targetToken ? "-" : "X";
                } 
                else if (targetToken.includes('*')) {
                    warnaLingkaran = warnaBenarCV; status = "Benar"; jwbBenarTeks = "BONUS"; jumlahBenar++;
                } 
                else {
                    if (arrHuruf.length === 0) {
                        warnaLingkaran = warnaSalahCV; status = "Kosong"; jumlahKosong++;
                    } else if (arrHuruf.length > 1) {
                        warnaLingkaran = warnaOrange; status = "Ganda"; jumlahGanda++;
                    } else if (targetToken.includes(jawabanTeks)) {
                        warnaLingkaran = warnaBenarCV; status = "Benar"; jumlahBenar++;
                    } else {
                        warnaLingkaran = warnaSalahCV; status = "Salah"; jumlahSalah++;
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
            
            bacaNilaiAI(namaSiswa, nilaiAkhir, scanMode);
            
            // 🔥 FITUR 5: LEDAKAN CONFETTI JIKA NILAI SEMPURNA (100) 🔥
            if (Number(nilaiAkhir) === 100) {
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.5 }, // Meledak dari tengah layar
                        colors: ['#34C759', '#007AFF', '#FFD60A', '#FF3B30'],
                        zIndex: 99999 // Tambah zIndex agar tidak tertutup elemen lain
                    });
                } else {
                    console.log("Library Confetti belum siap.");
                }
            }
            
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
        } else { 
            if(!isAutoMode) { 
                putarSuara(false); 
                Swal.fire({ title: 'LJK Miring', text: 'Sistem kesulitan memotong LJK. Bantu posisikan manual?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Posisikan Manual' })
                .then((res) => { if(res.isConfirmed) bukaCropManual(); });
            } 
        }
    } else { 
        if(!isAutoMode) { 
            putarSuara(false); 
            Swal.fire({ title: 'Kotak Tidak Terbaca', text: 'Kamera gagal menemukan 4 kotak hitam. Posisikan titik secara manual?', icon: 'error', showCancelButton: true, confirmButtonText: 'Posisikan Manual' })
            .then((res) => { if(res.isConfirmed) bukaCropManual(); });
        } 
    }
    
    bersihkanMemoriCV(src, dst, gambarHasil, contours, hierarchy); return 'failed';
}

// ==================== FALLBACK UI: MANUAL CROP ====================
let cropCanvas = null; let cropCtx = null;
let imgCrop = new Image();
let titikManual = []; let dragIndex = -1;

function bukaCropManual() {
    document.getElementById('modalCropManual').style.display = 'flex';
    cropCanvas = document.getElementById('canvasCrop'); cropCtx = cropCanvas.getContext('2d');
    
    // Ambil gambar terakhir yang membeku dari kanvas utama
    imgCrop.src = canvasElement.toDataURL('image/jpeg', 0.9);
    imgCrop.onload = () => {
        cropCanvas.width = imgCrop.width; cropCanvas.height = imgCrop.height;
        let w = cropCanvas.width; let h = cropCanvas.height;
        
        // 🔥 PERBAIKI: Beri offset (jarak) agar tidak pas di pojok 🔥
        // Kita gunakan 10% dari lebar dan tinggi sebagai jarak "pengait"
        let offW = w * 0.10; 
        let offH = h * 0.10; 

        titikManual = [
            // Kiri Atas (nongol)
            {x: offW, y: offH}, 
            // Kanan Atas (nongol)
            {x: w - offW, y: offH},
            // Kanan Bawah (nongol)
            {x: w - offW, y: h - offH},
            // Kiri Bawah (nongol)
            {x: offW, y: h - offH}
        ];
        
        initDragEvents(); gambarUlangCrop();
    }
}

function tutupCropManual() { document.getElementById('modalCropManual').style.display = 'none'; }

function prosesCropManual() {
    tutupCropManual();
    Toast.fire({ icon: 'info', title: 'Memproses titik manual...' });
    setTimeout(() => { prosesDeteksiKertas('manual', titikManual); }, 300); // Panggil ulang mesin dengan suapan manual!
}

function gambarUlangCrop() {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(imgCrop, 0, 0);
    
    // Gambar bayangan area yang akan dipotong
    cropCtx.beginPath();
    cropCtx.moveTo(titikManual[0].x, titikManual[0].y); cropCtx.lineTo(titikManual[1].x, titikManual[1].y);
    cropCtx.lineTo(titikManual[2].x, titikManual[2].y); cropCtx.lineTo(titikManual[3].x, titikManual[3].y);
    cropCtx.closePath();
    cropCtx.lineWidth = 4; cropCtx.strokeStyle = 'rgba(52, 199, 89, 0.8)'; cropCtx.stroke();
    cropCtx.fillStyle = 'rgba(52, 199, 89, 0.2)'; cropCtx.fill();

    // Gambar 4 Titik Merah Interaktif
    titikManual.forEach(pt => {
        cropCtx.beginPath(); cropCtx.arc(pt.x, pt.y, 11, 0, Math.PI*2);
        cropCtx.fillStyle = '#FF3B30'; cropCtx.fill();
        cropCtx.lineWidth = 4; cropCtx.strokeStyle = '#FFFFFF'; cropCtx.stroke();
    });
}

function getMousePos(evt) {
    let rect = cropCanvas.getBoundingClientRect();
    let scaleX = cropCanvas.width / rect.width; let scaleY = cropCanvas.height / rect.height;
    let clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
    let clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function initDragEvents() {
    cropCanvas.onmousedown = cropCanvas.ontouchstart = (e) => {
        e.preventDefault(); let pos = getMousePos(e);
        // 🔥 FIX: Perbesar daya magnet (Hitbox) dari 60px menjadi 120px 🔥
        dragIndex = titikManual.findIndex(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 210);
    };
    cropCanvas.onmousemove = cropCanvas.ontouchmove = (e) => {
        if(dragIndex === -1) return;
        e.preventDefault(); let pos = getMousePos(e);
        titikManual[dragIndex].x = pos.x; titikManual[dragIndex].y = pos.y;
        gambarUlangCrop();
    };
    cropCanvas.onmouseup = cropCanvas.ontouchend = cropCanvas.onmouseleave = () => { dragIndex = -1; };
}