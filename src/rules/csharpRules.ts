export const csharpRules = [
  {
    name: 'property-setter-check',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      // Property setter pattern kontrolü
      const propertyPattern = /set\s*{([^}]+)}/g;
      let inSetter = false;
      let setterStartLine = 0;
      
      lines.forEach((line, index) => {
        if (line.includes('set') && line.includes('{')) {
          inSetter = true;
          setterStartLine = index;
        }
        
        if (inSetter && line.includes('}')) {
          // Setter içeriğini kontrol et
          const setterContent = lines.slice(setterStartLine, index + 1).join('\n');
          
          // if koşulu var mı kontrol et
          if (!setterContent.includes('if') || !setterContent.includes('!=')) {
            violations.push({
              line: setterStartLine + 1,
              rule: 'Property Setter Koşul Kontrolü',
              message: 'Property setter içinde değer karşılaştırması yapılmalıdır.',
              severity: 'error',
              suggestion: 'if (fieldName != value) { fieldName = value; OnPropertyChanged("PropertyName"); }'
            });
          }
          
          inSetter = false;
        }
      });
      
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
    name: 'null-check',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // String.IsNullOrEmpty kullanımı kontrolü
        if (line.includes('== null') && line.includes('string')) {
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
  },
  {
    name: 'exception-handling',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      let inTryBlock = false;
      let tryStartLine = 0;
      
      lines.forEach((line, index) => {
        if (line.trim().startsWith('try')) {
          inTryBlock = true;
          tryStartLine = index;
        }
        
        if (inTryBlock && line.includes('catch')) {
          // Generic catch kontrolü
          if (line.includes('catch') && !line.includes('Exception')) {
            violations.push({
              line: index + 1,
              rule: 'Exception Handling',
              message: 'Catch bloğunda spesifik exception tipi belirtilmelidir.',
              severity: 'warning',
              suggestion: 'catch (SpecificException ex) veya catch (Exception ex)'
            });
          }
          inTryBlock = false;
        }
      });
      
      return violations;
    }
  },
  {
    name: 'command-pattern',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      // ICommand pattern kontrolü
      const commandPattern = /ICommand\s+_?(\w+Command)/;
      let foundCommand = false;
      
      lines.forEach((line, index) => {
        const match = line.match(commandPattern);
        if (match) {
          foundCommand = true;
          const commandName = match[1];
          
          // Execute ve CanExecute metodlarının varlığını kontrol et
          const hasExecute = code.includes(`${commandName.replace('Command', '')}Execute`);
          const hasCanExecute = code.includes(`Can${commandName.replace('Command', '')}Execute`);
          
          if (!hasExecute) {
            violations.push({
              line: index + 1,
              rule: 'Command Pattern',
              message: `${commandName} için Execute metodu eksik.`,
              severity: 'error',
              suggestion: `private void ${commandName.replace('Command', '')}Execute() { }`
            });
          }
          
          if (!hasCanExecute) {
            violations.push({
              line: index + 1,
              rule: 'Command Pattern',
              message: `${commandName} için CanExecute metodu eksik.`,
              severity: 'warning',
              suggestion: `private bool Can${commandName.replace('Command', '')}Execute() { return true; }`
            });
          }
        }
      });
      
      return violations;
    }
  }
];