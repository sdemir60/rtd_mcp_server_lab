import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Import template functions
import { 
  getListTemplate, 
  getFormTemplate, 
  getContractTemplate,
  getRequestTemplate,
  getResponseTemplate,
  getServiceTemplate,
  getControllerTemplate,
  getResourceRegistrationTemplate,
  getViewCodeBehindTemplate
} from '../templates/index.js';

interface Field {
  name: string;
  displayName: string;
  constraints?: string[];
}

interface GenerateScreenParams {
  tableName: string;
  screenTitle: string;
  schema: string;
  namespacePart: string;
  fields: Field[];
  resourceIdList: number;
  resourceIdForm: number;
}

// Request schema
const GenerateScreenSchema = z.object({
  tableName: z.string(),
  screenTitle: z.string(),
  schema: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    displayName: z.string(),
    constraints: z.array(z.string()).optional()
  }))
});

export async function generateScreenHandler(args: unknown) {
  // Validate input
  const request = GenerateScreenSchema.parse(args);
  
  // Prepare parameters
  const params: GenerateScreenParams = {
    tableName: request.tableName,
    screenTitle: request.screenTitle,
    schema: request.schema,
    fields: request.fields,
    namespacePart: request.schema === 'Common' ? 'General' : request.schema,
    resourceIdList: Math.floor(Math.random() * 1000) + 9000,
    resourceIdForm: Math.floor(Math.random() * 1000) + 9000 + 1000
  };
  
  // Define files to generate
  const files = [
    {
      name: `${request.tableName}List.cs`,
      content: getListTemplate(params),
      path: 'Lists'
    },
    {
      name: `${request.tableName}Form.cs`,
      content: getFormTemplate(params),
      path: 'Forms'
    },
    {
      name: `${request.tableName}View.xaml.cs`,
      content: getViewCodeBehindTemplate(params),
      path: 'Views'
    },
    {
      name: `${request.tableName}Contract.cs`,
      content: getContractTemplate(params),
      path: 'Contracts'
    },
    {
      name: `${request.tableName}Request.cs`,
      content: getRequestTemplate(params),
      path: 'Contracts'
    },
    {
      name: `${request.tableName}Response.cs`,
      content: getResponseTemplate(params),
      path: 'Contracts'
    },
    {
      name: `${request.tableName}Service.cs`,
      content: getServiceTemplate(params),
      path: 'Services'
    },
    {
      name: `${request.tableName}Controller.cs`,
      content: getControllerTemplate(params),
      path: 'Controllers'
    },
    {
      name: `${request.tableName}_ResourceRegistration.sql`,
      content: getResourceRegistrationTemplate(params),
      path: 'SQL'
    }
  ];
  
  try {
    // Get desktop path
    const desktopPath = path.join(os.homedir(), 'Desktop');
    
    // Create main folder with screen name
    const folderName = `${request.tableName}_${request.screenTitle.replace(/\s+/g, '_')}`;
    const mainFolderPath = path.join(desktopPath, folderName);
    
    // Create main folder
    await fs.mkdir(mainFolderPath, { recursive: true });
    
    // Create subfolders and write files
    for (const file of files) {
      const subfolder = path.join(mainFolderPath, file.path);
      await fs.mkdir(subfolder, { recursive: true });
      
      const filePath = path.join(subfolder, file.name);
      await fs.writeFile(filePath, file.content, 'utf8');
    }
    
    // Create a summary README file
    const readmeContent = `# ${request.screenTitle} Ekranı Dosyaları

Tablo: ${request.schema}.${request.tableName}
Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}

## Dosya Yapısı

- **Lists/**
  - ${request.tableName}List.cs - Liste ekranı

- **Forms/**
  - ${request.tableName}Form.cs - Form ekranı

- **Views/**
  - ${request.tableName}View.xaml.cs - WPF View Code-Behind

- **Contracts/**
  - ${request.tableName}Contract.cs - Data contract
  - ${request.tableName}Request.cs - Request contract
  - ${request.tableName}Response.cs - Response contract

- **Services/**
  - ${request.tableName}Service.cs - Business service

- **Controllers/**
  - ${request.tableName}Controller.cs - API controller

- **SQL/**
  - ${request.tableName}_ResourceRegistration.sql - Resource kayıt scripti

## Kullanım

1. İlgili dosyaları projenizin uygun klasörlerine kopyalayın
2. SQL scriptini veritabanında çalıştırın
3. Namespace'leri projenize göre düzenleyin
`;
    
    await fs.writeFile(path.join(mainFolderPath, 'README.md'), readmeContent, 'utf8');
    
    // Format result message
    let result = `# ✅ ${request.screenTitle} Ekranı Başarıyla Oluşturuldu!\n\n`;
    result += `📁 **Konum:** ${mainFolderPath}\n\n`;
    result += `## Oluşturulan Dosyalar:\n\n`;
    
    for (const file of files) {
      result += `- ✓ ${file.path}/${file.name}\n`;
    }
    
    result += `\n## Sonraki Adımlar:\n\n`;
    result += `1. Masaüstünüzde "${folderName}" klasörünü bulun\n`;
    result += `2. Dosyaları projenizin ilgili klasörlerine kopyalayın\n`;
    result += `3. SQL scriptini veritabanında çalıştırın\n`;
    result += `4. Namespace ve referansları kontrol edin\n`;
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
    
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Hata: Dosyalar oluşturulurken bir hata oluştu.\n\nDetay: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n\nLütfen yetkilendirme ayarlarını kontrol edin.`,
        },
      ],
    };
  }
}