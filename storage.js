// ==================== VARIABLE GLOBAL ====================
const Toast = Swal.mixin({ 
    toast: true, 
    position: 'top', // 🔥 Dipindah ke atas agar turun layaknya notifikasi elegan
    showConfirmButton: false, 
    timer: 2500, 
    timerProgressBar: true
    // 🔥 customClass dihapus agar ukurannya tidak bertabrakan dengan CSS Navbar
});


let videoElement;
let canvasElement;
let dbSiswa = {}; 
let riwayatData = []; 
let statistikSalah = Array(60).fill(0);
let autoScanTimer = null;
let daftarProfil = {}; 

// ==================== KONFIGURASI SUPABASE ====================
// 🔥 WAJIB DIISI DENGAN URL & ANON KEY PROJECT SUPABASE-MU 🔥
const SUPABASE_URL = "https://rfmlsxtchzhstheqdmla.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWxzeHRjaHpoc3RoZXFkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTA2MDEsImV4cCI6MjA4MjA2NjYwMX0.uuBqvhQ-1fsB2cF63-uluHpS6I-1JuYv5dF1bPcZdrU"; 

// ==================== SISTEM MODE SUMBER DATA ====================
// Menyimpan data mentah di memori lokal agar tidak saling tabrak
let dbRawSupabase = JSON.parse(localStorage.getItem('dbRawSupabase')) || {};
let dbRawExcel = JSON.parse(localStorage.getItem('dbRawExcel')) || {};
// (dbRawManual akan langsung membaca dari elemen #inputDBSiswa)

document.addEventListener("DOMContentLoaded", () => {
    let modeTersimpan = localStorage.getItem('modeSumberData') || 'supabase';
    let elMode = document.getElementById('modeSumberData');
    if(elMode) { elMode.value = modeTersimpan; ubahModeSumberData(); }
    
    // Ambil daftar kelas dari Supabase saat aplikasi dibuka
    if(modeTersimpan === 'supabase') { muatDaftarKelasSupabase(); }
});

function ubahModeSumberData() {
    let mode = document.getElementById('modeSumberData').value;
    localStorage.setItem('modeSumberData', mode);

    // Atur tampilan Panel
    document.getElementById('panelSupabase').style.display = (mode === 'supabase') ? 'block' : 'none';
    document.getElementById('panelExcel').style.display = (mode === 'excel') ? 'block' : 'none';
    document.getElementById('panelManual').style.display = (mode === 'manual') ? 'block' : 'none';

    // Muat kelas jika pindah ke mode Supabase dan belum dimuat
    if(mode === 'supabase') muatDaftarKelasSupabase();

    // Re-compile database siswa utama agar sesuai dengan mode yang dipilih
    simpanDataSiswa(); 
}

// ==================== FUNGSI SUPABASE (PRIORITAS 1) ====================
async function muatDaftarKelasSupabase() {
    let selectKelas = document.getElementById('pilihKelasSupabase');
    if(selectKelas.options.length > 1) return; // Jika sudah dimuat, lewati

    try {
        // Memanggil REST API Supabase untuk mengambil kolom 'kelas'
        let response = await fetch(`${SUPABASE_URL}/rest/v1/santri?select=kelas`, {
            method: 'GET',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        if (!response.ok) throw new Error("Gagal mengambil kelas");
        let data = await response.json();
        
        // Buat Array Kelas yang unik (menghilangkan duplikat) dan diurutkan
        let kelasUnik = [...new Set(data.map(item => item.kelas).filter(k => k))].sort();
        
        selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        kelasUnik.forEach(k => { selectKelas.innerHTML += `<option value="${k}">${k}</option>`; });
        
    } catch (error) {
        console.error(error);
        selectKelas.innerHTML = '<option value="">⚠️ Gagal memuat koneksi server</option>';
    }
}

async function tarikDataSupabase() {
    let kelasDipilih = document.getElementById('pilihKelasSupabase').value;
    if(!kelasDipilih) { Toast.fire({ icon: 'warning', title: 'Pilih kelas terlebih dahulu!' }); return; }

    let btnTarik = document.querySelector('#panelSupabase .btn-utama');
    // 🔥 Suntik animasi Loading memutar via SVG 🔥
    btnTarik.innerHTML = `<svg style="animation: puter 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Proses...`; 
    btnTarik.disabled = true;

    try {
        // Ambil data santri HANYA dari kelas yang dipilih
        let response = await fetch(`${SUPABASE_URL}/rest/v1/santri?kelas=eq.${encodeURIComponent(kelasDipilih)}&select=nis,nama_santri`, {
            method: 'GET',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (!response.ok) throw new Error("Gagal menarik data siswa");
        let data = await response.json();

        // 🔥 FORMAT DATA & KONVERSI NIS KE 5 DIGIT TERAKHIR 🔥
        dbRawSupabase = {};
        data.forEach(siswa => { 
            let nisLengkap = String(siswa.nis).trim();
            // Ambil 5 digit terakhir, atau tambahkan '0' di depan jika kurang dari 5 digit
            let nis5 = nisLengkap.length >= 5 ? nisLengkap.slice(-5) : nisLengkap.padStart(5, '0');
            
            dbRawSupabase[nis5] = siswa.nama_santri; 
        });
        
        // Simpan ke localStorage khusus Supabase
        localStorage.setItem('dbRawSupabase', JSON.stringify(dbRawSupabase));
        
        // Update UI
        document.getElementById('infoSupabase').innerText = `✅ Tersimpan: ${Object.keys(dbRawSupabase).length} Santri (Kelas ${kelasDipilih})`;
        Toast.fire({ icon: 'success', title: 'Data Supabase Berhasil Ditarik!' });
        
        simpanDataSiswa(); // Re-compile dbSiswa global
    } catch (error) {
        console.error(error);
        Toast.fire({ icon: 'error', title: 'Koneksi ke Supabase Gagal!' });
    } finally {
        btnTarik.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Tarik`; 
        btnTarik.disabled = false;
    }
}

// ==================== FUNGSI COMPILER UTAMA ====================
// Fungsi ini menggantikan fungsi lama yang hanya membaca dari Textarea
function simpanDataSiswa() {
    let mode = localStorage.getItem('modeSumberData') || 'supabase';
    dbSiswa = {}; // Reset global dbSiswa
    
    if (mode === 'supabase') {
        dbSiswa = Object.assign({}, dbRawSupabase);
        let count = Object.keys(dbSiswa).length;
        document.getElementById('infoSupabase').innerText = count > 0 ? `✅ Aktif: ${count} Santri dari Server` : `Belum ada data ditarik.`;
        
    } else if (mode === 'excel') {
        dbSiswa = Object.assign({}, dbRawExcel);
        let count = Object.keys(dbSiswa).length;
        document.getElementById('infoExcel').innerText = count > 0 ? `✅ Aktif: ${count} Santri dari Excel` : `Belum ada file diupload.`;
        
    } else if (mode === 'manual') {
        let lines = document.getElementById('inputDBSiswa').value.split('\n');
        lines.forEach(line => {
            let parts = line.split('=');
            if(parts.length >= 2) { 
                let nisRaw = parts[0].trim();
                let namaRaw = parts[1].trim();
                
                // 🔥 SAKTI: Ambil 5 digit terakhir saja! 🔥
                let nis5 = nisRaw.length >= 5 ? nisRaw.slice(-5) : nisRaw.padStart(5, '0');
                
                dbSiswa[nis5] = namaRaw; 
            }
        });
    }

    // Update jumlah siswa di tab Nilai (jika elemennya ada)
    let countTotal = Object.keys(dbSiswa).length;
    let elCount = document.getElementById('countKelas');
    if(elCount) elCount.innerText = `${countTotal} Siswa Terdaftar`;
    
    console.log(`[Database LJK] Mode: ${mode.toUpperCase()} | Total Data Aktif: ${countTotal}`);
}

// ==================== ENGINE KUNCI JAWABAN ====================
function parseKunci(str) {
    let text = (str || '').toUpperCase().replace(/\s+/g, '');
    let tokens = []; let current = [];
    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (/[A-E*X]/.test(c)) {
            current.push(c);
            if (i + 1 < text.length && text[i + 1] === '/') {
                i++; 
            } else {
                tokens.push(current); current = [];
            }
        }
    }
    return tokens.slice(0, 60); 
}

// ==================== AUTO-FORMAT KUNCI JAWABAN ====================
function formatKunciOtomatis() {
    let elem = document.getElementById('inputKunci');
    if (!elem) return;
    
    // Simpan posisi kursor agar saat mengetik tidak loncat
    let start = elem.selectionStart; 
    let originalLength = elem.value.length;
    
    // Bersihkan karakter aneh, hanya sisakan A-E, *, X, dan /
    let val = elem.value.toUpperCase().replace(/[^A-E*X\/]/g, '');
    let formatted = '';
    let count = 0;
    
    for (let i = 0; i < val.length; i++) {
        formatted += val[i];
        
        // Cek jika huruf adalah jawaban sah (A-E, *, X)
        if (/[A-E*X]/.test(val[i])) {
            // Jika huruf SETELAHNYA BUKAN '/', berarti ini 1 nomor penuh (misal A/B dihitung 1)
            if (val[i+1] !== '/') {
                count++;
                // Jika sudah 20 nomor dan belum di ujung teks, Pindah Baris!
                if (count > 0 && count % 20 === 0 && i !== val.length - 1) {
                    formatted += '\n';
                }
            }
        }
    }
    
    elem.value = formatted;
    
    // Kembalikan kursor ke posisi yang tepat
    let diff = formatted.length - originalLength;
    elem.setSelectionRange(start + diff, start + diff);

    // Update counter jika fungsinya ada
    if(typeof updateCounterKunci === 'function') updateCounterKunci();
}

function hitungNilaiAkhir(rincian, totalSoalAktif = 60) {
    let tipePenilaian = document.getElementById('sistemPenilaian').value;
    if (totalSoalAktif <= 0) return 0;

    let benar = 0; let salah = 0;
    rincian.forEach(r => {
        if (r.status === 'Benar') benar++;
        else if (r.status === 'Salah' || r.status === 'Kosong' || r.status === 'Ganda') salah++;
    });

    if (tipePenilaian === 'utbk') {
        return (benar * 4) + (salah * -1);
    } else if (tipePenilaian === 'bobot') {
        let inputBobot = document.getElementById('inputBobot').value || "1";
        let arrBobot = inputBobot.split(',').map(n => parseFloat(n.trim()) || 0);
        let isSingle = arrBobot.length === 1;
        let totalSkor = 0;
        
        rincian.forEach((r, idx) => {
            if (r.status === 'Benar') {
                let bbt = isSingle ? arrBobot[0] : (arrBobot[idx] !== undefined ? arrBobot[idx] : 1);
                totalSkor += bbt;
            }
        });
        return Math.round(totalSkor * 100) / 100; 
        
    } else if (tipePenilaian === 'benar') {
        return benar; 
        
    } else {
        // Default: Persentase Standar (0 - 100)
        return Math.round((benar / totalSoalAktif) * 100);
    }
}

// ==================== FITUR PROFIL & KELAS ====================
function renderDropdownProfil() {
    let select = document.getElementById('pilihProfil');
    if(!select) return;
    let currentVal = select.value;
    select.innerHTML = '<option value="">-- Buat / Pilih Profil --</option>';
    for (let namaProfil in daftarProfil) {
        let opt = document.createElement('option');
        opt.value = namaProfil; opt.innerHTML = namaProfil;
        select.appendChild(opt);
    }
    if(daftarProfil[currentVal]) select.value = currentVal;
}

async function simpanProfilBaru() {
    const { value: namaProfil } = await Swal.fire({
        title: 'Simpan Profil', input: 'text',
        inputLabel: 'Nama Kelas & Mapel (Cth: 10 IPA 1 - Biologi)',
        inputPlaceholder: 'Ketik nama profil...', showCancelButton: true, confirmButtonColor: 'var(--success)'
    });

    if (namaProfil) {
        daftarProfil[namaProfil] = {
            kunci: document.getElementById('inputKunci').value.toUpperCase(),
            siswa: document.getElementById('inputDBSiswa').value,
            riwayat: riwayatData, statistik: statistikSalah 
        };
        localStorage.setItem('daftarProfilLJK', JSON.stringify(daftarProfil));
        renderDropdownProfil(); document.getElementById('pilihProfil').value = namaProfil;
        Toast.fire({ icon: 'success', title: 'Profil & Nilai Tersimpan!' });
    }
}

function hapusProfil() {
    let select = document.getElementById('pilihProfil');
    let nama = select.value;
    if(!nama) return Toast.fire({ icon:'warning', title:'Pilih profil dulu!' });
    delete daftarProfil[nama];
    localStorage.setItem('daftarProfilLJK', JSON.stringify(daftarProfil));
    select.value = ""; renderDropdownProfil();
    Toast.fire({ icon:'success', title:'Profil dihapus!' });
}

function muatProfil() {
    let namaProfil = document.getElementById('pilihProfil').value;
    if (namaProfil && daftarProfil[namaProfil]) {
        document.getElementById('inputKunci').value = daftarProfil[namaProfil].kunci;
        document.getElementById('inputDBSiswa').value = daftarProfil[namaProfil].siswa;
        simpanPengaturan(); 
        riwayatData = daftarProfil[namaProfil].riwayat || [];
        statistikSalah = daftarProfil[namaProfil].statistik || Array(60).fill(0);
        localStorage.setItem('riwayatLJK', JSON.stringify(riwayatData));
        localStorage.setItem('statistikLJK', JSON.stringify(statistikSalah));
        renderTabelRiwayat();
        Toast.fire({ icon: 'info', title: `Data Kelas ${namaProfil} Dimuat!` });
    } else {
        riwayatData = []; statistikSalah = Array(60).fill(0);
        renderTabelRiwayat();
    }
}

// ==================== BACKUP & RESTORE ====================
function ambilSnapshotBackup() {
    return {
        version: 1, exportedAt: new Date().toISOString(),
        namaMapel: document.getElementById('pilihProfil').value || '',
        kunci: document.getElementById('inputKunci').value.toUpperCase(),
        sistemPenilaian: document.getElementById('sistemPenilaian').value,
        bobotLJK: document.getElementById('inputBobot').value,
        kkm: document.getElementById('inputKKM').value,
        suaraAI: document.getElementById('cbSuaraAI').checked,
        siswa: document.getElementById('inputDBSiswa').value,
        riwayat: riwayatData, statistik: statistikSalah
    };
}

function backupDataToFile() {
    try {
        const snapshot = ambilSnapshotBackup();
        const nama = (snapshot.namaMapel || 'backup-ljk').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'backup-ljk';
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nama + '.json';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        Toast.fire({ icon: 'success', title: 'Backup JSON berhasil dibuat!' });
    } catch (err) {
        console.error(err); Toast.fire({ icon: 'error', title: 'Backup gagal dibuat.' });
    }
}

function triggerRestoreFile() { document.getElementById('inputRestoreFile').click(); }

function restoreDataFromObject(data, mode = 'replace') {
    if (!data || typeof data !== 'object') throw new Error('Format file backup tidak valid.');
    
    document.getElementById('pilihProfil').value = data.namaMapel || '';
    document.getElementById('inputKunci').value = (data.kunci || '').toUpperCase();
    document.getElementById('sistemPenilaian').value = data.sistemPenilaian || 'benar';
    document.getElementById('inputBobot').value = data.bobotLJK || '1';
    document.getElementById('inputKKM').value = data.kkm || 75;
    document.getElementById('cbSuaraAI').checked = data.suaraAI === true;
    
    let backupDB = data.siswa || '';
    let backupRiwayat = Array.isArray(data.riwayat) ? data.riwayat : [];

    if (mode === 'replace') {
        document.getElementById('inputDBSiswa').value = backupDB;
        riwayatData = backupRiwayat;
    } else if (mode === 'merge') {
        let dbLama = document.getElementById('inputDBSiswa').value.split('\n').map(l => l.trim()).filter(l => l);
        let dbBaru = backupDB.split('\n').map(l => l.trim()).filter(l => l);
        document.getElementById('inputDBSiswa').value = [...new Set([...dbLama, ...dbBaru])].join('\n');

        backupRiwayat.forEach(baru => {
            let idx = riwayatData.findIndex(lama => lama.id === baru.id);
            if (idx !== -1) {
                riwayatData[idx] = baru; 
            } else {
                riwayatData.push(baru);
            }
        });
    }

    statistikSalah = Array(60).fill(0);
    riwayatData.forEach(siswa => {
        if (siswa.rincian) {
            siswa.rincian.forEach((item, idx) => {
                if ((item.status === "Salah" || item.status === "Kosong" || item.status === "Ganda") && idx < 60) {
                    statistikSalah[idx]++;
                }
            });
        }
    });

    toggleInputBobot();
    simpanPengaturan();
    localStorage.setItem('riwayatLJK', JSON.stringify(riwayatData));
    localStorage.setItem('statistikLJK', JSON.stringify(statistikSalah));
    renderTabelRiwayat();
    
    Toast.fire({ 
        icon: 'success', 
        title: mode === 'merge' ? 'Data Berhasil Digabungkan!' : 'Data Berhasil Ditimpa!' 
    });
}

// ==================== EVENT LISTENER RESTORE FILE ====================
document.getElementById('inputRestoreFile').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(event) {
        try {
            let dataBackup = JSON.parse(event.target.result);
            
            // Jika tabel saat ini kosong, langsung masukkan saja tanpa ba-bi-bu
            if (riwayatData.length === 0) {
                restoreDataFromObject(dataBackup, 'replace');
                return;
            }

            // Jika tabel saat ini ADA ISINYA, berikan pilihan ke Guru!
            let jumlahSiswaBaru = Array.isArray(dataBackup.riwayat) ? dataBackup.riwayat.length : 0;
            
            Swal.fire({
                title: 'Data Ditemukan',
                text: `Saat ini ada ${riwayatData.length} data siswa di kelas ini. Apa yang ingin Anda lakukan dengan data backup baru (${jumlahSiswaBaru} siswa)?`,
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '🔄 Gabungkan (Merge)',
                denyButtonText: '⚠️ Timpa (Overwrite)',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#007AFF',
                denyButtonColor: '#FF3B30'
            }).then((result) => {
                if (result.isConfirmed) {
                    restoreDataFromObject(dataBackup, 'merge'); // Eksekusi mode gabung
                } else if (result.isDenied) {
                    restoreDataFromObject(dataBackup, 'replace'); // Eksekusi mode timpa
                }
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Gagal Membaca File', text: 'File json rusak atau tidak sesuai format LJK Scanner Pro.' });
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input agar file yang sama bisa dipilih lagi jika mau
});

// ==================== PENGATURAN UMUM ====================
function simpanRiwayat() {
    statistikSalah = Array(60).fill(0);
    riwayatData.forEach(siswa => {
        if(siswa.rincian) {
            siswa.rincian.forEach((item, idx) => {
                if (item.status === "Salah" || item.status === "Kosong" || item.status === "Ganda") {
                    if(idx < 60) statistikSalah[idx]++;
                }
            });
        }
    });

    localStorage.setItem('riwayatLJK', JSON.stringify(riwayatData));
    localStorage.setItem('statistikLJK', JSON.stringify(statistikSalah));
    renderTabelRiwayat();
}

function normalisasiKunciJawaban() {
    const input = document.getElementById('inputKunci');
    let tokens = parseKunci(input.value);
    let bersih = tokens.map(t => t.join('/')).join(''); 
    input.value = bersih; 
    return bersih;
}

function simpanPengaturan(isSilent = false) {
    const kunciStr = normalisasiKunciJawaban();
    const tokens = parseKunci(kunciStr);
    
    if (typeof updateCounterKunci === 'function') updateCounterKunci();

    if (tokens.length === 0) {
        Toast.fire({ icon: 'error', title: 'Kunci jawaban tidak boleh kosong!' });
        document.getElementById('inputKunci').focus(); return;
    }

    localStorage.setItem('namaMapelLJK', document.getElementById('pilihProfil').value);
    localStorage.setItem('kunciLJK', kunciStr);
    localStorage.setItem('dbSiswaTxt', document.getElementById('inputDBSiswa').value);
    let selPenilaian = document.getElementById('sistemPenilaian');
    let tipePenilaian = selPenilaian.value;
    localStorage.setItem('sistemPenilaian', tipePenilaian);
    
    let elInfoSistem = document.getElementById('infoSistemPenilaian');
    if (elInfoSistem) {
        let namaSistem = selPenilaian.options[selPenilaian.selectedIndex].text;
        elInfoSistem.innerHTML = `Skor dihitung berdasarkan: <b style="color:var(--primary);">${namaSistem}</b>`;
    }
    localStorage.setItem('bobotLJK', document.getElementById('inputBobot').value);
    localStorage.setItem('kkmLJK', document.getElementById('inputKKM').value);
    localStorage.setItem('suaraAILJK', document.getElementById('cbSuaraAI').checked);
    
    // 🔥 PERBAIKAN: Kita panggil Compiler Utama kita yang baru! 🔥
    simpanDataSiswa(); 

    if(riwayatData.length > 0) {
        let totalAktif = tokens.filter(t => !t.includes('X')).length;
        
        riwayatData.forEach(siswa => {
            // 🔥 UPDATE NAMA SISWA OTOMATIS DARI DATABASE TERBARU 🔥
            siswa.nama = dbSiswa[siswa.id] || "Tidak Terdaftar";
            
            let jBenar = 0; let jSalah = 0; let jKosong = 0; let jGanda = 0;
            
            siswa.rincian.forEach((item, idx) => {
                let tk = idx < tokens.length ? tokens[idx] : null;
                let jwbSiswa = item.jawaban;
                
                if (!tk || tk.includes('X')) {
                    item.status = "DIABAIKAN";
                    item.kunci = !tk ? "-" : "X";
                } else if (tk.includes('*')) {
                    item.status = "Benar"; item.kunci = "BONUS"; jBenar++;
                } else {
                    item.kunci = tk.join('/');
                    if (jwbSiswa === "Kosong") { item.status = "Kosong"; jKosong++; } 
                    else if (jwbSiswa === "Ganda") { item.status = "Ganda"; jGanda++; } 
                    else if (tk.includes(jwbSiswa)) { item.status = "Benar"; jBenar++; } 
                    else { item.status = "Salah"; jSalah++; }
                }
            });
            
            siswa.benar = jBenar; siswa.salah = jSalah; siswa.kosong = jKosong; siswa.ganda = jGanda;
            siswa.nilai = hitungNilaiAkhir(siswa.rincian, totalAktif);
        });
        
        simpanRiwayat(); 
    }
    
    if (!isSilent) {
        Toast.fire({ icon: 'success', title: 'Pengaturan Disimpan!' });
    }
}

function parseDBSiswa() {
    dbSiswa = {};
    let baris = document.getElementById('inputDBSiswa').value.split('\n');
    baris.forEach(b => { let part = b.split('='); if(part.length === 2) dbSiswa[part[0].trim()] = part[1].trim(); });
}

function importExcelSiswa(event) {
    let file = event.target.files[0];
    if (!file) return;

    Toast.fire({ icon: 'info', title: 'Membaca file Excel...' });

    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let firstSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[firstSheetName];
        let jsonArray = XLSX.utils.sheet_to_json(worksheet, {header: 1});
        
        dbRawExcel = {}; // Reset kamar data Excel
        let count = 0;

        for (let i = 1; i < jsonArray.length; i++) {
            let row = jsonArray[i];
            if (row.length >= 2 && row[0] != null && row[1] != null) {
                let nis = String(row[0]).trim(); 
                let nama = String(row[1]).trim();
                let nis5 = nis.length >= 5 ? nis.slice(-5) : nis.padStart(5, '0');
                
                // 🔥 SEKARANG DATA DISIMPAN KE KAMAR EXCEL, BUKAN KE TEXTAREA 🔥
                dbRawExcel[nis5] = nama; 
                count++;
            }
        }

        if (count > 0) {
            localStorage.setItem('dbRawExcel', JSON.stringify(dbRawExcel));
            simpanDataSiswa(); // Compile & Refresh UI
            Swal.fire('Berhasil!', `Berhasil mengimpor <b>${count}</b> data siswa dari Excel.`, 'success');
        } else {
            Swal.fire('Gagal', 'Tidak ada data yang valid. Pastikan Kolom 1 adalah NIS dan Kolom 2 adalah Nama Santri.', 'error');
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function resetRiwayat() {
    Swal.fire({
        title: 'Kosongkan Kelas Ini?', text: "Pastikan Anda sudah mendownload file Excel-nya!",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            riwayatData = []; simpanRiwayat(); 
            document.getElementById('hasilUjian').innerHTML = '';
            document.getElementById('kanvasHasil').style.display = 'none';
            
            // 🔥 BUG FIX: MENGHAPUS REFERENSI btnStatistik USANG & RESET SUB-TAB 🔥
            let wStat = document.getElementById('wadahStatistik'); if(wStat) wStat.innerHTML = '';
            let wInv = document.getElementById('wadahInvestigasi'); if(wInv) wInv.innerHTML = '';
            
            Swal.fire('Dihapus!', 'Data nilai kelas ini telah dikosongkan.', 'success');
        }
    });
}

function simpanKop() {
    let b1 = document.getElementById('kopBaris1'); if(b1) localStorage.setItem('kopBaris1', b1.value);
    let b2 = document.getElementById('kopBaris2'); if(b2) localStorage.setItem('kopBaris2', b2.value);
    let b3 = document.getElementById('kopBaris3'); if(b3) localStorage.setItem('kopBaris3', b3.value);
    let b4 = document.getElementById('kopBaris4'); if(b4) localStorage.setItem('kopBaris4', b4.value);   
    Toast.fire({ icon: 'success', title: 'Teks Kop Disimpan!' });
}

function loadDataKop() {
    let b1 = document.getElementById('kopBaris1'); if(b1 && localStorage.getItem('kopBaris1')) b1.value = localStorage.getItem('kopBaris1');
    let b2 = document.getElementById('kopBaris2'); if(b2 && localStorage.getItem('kopBaris2')) b2.value = localStorage.getItem('kopBaris2');
    let b3 = document.getElementById('kopBaris3'); if(b3 && localStorage.getItem('kopBaris3')) b3.value = localStorage.getItem('kopBaris3');
    let b4 = document.getElementById('kopBaris4'); if(b4 && localStorage.getItem('kopBaris4')) b4.value = localStorage.getItem('kopBaris4');
    
    let l1 = localStorage.getItem('logo1');
    let p1 = document.getElementById('previewLogo1');
    if(p1 && l1) { p1.src = l1; p1.style.display = 'block'; }
}

function prosesLogo(inputElem, keyName) {
    let file = inputElem.files[0];
    if (!file) return;
    
    Toast.fire({ icon: 'info', title: 'Memproses Logo...' });
    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = function() {
            let canvas = document.createElement('canvas'); let ctx = canvas.getContext('2d');
            let MAX_WIDTH = 300; let MAX_HEIGHT = 300; let width = img.width; let height = img.height;
            if (width > height && width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            else if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            
            canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
            let base64 = canvas.toDataURL('image/png'); localStorage.setItem(keyName, base64);
            let imgPreview = document.getElementById(keyName === 'logo1' ? 'previewLogo1' : 'previewLogo2');
            if (imgPreview) {
                imgPreview.src = base64; 
                imgPreview.style.display = 'block';
            }
            Toast.fire({ icon: 'success', title: 'Logo Berhasil Disimpan!' });
        }
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(loadDataKop, 500); });