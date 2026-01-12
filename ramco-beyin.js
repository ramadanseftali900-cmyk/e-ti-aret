/* GARİBAN BEYİN - Groq API */

// AI AYARLARI
var aiSaglayicilar = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    modeller: [
      { id: 'llama-3.3-70b-versatile', isim: 'Llama 3.3 70B (Akıllı)' },
      { id: 'llama-3.1-8b-instant', isim: 'Llama 3.1 8B (Hızlı)' },
      { id: 'mixtral-8x7b-32768', isim: 'Mixtral 8x7B' }
    ]
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    modeller: [
      { id: 'gpt-4o-mini', isim: 'GPT-4o Mini (Ucuz)' },
      { id: 'gpt-4o', isim: 'GPT-4o (Akıllı)' },
      { id: 'gpt-3.5-turbo', isim: 'GPT-3.5 Turbo' }
    ]
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/',
    modeller: [
      { id: 'gemini-1.5-flash', isim: 'Gemini 1.5 Flash (Hızlı)' },
      { id: 'gemini-1.5-pro', isim: 'Gemini 1.5 Pro (Akıllı)' }
    ]
  }
};

var aktifSaglayici = localStorage.getItem('ai_saglayici') || 'groq';
// API KEY - Kullanıcı kendi key'ini girecek
var varsayilanKey = '';
var groqApiKey = localStorage.getItem('groq_api_key') || varsayilanKey;
var groqModel = localStorage.getItem('ai_model') || 'llama-3.3-70b-versatile';
var konusmaGecmisi = [];

// Site verilerini çek
async function siteVerisiAl() {
  if (typeof database === 'undefined') return null;
  
  var bugun = new Date().toLocaleDateString('tr-TR');
  var veri = { bugunSiparis: 0, bugunCiro: 0, toplamSiparis: 0, bekleyen: 0, stoklar: [], online: 0 };
  
  try {
    var sipSnap = await database.ref('siparisler').once('value');
    sipSnap.forEach(function(c) {
      var s = c.val();
      veri.toplamSiparis++;
      if (s.tarih === bugun) {
        veri.bugunSiparis++;
        veri.bugunCiro += parseInt((s.tutar || '0').replace(/\D/g, '')) || 0;
      }
      var d = (s.durum || '').toLowerCase();
      if (d !== 'tamamlandi' && d !== 'tamamlandı' && d !== 'iptal') veri.bekleyen++;
    });
    
    var stokSnap = await database.ref('forumStoklar').once('value');
    var stoklar = stokSnap.val() || {};
    for (var i = 1; i <= 10; i++) {
      var stok = stoklar['forum' + i] || 0;
      veri.stoklar.push('Ürün' + i + ':' + stok);
    }
    
    var onlineSnap = await database.ref('canliZiyaretciler').once('value');
    var now = Date.now();
    onlineSnap.forEach(function(c) {
      if (c.val().timestamp > now - 60000) veri.online++;
    });
    
    return veri;
  } catch(e) {
    return null;
  }
}

// Groq'a sor
async function groqSor(mesaj, ekVeri) {
  if (!groqApiKey) return '❌ API Key yok! Yaz: api key: SENIN_KEY';
  
  try {
    var gecmis = konusmaGecmisi.slice(-6).map(function(m) {
      return { role: m.rol === 'user' ? 'user' : 'assistant', content: m.mesaj };
    });

    var sistemMesaji = 'Sen GARİBAN, akıllı bir e-ticaret asistanısın. Türkçe konuş, samimi ol, kısa cevap ver.';
    if (ekVeri) sistemMesaji += '\n' + ekVeri;

    var mesajlar = [{ role: 'system', content: sistemMesaji }];
    mesajlar = mesajlar.concat(gecmis);
    mesajlar.push({ role: 'user', content: mesaj });

    var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqApiKey
      },
      body: JSON.stringify({
        model: groqModel,
        messages: mesajlar,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      var err = await response.json();
      if (response.status === 429) return '⏳ Biraz bekle, çok hızlı yazdın!';
      return '❌ Hata: ' + (err.error?.message || response.status);
    }
    
    var data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      var cevap = data.choices[0].message.content;
      konusmaGecmisi.push({ rol: 'user', mesaj: mesaj });
      konusmaGecmisi.push({ rol: 'assistant', mesaj: cevap });
      if (konusmaGecmisi.length > 20) konusmaGecmisi = konusmaGecmisi.slice(-20);
      return cevap;
    }
    return '🤔 Anlayamadım?';
  } catch (e) {
    return '❌ Bağlantı hatası: ' + e.message;
  }
}

// Ana fonksiyon
async function ramcoAkilliCevap(mesaj) {
  var m = mesaj.toLowerCase().trim();
  
  // API Key kaydet - çeşitli formatları destekle
  var apiKeyMatch = mesaj.match(/(?:api\s*key|key|apikey|anahtar)\s*[:=\-]?\s*(.+)/i);
  if (apiKeyMatch && apiKeyMatch[1]) {
    var yeniKey = apiKeyMatch[1].trim();
    // Eğer key çok kısa değilse kaydet
    if (yeniKey.length >= 10) {
      groqApiKey = yeniKey;
      localStorage.setItem('groq_api_key', groqApiKey);
      return '✅ API Key kaydedildi! Artık benimle konuşabilirsin. 🎉';
    }
  }
  
  // Sadece "key" veya "api key" yazarsa bilgi ver
  if (m === 'key' || m === 'api key' || m === 'apikey') {
    if (groqApiKey) {
      return '🔑 API Key zaten kayıtlı. Değiştirmek için yaz: api key: YENI_KEY';
    } else {
      return '🔑 API Key kaydetmek için yaz:\napi key: SENIN_API_KEYIN\n\nÖrnek: api key: gsk_abc123...';
    }
  }
  
  // Site ile ilgili sorular
  if (m.includes('sipariş') || m.includes('ciro') || m.includes('stok') || m.includes('durum') || 
      m.includes('site') || m.includes('satış') || m.includes('online') || m.includes('bekleyen')) {
    var veri = await siteVerisiAl();
    var ekVeri = null;
    if (veri) {
      ekVeri = '[SİTE VERİLERİ: Bugün ' + veri.bugunSiparis + ' sipariş, ' + veri.bugunCiro.toLocaleString('tr-TR') + '₺ ciro, ' +
        'Toplam ' + veri.toplamSiparis + ' sipariş, Bekleyen ' + veri.bekleyen + ', Online ' + veri.online + ' kişi]';
    }
    return await groqSor(mesaj, ekVeri);
  }
  
  // Yardım
  if (m === 'yardım' || m === 'help') {
    return '🤖 GARİBAN\n\n💬 Her şeyi sor!\n📊 "durum" - site durumu\n🔑 "api key: KEY" - key kaydet\n\nÖrnek: api key: gsk_abc123xyz...';
  }
  
  // Normal soru
  return await groqSor(mesaj, null);
}

function ramcoCevapAl(mesaj, callback) {
  ramcoAkilliCevap(mesaj).then(callback);
}

function ramcoIstatistik() {
  return { groqAktif: !!groqApiKey };
}

function ramcoBeyniniBaslat() {
  console.log('🧠 GARİBAN hazır! (Groq API)');
  aiAyarlariYukle();
}

// ==================== AI AYARLARI FONKSİYONLARI ====================

function aiAyarPaneliAc() {
  document.getElementById('aiAyarPanel').classList.add('open');
  document.getElementById('aiAyarOverlay').classList.add('open');
  aiAyarlariYukle();
}

function aiAyarPaneliKapat() {
  document.getElementById('aiAyarPanel').classList.remove('open');
  document.getElementById('aiAyarOverlay').classList.remove('open');
}

function aiAyarlariYukle() {
  var saglayici = localStorage.getItem('ai_saglayici') || 'groq';
  var apiKey = localStorage.getItem('groq_api_key') || '';
  var model = localStorage.getItem('ai_model') || 'llama-3.3-70b-versatile';
  
  var saglayiciSelect = document.getElementById('aiSaglayici');
  var apiKeyInput = document.getElementById('aiApiKey');
  
  if (saglayiciSelect) saglayiciSelect.value = saglayici;
  if (apiKeyInput) apiKeyInput.value = apiKey;
  
  aiModelleriniGuncelle();
  
  var modelSelect = document.getElementById('aiModel');
  if (modelSelect) {
    setTimeout(function() { modelSelect.value = model; }, 100);
  }
}

function aiModelleriniGuncelle() {
  var saglayici = document.getElementById('aiSaglayici').value;
  var modelSelect = document.getElementById('aiModel');
  
  if (!modelSelect) return;
  
  modelSelect.innerHTML = '';
  
  var modeller = aiSaglayicilar[saglayici].modeller;
  modeller.forEach(function(m) {
    var opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.isim;
    modelSelect.appendChild(opt);
  });
}

function aiKeyGosterGizle() {
  var input = document.getElementById('aiApiKey');
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

function aiAyarlariKaydet() {
  var saglayici = document.getElementById('aiSaglayici').value;
  var apiKey = document.getElementById('aiApiKey').value.trim();
  var model = document.getElementById('aiModel').value;
  
  if (!apiKey) {
    aiDurumGoster('❌ API Key boş olamaz!', 'error');
    return;
  }
  
  localStorage.setItem('ai_saglayici', saglayici);
  localStorage.setItem('groq_api_key', apiKey);
  localStorage.setItem('ai_model', model);
  
  // Global değişkenleri güncelle
  aktifSaglayici = saglayici;
  groqApiKey = apiKey;
  groqModel = model;
  
  aiDurumGoster('✅ Ayarlar kaydedildi!', 'success');
}

function aiTestEt() {
  var apiKey = document.getElementById('aiApiKey').value.trim();
  var saglayici = document.getElementById('aiSaglayici').value;
  var model = document.getElementById('aiModel').value;
  
  if (!apiKey) {
    aiDurumGoster('❌ Önce API Key gir!', 'error');
    return;
  }
  
  aiDurumGoster('⏳ Test ediliyor...', 'info');
  
  // Groq ve OpenAI aynı format
  if (saglayici === 'groq' || saglayici === 'openai') {
    var url = aiSaglayicilar[saglayici].url;
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Merhaba, test!' }],
        max_tokens: 50
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.choices && data.choices[0]) {
        aiDurumGoster('✅ Bağlantı başarılı! AI çalışıyor.', 'success');
      } else if (data.error) {
        aiDurumGoster('❌ Hata: ' + data.error.message, 'error');
      }
    })
    .catch(function(e) {
      aiDurumGoster('❌ Bağlantı hatası: ' + e.message, 'error');
    });
  }
  // Gemini farklı format
  else if (saglayici === 'gemini') {
    var geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    
    fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Merhaba, test!' }] }]
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.candidates && data.candidates[0]) {
        aiDurumGoster('✅ Gemini bağlantısı başarılı!', 'success');
      } else if (data.error) {
        aiDurumGoster('❌ Hata: ' + data.error.message, 'error');
      }
    })
    .catch(function(e) {
      aiDurumGoster('❌ Bağlantı hatası: ' + e.message, 'error');
    });
  }
}

function aiDurumGoster(mesaj, tip) {
  var durum = document.getElementById('aiDurum');
  if (!durum) return;
  
  durum.textContent = mesaj;
  durum.className = 'ai-durum ' + tip;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ramcoBeyniniBaslat);
} else {
  ramcoBeyniniBaslat();
}
