# Manuel test senaryoları

1. Gizli pencerede siteyi açın: yapılandırılmış ortak resimler görünmeli; giriş istenmemeli.
2. Gizli pencerede Ekleyici'yi seçin: giriş ekranı açılmalı; geçersiz/allowlist dışı hesapla ekleme düğmeleri görünmemeli.
3. Allowlist'teki hesapla giriş yapın: ekleyin, başlık/açıklama/kategori değiştirin ve yenileyin. `created_at` aynı, `updated_at` yeni olmalı.
4. JPG, PNG, WEBP, GIF ve AVIF yüklemeyi; ayrıca geçersiz MIME ve 70 MB üstü dosyayı deneyin. İkinciler anlaşılır hatayla engellenmeli.
5. Bir resmi silin. Kart kaybolmalı; Storage bucket'ta `storage_path` ve varsa `thumb_path` kalmamalı. Ağ hatasında kullanıcıya kayıt/dosya temizliği durumu bildirilmeli.
6. İki tarayıcı/telefon açın: birinde admin eklediği resim diğerinde yenileme sonrasında görünmeli.
7. Bir cihazda favoriye ekleyin; başka cihazda Favoriler sekmesinin boş kaldığını doğrulayın.
8. ZIP dışa aktarın, aynı ZIP'i içe aktarın: ikinci içe aktarmada `archive_id` çakışmaları atlanmalı. Kategori bilgisi olmayan v1 manifesti `drawings` olarak gelmeli.
9. Eski `izler-gallery-1` IndexedDB içeren cihazda önce ZIP yedek alın, sonra “Bu cihazdakileri buluta aktar”ı çalıştırın. Tekrar çalıştırınca kopya oluşmamalı.

