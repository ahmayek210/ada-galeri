# Ada Galerisi

Tek dosyalı tasarım korunarak GitHub Pages üzerinde çalışan Supabase ortak galeri sürümü.

## Kurulum

1. Supabase'de yeni bir proje oluşturun. **Authentication → Providers → Email** sağlayıcısını açın. Geliştirme için e-posta onayını kapatabilir veya yönettiğiniz kullanıcıyı doğrulayabilirsiniz.
2. SQL Editor'da [`supabase/migrations/20261031_initial_gallery.sql`](supabase/migrations/20261031_initial_gallery.sql) dosyasının tamamını çalıştırın.
3. **Authentication → Users** içinden ekleyici olacak kişiye ait hesabı oluşturun. SQL Editor'da o hesabı allowlist'e ekleyin:

   ```sql
   insert into public.gallery_admins (user_id)
   select id from auth.users where email = 'admin@example.com';
   ```

4. **Project Settings → API** bölümündeki Project URL ve publishable (veya legacy anon) key'i [`supabase-config.js`](supabase-config.js) içindeki iki değere yazın. Bu anahtarın GitHub'a konması normaldir; `service_role`/secret anahtarını hiçbir zaman eklemeyin.
5. Bu klasörün içeriğini bir GitHub deposunun köküne koyun, commit/push edin. GitHub **Settings → Pages** altında `Deploy from a branch`, ilgili branch ve `/(root)` seçin. Giriş dosyası `index.html` olduğundan proje alt yolu ayrıca yapılandırılmaz.

## Kullanım

- Ziyaretçi ilk açılışta **İzleyici** seçer; ortak galeri anon olarak okunur.
- **Ekleyici** seçilince giriş formu açılır. Ancak `gallery_admins` tablosundaki kullanıcılar ekleme, düzenleme, yedek geri yükleme ve silme yapabilir.
- Oturum Supabase tarafından tarayıcıda kalıcı tutulur. Ekleyici modundayken mod düğmesiyle çıkış yapılabilir.
- Favoriler sadece cihazdaki `localStorage` içinde tutulur.
- ZIP dışa aktarma buluttaki orijinalleri indirir. İçeri aktarma v1 ZIP biçimini kabul eder; eski yedeklerde kategori yoksa `drawings` kullanılır.
- Eski IndexedDB koleksiyonu için Ekleyici → kutu simgesi → **Bu cihazdakileri buluta aktar** seçeneğini kullanın. Önce ZIP yedeği alın. Her `archive_id` tekil olduğundan aynı öğe yeniden taşınmaz.

## Güvenlik notu

Arayüzdeki İzleyici/Ekleyici seçimi yalnızca deneyimi belirler. Yetki, RLS ve `public.is_gallery_admin()` tarafından veritabanı ile Storage'da ayrı ayrı uygulanır. Bucket private'dır; yine de ziyaretçi okuma policy'si nedeniyle resimler bağlantıyı bilen herkese görünür. Özel galeriye geçmek için public `SELECT` policy'lerini kaldırıp erişim kuralı ekleyin.

## Test

Manuel kontroller için [`TEST_SCENARIOS.md`](TEST_SCENARIOS.md) dosyasını izleyin.

