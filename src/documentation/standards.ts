import { StandardRule } from "../types/index.js";

interface StandardDocumentation {
  title: string;
  description: string;
  rules?: StandardRule[];
  bestPractices?: string[];
}

const standardsDatabase: { [key: string]: StandardDocumentation } = {
  "property-tanimlama": {
    title: "Property Tanımlama Standartları",
    description:
      "C# dilinde property tanımlama kuralları ve en iyi uygulamalar.",
    rules: [
      {
        id: "prop-01",
        title: "Property Setter Koşul Kontrolü",
        description:
          "Property setter içinde mutlaka değer değişiklik kontrolü yapılmalıdır. Bu kontrol sonsuz döngüyü önler.",
        examples: {
          correct: `private string code;
public string Code
{
    get { return code; }
    set
    {
        if (code != value)  // ✅ Koşul kontrolü var
        {
            code = value;
            OnPropertyChanged("Code");
        }
    }
}`,
          incorrect: `private string code;
public string Code
{
    get { return code; }
    set
    {
        code = value;  // ❌ Koşul kontrolü yok - sonsuz döngü riski!
        OnPropertyChanged("Code");
    }
}`,
        },
        severity: "error",
      },
      {
        id: "prop-02",
        title: "Property İsimlendirme",
        description:
          "Public property isimleri PascalCase, private field isimleri camelCase olmalıdır.",
        examples: {
          correct: `private string userName;  // ✅ camelCase
public string UserName     // ✅ PascalCase
{
    get { return userName; }
    set { ... }
}`,
          incorrect: `private string UserName;  // ❌ PascalCase kullanılmış
public string userName     // ❌ camelCase kullanılmış
{
    get { return UserName; }
    set { ... }
}`,
        },
        severity: "warning",
      },
    ],
    bestPractices: [
      "Her zaman INotifyPropertyChanged interface'ini implemente edin",
      "Property setter'da OnPropertyChanged metodunu çağırın",
      "Complex logic için setter yerine metod kullanın",
      "Auto-property kullanabiliyorsanız kullanın: public string Name { get; set; }",
    ],
  },

  "dil-tanimlari": {
    title: "Dil Tanımları ve Çoklu Dil Desteği",
    description: "Uygulamada çoklu dil desteği için standartlar.",
    rules: [
      {
        id: "lang-01",
        title: "Resource Key Kullanımı",
        description: "Tüm UI metinleri resource dosyalarından alınmalıdır.",
        examples: {
          correct: `// ✅ Resource kullanımı
Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Code}"
ShowStatusMessage(langGlobal.FormSaved, DialogTypes.Info);`,
          incorrect: `// ❌ Hard-coded metin
Label="Kod"
ShowStatusMessage("Form kaydedildi", DialogTypes.Info);`,
        },
        severity: "error",
      },
      {
        id: "lang-02",
        title: "Resource Namespace",
        description:
          "Language resource'ları için doğru namespace kullanılmalıdır.",
        examples: {
          correct: `xmlns:langGlobal="clr-namespace:OSYS.UI.LanguageResources.GlobalKeys;assembly=OSYS.UI.LanguageResources"
xmlns:langGeneral="clr-namespace:OSYS.UI.LanguageResources.General;assembly=OSYS.UI.LanguageResources"`,
        },
        severity: "warning",
      },
    ],
    bestPractices: [
      "Her modül için ayrı resource dosyası oluşturun",
      "Resource key'leri anlamlı ve tutarlı adlandırın",
      "Varsayılan dil olarak Türkçe kullanın",
      'Format string\'leri için placeholder kullanın: "Kayıt {0} başarıyla silindi"',
    ],
  },

  "naming-conventions": {
    title: "İsimlendirme Standartları",
    description: "Kod elemanları için isimlendirme kuralları.",
    rules: [
      {
        id: "name-01",
        title: "Class İsimlendirme",
        description: "Class isimleri PascalCase olmalı ve anlamlı olmalıdır.",
        examples: {
          correct: "public class DistributionChannel { }",
          incorrect: "public class distributionChannel { } // ❌ camelCase",
        },
        severity: "error",
      },
      {
        id: "name-02",
        title: "Method İsimlendirme",
        description:
          "Method isimleri PascalCase olmalı ve fiil ile başlamalıdır.",
        examples: {
          correct: "public void SaveRecord() { }",
          incorrect: "public void record_save() { } // ❌ snake_case",
        },
        severity: "error",
      },
      {
        id: "name-03",
        title: "Interface İsimlendirme",
        description: 'Interface isimleri "I" ile başlamalıdır.',
        examples: {
          correct: "public interface IUserService { }",
          incorrect: "public interface UserService { } // ❌ I prefix yok",
        },
        severity: "error",
      },
    ],
    bestPractices: [
      "Kısaltmalardan kaçının (btn yerine button)",
      "Boolean değişkenler is, has, can ile başlasın",
      "Collection'lar çoğul isim alsın (users, items)",
      'Async metodlar "Async" suffix\'i alsın',
    ],
  },

  "error-handling": {
    title: "Hata Yönetimi Standartları",
    description: "Exception handling ve hata yönetimi kuralları.",
    rules: [
      {
        id: "err-01",
        title: "Try-Catch Kullanımı",
        description: "Her service çağrısı try-catch içinde olmalıdır.",
        examples: {
          correct: `try
{
    var response = Execute<Request, Response>(request);
    if (!response.Success)
    {
        ShowStatusMessage(response.Results.FirstOrDefault()?.ErrorMessage, DialogTypes.Error);
    }
}
catch (Exception ex)
{
    Logger.Error(ex);
    ShowStatusMessage("İşlem sırasında hata oluştu", DialogTypes.Error);
}`,
          incorrect: `// ❌ Try-catch yok
var response = Execute<Request, Response>(request);`,
        },
        severity: "error",
      },
      {
        id: "err-02",
        title: "Specific Exception Handling",
        description: "Mümkün olduğunda spesifik exception tiplerini yakala.",
        examples: {
          correct: `catch (SqlException sqlEx) { /* SQL specific handling */ }
catch (TimeoutException timeEx) { /* Timeout handling */ }
catch (Exception ex) { /* General handling */ }`,
          incorrect: "catch { } // ❌ Exception tipi belirtilmemiş",
        },
        severity: "warning",
      },
    ],
    bestPractices: [
      "Her zaman kullanıcıya anlamlı hata mesajı gösterin",
      "Hataları loglayın ama sensitive bilgileri loglamayın",
      "Business logic exception'ları için custom exception sınıfları oluşturun",
      "Finally bloğunu cleanup işlemleri için kullanın",
    ],
  },

  "database-standards": {
    title: "Veritabanı Standartları",
    description: "SQL ve veritabanı işlemleri için kurallar.",
    rules: [
      {
        id: "db-01",
        title: "Tablo İsimlendirme",
        description: "Tablo isimleri PascalCase ve tekil olmalıdır.",
        examples: {
          correct: "[Common].[DistributionChannel]",
          incorrect:
            "[common].[distribution_channels] // ❌ lowercase ve çoğul",
        },
        severity: "error",
      },
      {
        id: "db-02",
        title: "Stored Procedure İsimlendirme",
        description:
          "SP isimleri işlem tipini belirten prefix ile başlamalıdır.",
        examples: {
          correct: `ins_DistributionChannel  -- Insert
upd_DistributionChannel  -- Update
del_DistributionChannel  -- Delete
sel_DistributionChannel  -- Select`,
          incorrect: "sp_SaveDistributionChannel // ❌ Genel prefix",
        },
        severity: "warning",
      },
      {
        id: "db-03",
        title: "Zorunlu Alanlar",
        description: "Her tabloda bulunması gereken standart alanlar.",
        examples: {
          correct: `Id (Primary Key)
InsertUserId (NOT NULL)
InsertDate (NOT NULL)
UpdateUserId (NULL)
UpdateDate (NULL)
IsActive (NOT NULL, Default: 1)`,
        },
        severity: "error",
      },
    ],
    bestPractices: [
      "Her tablo için Primary Key tanımlayın",
      "Foreign Key ilişkilerini tanımlayın",
      "Index'leri performans gereksinimlerine göre oluşturun",
      "IsActive alanı için mutlaka index oluşturun",
      "Transaction kullanımında ROLLBACK'i unutmayın",
    ],
  },

  "api-standards": {
    title: "API Standartları",
    description: "RESTful API tasarımı için kurallar.",
    rules: [
      {
        id: "api-01",
        title: "Route Naming",
        description: "API route'ları lowercase ve çoğul olmalıdır.",
        examples: {
          correct: '[Route("api/common/distributionchannels")]',
          incorrect:
            '[Route("api/Common/DistributionChannel")] // ❌ PascalCase ve tekil',
        },
        severity: "warning",
      },
      {
        id: "api-02",
        title: "HTTP Methods",
        description: "Doğru HTTP metodlarını kullanın.",
        examples: {
          correct: `[HttpGet] Select
[HttpPost] Insert
[HttpPut] Update
[HttpDelete] Delete`,
          incorrect: "[HttpPost] GetUsers // ❌ POST for GET operation",
        },
        severity: "error",
      },
    ],
    bestPractices: [
      "Her zaman GenericResponse wrapper kullanın",
      "Pagination için standart parametreler kullanın",
      "API versioning uygulayın",
      "Authentication ve Authorization implement edin",
    ],
  },

  "yetki-kontrolu": {
    title: "Yetki Kontrolü Standartları",
    description:
      "UI elementlerinde ve komutlarda yetki kontrolü nasıl yapılır.",
    rules: [
      {
        id: "auth-01",
        title: "Command Yetki Kontrolü",
        description:
          "Her command için ResourceActionList üzerinden yetki kontrolü yapılmalıdır.",
        examples: {
          correct: `private bool CanNewFormCommandExecute()
{
    return this.ResourceInfo.ResourceActionList.Find(x => x.CommandName == "NewFormCommand") != null;
}`,
          incorrect: `private bool CanNewFormCommandExecute()
{
    return true; // ❌ Yetki kontrolü yapılmamış
}`,
        },
        severity: "error",
      },
      {
        id: "auth-02",
        title: "UI Element Yetki Kontrolü",
        description:
          "Button, MenuItem gibi UI elementlerin görünürlüğü yetki durumuna göre ayarlanmalıdır.",
        examples: {
          correct: `if (this.ResourceInfo.ResourceActionList.Find(x => x.CommandName == "DetailCommand") != null)
{
    DetailCommandExecute();
}
else
{
    ShowStatusMessage(langGlobal.NoPermissionForOperation, DialogTypes.Info);
}`,
          incorrect: `DetailCommandExecute(); // ❌ Yetki kontrolü yok`,
        },
        severity: "error",
      },
      {
        id: "auth-03",
        title: "Event Handler Yetki Kontrolü",
        description:
          "Double-click, right-click gibi event handler'larda yetki kontrolü yapılmalıdır.",
        examples: {
          correct: `void ControlGrid_RecordDoubleClick(object sender, EventArgs e)
{
    if (this.ResourceInfo.ResourceActionList.Find(x => x.CommandName == "DetailCommand") != null)
    {
        DetailCommandExecute();
    }
    else
    {
        ShowStatusMessage(langGlobal.NoPermissionForOperation, DialogTypes.Info);
    }
}`,
          incorrect: `void ControlGrid_RecordDoubleClick(object sender, EventArgs e)
{
    DetailCommandExecute(); // ❌ Yetki kontrolü yok
}`,
        },
        severity: "error",
      },
    ],
    bestPractices: [
      "Her command için CanExecute metodunda yetki kontrolü yapın",
      "UI event handler'larında mutlaka yetki kontrolü yapın",
      "Yetkisiz işlem durumunda kullanıcıya bilgilendirici mesaj gösterin",
      "ResourceActionList null kontrolü yapmayı unutmayın",
      "CommandName değerlerini sabit string yerine constant kullanın",
    ],
  },
};

export function getStandardsDocumentation(
  topic: string
): StandardDocumentation | null {
  return standardsDatabase[topic] || null;
}
