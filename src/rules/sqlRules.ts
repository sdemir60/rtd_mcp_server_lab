export const sqlRules = [
  {
    name: 'naming-convention',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        const upperLine = line.toUpperCase();
        
        // Tablo isimlendirme kontrolü
        const tableMatch = line.match(/CREATE\s+TABLE\s+\[?(\w+)\]?\.\[?(\w+)\]?/i);
        if (tableMatch) {
          const schema = tableMatch[1];
          const tableName = tableMatch[2];
          
          // Tablo adı büyük harfle başlamalı
          if (tableName[0] !== tableName[0].toUpperCase()) {
            violations.push({
              line: index + 1,
              rule: 'Table Naming',
              message: `Tablo adı "${tableName}" büyük harfle başlamalıdır.`,
              severity: 'error',
              suggestion: tableName.charAt(0).toUpperCase() + tableName.slice(1)
            });
          }
        }
        
        // Stored Procedure isimlendirme
        const spMatch = line.match(/CREATE\s+PROCEDURE\s+\[?(\w+)\]?\.\[?(\w+)\]?/i);
        if (spMatch) {
          const spName = spMatch[2];
          
          // Prefix kontrolü
          if (!spName.startsWith('ins_') && !spName.startsWith('upd_') && 
              !spName.startsWith('del_') && !spName.startsWith('sel_')) {
            violations.push({
              line: index + 1,
              rule: 'Stored Procedure Naming',
              message: `Stored procedure "${spName}" uygun prefix ile başlamalıdır.`,
              severity: 'warning',
              suggestion: 'ins_, upd_, del_, sel_ prefix\'lerinden biri kullanılmalı'
            });
          }
        }
      });
      
      return violations;
    }
  },
  {
    name: 'sql-keywords',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 
                       'CREATE', 'ALTER', 'DROP', 'BEGIN', 'END', 'IF', 'ELSE'];
      
      lines.forEach((line, index) => {
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = line.match(regex);
          if (matches) {
            matches.forEach(match => {
              if (match !== match.toUpperCase()) {
                violations.push({
                  line: index + 1,
                  rule: 'SQL Keywords',
                  message: `SQL keyword "${match}" büyük harfle yazılmalıdır.`,
                  severity: 'info',
                  suggestion: match.toUpperCase()
                });
              }
            });
          }
        });
      });
      
      return violations;
    }
  },
  {
    name: 'transaction-handling',
    check: (code: string) => {
      const violations: any[] = [];
      const upperCode = code.toUpperCase();
      
      // BEGIN TRANSACTION varsa COMMIT veya ROLLBACK olmalı
      if (upperCode.includes('BEGIN TRANSACTION') || upperCode.includes('BEGIN TRAN')) {
        if (!upperCode.includes('COMMIT') && !upperCode.includes('ROLLBACK')) {
          violations.push({
            line: 0,
            rule: 'Transaction Handling',
            message: 'BEGIN TRANSACTION kullanıldı ama COMMIT/ROLLBACK bulunamadı.',
            severity: 'error',
            suggestion: 'Transaction\'ı COMMIT veya ROLLBACK ile sonlandırın'
          });
        }
      }
      
      // TRY-CATCH içinde transaction kontrolü
      if (upperCode.includes('BEGIN TRY') && upperCode.includes('BEGIN TRANSACTION')) {
        if (!upperCode.includes('BEGIN CATCH') || !upperCode.includes('ROLLBACK')) {
          violations.push({
            line: 0,
            rule: 'Transaction Error Handling',
            message: 'Transaction içinde TRY-CATCH kullanıldı ama CATCH\'de ROLLBACK yok.',
            severity: 'error',
            suggestion: 'CATCH bloğunda ROLLBACK TRANSACTION eklenmeli'
          });
        }
      }
      
      return violations;
    }
  },
  {
    name: 'index-check',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      // CREATE TABLE içinde index tanımlamaları
      let inCreateTable = false;
      let hasIsActive = false;
      let hasIsActiveIndex = false;
      
      lines.forEach((line, index) => {
        if (line.toUpperCase().includes('CREATE TABLE')) {
          inCreateTable = true;
        }
        
        if (inCreateTable) {
          if (line.includes('IsActive')) {
            hasIsActive = true;
          }
          
          if (line.toUpperCase().includes('INDEX') && line.includes('IsActive')) {
            hasIsActiveIndex = true;
          }
          
          if (line.includes(')') && !line.includes('(')) {
            inCreateTable = false;
            
            // IsActive varsa ama index yoksa uyarı ver
            if (hasIsActive && !hasIsActiveIndex) {
              violations.push({
                line: index + 1,
                rule: 'Index Definition',
                message: 'IsActive alanı için index tanımlanmamış.',
                severity: 'warning',
                suggestion: 'CREATE INDEX IX_TableName_IsActive ON TableName(IsActive)'
              });
            }
          }
        }
      });
      
      return violations;
    }
  },
  {
    name: 'null-handling',
    check: (code: string) => {
      const violations: any[] = [];
      const lines = code.split('\n');
      
      lines.forEach((line, index) => {
        // ISNULL kullanımı önerisi
        if (line.includes('= NULL') || line.includes('!= NULL')) {
          violations.push({
            line: index + 1,
            rule: 'NULL Comparison',
            message: 'NULL karşılaştırması için IS NULL veya IS NOT NULL kullanılmalı.',
            severity: 'error',
            suggestion: '= NULL yerine IS NULL, != NULL yerine IS NOT NULL'
          });
        }
        
        // INSERT/UPDATE'de nullable alanlar için DEFAULT değer
        if (line.toUpperCase().includes('INSERT INTO') || line.toUpperCase().includes('UPDATE')) {
          if (line.includes('UpdateUserId') && !line.includes('ISNULL')) {
            violations.push({
              line: index + 1,
              rule: 'Nullable Field Handling',
              message: 'UpdateUserId gibi nullable alanlar için ISNULL kullanımı önerilir.',
              severity: 'info',
              suggestion: 'ISNULL(@UpdateUserId, NULL)'
            });
          }
        }
      });
      
      return violations;
    }
  }
];