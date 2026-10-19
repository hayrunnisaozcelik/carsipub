# Çarşı Pub · QR Menü

Statik site (HTML/CSS/JS, derleme adımı yok). Görünüm basılı menüyü takip eder: kara tahta zemin, bira bardağı logosu, sarı "Çarşı sizin, eğlence bizim!" şeridi, kırmızı bölüm başlıkları.

Yerelde çalıştırmak için:

    python3 -m http.server 2408

## Sayfa düzeni

Tek sayfa, üç ekran (adres çubuğundaki `#` ile geçilir):

1. **Karşılama** (`/`): QR buraya açılır. Logo, slogan ve iki büyük buton: Menü, Maçlar & Rezervasyon.
2. **Menü** (`#menu`, belirli sekme için `#menu-bira`, `#menu-viski`…): sekmeler. Signature sekmesinde görselli kokteyller (açıklama, tat oranları, fiyat; görsele dokununca afiş açılır) ve "Kararsız mısın?" 3 soruluk testi.
3. **Maçlar & Rezervasyon** (`#mac`): sıradaki maç, fikstür, WhatsApp'tan rezervasyon formu ve arama butonu.

## Veri dosyaları

- `data/menu.json`: menü. `"img"` olan ürün Signature kartı olur (`assets/img/kokteyl/<img>.jpg` ve `<img>-sm.jpg`); `desc` açıklama, `bars` tat oranları, `taste` test puanlaması.
- **Maçlar internetten gelir:** `functions/api/maclar.js` (Cloudflare Pages Function) Beşiktaş'ın Süper Lig, Avrupa kupaları ve Türkiye Kupası fikstürünü ESPN'in herkese açık ama resmî olmayan API'sinden çeker, 3 saat önbellekte tutar. ESPN cevap vermezse `data/maclar.json` yedeği kullanılır; yerelde `python3 -m http.server` ile açınca da yedek görünür (fonksiyonları denemek için `npx wrangler pages dev .`).
- `data/mekan.json`: telefon, WhatsApp, Instagram, adres. Numara girilince rezervasyon butonları çalışır.

## Yönetim paneli (`/admin`)

Mekân sahibi telefondan şifreyle girip menüyü düzenler; "Kaydet"e basınca site anında güncellenir.

- Fiyat, ürün adı, kalori; ürün ekleme, silme, sıralama
- "Bugün yok": ürünü silmeden menüden gizler; sekmeyi (ör. Kampanyalar) gizleme
- Toplu fiyat: bir sekmenin tüm fiyatlarına % zam/indirim, 5/10/25'e yuvarlama
- Signature kokteyl: afiş yükleme (telefonda küçültülür), açıklama, tat oranları. "Ne içsem?" testi yeni kokteylleri tat oranlarından puanlar
- Geçmiş: son 15 kayıt saklanır, "Bu hâline dön" ile geri alınır
- Aynı anda iki kişi düzenlerse ikinci kayıt reddedilir (sayfayı yenile uyarısı)
- Fiyat değiştiğinde "Fiyat değişim tarihi" kendiliğinden bugünün tarihi olur

Veri Cloudflare KV'de: `menu`, `menu-history`, `img:<id>`. İlk kayda kadar `data/menu.json` gösterilir. Kod: `functions/api/menu/`, `functions/api/img.js`, `functions/img/`, `lib/`; arayüz `admin.html`, `assets/js/admin.js`, `assets/css/admin.css`.

Cloudflare kurulumu (bir kez):
1. Storage & databases → KV → yeni namespace (ör. `carsipub`)
2. Pages projesi → Settings → Bindings → KV namespace: değişken adı `PUB`
3. Pages projesi → Settings → Variables and Secrets → `ADMIN_PASSWORD` (Secret)
4. Son deployment'ı yeniden başlat (Retry deployment)

Yerelde denemek için: `npx wrangler pages dev . --kv PUB --binding ADMIN_PASSWORD=deneme`

## Eksikler

- Logo, basılı menüden çizilmiş bir SVG; asıl logo dosyası gelince değiştirilmeli.
- `data/mekan.json`: adres ve çalışma saatleri (telefon, WhatsApp ve Instagram girildi).
- Kokteyl açıklamaları taslak; barmen düzeltmeli.
