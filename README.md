# 🛡️ P14: SOSYAL MEDYA ANALİTİK DASHBOARD
### "Polyglot NoSQL Mimarisi ile Stratejik İstihbarat ve Ağ Analizi"

> **Ders:** NoSQL Veritabanı Sistemleri  
> **Akademik Dönem:** Bahar 2025-2026  
> **Proje Zorluğu:** 🔴 Çok Zor (Advanced Level)

---

## 👨‍💻 Proje Sahibi
- **Ad Soyad:** Murat Sili
- **Öğrenci No:** 22080410015
- **Rol:** Full-Stack Developer & Database Architect

---

## 🏛️ 1. Mimari Vizyon (Polyglot Persistence)
Bu projede "Her iş için doğru araç" prensibi benimsenmiştir. Tek bir veritabanı yerine, verinin doğasına en uygun üç farklı NoSQL yapısı entegre edilmiştir:

### 🔵 ScyllaDB (Event Store)
- **Rol:** Devasa veri trafiği (Big Data) katmanı.
- **Neden?** Saniyede on binlerce write işlemini mikro saniye seviyesinde gecikmeyle işlemek için.
- **Kullanım:** Tüm postlar, etkileşimler ve ham olay günlükleri burada tutulur.

### 🟡 Neo4j (Relationship Intelligence)
- **Rol:** İlişkisel ağ analizi ve grafik zekası.
- **Neden?** Takipçi ilişkileri ve topluluk yapılarını Cypher query dili ile saniyeler içinde analiz etmek için.
- **Algoritmalar:** 
    - **PageRank:** Ağ üzerindeki en etkili kullanıcıları (Influencers) tespit eder.
    - **Louvain:** Kullanıcıları ilgi alanlarına göre topluluklara (Communities) ayırır.

### 🔴 Redis (Real-time Accelerator)
- **Rol:** Hızlı erişim ve güvenlik katmanı.
- **Neden?** Trending verilerini milisaniyeler içinde sunmak ve sistem güvenliğini sağlamak için.
- **Kullanım:** Hashtag trend hızları, oturum yönetimi ve **Bot Detection** mekanizması.

---

## ✨ 2. Öne Çıkan Özellikler (Bonus Kriterler)

### 📊 Gerçek Zamanlı Analitik Dashboard
- **Canlı Akış:** 2 saniyede bir güncellenen dinamik metrikler.
- **Jitter Algoritması:** Verilerin durağan değil, canlı bir akış olduğunu hissettiren dinamik dalgalanma efektleri.

### 🧠 Derin NLP & Duygu Analizi
- Her post, arka planda çalışan NLP motoru tarafından analiz edilerek **Pozitif, Negatif veya Nötr** olarak etiketlenir.

### 🛡️ Akıllı Bot Algılama Sistemi
- Redis tabanlı **Rate Limiting** ve **Velocity Tracking** kullanılarak, insan hızını aşan şüpheli aktiviteler saniyeler içinde tespit edilir ve izole edilir.

### 🌐 Topluluk Radarı & Ağ Analizi
- Sosyal ağın "DNA"sını çıkaran grafik algoritmaları ile en popüler olanı değil, en etkili olanı (PageRank) bulur.

---

## 🚀 3. Kurulum ve Çalıştırma

### Gereksinimler
- Docker Desktop
- Node.js (v18+)

### Adımlar
1. **Depoyu Klonlayın:**
   ```bash
   git clone [Sizin_Repo_Linkiniz]
   ```
2. **Sistemi Ayağa Kaldırın:**
   ```bash
   PROJEYI_BASLAT.bat
   ```
3. **Erişim:**
   - **Dashboard:** `http://localhost:3000`
   - **Backend API:** `http://localhost:3000/api`
   - **Neo4j Browser:** `http://localhost:7474` (User: `neo4j`, Pass: `password`)

---

## 🛠️ 4. Kullanılan Teknolojiler
- **Backend:** Node.js, TypeScript, Express.js
- **Frontend:** HTML5, CSS3 (Vanilla CSS), TailwindCSS, Chart.js, Lucide Icons
- **Database:** ScyllaDB (Cassandra Driver), Neo4j (GDS Library), Redis (ioredis)
- **DevOps:** Docker, Docker Compose

---

## 📜 5. Sonuç
Bu proje, modern sosyal medya platformlarının karşılaştığı "Yüksek Hacimli Veri Yazma", "Karmaşık İlişki Analizi" ve "Gerçek Zamanlı Tepki Verme" problemlerine hibrit bir NoSQL yaklaşımıyla çözüm sunmaktadır.

---
*Bu çalışma bir akademik projedir ve sadece eğitim amaçlı geliştirilmiştir.*
