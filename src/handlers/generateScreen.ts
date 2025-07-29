import { ScreenGenerationRequest } from '../types/index.js';
import { getContractTemplate } from '../templates/contract.js';
import { getViewModelTemplate } from '../templates/viewModel.js';
import { getViewTemplate } from '../templates/view.js';
import { getServiceTemplate } from '../templates/service.js';
import { getControllerTemplate } from '../templates/controller.js';

export async function generateScreenHandler(args: unknown) {
  const request = args as ScreenGenerationRequest;
  
  // Temel alan tanımlamalarını hazırla
  const baseFields = [
    { name: 'Id', displayName: 'Id', constraints: ['Primary'] },
    { name: 'InsertUserId', displayName: 'Kayıt Eden Kullanıcı Id', constraints: [] },
    { name: 'InsertDate', displayName: 'Kayıt Tarihi / Saati', constraints: [] },
    { name: 'UpdateUserId', displayName: 'Son Güncelleyen Kullanıcı Id', constraints: [] },
    { name: 'UpdateDate', displayName: 'Son Güncelleme Tarihi / Saati', constraints: [] },
    { name: 'IsActive', displayName: 'Kayıt Aktif Mi', constraints: ['IndexA'] },
  ];
  
  // Kullanıcının verdiği alanları ekle (Id hariç, çünkü zaten var)
  const customFields = request.fields.filter(f => f.name !== 'Id');
  const allFields = [
    baseFields[0], // Id
    ...customFields.filter(f => !baseFields.some(bf => bf.name === f.name)),
    ...baseFields.slice(1) // Diğer sistem alanları
  ];
  
  // Şablon parametrelerini hazırla
  const params = {
    tableName: request.tableName,
    screenTitle: request.screenTitle,
    schema: request.schema,
    fields: allFields,
  };
  
  // Tüm dosyaları üret
  const files = [
    {
      name: `${request.tableName}Contract.cs`,
      content: getContractTemplate(params),
      description: 'Data Contract dosyası'
    },
    {
      name: `${request.tableName}ViewModel.cs`,
      content: getViewModelTemplate(params),
      description: 'ViewModel dosyası'
    },
    {
      name: `${request.tableName}View.xaml`,
      content: getViewTemplate(params),
      description: 'XAML View dosyası'
    },
    {
      name: `${request.tableName}View.xaml.cs`,
      content: getViewCodeBehindTemplate(params),
      description: 'View Code-Behind dosyası'
    },
    {
      name: `${request.tableName}Service.cs`,
      content: getServiceTemplate(params),
      description: 'Service dosyası'
    },
    {
      name: `${request.tableName}Controller.cs`,
      content: getControllerTemplate(params),
      description: 'API Controller dosyası'
    }
  ];
  
  // Sonuçları formatla
  let result = `# ${request.screenTitle} Ekranı Kodları\n\n`;
  result += `Tablo: ${request.schema}.${request.tableName}\n\n`;
  
  for (const file of files) {
    result += `## ${file.name} - ${file.description}\n\n`;
    result += '```csharp\n';
    result += file.content;
    result += '\n```\n\n';
  }
  
  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
}

// View Code-Behind template helper
function getViewCodeBehindTemplate(params: any): string {
  return `using System.Windows.Controls;

namespace YourProject.Views.${params.schema}
{
    /// <summary>
    /// ${params.screenTitle} ekranı
    /// </summary>
    public partial class ${params.tableName}View : UserControl
    {
        public ${params.tableName}View()
        {
            InitializeComponent();
        }
    }
}`;
}