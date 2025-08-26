# RTD MCP Server

Kod üretimi ve standart kontrolü için MCP (Model Context Protocol) sunucusu.

## 🚀 Özellikler

- **Ekran Kodu Üretimi**: Tablo bilgilerinden otomatik CRUD ekranı oluşturma
- **Kod Standart Kontrolü**: C#, TypeScript ve SQL kodlarının standartlara uygunluk kontrolü
- **Dokümantasyon Sorgulama**: Kodlama standartları hakkında bilgi alma
- **Toplu Proje Derleme**: Version control güncelleme ve otomatik derleme sistemi

## 📋 Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Claude Desktop App

## 🛠️ Kurulum

### 1. Projeyi Klonlama

```bash
git clone https://github.com/yourusername/rtd_mcp_server_lab.git
cd rtd_mcp_server_lab
```

### 2. Bağımlılıkları Yükleme

```bash
npm install
```

### 3. Projeyi Derleme

```bash
npm run build
```

## 🔧 Claude'a Bağlama

### Windows için:

1. Claude Desktop uygulamasını açın
2. Settings → Developer → MCP Servers bölümüne gidin
3. "Add MCP Server" butonuna tıklayın
4. Aşağıdaki konfigürasyonu girin:

```json
{
  "rtd-mcp-server": {
    "command": "node",
    "args": ["C:/path/to/rtd_mcp_server_lab/dist/index.js"]
  }
}
```

> **Not**: Path'i kendi bilgisayarınızdaki gerçek path ile değiştirin!

### macOS/Linux için:

```json
{
  "rtd-mcp-server": {
    "command": "node",
    "args": ["/home/user/rtd_mcp_server_lab/dist/index.js"]
  }
}
```

## 💻 Kullanım

Claude'da aşağıdaki komutları kullanabilirsiniz:

### 1. Ekran Kodu Üretme

```
Division ekranını yap. Alanlar:
- Code (Kodu) - Unique
- Description (Açıklama)
Schema: Common
```

### 2. Kod Standart Kontrolü

```
Aşağıdaki kodu kontrol et:

private string code;
public string Code
{
    get { return code; }
    set
    {
        code = value;
        OnPropertyChanged("Code");
    }
}
```

### 3. Standart Sorgulama

```
Yetki kontrolü standartları nelerdir?
```

## 🏗️ Toplu Proje Derleme

### Konfigürasyon Dosyaları

Proje root'unda `config` klasörü oluşturun ve aşağıdaki dosyaları ekleyin:

```
rtd_mcp_server_lab/
├── config/
│   ├── build-config.json          # Varsayılan config
│   ├── build-config-dev.json      # Development config  
│   ├── build-config-prod.json     # Production config
│   └── build-config-test.json     # Test config
```

### Örnek Config Dosyası (build-config.json)

```json
{
  "versionControlPaths": [
    {
      "path": "D:/OSYSTFS/OSYS",
      "type": "git"
    },
    {
      "path": "D:/OSYSTFS/Service", 
      "type": "tfs"
    }
  ],
  "projects": [
    {
      "path": "D:/Projects/OSYS.Types.General/OSYS.Types.General.csproj",
      "name": "OSYS.Types.General"
    },
    {
      "path": "D:/Projects/OSYS.UI.General/OSYS.UI.General.csproj",
      "name": "OSYS.UI.General",
      "dependencies": ["OSYS.Types.General"]
    }
  ],
  "msbuildPath": "C:/Program Files/Microsoft Visual Studio/2022/Professional/MSBuild/Current/Bin/MSBuild.exe",
  "maxRetries": 3
}
```

### Kullanım Örnekleri

```bash
# Varsayılan config ile
"Tüm projeleri derle"

# Özel config ile  
"Development projelerini derle"
"Production projelerini derle"

# Version control'siz sadece derleme
"Projeleri derle" (versionControlPaths: [] olarak ayarlayın)
```

### Özellikler

- ✅ Otomatik version control güncelleme (Git/TFS)
- ✅ Akıllı yeniden deneme sistemi
- ✅ Bağımlılık bazlı derleme sırası
- ✅ Detaylı hata raporlama
- ✅ Çoklu config dosyası desteği

## 📁 Proje Yapısı

```
rtd_mcp_server_lab/
├── src/
│   ├── index.ts              # Ana giriş noktası
│   ├── types/                # TypeScript tip tanımlamaları
│   ├── handlers/             # Tool handler'ları
│   ├── templates/            # Kod üretim şablonları
│   ├── rules/                # Kod kontrol kuralları
│   └── documentation/        # Standart dokümantasyonu
├── config/                   # Derleme konfigürasyon dosyaları
├── dist/                     # Derlenmiş dosyalar
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Geliştirme

Geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Bu komut, dosya değişikliklerini izler ve otomatik olarak yeniden derler.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'e push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Standart Ekleme

Yeni bir standart eklemek için:

1. `src/documentation/standards.ts` dosyasını açın
2. `standardsDatabase` objesine yeni konu ekleyin
3. Kural ve örnekler ekleyin
4. `npm run build` ile derleyin

## 🐛 Hata Bildirimi

Hata bulursanız lütfen GitHub Issues bölümünde bildirin.

## 📄 Lisans

MIT License