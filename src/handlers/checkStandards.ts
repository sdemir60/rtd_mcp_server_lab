import { CodeCheckRequest, CodeCheckResult } from '../types/index.js';
import { csharpRules } from '../rules/csharpRules.js';
import { typescriptRules } from '../rules/typescriptRules.js';
import { sqlRules } from '../rules/sqlRules.js';

export async function checkStandardsHandler(args: unknown) {
  const request = args as CodeCheckRequest;
  
  // Dile göre kuralları seç
  let rules: any[] = [];
  switch (request.language) {
    case 'csharp':
      rules = csharpRules;
      break;
    case 'typescript':
      rules = typescriptRules;
      break;
    case 'sql':
      rules = sqlRules;
      break;
  }
  
  // Kod kontrolünü yap
  const result: CodeCheckResult = {
    isValid: true,
    violations: []
  };
  
  // Kuralları uygula
  for (const rule of rules) {
    const violations = rule.check(request.code);
    if (violations.length > 0) {
      result.isValid = false;
      result.violations.push(...violations);
    }
  }
  
  // Sonucu formatla
  let responseText = '';
  
  if (result.isValid) {
    responseText = '✅ Kod standartlara uygun!\n\nTüm kontroller başarıyla geçti.';
  } else {
    responseText = `❌ Kod standartlara uygun değil!\n\n${result.violations.length} ihlal bulundu:\n\n`;
    
    for (const violation of result.violations) {
      responseText += `### ${violation.severity.toUpperCase()}: ${violation.rule}\n`;
      responseText += `${violation.message}\n`;
      
      if (violation.line) {
        responseText += `📍 Satır: ${violation.line}`;
        if (violation.column) {
          responseText += `, Kolon: ${violation.column}`;
        }
        responseText += '\n';
      }
      
      if (violation.suggestion) {
        responseText += `💡 Öneri: ${violation.suggestion}\n`;
      }
      
      responseText += '\n';
    }
  }
  
  return {
    content: [
      {
        type: 'text',
        text: responseText,
      },
    ],
  };
}