# RTD MCP Server

Kod üretimi ve standart kontrolü için MCP (Model Context Protocol) sunucusu.

## 🚀 Özellikler

- **Ekran Kodu Üretimi**: Tablo bilgilerinden otomatik CRUD ekranı oluşturma
- **Kod Standart Kontrolü**: C#, TypeScript ve SQL kodlarının standartlara uygunluk kontrolü
- **Dokümantasyon Sorgulama**: Kodlama standartları hakkında bilgi alma

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
Property tanımlama standartları nelerdir?
```

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