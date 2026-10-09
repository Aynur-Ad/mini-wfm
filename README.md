### 📁 Temel Mimari Bileşenleri

- **`main.ts`**: Uygulamanın giriş noktasıdır (entry point). `NestFactory` kullanarak uygulamayı başlatır, global konfigürasyonları (middleware, pipe, filter vb.) yükler ve gelen HTTP isteklerini dinlemek üzere sunucuyu ayağa kaldırır.
- **`app.module.ts`**: Uygulamanın kök modülüdür (root module). NestJS mimarisindeki tüm alt modüller, controller'lar ve provider/servisler hiyerarşik bir ağaç yapısında düzenlenir; `AppModule` ise bu ağacın merkezinde yer alarak tüm bağımlılıkları bir araya getirir ve `main.ts` üzerinden başlatılır.