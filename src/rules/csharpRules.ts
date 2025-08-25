export const csharpRules = [
  {
    name: 'property-setter-check',
    check: (code: string) => {
      const violations: any[] = [];
      
      // Property setter pattern'ini ara
      const propertyRegex = /public\s+\w+\s+(\w+)\s*\{[^}]*get[^}]*set\s*\{([^}]+)\}[^}]*\}/g;
      let match;
      
      while ((match = propertyRegex.exec(code)) !== null) {
        const propertyName = match[1];
        const setterContent = match[2];
        
        // Koşul kontrolü var mı bak
        const hasConditionCheck = setterContent.includes('if') && 
                                 (setterContent.includes('!=') || setterContent.includes('!=='));
        
        if (!hasConditionCheck) {
          // Satır numarasını bul
          const beforeMatch = code.substring(0, match.index);
          const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
          
          violations.push({
            line: lineNumber,
            rule: 'Property Setter Koşul Kontrolü',
            message: `Property "${propertyName}" setter'ında değer değişiklik kontrolü yapılmalıdır.`,
            severity: 'error',
            suggestion: `if (${propertyName.toLowerCase()} != value) { ${propertyName.toLowerCase()} = value; OnPropertyChanged("${propertyName}"); }`
          });
        }
      }
      
      // Alternatif pattern - daha basit setter'lar için
      const simpleSetterRegex = /set\s*\{([^}]+)\}/g;
      let setterMatch;
      
      while ((setterMatch = simpleSetterRegex.exec(code)) !== null) {
        const setterContent = setterMatch[1];
        
        // OnPropertyChanged var ama koşul yok
        if (setterContent.includes('OnPropertyChanged') && 
            !setterContent.includes('if') && 
            !setterContent.includes('!=')) {
          
          const beforeMatch = code.substring(0, setterMatch.index);
          const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
          
          violations.push({
            line: lineNumber,
            rule: 'Property Setter Koşul Kontrolü',
            message: 'Property setter içinde değer değişiklik kontrolü yapılmalıdır.',
            severity: 'error',
            suggestion: 'if (field != value) { field = value; OnPropertyChanged("PropertyName"); }'
          });
        }
      }
      
      return violations;
    }
  },
  {
    name: 'naming-convention',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // Private field naming
        const privateFieldMatch = line.match(/private\s+\w+\s+(\w+);/);
        if (privateFieldMatch && privateFieldMatch[1]) {
          const fieldName = privateFieldMatch[1];
          if (fieldName[0] !== fieldName[0].toLowerCase()) {
            violations.push({
              line: index + 1,
              rule: 'Private Field İsimlendirme',
              message: `Private field "${fieldName}" küçük harfle başlamalıdır.`,
              severity: 'warning',
              suggestion: `${fieldName.charAt(0).toLowerCase() + fieldName.slice(1)}`
            });
          }
        }
        
        // Public property naming
        const publicPropertyMatch = line.match(/public\s+\w+\s+(\w+)\s*{/);
        if (publicPropertyMatch && publicPropertyMatch[1]) {
          const propertyName = publicPropertyMatch[1];
          if (propertyName[0] !== propertyName[0].toUpperCase()) {
            violations.push({
              line: index + 1,
              rule: 'Public Property İsimlendirme',
              message: `Public property "${propertyName}" büyük harfle başlamalıdır.`,
              severity: 'warning',
              suggestion: `${propertyName.charAt(0).toUpperCase() + propertyName.slice(1)}`
            });
          }
        }
      });
      
      return violations;
    }
  },
  {
    name: 'infinite-loop-risk',
    check: (code: string) => {
      const violations: any[] = [];
      
      // Setter içinde koşulsuz atama kontrolü
      const setterPattern = /set\s*\{[^}]*(\w+)\s*=\s*value;[^}]*OnPropertyChanged[^}]*\}/g;
      let match;
      
      while ((match = setterPattern.exec(code)) !== null) {
        const setterContent = match[0];
        
        // if koşulu yoksa sonsuz döngü riski var
        if (!setterContent.includes('if')) {
          const beforeMatch = code.substring(0, match.index);
          const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
          
          violations.push({
            line: lineNumber,
            rule: 'Sonsuz Döngü Riski',
            message: 'Property setter içinde koşulsuz atama sonsuz döngüye sebep olabilir.',
            severity: 'error',
            suggestion: 'Değer ataması öncesi mutlaka if (field != value) kontrolü yapın'
          });
        }
      }
      
      return violations;
    }
  },
  {
    name: 'string-null-check',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // String null kontrolü
        if ((line.includes('== null') || line.includes('!= null')) && 
            (line.includes('string') || line.toLowerCase().includes('text'))) {
          violations.push({
            line: index + 1,
            rule: 'String Null Kontrolü',
            message: 'String null kontrolü için String.IsNullOrEmpty kullanılmalıdır.',
            severity: 'warning',
            suggestion: 'string.IsNullOrEmpty(value) veya string.IsNullOrWhiteSpace(value)'
          });
        }
      });
      
      return violations;
    }
  }
];