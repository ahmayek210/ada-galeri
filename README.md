# Ada Galerisi

Canlı site: https://ahmayek210.github.io/ada-galeri/

GitHub Pages üzerinde çalışan, Supabase `Hmm` projesindeki `public.gallery_assets` ve `gallery-assets` Storage alanını kullanan ortak galeri.

## Kullanım

- İlk girişte **İzleyici** veya **Ekleyici** seçilir. E-posta, parola veya admin hesabı istenmez.
- **İzleyici** fotoğrafları görüntüler, kategori filtreler, favorilere ekler ve indirebilir.
- **Ekleyici** aynı ortak galeride resim ekler, günceller, siler ve yedekleme/aktarma yapar.
- Fotoğraflar Supabase Storage'da, metadata PostgreSQL'de tutulur. Değişiklikler diğer cihazlarda sayfa yenilendiğinde görünür.
- Favoriler yalnızca o cihazın tarayıcısında tutulur.
- Orijinal dosya ve küçük önizleme ayrı saklanır; eklenme tarihi veritabanında otomatik oluşturulur.

## Proje yapılandırması

- Supabase Project ID: `kjnyzxqdayipxmucgeot` (Hmm)
- Frontend bağlantı ayarları: `supabase-config.js` (yalnızca publishable key)
- Aktif veritabanı migration'ı: `ada_gallery_open_modes_v1`
- Mevcut `supabase/migrations/20261031_initial_gallery.sql` dosyası **eski admin-only tasarımına aittir ve mevcut kurulumun üstünde tekrar uygulanmamalıdır**.
- GitHub Pages, `main` branch üzerindeki dağıtım iş akışından yayınlanır.

## Güvenlik notu

**Önemli: Galeri herkese açık ve yazılabilirdir.** Site bağlantısını bilen herkes Ekleyici moduyla fotoğraf ekleyebilir, değiştirebilir ve silebilir. İzleyici/Ekleyici ayrımı sadece arayüz tercihidir, güvenlik sınırı değildir. Kötüye kullanım olasılığı vardır. Fotoğrafları başka bir yerde düzenli yedekleyin. İleride yalnızca seçili kişilerin eklemesini istiyorsanız Supabase Auth ve kullanıcıya özel RLS kuralları gerekecektir.

Mevcut `Hmm` projesindeki diğer tablolar korunmuştur.
