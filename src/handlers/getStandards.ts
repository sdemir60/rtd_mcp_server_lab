import { StandardsRequest } from '../types/index.js';
import { getStandardsDocumentation } from '../documentation/standards.js';

export async function getStandardsHandler(args: unknown) {
  const request = args as StandardsRequest;
  
  // Konu bazlı dokümantasyonu getir
  const documentation = getStandardsDocumentation(request.topic);
  
  if (!documentation) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ "${request.topic}" konusu için dokümantasyon bulunamadı.\n\nMevcut konular:\n- property-tanimlama\n- dil-tanimlari\n- naming-conventions\n- error-handling\n- database-standards\n- api-standards`,
        },
      ],
    };
  }
  
  // Dokümantasyonu formatla
  let result = `# ${documentation.title}\n\n`;
  result += `${documentation.description}\n\n`;
  
  if (documentation.rules && documentation.rules.length > 0) {
    result += '## Kurallar\n\n';
    for (const rule of documentation.rules) {
      result += `### ${rule.title}\n`;
      result += `${rule.description}\n\n`;
      
      if (rule.examples?.correct) {
        result += '✅ **Doğru Kullanım:**\n```csharp\n';
        result += rule.examples.correct;
        result += '\n```\n\n';
      }
      
      if (rule.examples?.incorrect) {
        result += '❌ **Yanlış Kullanım:**\n```csharp\n';
        result += rule.examples.incorrect;
        result += '\n```\n\n';
      }
    }
  }
  
  if (documentation.bestPractices && documentation.bestPractices.length > 0) {
    result += '## En İyi Uygulamalar\n\n';
    for (const practice of documentation.bestPractices) {
      result += `- ${practice}\n`;
    }
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