// ==================== INISIALISASI AWAL (ONLOAD) ====================
window.onload = function() {
    videoElement = document.getElementById('kamera');
    canvasElement = document.getElementById('kanvasFoto');

    if(!localStorage.getItem('kunciLJK') && document.getElementById('inputKunci')) { simpanPengaturan(); }
    if(localStorage.getItem('namaMapelLJK')) document.getElementById('pilihProfil').value = localStorage.getItem('namaMapelLJK');
    if(localStorage.getItem('kunciLJK')) document.getElementById('inputKunci').value = localStorage.getItem('kunciLJK');
    if(localStorage.getItem('sistemPenilaian')) document.getElementById('sistemPenilaian').value = localStorage.getItem('sistemPenilaian');
    if(localStorage.getItem('bobotLJK')) document.getElementById('inputBobot').value = localStorage.getItem('bobotLJK');
    if(localStorage.getItem('dbSiswaTxt')) document.getElementById('inputDBSiswa').value = localStorage.getItem('dbSiswaTxt');
    if(localStorage.getItem('kkmLJK')) document.getElementById('inputKKM').value = localStorage.getItem('kkmLJK');
    
    // Default Suara & Scan ON
    document.getElementById('cbAutoScan').checked = true;
    if(localStorage.getItem('suaraAILJK') !== 'false') document.getElementById('cbSuaraAI').checked = true;
    
    toggleInputBobot();
    updateCounterKunci();

    if(localStorage.getItem('daftarProfilLJK')) {
        daftarProfil = JSON.parse(localStorage.getItem('daftarProfilLJK'));
        renderDropdownProfil();
    }

    if(localStorage.getItem('riwayatLJK')) {
        riwayatData = JSON.parse(localStorage.getItem('riwayatLJK'));
        if(localStorage.getItem('statistikLJK')) statistikSalah = JSON.parse(localStorage.getItem('statistikLJK'));
        renderTabelRiwayat();
    }
    parseDBSiswa();
    
    document.getElementById('inputRestoreFile').addEventListener('change', async function(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try { 
            const raw = await file.text(); 
            const data = JSON.parse(raw); 
            
            const result = await Swal.fire({
                title: 'Opsi Restore Backup',
                text: 'Apakah Anda ingin menimpa data saat ini, atau menggabungkannya?',
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '➕ Gabung Data',
                denyButtonText: '⚠️ Timpa Total',
                cancelButtonText: 'Batal',
                confirmButtonColor: 'var(--success)',
                denyButtonColor: 'var(--danger)'
            });

            if (result.isConfirmed) { restoreDataFromObject(data, 'merge'); } 
            else if (result.isDenied) { restoreDataFromObject(data, 'replace'); }
        } 
        catch (err) { console.error(err); Toast.fire({ icon: 'error', title: 'File backup gagal dibaca.' }); } 
        finally { event.target.value = ''; }
    });
};

// ==================== UI & AUDIO HELPERS ====================
function updateCounterKunci() {
    let input = document.getElementById('inputKunci');
    let counterEl = document.getElementById('counterKunci');
    if (input && counterEl && typeof parseKunci === 'function') {
        let count = parseKunci(input.value).length;
        counterEl.innerText = `${count} / 60 Soal`;
        if (count === 60) {
            counterEl.style.color = "var(--success)";
            counterEl.style.borderColor = "var(--success)";
        } else {
            counterEl.style.color = "var(--primary)";
            counterEl.style.borderColor = "var(--primary)";
        }
    }
}

function toggleInputBobot() {
    let val = document.getElementById('sistemPenilaian').value;
    let wadah = document.getElementById('wadahBobot');
    if (wadah) { wadah.style.display = (val === 'bobot') ? 'block' : 'none'; }
}

function bacaNilaiAI(nama, nilai) {
    let isSuaraAktif = document.getElementById('cbSuaraAI').checked;
    if (!isSuaraAktif || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    let speech = new SpeechSynthesisUtterance(`${nama}. Nilai: ${nilai}.`);
    speech.lang = 'id-ID'; speech.rate = 1.0; window.speechSynthesis.speak(speech);
}

function putarSuara(isSukses) {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    let ctx = new AudioContext(); 
    
    if (isSukses) {
        if (navigator.vibrate) navigator.vibrate([50, 50]);
        let osc1 = ctx.createOscillator(); let gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.type = 'sine'; osc1.frequency.setValueAtTime(800, ctx.currentTime);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        osc1.start(); osc1.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
            let osc2 = ctx.createOscillator(); let gain2 = ctx.createGain();
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(1200, ctx.currentTime);
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            osc2.start(); osc2.stop(ctx.currentTime + 0.15);
        }, 100);
    } else {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        let osc = ctx.createOscillator(); let gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start(); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
    }
}

function updateActionButtons() {
    const hasData = Array.isArray(riwayatData) && riwayatData.length > 0;
    // PENTING: ID sudah disesuaikan dengan Sub-Tab yang baru
    const btns = [
        document.getElementById('btnDownloadExcel'), 
        document.getElementById('btnSubAnalisis'), 
        document.getElementById('btnSubNyontek')
    ];
    
    btns.forEach(btn => {
        if (!btn) return;
        btn.disabled = !hasData; 
        btn.style.opacity = hasData ? '1' : '0.55'; 
        btn.style.cursor = hasData ? 'pointer' : 'not-allowed';
    });
}

function buatBarisTabel(data) {
    if (data.status === "DIABAIKAN") {
        return `<tr style="border-bottom:1px solid var(--border); opacity:0.4;"><td style="padding:4px 0;">${data.nomor}.</td><td style="color:var(--text-muted); text-align:center;">- Diabaikan -</td></tr>`;
    }
    let warna = data.status === "BENAR" ? "var(--success)" : (data.status === "SALAH" ? "var(--danger)" : "var(--warning)");
    let ikon = data.status === "BENAR" ? "✔️" : (data.status === "SALAH" ? "❌" : "⚠️");
    let teks = data.status === "BENAR" ? `<b>${data.jawaban}</b>` : `<s>${data.jawaban}</s> (<span style="color:var(--primary)">${data.kunci}</span>)`;
    return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px 0; color:var(--text-muted);">${data.nomor}.</td><td style="color:${warna};">${teks} ${ikon}</td></tr>`;
}

// 🔥 HEADER TABEL DIMUNCULKAN KEMBALI 🔥
function renderTabelRiwayat() {
    const tabel = document.getElementById('tabelRiwayat');
    const count = document.getElementById('countKelas');
    if(!tabel) return;
    
    if (!riwayatData || riwayatData.length === 0) {
        if(count) count.innerText = "0 Siswa";
        tabel.innerHTML = `<tr><td colspan="8" style="padding: 30px; text-align:center; color: var(--text-muted);">Belum ada data scan.</td></tr>`;
        updateActionButtons(); return;
    }

    if(count) count.innerText = `${riwayatData.length} Siswa`;
    
    let htmlContent = `
    <thead>
        <tr>
            <th>ID</th>
            <th class="text-left">Nama</th>
            <th>B</th>
            <th>S</th>
            <th>K</th>
            <th>G</th>
            <th>Skor</th>
            <th>WA</th>
        </tr>
    </thead><tbody>`;

    let sortedRiwayat = [...riwayatData].sort((a, b) => b.nilai - a.nilai);
    
    // 🔥 UBAH parseInt MENJADI parseFloat AGAR SINKRON DENGAN BOBOT/TO 🔥
    let batasKKM = parseFloat(document.getElementById('inputKKM').value);
    if(isNaN(batasKKM)) batasKKM = 75;

    sortedRiwayat.forEach((data) => {
        let isLulus = data.nilai >= batasKKM;
        let btnKirim = `<button class="wa-btn" onclick="kirimWA(event, '${data.nama}', ${data.nilai}, ${data.benar}, ${data.salah}, ${isLulus})" title="Kirim WA">💬</button>`;

        htmlContent += `
            <tr style="cursor: pointer;" onclick="if(event.target.tagName.toLowerCase() !== 'button') koreksiManual('${data.id}')">
                <td style="font-weight: 600; color: var(--text-muted);">${data.id}</td>
                <td class="text-left">${data.nama}</td>
                <td style="color: var(--success); font-weight: bold;">${data.benar}</td>
                <td style="color: var(--danger); font-weight: bold;">${data.salah}</td>
                <td style="color: var(--warning); font-weight: bold;">${data.kosong}</td>
                <td style="color: #FF3B30; font-weight: bold;">${data.ganda || 0}</td>
                <td><div class="badge-score">${data.nilai}</div></td>
                <td>${btnKirim}</td>
            </tr>
        `;
    });
    
    htmlContent += `</tbody>`;
    tabel.innerHTML = htmlContent;
    updateActionButtons();
}

async function koreksiManual(idSiswa) {
    let mhsIndex = riwayatData.findIndex(d => d.id === idSiswa);
    if (mhsIndex === -1) return;
    let d = riwayatData[mhsIndex];
    let opsiSoal = '';
    d.rincian.forEach(r => {
        if(r.status === "DIABAIKAN") return; 
        let info = r.status === "BENAR" ? "✔️ Benar" : (r.status === "GANDA" ? `⚠️ Ganda (${r.jawaban})` : `❌ (Jawab: ${r.jawaban})`);
        opsiSoal += `<option value="${r.nomor}">No. ${r.nomor} - ${info}</option>`;
    });

    if (opsiSoal === '') return Toast.fire({ icon: 'warning', title: 'Tidak ada soal aktif.' });

    const result = await Swal.fire({
        title: `Koreksi: ${d.nama}`,
        html: `<div style="text-align: left; font-size: 14px;">
                <label style="font-weight:bold; color:var(--text-muted);">Pilih Nomor Soal:</label>
                <select id="swal-input1" class="input-css" style="margin-bottom:15px; margin-top:5px;">${opsiSoal}</select>
                <label style="font-weight:bold; color:var(--text-muted);">Ubah Jawaban Menjadi:</label>
                <select id="swal-input2" class="input-css" style="margin-top:5px;">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="Kosong">KOSONG</option><option value="GANDA">GANDA</option>
                </select>
            </div>`,
        focusConfirm: false, showCancelButton: true, showDenyButton: true, 
        confirmButtonText: '💾 Simpan', cancelButtonText: 'Batal', denyButtonText: '🗑️ Hapus', 
        confirmButtonColor: 'var(--success)', denyButtonColor: 'var(--danger)',
        preConfirm: () => { return { nomor: parseInt(document.getElementById('swal-input1').value), jawabanBaru: document.getElementById('swal-input2').value } }
    });

    if (result.isConfirmed) {
        let no = result.value.nomor; let jwbBaru = result.value.jawabanBaru;
        let soalIndex = d.rincian.findIndex(r => r.nomor === no);
        if (soalIndex !== -1) {
            d.rincian[soalIndex].jawaban = jwbBaru;
            let kunciTokens = parseKunci(document.getElementById('inputKunci').value);
            let totalAktif = kunciTokens.filter(t => !t.includes('X')).length;
            
            let jBenar = 0; let jSalah = 0; let jKosong = 0; let jGanda = 0;
            d.rincian.forEach((item, idx) => {
                let tk = idx < kunciTokens.length ? kunciTokens[idx] : null;
                if (!tk || tk.includes('X')) { item.status = "DIABAIKAN"; } 
                else if (tk.includes('*')) { jBenar++; item.status = "BENAR"; } 
                else if (item.jawaban === "Kosong") { jKosong++; item.status = "KOSONG"; } 
                else if (item.jawaban === "GANDA") { jGanda++; item.status = "GANDA"; } 
                else if (tk.includes(item.jawaban)) { jBenar++; item.status = "BENAR"; } 
                else { jSalah++; item.status = "SALAH"; }
            });
            d.benar = jBenar; d.salah = jSalah; d.kosong = jKosong; d.ganda = jGanda;
            d.nilai = hitungNilaiAkhir(d.rincian, totalAktif);
            riwayatData[mhsIndex] = d;

            simpanRiwayat(); Toast.fire({ icon: 'success', title: 'Nilai dikoreksi!' });
        }
    } else if (result.isDenied) {
        Swal.fire({
            title: 'Hapus Siswa?', text: `Yakin ingin menghapus data ${d.nama}?`, icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Ya, Hapus', confirmButtonColor: 'var(--danger)'
        }).then((del) => {
            if(del.isConfirmed) {
                riwayatData = riwayatData.filter(item => item.id !== idSiswa);
                simpanRiwayat(); Toast.fire({ icon: 'success', title: 'Data dihapus!' });
            }
        });
    }
}

function kirimWA(event, nama, nilai, benar, salah, isLulus) {
    if(event) event.stopPropagation(); 
    let status = isLulus ? "✅ LULUS" : "🚨 REMEDIAL";
    let mapel = document.getElementById('pilihProfil').value || "Ujian Kelas";
    let pesan = `Halo Bapak/Ibu,%0ABerikut adalah laporan hasil ujian [ *${mapel}* ] ananda *${nama}*:%0A%0A📊 *Nilai Akhir: ${nilai}*%0A✔️ Benar: ${benar}%0A❌ Salah/Kosong: ${salah}%0AStatus: *${status}*%0A%0ATerima kasih. 🙏`;
    window.open(`https://api.whatsapp.com/send?text=${pesan}`, '_blank');
}

function toggleDarkMode() {
    let body = document.body; let btn = document.getElementById('btnDarkMode'); body.classList.toggle('dark-mode');
    if(btn) { btn.style.transform = 'rotate(360deg)'; setTimeout(() => btn.style.transform = 'rotate(0deg)', 200); }
    let isDark = body.classList.contains('dark-mode');
    if (isDark) { localStorage.setItem('temaLJK', 'dark'); if(btn) btn.innerHTML = '☀️'; } else { localStorage.setItem('temaLJK', 'light'); if(btn) btn.innerHTML = '🌙'; }
}
if (localStorage.getItem('temaLJK') === 'dark') { document.body.classList.add('dark-mode'); window.addEventListener('DOMContentLoaded', () => { let btn = document.getElementById('btnDarkMode'); if(btn) btn.innerHTML = '☀️'; }); }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Gagal:', err)); }); }
let penahanPrompt; const bannerInstall = document.getElementById('bannerInstall');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); penahanPrompt = e; if (!window.matchMedia('(display-mode: standalone)').matches && bannerInstall) bannerInstall.style.display = 'block'; });
async function installAplikasi() {
    if (!penahanPrompt) return; if(bannerInstall) bannerInstall.style.display = 'none'; penahanPrompt.prompt(); 
    const { outcome } = await penahanPrompt.userChoice; if (outcome !== 'accepted' && bannerInstall) bannerInstall.style.display = 'block'; penahanPrompt = null;
}
window.addEventListener('appinstalled', () => { if(bannerInstall) bannerInstall.style.display = 'none'; penahanPrompt = null; Toast.fire({ icon: 'success', title: 'Berhasil Diinstall!' }); });
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) { if(bannerInstall) bannerInstall.style.display = 'none'; }

// 🔥 FUNGSI NAVIGASI UTAMA DENGAN AUTO-RESET SUB-TAB 🔥
function switchTab(tabId, element) {
    // Pindah Tab Utama
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(nav => { nav.classList.remove('active'); });
    document.getElementById('tab-' + tabId).classList.add('active');
    element.classList.add('active'); 
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Cerdas me-reset Sub-Tab ke Default setiap kali menu bawah diklik
    if (tabId === 'riwayat' && typeof switchSubTab === 'function') {
        switchSubTab('nilai'); // Default Riwayat: Daftar Nilai
    } else if (tabId === 'pengaturan' && typeof switchSetelanTab === 'function') {
        switchSetelanTab('kunci'); // Default Setelan: Kunci & Nilai
    }
}

// 🔥 LOGIKA SWITCH SUB-TAB DENGAN AUTO-SYNC 🔥
function switchSubTab(tabName) {
    // 1. Lakukan "Silent Refresh" (Hitung ulang semua nilai & KKM secara gaib)
    if (typeof simpanPengaturan === 'function') { 
        simpanPengaturan(true); 
    }

    // 2. Matikan semua tombol & konten
    document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));

    // 3. Aktifkan tab yang dipilih & Render ulang datanya secara fresh!
    if (tabName === 'nilai') {
        document.getElementById('btnSubNilai').classList.add('active');
        document.getElementById('sub-nilai').classList.add('active');
    } else if (tabName === 'analisis') {
        document.getElementById('btnSubAnalisis').classList.add('active');
        document.getElementById('sub-analisis').classList.add('active');
        if (typeof tampilkanStatistik === 'function') tampilkanStatistik(); // Auto-Render Analisis
    } else if (tabName === 'nyontek') {
        document.getElementById('btnSubNyontek').classList.add('active');
        document.getElementById('sub-nyontek').classList.add('active');
        if (typeof tampilkanInvestigasi === 'function') tampilkanInvestigasi(); // Auto-Render Nyontek
    }
}

// 🔥 LOGIKA SWITCH SUB-TAB UNTUK MENU SETELAN 🔥
function switchSetelanTab(tabName) {
    // Matikan semua tombol & konten setelan
    document.querySelectorAll('#tab-pengaturan .sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#tab-pengaturan .sub-tab-content').forEach(content => content.classList.remove('active'));

    // Aktifkan yang dipilih
    if (tabName === 'kunci') {
        document.getElementById('btnSetKunci').classList.add('active');
        document.getElementById('set-kunci').classList.add('active');
    } else if (tabName === 'cetak') {
        document.getElementById('btnSetCetak').classList.add('active');
        document.getElementById('set-cetak').classList.add('active');
    } else if (tabName === 'siswa') {
        document.getElementById('btnSetSiswa').classList.add('active');
        document.getElementById('set-siswa').classList.add('active');
    }
}

// ==================== ENGINE DROPDOWN CUSTOM ====================
function sulapMenjadiCustomDropdown(selectId) {
    const selectAsli = document.getElementById(selectId);
    if (!selectAsli || selectAsli.dataset.customized) return;
    
    // 1. Sembunyikan Select Bawaan Browser
    selectAsli.style.display = 'none';
    selectAsli.dataset.customized = "true";
    
    // 2. Buat Wadah Custom
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    selectAsli.parentNode.insertBefore(wrapper, selectAsli.nextSibling);
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-options';
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);
    
    // 3. Fungsi Render Ulang (Penting untuk data dinamis seperti Supabase & Profil)
    function renderCustomUI() {
        const selectedOpt = selectAsli.options[selectAsli.selectedIndex];
        
        // Update Teks Tombol
        trigger.innerHTML = `<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${selectedOpt ? selectedOpt.text : 'Pilih...'}</span> 
            <svg class="arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        
        // Buat List Menu
        optionsList.innerHTML = '';
        Array.from(selectAsli.options).forEach((opt, index) => {
            const optEl = document.createElement('div');
            optEl.className = 'custom-option' + (opt.selected ? ' selected' : '');
            optEl.innerText = opt.text;
            
            // Event Saat Item Diklik
            optEl.addEventListener('click', (e) => {
                e.stopPropagation();
                selectAsli.selectedIndex = index;
                wrapper.classList.remove('open');
                renderCustomUI();
                selectAsli.dispatchEvent(new Event('change')); // Memicu onchange asli
            });
            optionsList.appendChild(optEl);
        });
    }
    
    renderCustomUI(); // Render pertama kali
    
    // 4. Animasi Buka/Tutup
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Tutup dropdown lain yang sedang terbuka
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            if(w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    });
    
    // 5. OBSERVER AJAIB (Mendeteksi jika ada <option> baru masuk dari Supabase)
    const observer = new MutationObserver(() => { renderCustomUI(); });
    observer.observe(selectAsli, { childList: true, subtree: true });
    
    // 6. Deteksi perubahan value dari script lain
    selectAsli.addEventListener('change', () => { renderCustomUI(); });
}

// Menutup dropdown jika klik di luar area
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
});

// Menjalankan mesin setelah halaman siap
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        sulapMenjadiCustomDropdown('modeSumberData');
        sulapMenjadiCustomDropdown('pilihKelasSupabase');
        sulapMenjadiCustomDropdown('sistemPenilaian');
        sulapMenjadiCustomDropdown('pilihProfil');
    }, 800); // Diberi delay sedikit agar UI asli termuat dulu
});