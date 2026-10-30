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

Sağ üstteki mod düğmesi seçim ekranını her zaman yeniden açar ve seçilen mod sayfa yenilendikten sonra korunur. İzleyici/Ekleyici ayrımı güvenlik sınırı değildir: bağlantıyı bilen herkes Ekleyici modunda ortak galeriyi değiştirebilir.

Mevcut `Hmm` projesindeki diğer tablolar korunmuştur.
