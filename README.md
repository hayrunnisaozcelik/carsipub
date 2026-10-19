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
- `data/maclar.json`: fikstür. Geçmiş maçlar kendiliğinden düşer.
- `data/mekan.json`: telefon, WhatsApp, Instagram, adres. Numara girilince rezervasyon butonları çalışır.

## Eksikler

- Logo, basılı menüden çizilmiş bir SVG; asıl logo dosyası gelince değiştirilmeli.
- `data/mekan.json`: telefon/WhatsApp (rezervasyon için şart), adres, Instagram, çalışma saatleri.
- Kokteyl açıklamaları taslak; barmen düzeltmeli.
- Maç saatleri basından alındı, teyit edilmeli; lig maçları eklenmeli.
