// ============================================
// FIREBASE YAPILANDIRMA DOSYASI
// ============================================
// Her sayfa açıldığında Firebase otomatik başlar.
// Ayarlar localStorage'dan okunur (domain bazlı izole).
// Herkes kendi Firebase'ini domain-bagla.html'den kurar.
// ============================================

// MERKEZİ FIREBASE KALDIRILDI - Herkes kendi Firebase'ini kuracak
// Kullanıcı domain-bagla.html'den kendi Firebase bilgilerini girer
var MERKEZI_FIREBASE = null;

// Site ID kontrolü
if (typeof SITE_ID === 'undefined') {
    console.warn('⚠️ SITE_ID tanımlı değil! site-config.js dosyasını ekleyin.');
    var SITE_ID = 'default';
}

// Site ID'li localStorage key oluştur
if (typeof getSiteKey === 'undefined') {
    function getSiteKey(key) {
        return SITE_ID + '_' + key;
    }
}

// Domain'den benzersiz ID oluştur
function getDomainId() {
    // Önce SITE_ID kullan (site-config.js'den)
    if (typeof SITE_ID !== 'undefined' && SITE_ID && SITE_ID !== 'default') {
        return SITE_ID;
    }
    
    var domain = window.location.hostname;
    
    // Gerçek domain varsa kullan
    if (domain && domain !== '' && domain !== 'localhost' && !domain.startsWith('127.')) {
        return domain.replace(/\./g, '_').replace(/-/g, '_');
    }
    
    // Local dosya için sabit ID kullan
    return 'local_site';
}

// localStorage'dan ayarları oku
function getFirebaseConfigFromLocal() {
    var saved = localStorage.getItem(getSiteKey('account_settings'));
    if (saved) {
        try {
            var s = JSON.parse(saved);
            if (s.firebaseApiKey && s.firebaseProjectId && s.firebaseDatabaseUrl) {
                return {
                    apiKey: s.firebaseApiKey,
                    authDomain: s.firebaseProjectId + ".firebaseapp.com",
                    databaseURL: s.firebaseDatabaseUrl,
                    projectId: s.firebaseProjectId,
                    storageBucket: s.firebaseProjectId + ".appspot.com"
                };
            }
        } catch(e) {}
    }
    return null;
}

// Firebase değişkenleri
var firebaseConfig = null;
var database = null;
var firebaseHazir = false;
var firebaseHazirCallbacks = [];

// Firebase hazır olduğunda çağrılacak fonksiyonları kaydet
function onFirebaseReady(callback) {
    if (firebaseHazir && database) {
        callback(database);
    } else {
        firebaseHazirCallbacks.push(callback);
    }
}

// Firebase'i başlat ve callback'leri çağır
function initFirebase(config) {
    if (config && typeof firebase !== 'undefined') {
        try {
            var defaultApp = null;
            if (firebase.apps && firebase.apps.length > 0) {
                defaultApp = firebase.apps.find(function(app) { return app.name === '[DEFAULT]'; });
            }
            
            if (!defaultApp) {
                firebase.initializeApp(config);
            }
            
            database = firebase.database();
            firebaseHazir = true;
            console.log('✅ Firebase başlatıldı!');
            
            // Bekleyen callback'leri çağır
            firebaseHazirCallbacks.forEach(function(cb) {
                try { cb(database); } catch(e) { console.error(e); }
            });
            firebaseHazirCallbacks = [];
            
        } catch(e) {
            console.log('⚠️ Firebase başlatma hatası:', e.message);
        }
    }
}

// Firebase SDK hazır olunca HEMEN başlat
function firebaseHazirOluncaBaslat() {
    if (typeof firebase === 'undefined') {
        setTimeout(firebaseHazirOluncaBaslat, 50);
        return;
    }
    
    console.log('📦 Firebase SDK hazır, başlatılıyor...');
    
    // Önce localStorage'dan dene
    firebaseConfig = getFirebaseConfigFromLocal();
    
    if (firebaseConfig) {
        console.log('✅ localStorage\'dan ayarlar kullanılıyor');
        initFirebase(firebaseConfig);
    } else {
        // localStorage'da ayar yok - kullanıcı henüz Firebase kurmamış
        console.log('⚠️ Firebase ayarlanmamış. domain-bagla.html sayfasından Firebase bilgilerinizi girin.');
    }
}

// HEMEN BAŞLAT!
firebaseHazirOluncaBaslat();

// WhatsApp numarasını al
function getWhatsAppNumber() {
    var wpNumara = localStorage.getItem(getSiteKey('whatsapp_numara'));
    if (wpNumara) return wpNumara;
    
    var saved = localStorage.getItem(getSiteKey('account_settings'));
    if (saved) {
        try {
            var s = JSON.parse(saved);
            if (s.whatsappNumber) return s.whatsappNumber;
        } catch(e) {}
    }
    return ""; // Boş - herkes kendi numarasını girecek
}

console.log('📦 Firebase Config yüklendi');
