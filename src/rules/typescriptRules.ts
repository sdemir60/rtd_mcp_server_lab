export const typescriptRules = [
  {
    name: 'type-annotation',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // Function parameter type kontrolü
        const funcMatch = line.match(/function\s+\w+\s*\(([^)]*)\)/);
        if (funcMatch && funcMatch[1]) {
          const params = funcMatch[1].split(',');
          params.forEach(param => {
            if (param.trim() && !param.includes(':')) {
              violations.push({
                line: index + 1,
                rule: 'Type Annotation',
                message: 'Function parametreleri için tip tanımlaması yapılmalıdır.',
                severity: 'error',
                suggestion: 'parameter: type'
              });
            }
          });
        }
        
        // Variable type kontrolü
        const varMatch = line.match(/(let|const|var)\s+(\w+)\s*=/);
        if (varMatch && !line.includes(':')) {
          // Basit tip çıkarımları hariç
          if (!line.includes('= true') && !line.includes('= false') && 
              !line.includes('= ""') && !line.match(/= \d+/)) {
            violations.push({
              line: index + 1,
              rule: 'Type Annotation',
              message: `Değişken "${varMatch[2]}" için tip tanımlaması önerilir.`,
              severity: 'info',
              suggestion: `${varMatch[1]} ${varMatch[2]}: type = ...`
            });
          }
        }
      });
      
      return violations;
    }
  },
  {
    name: 'async-await',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // .then() kullanımı kontrolü
        if (line.includes('.then(') && !line.includes('// legacy')) {
          violations.push({
            line: index + 1,
            rule: 'Async/Await Pattern',
            message: '.then() yerine async/await kullanımı tercih edilmelidir.',
            severity: 'warning',
            suggestion: 'async function içinde await kullanın'
          });
        }
        
        // Async function içinde await kontrolü
        if (line.includes('async') && line.includes('function')) {
          const funcBody = lines.slice(index, index + 20).join('\n');
          if (!funcBody.includes('await')) {
            violations.push({
              line: index + 1,
              rule: 'Async Function',
              message: 'Async function içinde await kullanılmamış.',
              severity: 'warning',
              suggestion: 'Async keyword gereksiz olabilir veya await eklenmeli'
            });
          }
        }
      });
      
      return violations;
    }
  },
  {
    name: 'import-organization',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      const imports: { line: number; module: string }[] = [];
      
      lines.forEach((line, index) => {
        if (line.startsWith('import')) {
          const moduleMatch = line.match(/from ['"](.+)['"]/);
          if (moduleMatch) {
            imports.push({ line: index + 1, module: moduleMatch[1] });
          }
        }
      });
      
      // Import sıralaması kontrolü
      let lastRelativeImport = -1;
      let firstAbsoluteImport = -1;
      
      imports.forEach((imp, index) => {
        if (imp.module.startsWith('.')) {
          lastRelativeImport = index;
        } else if (firstAbsoluteImport === -1) {
          firstAbsoluteImport = index;
        }
      });
      
      if (lastRelativeImport > firstAbsoluteImport && firstAbsoluteImport !== -1) {
        violations.push({
          line: imports[lastRelativeImport].line,
          rule: 'Import Organization',
          message: 'External import\'lar relative import\'lardan önce gelmelidir.',
          severity: 'info',
          suggestion: 'Önce npm paketleri, sonra relative import\'lar'
        });
      }
      
      return violations;
    }
  },
  {
    name: 'error-handling',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // Empty catch block kontrolü
        if (line.includes('catch')) {
          const nextLines = lines.slice(index + 1, index + 3).join('');
          if (nextLines.includes('{}') || (nextLines.includes('{') && nextLines.includes('}'))) {
            violations.push({
              line: index + 1,
              rule: 'Error Handling',
              message: 'Boş catch bloğu bulundu.',
              severity: 'error',
              suggestion: 'En azından console.error veya log eklenmeli'
            });
          }
        }
        
        // console.log yerine proper logging
        if (line.includes('console.log') && !line.includes('// debug')) {
          violations.push({
            line: index + 1,
            rule: 'Logging',
            message: 'Production kodunda console.log kullanımı.',
            severity: 'warning',
            suggestion: 'Logger servisi kullanılmalı'
          });
        }
      });
      
      return violations;
    }
  }
];