// ==================== VARIABLE GLOBAL ====================
const Toast = Swal.mixin({ 
    toast: true, 
    position: 'bottom', 
    showConfirmButton: false, 
    timer: 2500, 
    timerProgressBar: true,
    customClass: { container: 'mb-navbar' }
});

let videoElement;
let canvasElement;
let dbSiswa = {}; 
let riwayatData = []; 
let statistikSalah = Array(60).fill(0);
let autoScanTimer = null;
let daftarProfil = {}; 

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

function hitungNilaiAkhir(rincian, totalSoalAktif = 60) {
    let tipePenilaian = document.getElementById('sistemPenilaian').value;
    if (totalSoalAktif <= 0) return 0;

    let benar = 0; let salah = 0;
    rincian.forEach(r => {
        if (r.status === 'BENAR') benar++;
        else if (r.status === 'SALAH' || r.status === 'KOSONG' || r.status === 'GANDA') salah++;
    });

    if (tipePenilaian === 'utbk') {
        return (benar * 4) + (salah * -1);
    } else if (tipePenilaian === 'bobot') {
        let inputBobot = document.getElementById('inputBobot').value || "1";
        let arrBobot = inputBobot.split(',').map(n => parseFloat(n.trim()) || 0);
        let isSingle = arrBobot.length === 1;
        let totalSkor = 0;
        
        rincian.forEach((r, idx) => {
            if (r.status === 'BENAR') {
                let bbt = isSingle ? arrBobot[0] : (arrBobot[idx] !== undefined ? arrBobot[idx] : 1);
                totalSkor += bbt;
            }
        });
        return Math.round(totalSkor * 100) / 100; 
    } else {
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
    document.getElementById('sistemPenilaian').value = data.sistemPenilaian || 'standar';
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
                if ((item.status === "SALAH" || item.status === "KOSONG" || item.status === "GANDA") && idx < 60) {
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

// ==================== PENGATURAN UMUM ====================
function simpanRiwayat() {
    statistikSalah = Array(60).fill(0);
    riwayatData.forEach(siswa => {
        if(siswa.rincian) {
            siswa.rincian.forEach((item, idx) => {
                if (item.status === "SALAH" || item.status === "KOSONG" || item.status === "GANDA") {
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
    let tipePenilaian = document.getElementById('sistemPenilaian').value;
    localStorage.setItem('sistemPenilaian', tipePenilaian);
    localStorage.setItem('bobotLJK', document.getElementById('inputBobot').value);
    localStorage.setItem('kkmLJK', document.getElementById('inputKKM').value);
    localStorage.setItem('suaraAILJK', document.getElementById('cbSuaraAI').checked);
    
    parseDBSiswa();

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
                    item.status = "BENAR"; item.kunci = "BONUS"; jBenar++;
                } else {
                    item.kunci = tk.join('/');
                    if (jwbSiswa === "Kosong") { item.status = "KOSONG"; jKosong++; } 
                    else if (jwbSiswa === "GANDA") { item.status = "GANDA"; jGanda++; } 
                    else if (tk.includes(jwbSiswa)) { item.status = "BENAR"; jBenar++; } 
                    else { item.status = "SALAH"; jSalah++; }
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
        
        let hasilDB = [];
        for (let i = 1; i < jsonArray.length; i++) {
            let row = jsonArray[i];
            if (row.length >= 2 && row[0] != null && row[1] != null) {
                let nis = String(row[0]).trim(); let nama = String(row[1]).trim();
                let nis5 = nis.length >= 5 ? nis.slice(-5) : nis.padStart(5, '0');
                hasilDB.push(`${nis5}=${nama}`);
            }
        }

        if (hasilDB.length > 0) {
            document.getElementById('inputDBSiswa').value = hasilDB.join('\n');
            simpanPengaturan();
            Swal.fire('Berhasil!', `Berhasil mengimpor <b>${hasilDB.length}</b> data siswa.`, 'success');
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
            document.getElementById('wadahStatistik').style.display = 'none';
            document.getElementById('btnStatistik').innerHTML = '📈 Analisis Soal';
            Swal.fire('Dihapus!', 'Data nilai kelas ini telah dikosongkan.', 'success');
        }
    });
}

// 🔥 BUG FIX: DIBERIKAN PROTEKSI if() UNTUK MENCEGAH CRASH SAAT ELEMENT TIDAK ADA 🔥
function simpanKop() {
    let b1 = document.getElementById('kopBaris1'); if(b1) localStorage.setItem('kopBaris1', b1.value);
    let b2 = document.getElementById('kopBaris2'); if(b2) localStorage.setItem('kopBaris2', b2.value);
    let b3 = document.getElementById('kopBaris3'); if(b3) localStorage.setItem('kopBaris3', b3.value);
    let b4 = document.getElementById('kopBaris4'); if(b4) localStorage.setItem('kopBaris4', b4.value);   
    Toast.fire({ icon: 'success', title: 'Teks Kop Disimpan!' });
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

function loadDataKop() {
    let b1 = document.getElementById('kopBaris1'); if(b1 && localStorage.getItem('kopBaris1')) b1.value = localStorage.getItem('kopBaris1');
    let b2 = document.getElementById('kopBaris2'); if(b2 && localStorage.getItem('kopBaris2')) b2.value = localStorage.getItem('kopBaris2');
    let b3 = document.getElementById('kopBaris3'); if(b3 && localStorage.getItem('kopBaris3')) b3.value = localStorage.getItem('kopBaris3');
    let b4 = document.getElementById('kopBaris4'); if(b4 && localStorage.getItem('kopBaris4')) b4.value = localStorage.getItem('kopBaris4');
    
    let l1 = localStorage.getItem('logo1');
    let p1 = document.getElementById('previewLogo1');
    if(p1 && l1) { p1.src = l1; p1.style.display = 'block'; }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(loadDataKop, 500); });