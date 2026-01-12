// =============================================
// PIXEL LOADER - Kullanıcının Firebase'inden Dinamik Yükleme
// =============================================
// Bu dosya Meta ve TikTok Pixel'lerini kullanıcının
// kendi Firebase'inden çeker. Her kullanıcı kendi
// Firebase'ini domain-bagla.html'den ayarlar.
// =============================================

(function() {
    // Site ID için key oluştur
    function getSiteKey(key) {
        var siteId = localStorage.getItem('__SITE_ID__');
        if (!siteId) {
            var hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
                siteId = hostname.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            } else {
                siteId = 'default';
            }
            localStorage.setItem('__SITE_ID__', siteId);
        }
        return siteId + '_' + key;
    }
    
    // Kullanıcının Firebase ayarlarını al
    function getUserFirebaseConfig() {
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
            } catch(e) {
                console.log('Firebase config parse hatası:', e);
            }
        }
        return null;
    }
    
    // Firebase SDK yüklenene kadar bekle
    function waitForFirebase(callback) {
        if (typeof firebase !== 'undefined') {
            callback();
        } else {
            setTimeout(function() { waitForFirebase(callback); }, 100);
        }
    }
    
    // Meta Pixel SDK'yı yükle
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    waitForFirebase(function() {
        var config = getUserFirebaseConfig();
        
        if (!config) {
            console.log('⚠️ Firebase ayarlanmamış - domain-bagla.html sayfasından ayarlayın');
            return;
        }
        
        try {
            var app;
            try { app = firebase.app('pixelLoader'); } 
            catch(e) { app = firebase.initializeApp(config, 'pixelLoader'); }
            
            var db = app.database();
            
            // Meta Pixel yükle
            db.ref('pixels/meta').once('value').then(function(snapshot) {
                var pixelId = snapshot.val();
                if (pixelId) {
                    fbq('init', pixelId);
                    fbq('track', 'PageView');
                    fbq('track', 'ViewContent');
                    console.log('✅ Meta Pixel aktif:', pixelId);
                    window.metaPixelId = pixelId;
                } else {
                    console.log('⚠️ Meta Pixel ID ayarlanmamış - meta-pixel.html sayfasından ayarlayın');
                }
            }).catch(function(e) {
                console.log('Meta Pixel yükleme hatası:', e.message);
            });
            
            // TikTok Pixel yükle
            db.ref('pixels/tiktok').once('value').then(function(snapshot) {
                var pixelId = snapshot.val();
                if (pixelId) {
                    !function (w, d, t) {
                        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                        ttq.load(pixelId);
                        ttq.page();
                        ttq.track('ViewContent', {content_type: 'product'});
                    }(window, document, 'ttq');
                    console.log('✅ TikTok Pixel aktif:', pixelId);
                    window.tiktokPixelId = pixelId;
                } else {
                    console.log('⚠️ TikTok Pixel ID ayarlanmamış - tiktok-pixel.html sayfasından ayarlayın');
                }
            }).catch(function(e) {
                console.log('TikTok Pixel yükleme hatası:', e.message);
            });
            
        } catch(e) {
            console.log('Pixel yükleme hatası:', e);
        }
    });
})();

// Sipariş tamamlandığında çağrılacak fonksiyonlar
function fireMetaLeadEvent() {
    if (window.metaPixelId && typeof fbq !== 'undefined') {
        fbq('track', 'Lead');
        fbq('track', 'Purchase');
        console.log('✅ Meta Lead/Purchase event gönderildi');
    }
}

function fireTikTokSubmitFormEvent() {
    if (window.tiktokPixelId && typeof ttq !== 'undefined') {
        ttq.track('SubmitForm');
        ttq.track('CompletePayment');
        console.log('✅ TikTok SubmitForm/CompletePayment event gönderildi');
    }
}
