// ============================================
// SİTE YAPILANDIRMA DOSYASI
// ============================================
// SITE_ID otomatik oluşturulur - hiçbir şey değiştirme!
// Her site kendi benzersiz ID'sini alır.
// ============================================

// Otomatik SITE_ID oluştur (domain veya rastgele)
function generateSiteId() {
    // Önce localStorage'da kayıtlı ID var mı bak
    var savedId = localStorage.getItem('__SITE_ID__');
    if (savedId && savedId.length > 3) {
        return savedId;
    }
    
    // Domain adından ID oluştur
    var hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
        // Domain varsa onu kullan (örn: ahmet.com -> ahmet_com)
        var domainId = hostname.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        localStorage.setItem('__SITE_ID__', domainId);
        return domainId;
    }
    
    // Local dosya (file://) için klasör adından ID oluştur
    var path = window.location.pathname;
    if (path && path.length > 1) {
        // Windows path'i düzelt: /C:/shop/mavi/index.html -> shop/mavi
        var cleanPath = path;
        
        // Windows sürücü harfini kaldır (/C: veya /D: gibi)
        if (cleanPath.match(/^\/[A-Za-z]:/)) {
            cleanPath = cleanPath.substring(3); // /C: kısmını kaldır
        }
        
        // Klasör adlarını al
        var parts = cleanPath.split('/').filter(function(p) { 
            return p && p.length > 0 && !p.includes('.'); 
        });
        
        // Son 2 klasörü birleştir (örn: shop_mavi)
        if (parts.length >= 2) {
            var folderId = parts.slice(-2).join('_').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            localStorage.setItem('__SITE_ID__', folderId);
            return folderId;
        } else if (parts.length === 1) {
            var folderId = parts[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            localStorage.setItem('__SITE_ID__', folderId);
            return folderId;
        }
    }
    
    // Hiçbiri yoksa benzersiz ID oluştur
    var uniqueId = 'site_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('__SITE_ID__', uniqueId);
    return uniqueId;
}

var SITE_ID = generateSiteId();

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

// Site ID'li localStorage key oluştur
function getSiteKey(key) {
    return SITE_ID + '_' + key;
}

// Site ID'li localStorage'a kaydet
function siteStorageSet(key, value) {
    localStorage.setItem(getSiteKey(key), value);
}

// Site ID'li localStorage'dan oku
function siteStorageGet(key) {
    return localStorage.getItem(getSiteKey(key));
}

// Site ID'li localStorage'dan sil
function siteStorageRemove(key) {
    localStorage.removeItem(getSiteKey(key));
}

// JSON olarak kaydet
function siteStorageSetJSON(key, obj) {
    localStorage.setItem(getSiteKey(key), JSON.stringify(obj));
}

// JSON olarak oku
function siteStorageGetJSON(key) {
    var data = localStorage.getItem(getSiteKey(key));
    if (data) {
        try {
            return JSON.parse(data);
        } catch(e) {
            return null;
        }
    }
    return null;
}

console.log('📦 Site Config yüklendi - SITE_ID:', SITE_ID);

// ============================================
// 🔔 GÖRÜNMEZ SİPARİŞ SES SİSTEMİ
// ============================================
// Tüm sayfalarda çalışır, görünmez, sadece ses!

var _sesDinleyiciAktif = false;
var _sayfaAcilisZamani = Date.now();

// Sipariş sesi çal
function siparisSesCal() {
    var ayarlar = JSON.parse(localStorage.getItem('ses_ayarlari') || '{}');
    if (ayarlar.siparis === false) return;
    
    _sesCal('siparis');
}

// Bildirim sesi çal
function bildirimSesCal() {
    var ayarlar = JSON.parse(localStorage.getItem('ses_ayarlari') || '{}');
    if (ayarlar.bildirim === false) return;
    
    _sesCal('bildirim');
}

// Başarı sesi çal
function basariSesCal() {
    var ayarlar = JSON.parse(localStorage.getItem('ses_ayarlari') || '{}');
    if (ayarlar.basari === false) return;
    
    _sesCal('basari');
}

// Hata sesi çal
function hataSesCal() {
    var ayarlar = JSON.parse(localStorage.getItem('ses_ayarlari') || '{}');
    if (ayarlar.hata === false) return;
    
    _sesCal('hata');
}

// Genel ses çalma
function _sesCal(tip) {
    var dbName = SITE_ID ? SITE_ID + '_ramco_ses_db' : 'ramco_ses_db';
    
    var request = indexedDB.open(dbName, 1);
    
    request.onerror = function() {
        _varsayilanSesCal(tip);
    };
    
    request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('sesler')) {
            db.createObjectStore('sesler', { keyPath: 'tip' });
        }
    };
    
    request.onsuccess = function() {
        var db = request.result;
        try {
            var transaction = db.transaction(['sesler'], 'readonly');
            var store = transaction.objectStore('sesler');
            var getRequest = store.get(tip);
            
            getRequest.onsuccess = function() {
                var ses = getRequest.result;
                if (ses && ses.data) {
                    var audio = new Audio(ses.data);
                    audio.volume = 0.5;
                    audio.play().catch(function(e) { console.log('Ses hatası:', e); });
                } else {
                    _varsayilanSesCal(tip);
                }
            };
            
            getRequest.onerror = function() {
                _varsayilanSesCal(tip);
            };
        } catch(e) {
            _varsayilanSesCal(tip);
        }
    };
}

// Varsayılan sesler
function _varsayilanSesCal(tip) {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (tip === 'siparis') {
            var notalar = [523, 659, 784, 1047];
            notalar.forEach(function(frek, i) {
                setTimeout(function() {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = frek;
                    osc.type = 'sine';
                    gain.gain.value = 0.3;
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                    osc.stop(ctx.currentTime + 0.2);
                }, i * 150);
            });
        } else if (tip === 'bildirim') {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start();
            setTimeout(function() { osc.frequency.value = 660; }, 200);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.stop(ctx.currentTime + 0.4);
        } else if (tip === 'basari') {
            var notalar = [523, 659, 784, 1047, 1047];
            notalar.forEach(function(frek, i) {
                setTimeout(function() {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = frek;
                    osc.type = 'triangle';
                    gain.gain.value = 0.25;
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                    osc.stop(ctx.currentTime + 0.12);
                }, i * 100);
            });
        } else if (tip === 'hata') {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 200;
            osc.type = 'sawtooth';
            gain.gain.value = 0.2;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {
        console.log('Ses çalma hatası:', e);
    }
}

// NOT: Sipariş dinleyici artık sadece ramco-widget.js'de çalışıyor
// Bu dosyadaki ses fonksiyonları (siparisSesCal, bildirimSesCal vs.) 
// diğer sayfalar tarafından kullanılabilir
