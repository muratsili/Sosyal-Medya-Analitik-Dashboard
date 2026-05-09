@echo off
echo ==========================================
echo   P14 SOCIAL ANALYTICS - BASLATILIYOR
echo ==========================================

echo 1. Docker konteynerlari kuruluyor ve baslatiliyor...
docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [HATA] Docker baslatilamadi! 
    echo Lutfen Docker Desktop uygulamasinin acik oldugundan emin olun.
    echo.
    pause
    exit /b
)

echo 2. Sistemlerin hazirlanmasi icin bekleniyor (45 saniye)...
echo Bu sirada veritabanlari kuruluyor, lutfen bekleyin...
timeout /t 45 /nobreak

echo 3. Veritabanlari ilklendiriliyor...
docker exec scylla_p14 cqlsh -f /init-scylla.cql
docker exec neo4j_p14 cypher-shell -u neo4j -p password -f /var/lib/neo4j/import/init-neo.cypher

echo 4. Ornek veriler (Seed) yukleniyor...
docker exec backend_p14 npx ts-node src/seed.ts

echo ==========================================
echo   PROJE BASARIYLA CALISTIRILDI!
echo   Dashboard: http://localhost:3000/dashboard/overview
echo ==========================================
echo Pencereyi kapatabilirsiniz veya Dashboard'u acabilirsiniz.
pause
