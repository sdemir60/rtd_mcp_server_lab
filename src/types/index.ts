// Tablo alan bilgisi
export interface TableField {
  name: string;
  displayName: string;
  constraints?: ('Primary' | 'Unique' | 'IndexA')[];
}

// Ekran üretimi için gerekli bilgiler
export interface ScreenGenerationRequest {
  tableName: string;
  screenTitle: string;
  schema: string;
  fields: TableField[];
}

// Kod kontrolü için gerekli bilgiler
export interface CodeCheckRequest {
  code: string;
  language: 'csharp' | 'typescript' | 'sql';
}

// Standart sorgusu için gerekli bilgiler
export interface StandardsRequest {
  topic: string;
}

// Standart kuralı
export interface StandardRule {
  id: string;
  title: string;
  description: string;
  examples?: {
    correct?: string;
    incorrect?: string;
  };
  severity: 'error' | 'warning' | 'info';
}

// Kod kontrolü sonucu
export interface CodeCheckResult {
  isValid: boolean;
  violations: {
    line?: number;
    column?: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
  }[];
}