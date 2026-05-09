# P14 Social Analytics Dashboard - Production Readiness & Architecture

Bu doküman, sistemin üretim ortamında (production) milyonlarca kullanıcı ve milyarlarca event altında nasıl davranacağını, alınan mühendislik kararlarını ve NoSQL stratejilerini açıklar.

---

## 1. ScyllaDB Partition Sizing & Hotspot Mitigation (KRİTİK)
ScyllaDB'de partition boyutunun 100MB'ı aşmaması önerilir. 
- **Hotspot Sorunu:** Popüler bir hashtag (#Deprem) paylaşıldığında, `hashtag_posts` tablosunda tüm veriler aynı partition'a akar ve o node üzerinde yük patlaması (hotspot) yaratır.
- **Çözüm (Bucketing):** Projemizde `hour_bucket` (ör: 2026-05-06-18) kullanarak veriyi zaman dilimlerine böldük. Böylece popüler bir hashtag bile olsa, yük saatlik olarak farklı partition'lara dağılır.

## 2. Graph Sync Consistency (KRİTİK)
ScyllaDB (Source of Truth) ile Neo4j (Derivative Graph) arasındaki tutarlılık.
- **Strateji:** Sistemimizde "Async Polling & Sync Worker" stratejisi seçilmiştir. 
- **Neden:** Yazma anında her iki DB'ye de (Dual-Write) senkron yazmak gecikmeyi (latency) artırır. Eventual Consistency (Nihai Tutarlılık) kabul edilerek, Sync Worker arka planda graf yapısını günceller.

## 3. Trending Algorithm - Cold Start & Anti-Gaming (KRİTİK)
- **Problem:** Botlar sahte hashtagler ile trendleri manipüle edebilir (gaming).
- **Çözüm:** Redis Sorted Set üzerinde "Sliding Window" ve "Decay Factor" uygulanır. Eski etkileşimlerin ağırlığı zamanla azaltılır. Bot tespiti (Bonus C) ile bot olarak işaretlenen kullanıcıların etkileşimleri trend puanlamasına dahil edilmez.

## 4. CAP Theorem & Database Selection
- **ScyllaDB & Redis:** AP (Availability & Partition Tolerance) odaklıdır. Sosyal medya etkileşimlerinde anlık tutarlılıktan ziyade yüksek erişilebilirlik (Always-on) tercih edilmiştir.
- **Neo4j:** CP (Consistency & Partition Tolerance) odaklıdır. Sosyal ağ ilişkilerinde (takip etme) tutarlılık daha kritiktir.

## 5. Scaling Strategy (Horizontal Sharding)
- **ScyllaDB:** Veriler `user_id` ve `year_month` üzerinden sharding yapılarak cluster genelinde dengelenir.
- **Neo4j:** İlişki yoğunluğu arttıkça Neo4j Fabric veya Sharding stratejileri ile yatayda genişleme planlanmıştır.

## 6. Security & Authentication Model
- **JWT:** Stateless authentication ile backend ölçeklenebilirliği sağlanmıştır.
- **Rate Limiting:** Redis tabanlı `sliding window` rate limiter ile API ve Engagement (like/share) uç noktaları brute-force ve bot saldırılarına karşı korunur.

## 7. Monitoring & Observability
- `/health` uç noktası üzerinden 3 veritabanının (Scylla, Neo4j, Redis) canlılığı ve ping süreleri anlık takip edilir.
- Yapılandırılmış loglama (structured logging) ile hata takibi kolaylaştırılmıştır.

## 8. Disaster Recovery & Backup
- **Docker Volumes:** Veriler konteyner dışında, ana makinede kalıcı olarak saklanır.
- **Snapshot:** ScyllaDB nodetool snapshot ve Neo4j backup araçları ile periyodik yedekleme simüle edilmiştir.

## 9. Bot Detection & Network Integrity
- Redis üzerinde kullanıcı aksiyon sıklığı (frequency analysis) takip edilerek anormal hızda (insan dışı) etkileşim kuran kullanıcılar Neo4j'de `is_bot: true` olarak işaretlenir ve analitik metriklerden izole edilir.

## 10. Performance Optimization (Caching Strategy)
- **Dashboard Cache:** Dashboard verileri 60 saniye boyunca Redis'te önbelleğe alınır. Böylece saniyede binlerce dashboard isteği gelse bile veritabanı yükü minimumda tutulur.
- **Query Optimization:** ScyllaDB'de "ALLOW FILTERING" yerine partition key tabanlı sorgular ve Neo4j'de GDS Graph Projection kullanılarak performans optimize edilmiştir.
