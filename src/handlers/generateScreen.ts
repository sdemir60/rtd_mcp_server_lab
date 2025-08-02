import { ScreenGenerationRequest } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export async function generateScreenHandler(args: unknown) {
  const request = args as ScreenGenerationRequest;
  
  // Masaüstüne output klasörü oluştur
  const tempDir = path.join(os.homedir(), 'Desktop', `${request.tableName}_Generated`);
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    // Alt klasörleri oluştur
    const subDirs = ['Business', 'Orchestration', 'Types', 'UI', 'SQL'];
    for (const dir of subDirs) {
      await fs.mkdir(path.join(tempDir, dir), { recursive: true });
    }
    
    const params = {
      tableName: request.tableName,
      screenTitle: request.screenTitle,
      schema: request.schema,
      namespace: request.namespace,
      fields: request.fields
    };
    
    // Dosyaları oluştur ve kaydet
    const files = await generateAllFiles(params, tempDir);
    
    // Her dosyayı uygun klasöre kaydet
    let savedFiles = 0;
    for (const file of files) {
      try {
        // Dosya adını temizle ve uzantı ekle
        let fileName = file.name;
        
        // SQL dosyaları için temizlik
        if (file.language === 'sql') {
          fileName = fileName
            .replace(/[\[\]]/g, '')
            .replace(/\./g, '_')
            .replace(/:/g, '_') + '.sql';
        }

        // C# dosyaları zaten .cs ile bitiyor, tekrar ekleme
        // XAML dosyaları zaten .xaml ile bitiyor, tekrar ekleme
        
        // Folder bilgisini kullan
        const filePath = path.join(tempDir, file.folder, fileName);
        
        await fs.writeFile(filePath, file.content, 'utf8');
        savedFiles++;
      } catch (error) {
        console.error(`Dosya kaydedilemedi: ${file.name}`, error);
      }
    }
    
    // Başarı mesajı döndür
    let result = `# ✅ ${request.screenTitle} Ekranı Başarıyla Oluşturuldu!\n\n`;
    result += `📁 **Konum:** ${tempDir}\n\n`;
    result += `📊 **Özet:**\n`;
    result += `- Toplam ${savedFiles} dosya oluşturuldu\n`;
    result += `- ${subDirs.length} klasör organize edildi\n\n`;
    result += `📂 **Klasör Yapısı:**\n`;
    result += `\`\`\`\n`;
    result += `${request.tableName}_Generated/\n`;
    result += `├── Business/     (${files.filter(f => f.name.includes('Business')).length} dosya)\n`;
    result += `├── Orchestration/ (${files.filter(f => f.name.includes('Orchestration')).length} dosya)\n`;
    result += `├── Types/        (${files.filter(f => f.name.includes('Contract') || f.name.includes('Request')).length} dosya)\n`;
    result += `├── UI/           (${files.filter(f => f.name.includes('.xaml') || f.name.includes('List') || f.name.includes('Form')).length} dosya)\n`;
    result += `└── SQL/          (${files.filter(f => f.language === 'sql').length} dosya)\n`;
    result += `\`\`\`\n\n`;
    result += `## 🚀 Sonraki Adımlar:\n`;
    result += `1. Masaüstünüzdeki **${request.tableName}_Generated** klasörünü açın\n`;
    result += `2. Dosyaları projenizin ilgili yerlerine kopyalayın\n`;
    result += `3. SQL scriptlerini sırasıyla çalıştırın (önce tablo, sonra SP'ler)\n`;
    result += `4. Resource registration script'ini çalıştırın\n`;
    
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
          text: `❌ **Hata Oluştu!**\n\n${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n\nLütfen tekrar deneyin veya yöneticinize başvurun.`,
        },
      ],
    };
  }
}

async function generateAllFiles(params: any, tempDir: string) {
  const files = [];
  
  // Business Layer
  files.push({
    name: `${params.tableName}.designer.cs`,
    content: generateBusinessDesignerCs(params),
    language: 'csharp',
    folder: 'Business'
  });
  
  files.push({
    name: `${params.tableName}.cs`,
    content: generateBusinessCs(params),
    language: 'csharp',
    folder: 'Business'
  });
  
  // Orchestration Layer
  files.push({
    name: `${params.tableName}.designer.cs`,
    content: generateOrchestrationDesignerCs(params),
    language: 'csharp',
    folder: 'Orchestration'
  });
  
  files.push({
    name: `${params.tableName}.cs`,
    content: generateOrchestrationCs(params),
    language: 'csharp',
    folder: 'Orchestration'
  });
  
  // Contract Layer
  files.push({
    name: `${params.tableName}Contract.designer.cs`,
    content: generateContractDesignerCs(params),
    language: 'csharp',
    folder: 'Types'
  });
  
  files.push({
    name: `${params.tableName}Contract.cs`,
    content: generateContractCs(params),
    language: 'csharp',
    folder: 'Types'
  });
  
  files.push({
    name: `${params.tableName}Request.designer.cs`,
    content: generateRequestDesignerCs(params),
    language: 'csharp',
    folder: 'Types'
  });
  
  files.push({
    name: `${params.tableName}Request.cs`,
    content: generateRequestCs(params),
    language: 'csharp',
    folder: 'Types'
  });
  
  // UI Layer
  files.push({
    name: `${params.tableName}List.xaml`,
    content: generateListXaml(params),
    language: 'xml',
    folder: 'UI'
  });
  
  files.push({
    name: `${params.tableName}List.xaml.cs`,
    content: generateListCs(params),
    language: 'csharp',
    folder: 'UI'
  });
  
  files.push({
    name: `${params.tableName}Form.xaml`,
    content: generateFormXaml(params),
    language: 'xml',
    folder: 'UI'
  });
  
  files.push({
    name: `${params.tableName}Form.xaml.cs`,
    content: generateFormCs(params),
    language: 'csharp',
    folder: 'UI'
  });
  
  // SQL Scripts
  files.push({
    name: `[${params.schema}].[${params.tableName}]`,
    content: generateTableScript(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  files.push({
    name: `[${params.schema}].[del_${params.tableName}]`,
    content: generateDeleteProc(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  files.push({
    name: `[${params.schema}].[ins_${params.tableName}]`,
    content: generateInsertProc(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  files.push({
    name: `[${params.schema}].[sel_${params.tableName}]`,
    content: generateSelectProc(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  files.push({
    name: `[${params.schema}].[sel_${params.tableName}ByKey]`,
    content: generateSelectByKeyProc(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  files.push({
    name: `[${params.schema}].[upd_${params.tableName}]`,
    content: generateUpdateProc(params),
    language: 'sql',
    folder: 'SQL'
  });
  
  return files;
}

// Helper functions
function getFieldType(fieldName: string): string {
  const typeMap: { [key: string]: string } = {
    'Id': 'Int16',
    'Code': 'String',
    'Description': 'String',
    'InsertUserId': 'Int32',
    'InsertDate': 'DateTime',
    'UpdateUserId': 'Int32?',
    'UpdateDate': 'DateTime?',
    'IsActive': 'Boolean'
  };
  return typeMap[fieldName] || 'String';
}

function getCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Template Functions

// Business Layer Templates
function generateBusinessDesignerCs(params: any): string {
  const { tableName, namespace, fields } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Data;
using System.Data.SqlClient;
using OSYS.Common.Types;
using OSYS.Base;
using OSYS.Base.Data;
using OSYS.Types.${namespace};

namespace OSYS.Business.${namespace}
{
    /// 
    /// Auto generated Business Object class of "${params.schema}.${tableName}" table.
    /// 	
    public partial class ${tableName} : ObjectHelper
    {
        public ${tableName}(ExecutionDataContext context) : base(context) { }

        public GenericResponse<Int16> Insert(${tableName}Contract contract)
        {
            SqlCommand command;
            GenericResponse<Int16> returnObject;
            GenericResponse<Int16> sp;
            SqlException exSql = null;

            returnObject = this.InitializeGenericResponse<Int16>("OSYS.Business.${namespace}.${tableName}.Insert");

            command = this.DBLayer.GetDBCommand("${params.schema}.ins_${tableName}");

${fields.filter((f: any) => !['Id', 'InsertDate', 'UpdateUserId', 'UpdateDate'].includes(f.name)).map((field: any) => {
    const dbType = field.name === 'Code' ? 'NVarChar' :
      field.name === 'Description' ? 'NVarChar' :
        field.name === 'InsertUserId' ? 'Int' :
          field.name === 'IsActive' ? 'Bit' : 'NVarChar';
    return `            this.DBLayer.AddInParameter(command, "${field.name}", SqlDbType.${dbType}, contract.${field.name});`;
  }).join('\n')}

            sp = this.DBLayer.ExecuteScalar<Int16>(command, ref exSql);

            if (!sp.Success)
            {
                if (exSql != null && exSql.Number == 2627)
                {
                    Result result = new Result();
                    result.ErrorCode = exSql.Number.ToString();
                    result.ErrorMessage = "Bu kod ile zaten bir kayıt mevcut. Lütfen farklı bir kod deneyin.";
                    result.Exception = exSql.ToString();
                    returnObject.Results.Add(result);
                }
                else
                {
                    returnObject.Results.AddRange(sp.Results);
                }

                return returnObject;
            }

            contract.Id = sp.Value;
            returnObject.Value = sp.Value;

            return returnObject;
        }

        public GenericResponse<Int32> Update(${tableName}Contract contract)
        {
            SqlCommand command;
            GenericResponse<Int32> returnObject;
            GenericResponse<Int32> sp;
            SqlException exSql = null;

            returnObject = this.InitializeGenericResponse<Int32>("OSYS.Business.${namespace}.${tableName}.Update");

            command = this.DBLayer.GetDBCommand("${params.schema}.upd_${tableName}");

            this.DBLayer.AddInParameter(command, "Id", SqlDbType.SmallInt, contract.Id);
${fields.filter((f: any) => ['Description', 'UpdateUserId', 'IsActive'].includes(f.name)).map((field: any) => {
    const dbType = field.name === 'Description' ? 'NVarChar' :
      field.name === 'UpdateUserId' ? 'Int' :
        field.name === 'IsActive' ? 'Bit' : 'NVarChar';
    return `            this.DBLayer.AddInParameter(command, "${field.name}", SqlDbType.${dbType}, contract.${field.name});`;
  }).join('\n')}

            sp = this.DBLayer.ExecuteNonQuery(command, ref exSql);

            if (!sp.Success)
            {
                if (exSql != null && exSql.Number == 2627)
                {
                    Result result = new Result();
                    result.ErrorCode = exSql.Number.ToString();
                    result.ErrorMessage = "Bu kod ile zaten bir kayıt mevcut. Lütfen farklı bir kod deneyin.";
                    result.Exception = exSql.ToString();
                    returnObject.Results.Add(result);
                }
                else
                {
                    returnObject.Results.AddRange(sp.Results);
                }

                return returnObject;
            }

            returnObject.Value = sp.Value;
            return returnObject;
        }

        public GenericResponse<Int32> Delete(Int16 id)
        {
            SqlCommand command;
            GenericResponse<Int32> returnObject;
            GenericResponse<Int32> sp;

            returnObject = this.InitializeGenericResponse<Int32>("OSYS.Business.${namespace}.${tableName}.Delete");

            command = this.DBLayer.GetDBCommand("${params.schema}.del_${tableName}");

            this.DBLayer.AddInParameter(command, "Id", SqlDbType.SmallInt, id);

            sp = this.DBLayer.ExecuteNonQuery(command);
            if (!sp.Success)
            {
                returnObject.Results.AddRange(sp.Results);
                return returnObject;
            }

            returnObject.Value = sp.Value;
            return returnObject;
        }

        public GenericResponse<List<${tableName}Contract>> Select()
        {
            SqlCommand command;
            GenericResponse<List<${tableName}Contract>> returnObject;
            GenericResponse<SqlDataReader> sp;

            returnObject = this.InitializeGenericResponse<List<${tableName}Contract>>("OSYS.Business.${namespace}.${tableName}.Select");

            command = this.DBLayer.GetDBCommand("${params.schema}.sel_${tableName}");

            sp = this.DBLayer.ExecuteReader(command);

            if (!sp.Success)
            {
                returnObject.Results.AddRange(sp.Results);
                return returnObject;
            }

            #region Fill from SqlDataReader to List

            List<${tableName}Contract> listOfDataContract = new List<${tableName}Contract>();
            ${tableName}Contract dataContract = null;
            SqlDataReader reader = sp.Value;
            while (reader.Read())
            {
                dataContract = new ${tableName}Contract();

${fields.map((field: any) => {
    const helperMethod = field.name.includes('Date') ? 'GetDateTimeValue' :
      field.name === 'UpdateDate' ? 'GetDateTimeNullableValue' :
        field.name === 'UpdateUserId' ? 'GetInt32NullableValue' :
          field.name === 'Id' ? 'GetInt16Value' :
            field.name === 'InsertUserId' ? 'GetInt32Value' :
              field.name === 'IsActive' ? 'GetBooleanValue' : 'GetStringValue';
    return `                dataContract.${field.name} = SQLDBHelper.${helperMethod}(reader["${field.name}"]);`;
  }).join('\n')}
                listOfDataContract.Add(dataContract);
            }
            reader.Close();

            returnObject.Value = listOfDataContract;

            #endregion

            return returnObject;
        }

        public GenericResponse<${tableName}Contract> SelectByKey(Int16 id)
        {
            SqlCommand command;
            GenericResponse<${tableName}Contract> returnObject;
            GenericResponse<SqlDataReader> sp;
            returnObject = this.InitializeGenericResponse<${tableName}Contract>("OSYS.Business.${namespace}.${tableName}.SelectByKey");

            command = this.DBLayer.GetDBCommand("${params.schema}.sel_${tableName}ByKey");

            this.DBLayer.AddInParameter(command, "Id", SqlDbType.SmallInt, id);

            sp = this.DBLayer.ExecuteReader(command);

            if (!sp.Success)
            {
                returnObject.Results.AddRange(sp.Results);
                return returnObject;
            }

            #region Fill from SqlDataReader to DataContract

            ${tableName}Contract dataContract = null;
            SqlDataReader reader = sp.Value;

            while (reader.Read())
            {
                dataContract = new ${tableName}Contract();

${fields.map((field: any) => {
    const helperMethod = field.name.includes('Date') ? 'GetDateTimeValue' :
      field.name === 'UpdateDate' ? 'GetDateTimeNullableValue' :
        field.name === 'UpdateUserId' ? 'GetInt32NullableValue' :
          field.name === 'Id' ? 'GetInt16Value' :
            field.name === 'InsertUserId' ? 'GetInt32Value' :
              field.name === 'IsActive' ? 'GetBooleanValue' : 'GetStringValue';
    return `                dataContract.${field.name} = SQLDBHelper.${helperMethod}(reader["${field.name}"]);`;
  }).join('\n')}
                break;
            }

            reader.Close();

            returnObject.Value = dataContract;

            #endregion

            return returnObject;
        }
    }
}`;
}

function generateBusinessCs(params: any): string {
  const { tableName, namespace } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using OSYS.Base;

namespace OSYS.Business.${namespace}
{
    /// 
    /// Auto generated Business Object class of "${params.schema}.${tableName}" table.
    /// 
    public partial class ${tableName} : ObjectHelper
    {
    }
}`;
}

// Orchestration Layer Templates
function generateOrchestrationDesignerCs(params: any): string {
  const { tableName, namespace } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using System;
using System.Collections.Generic;
using System.Text;
using System.Data;
using OSYS.Common.Types;
using OSYS.Base;
using OSYS.Types.${namespace};

namespace OSYS.Orchestration.${namespace}
{
    /// 
    /// Auto generated Orchestration class of "${params.schema}.${tableName}" table.
    /// 
    public partial class ${tableName}
    {
        public GenericResponse<Int16> Insert(${tableName}Request request, ObjectHelper objectHelper)
        {
            OSYS.Business.${namespace}.${tableName} bo = new OSYS.Business.${namespace}.${tableName}(objectHelper.Context);

            GenericResponse<Int16> returnObject = objectHelper.InitializeGenericResponse<Int16>("OSYS.Orchestration.${tableName}.${tableName}.Insert");

            GenericResponse<Int16> response = bo.Insert(request.DataContract);
            if (!response.Success)
            {
                returnObject.Results.AddRange(response.Results);
                return returnObject;
            }
            returnObject.Value = response.Value;
            return returnObject;
        }

        public GenericResponse<Int32> Update(${tableName}Request request, ObjectHelper objectHelper)
        {
            OSYS.Business.${namespace}.${tableName} bo = new OSYS.Business.${namespace}.${tableName}(objectHelper.Context);

            GenericResponse<Int32> returnObject = objectHelper.InitializeGenericResponse<Int32>("OSYS.Orchestration.${tableName}.${tableName}.Update");

            GenericResponse<Int32> response = bo.Update(request.DataContract);
            if (!response.Success)
            {
                returnObject.Results.AddRange(response.Results);
                return returnObject;
            }
            returnObject.Value = response.Value;
            return returnObject;
        }

        public GenericResponse<Int32> Delete(${tableName}Request request, ObjectHelper objectHelper)
        {
            OSYS.Business.${namespace}.${tableName} bo = new OSYS.Business.${namespace}.${tableName}(objectHelper.Context);

            GenericResponse<Int32> returnObject = objectHelper.InitializeGenericResponse<Int32>("OSYS.Orchestration.${tableName}.${tableName}.Delete");

            GenericResponse<Int32> response = bo.Delete(request.DataContract.Id);
            if (!response.Success)
            {
                returnObject.Results.AddRange(response.Results);
                return returnObject;
            }
            returnObject.Value = response.Value;
            return returnObject;
        }

        public GenericResponse<List<${tableName}Contract>> Select(${tableName}Request request, ObjectHelper objectHelper)
        {
            OSYS.Business.${namespace}.${tableName} bo = new OSYS.Business.${namespace}.${tableName}(objectHelper.Context);

            GenericResponse<List<${tableName}Contract>> returnObject = objectHelper.InitializeGenericResponse<List<${tableName}Contract>>("OSYS.Orchestration.${tableName}.${tableName}.Select");

            GenericResponse<List<${tableName}Contract>> response = bo.Select();
            if (!response.Success)
            {
                returnObject.Results.AddRange(response.Results);
                return returnObject;
            }
            returnObject.Value = response.Value;
            return returnObject;
        }

        public GenericResponse<${tableName}Contract> SelectByKey(${tableName}Request request, ObjectHelper objectHelper)
        {
            OSYS.Business.${namespace}.${tableName} bo = new OSYS.Business.${namespace}.${tableName}(objectHelper.Context);

            GenericResponse<${tableName}Contract> returnObject = objectHelper.InitializeGenericResponse<${tableName}Contract>("OSYS.Orchestration.${tableName}.${tableName}.SelectByKey");

            GenericResponse<${tableName}Contract> response = bo.SelectByKey(request.DataContract.Id);
            if (!response.Success)
            {
                returnObject.Results.AddRange(response.Results);
                return returnObject;
            }
            returnObject.Value = response.Value;
            return returnObject;
        }
    }
}`;
}

function generateOrchestrationCs(params: any): string {
  const { tableName, namespace } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


namespace OSYS.Orchestration.${namespace}
{
    /// 
    /// Auto generated Orchestration class of "${params.schema}.${tableName}" table.
    /// 
    public partial class ${tableName}
    {
    }
}`;
}

// Contract Layer Templates
function generateContractDesignerCs(params: any): string {
  const { tableName, namespace, fields } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}Contract.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using OSYS.Common.Types;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Text;

namespace OSYS.Types.${namespace}
{
    /// 
    /// Auto generated DataContract class of "${params.schema}.${tableName}" table.
    /// 
	[Serializable]
    public partial class ${tableName}Contract : ContractBase
    {
        #region Constructor

        public ${tableName}Contract()
        {
        }

        #endregion

        #region Private Members		

${fields.map((field: any) => {
    const fieldType = getFieldType(field.name);
    const fieldName = getCamelCase(field.name);
    const defaultValue = field.name === 'IsActive' ? ' = true' : '';
    return `        private ${fieldType} ${fieldName}${defaultValue};`;
  }).join('\n')}

        #endregion

        #region Public Members		

${fields.map((field: any) => {
    const fieldType = getFieldType(field.name);
    const fieldName = getCamelCase(field.name);
    return `        public ${fieldType} ${field.name}
        {
            get { return ${fieldName}; }
            set
            {
                if (${fieldName} != value)
                {
                    ${fieldName} = value;
                    OnPropertyChanged("${field.name}");
                }
            }
        }`;
  }).join('\n')}

        #endregion
    }
}`;
}

function generateContractCs(params: any): string {
  const { tableName, namespace } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}Contract.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using OSYS.Common.Types;

namespace OSYS.Types.${namespace}
{
    /// 
    /// Auto generated DataContract class of "${params.schema}.${tableName}" table.
    ///     
	public partial class ${tableName}Contract : ContractBase
    {
    }
}`;
}

function generateRequestDesignerCs(params: any): string {
  const { tableName, namespace } = params;

  return `/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}Request.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using System;
using System.Collections.Generic;
using System.Text;
using OSYS.Common.Types;

namespace OSYS.Types.${namespace}
{
    /// 
    /// Auto generated Request class of "${params.schema}.${tableName}" table.
    /// 
	[Serializable]
    public partial class ${tableName}Request : RequestBase
    {
        #region Constructor

        public ${tableName}Request()
        {
        }

        #endregion

        #region Public Members	

        public ${tableName}Contract DataContract { get; set; }

        #endregion
    }
}`;
}

function generateRequestCs(params: any): string {
  const { tableName, namespace } = params;

  return `
/*  Delta Software Inc
*
*  All rights are reserved. Reproduction or transmission in whole or in part, in
*  any form or by any means, electronic, mechanical or otherwise, is prohibited
*  without the prior written consent of the copyright owner.
*
*
*  Generator Information
*      Generator				: OSYS.Tools.CodeGenerator
*      File Name				: ${tableName}Request.cs
*      Generated By			    : MCP Server
*      Generated Date			: ${new Date().toLocaleString('tr-TR')}
*
*/


using OSYS.Common.Types;

namespace OSYS.Types.${namespace}
{
    /// 
    /// Auto generated Request class of "${params.schema}.${tableName}" table.
    ///     
	public partial class ${tableName}Request : RequestBase
    {
    }
}`;
}

// UI Layer Templates
function generateListXaml(params: any): string {
  const { tableName, namespace, screenTitle } = params;
  const langHeader = namespace === 'General' ? 'GeneralHeaderKeysProperties' : `${namespace}HeaderKeysProperties`;

  return `<controls:BrowseForm x:Class="OSYS.UI.${namespace}.Lists.${tableName}List"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
        xmlns:infraDP="http://infragistics.com/DataPresenter"
        xmlns:local="clr-namespace:OSYS.UI.${namespace}.Lists"
        xmlns:controls="clr-namespace:OSYS.UI;assembly=OSYS.UI"
        mc:Ignorable="d" d:DesignHeight="450" d:DesignWidth="800"  x:Name="root" 
        xmlns:langGlobal="clr-namespace:OSYS.UI.LanguageResources.GlobalKeys;assembly=OSYS.UI.LanguageResources"  
        xmlns:lang${namespace}="clr-namespace:OSYS.UI.LanguageResources.${namespace};assembly=OSYS.UI.LanguageResources"
        DataContext="{Binding ElementName=root}" IsCriteriaPanePinned="False" 
        ResultPaneHeader="{Binding Source={x:Static lang${namespace}:${langHeader}.Instance},Path=${tableName}List}">

    <controls:BrowseForm.ControlGridFieldSettings>
        <infraDP:FieldSettings AllowEdit="False" AllowRecordFiltering ="True" FilterLabelIconDropDownType="MultiSelectExcelStyle" FilterOperandUIType="UseFieldEditor"/>
    </controls:BrowseForm.ControlGridFieldSettings>

    <controls:BrowseForm.ControlGridFieldLayout >
        <infraDP:FieldLayout>

            <infraDP:FieldLayout.Settings>
                <infraDP:FieldLayoutSettings AutoFitMode="Always" AllowDelete="False" AutoGenerateFields ="False" HighlightAlternateRecords ="True"
                                             SelectionTypeCell ="Single" SelectionTypeField ="Single" SelectionTypeRecord ="Single" FilterUIType="LabelIcons" />
            </infraDP:FieldLayout.Settings>

            <infraDP:FieldLayout.Fields>
                <infraDP:Field Name="Code" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Code}" Width="Auto"/>
                <infraDP:Field Name="Description" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Description}" Width="Auto"/>
                <infraDP:Field Name="Id" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Id}" Width="Auto"/>
                <infraDP:Field Name="IsActive" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=IsActive}" Width="Auto"/>
            </infraDP:FieldLayout.Fields>

            <infraDP:FieldLayout.SortedFields>
                <infraDP:FieldSortDescription Direction="Descending" FieldName ="IsActive"/>
                <infraDP:FieldSortDescription Direction="Descending" FieldName ="Id"/>
            </infraDP:FieldLayout.SortedFields>

        </infraDP:FieldLayout>
    </controls:BrowseForm.ControlGridFieldLayout>

    <StackPanel></StackPanel>

</controls:BrowseForm>`;
}

function generateListCs(params: any): string {
  const { tableName, namespace, screenTitle } = params;
  const langHeader = namespace === 'General' ? 'GeneralHeaderKeysProperties' : `${namespace}HeaderKeysProperties`;

  return `using Infragistics.Windows.DataPresenter;
using OSYS.Common.Types;
using OSYS.Types.${namespace};
using OSYS.UI.BusinessCommon.Utils;
using OSYS.UI.${namespace}.Form;
using OSYS.UI.LanguageResources.${namespace};
using OSYS.UI.LanguageResources.GlobalKeys;
using OSYS.UI.Types;
using OSYS.UI.Utils;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;
using System.Windows.Threading;


namespace OSYS.UI.${namespace}.Lists
{
    /// <summary>
    /// Interaction logic for ${tableName}List.xaml
    /// </summary>
    public partial class ${tableName}List : BrowseForm
    {
        #region Properties 

        public static GlobalKeysProperties langGlobal => GlobalKeysProperties.Instance;
        public static ${langHeader} lang${namespace}Header => ${langHeader}.Instance;

        ObservableCollection<${tableName}Contract> dataContractList;
        public ObservableCollection<${tableName}Contract> DataContractList
        {
            get { return dataContractList; }
            set
            {
                if (dataContractList != value)
                {
                    dataContractList = value;
                    OnPropertyChanged("DataContractList");
                }

            }
        }

        #endregion

        #region Commands

        #region NewFormCommand

        private ICommand _NewFormCommand;
        public ICommand NewFormCommand
        {
            get
            {
                if (_NewFormCommand == null)
                {
                    _NewFormCommand = new DelegateCommand(NewFormCommandExecute, CanNewFormCommandExecute);
                }
                return _NewFormCommand;
            }
        }

        private void NewFormCommandExecute()
        {
            FormManager.Instance.Show(new ${tableName}Form(this), true);
        }

        private bool CanNewFormCommandExecute()
        {
            return true;
        }

        #endregion

        #region DetailCommand

        private ICommand _DetailCommand;
        public ICommand DetailCommand
        {
            get
            {
                if (_DetailCommand == null)
                {
                    _DetailCommand = new DelegateCommand(DetailCommandExecute, CanDetailCommandExecute);
                }
                return _DetailCommand;
            }
        }

        private void DetailCommandExecute()
        {
            if (this.ControlGrid.ActiveDataItem != null)
            {
                ${tableName}Contract selectedItem = ControlGrid.ActiveDataItem as ${tableName}Contract;
                ${tableName}Form ${getCamelCase(tableName)}Form = new ${tableName}Form(this, selectedItem, FormOpenMode.Show);

                FormManager.Instance.Show(${getCamelCase(tableName)}Form, true);
            }
        }

        private bool CanDetailCommandExecute()
        {
            return DataContractList?.Count > 0;
        }

        #endregion

        #region ChangeCommand

        private ICommand _ChangeCommand;
        public ICommand ChangeCommand
        {
            get
            {
                if (_ChangeCommand == null)
                {
                    _ChangeCommand = new DelegateCommand(ChangeCommandExecute, CanChangeCommandExecute);
                }
                return _ChangeCommand;
            }
        }

        private void ChangeCommandExecute()
        {
            if (this.ControlGrid.ActiveDataItem != null)
            {
                ${tableName}Contract selectedItem = this.ControlGrid.ActiveDataItem as ${tableName}Contract;

                string result = DataLockUtils.IsLockRecord(this, Convert.ToInt32(selectedItem.Id), "${tableName}");

                if (result.Length > 0)
                {
                    ShowStatusMessage(result, DialogTypes.Info, true);
                    return;
                }

                DataLockUtils.LockRecord(this, Convert.ToInt32(selectedItem.Id), ApplicationContext.User.Description, "${tableName}");

                ${tableName}Form ${tableName}Form = new ${tableName}Form(this, selectedItem, FormOpenMode.Update);

                FormManager.Instance.Show(${tableName}Form, true);
            }
        }

        private bool CanChangeCommandExecute()
        {
            return DataContractList?.Count > 0;
        }

        #endregion

        #region FullListCommand

        private ICommand _FullListCommand;
        public ICommand FullListCommand
        {
            get
            {
                if (_FullListCommand == null)
                {
                    _FullListCommand = new DelegateCommand(() => FullListCommandExecute(), CanFullListCommandExecute);
                }
                return _FullListCommand;
            }
        }

        public void FullListCommandExecute(object itemToActivate = null)
        {
            ${tableName}Request request = new ${tableName}Request() { MethodName = "Select", DataContract = new ${tableName}Contract() };
            GenericResponse<List<${tableName}Contract>> response = Execute<${tableName}Request, GenericResponse<List<${tableName}Contract>>>(request);

            if (response.Success)
            {
                DataContractList = new ObservableCollection<${tableName}Contract>(response.Value ?? new List<${tableName}Contract>());
                ControlGrid.DataSource = DataContractList;

                if (DataContractList?.Count <= 0)
                {
                    ShowStatusMessage(langGlobal.NoRecordsFound, DialogTypes.Warning);
                    return;
                }

                ShowCountMessage(string.Format(langGlobal.ListedRecordCount, DataContractList.Count));

                SetActiveItemOrDefault();
            }
            else
            {
                ShowStatusMessage(string.Format("{0}: {1}", langGlobal.Error, response.Results.FirstOrDefault().ErrorMessage), DialogTypes.Error, true);
            }
        }

        private bool CanFullListCommandExecute()
        {
            return true;
        }

        #endregion

        #endregion

        #region Constructors

        public ${tableName}List()
        {
            InitializeComponent();

            ControlGrid.RecordDoubleClick += ControlGrid_RecordDoubleClick;
        }

        #endregion

        #region Events

        void ControlGrid_RecordDoubleClick(object sender, EventArgs e)
        {
            if (this.ResourceInfo.ResourceActionList.Find(x => x.CommandName == "DetailCommand") != null)
            {
                DetailCommandExecute();
            }
            else
            {
                ShowStatusMessage(langGlobal.NoPermissionForOperation, DialogTypes.Info);
            }
        }

        #endregion

        #region Functions

        public override void LoadData()
        {
            base.LoadData();

            GlobalKeysLabelKeys.CheckLangSetting((byte)ApplicationContext.User.LanguageId);
            ${namespace}LangSettings.CheckLangSetting((byte)ApplicationContext.User.LanguageId);

            FullListCommandExecute();
        }

        private void SetActiveItemOrDefault(object targetItem = null)
        {
            if (ControlGrid == null) return;

            int? targetItemId = (targetItem as ${tableName}Contract)?.Id;

            ControlGrid.SelectedItems.Records.Clear();
            ControlGrid.SelectedItems.Cells.Clear();
            ControlGrid.ActiveRecord = null;
            ControlGrid.ActiveDataItem = null;
            ControlGrid.ActiveCell = null;

            Dispatcher?.BeginInvoke(new Action(() =>
            {
                if (targetItemId.HasValue)
                {
                    ControlGrid.ActiveDataItem = DataContractList?.FirstOrDefault(p => p.Id == targetItemId.Value);
                }
                else
                {
                    ControlGrid.ActiveDataItem = ControlGrid.RecordManager?.Sorted?.OfType<DataRecord>()?.FirstOrDefault()?.DataItem;
                }

                ControlGrid.ActiveCell = (ControlGrid.ActiveRecord as DataRecord)?.Cells[0];
            }
            ), DispatcherPriority.Loaded);
        }

        public void ApplyItemToList(${tableName}Contract item)
        {
            var existingItem = DataContractList.FirstOrDefault(x => x.Id == item.Id);

            if (existingItem != null)
            {
                DataContractList[DataContractList.IndexOf(existingItem)] = item;
            }
            else
            {
                DataContractList.Add(item);
            }

            ControlGrid.Records.RefreshSort();

            SetActiveItemOrDefault(item);
        }

        #endregion
    }
}`;
}

function generateFormXaml(params: any): string {
  const { tableName, namespace, screenTitle, fields } = params;
  const langHeader = namespace === 'General' ? 'GeneralHeaderKeysProperties' : `${namespace}HeaderKeysProperties`;

  // Sistem alanları dışındaki alanları al
  const customFields = fields.filter((f: any) =>
    !['Id', 'InsertUserId', 'InsertDate', 'UpdateUserId', 'UpdateDate'].includes(f.name)
  );

  return `<controls:TransactionForm
    x:Class="OSYS.UI.${namespace}.Form.${tableName}Form"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:igDP="http://infragistics.com/DataPresenter"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:controls="clr-namespace:OSYS.UI;assembly=OSYS.UI"
    xmlns:langGlobal="clr-namespace:OSYS.UI.LanguageResources.GlobalKeys;assembly=OSYS.UI.LanguageResources"  
    xmlns:lang${namespace}="clr-namespace:OSYS.UI.LanguageResources.${namespace};assembly=OSYS.UI.LanguageResources"
    xmlns:sys="clr-namespace:System;assembly=mscorlib" 
    mc:Ignorable="d" x:Name="root"
    DataContext="{Binding ElementName=root}">

    <Grid>

        <Grid.RowDefinitions>
            <RowDefinition ></RowDefinition>
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="500"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>

        <controls:TGroupBox Header="{Binding Source={x:Static lang${namespace}:${langHeader}.Instance},Path=${tableName}Form}" 
                            DataContext="{Binding BindingDataContract}" Grid.Column="0" Grid.Row="0">
            <ScrollViewer >

                <Grid VerticalAlignment="Top">

                    <Grid.RowDefinitions>
${customFields.map(() => '                        <RowDefinition/>').join('\n')}
                    </Grid.RowDefinitions>

${customFields.map((field: any, index: number) => {
    if (field.name === 'Code') {
      return `                    <controls:TTextEditorLabeled Name="txtCode" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Code}" 
                                                 Text="{Binding Code, Mode=TwoWay}" Grid.Row="${index}" LabelWidth="150"
                                                 IsTextEnabled="{Binding Path=IsNewMode, ElementName=root}">
                        <controls:TTextEditorLabeled.Limit>
                            <controls:TLimit Nullable="False" MaxLength="10"/>
                        </controls:TTextEditorLabeled.Limit>
                    </controls:TTextEditorLabeled>`;
    } else if (field.name === 'Description') {
      return `                    <controls:TTextEditorLabeled Name="txtDescription" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=Description}" 
                                                 Text="{Binding Description,  Mode=TwoWay}" Grid.Row="${index}" LabelWidth="150" 
                                                 IsTextEnabled="{Binding Path=IsEditableMode, ElementName=root}">
                        <controls:TTextEditorLabeled.Limit>
                            <controls:TLimit Nullable="False" MaxLength="50"/>
                        </controls:TTextEditorLabeled.Limit>
                    </controls:TTextEditorLabeled>`;
    } else if (field.name === 'IsActive') {
      return `                    <controls:TCheckEditorLabeled Name="TckStatu" Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=IsActive}" 
                                                  IsChecked="{Binding IsActive, Mode=TwoWay}" Grid.Row="${index}" LabelWidth="142" 
                                                  IsTextEnabled="{Binding Path=IsEditableMode, ElementName=root}"/>`;
    } else {
      return `                    <controls:TTextEditorLabeled Name="txt${field.name}" Label="${field.displayName}" 
                                                 Text="{Binding ${field.name},  Mode=TwoWay}" Grid.Row="${index}" LabelWidth="150" 
                                                 IsTextEnabled="{Binding Path=IsEditableMode, ElementName=root}">
                        <controls:TTextEditorLabeled.Limit>
                            <controls:TLimit Nullable="True" MaxLength="50"/>
                        </controls:TTextEditorLabeled.Limit>
                    </controls:TTextEditorLabeled>`;
    }
  }).join('\n\n')}

                </Grid>

            </ScrollViewer>
        </controls:TGroupBox>

    </Grid>
</controls:TransactionForm>`;
}

function generateFormCs(params: any): string {
  const { tableName, namespace, screenTitle } = params;
  const langHeader = namespace === 'General' ? 'GeneralHeaderKeysProperties' : `${namespace}HeaderKeysProperties`;

  return `using OSYS.Common.Types;
using OSYS.Types.${namespace};
using OSYS.UI.BusinessCommon.Utils;
using OSYS.UI.BusinessComponents.Utils;
using OSYS.UI.${namespace}.GlobalVariables;
using OSYS.UI.${namespace}.Lists;
using OSYS.UI.LanguageResources.GlobalKeys;
using OSYS.UI.LanguageResources.${namespace};
using OSYS.UI.Types;
using System;
using System.Linq;
using System.Windows.Input;

namespace OSYS.UI.${namespace}.Form
{
    /// <summary>
    /// Interaction logic for ${tableName}Form.xaml
    /// </summary>
    public partial class ${tableName}Form : TransactionForm, IDisposable
    {
        #region Properties  

        public static GlobalKeysProperties langGlobal => GlobalKeysProperties.Instance;
        public static ${langHeader} lang${namespace}Header => ${langHeader}.Instance;

        public new FormOpenMode FormOpenMode
        {
            get { return base.FormOpenMode; }
            set
            {
                base.FormOpenMode = value;
                NotifyFormOpenModeBindings();
            }
        }
        public bool IsNewMode => FormOpenMode == FormOpenMode.Default || FormOpenMode == FormOpenMode.New;
        public bool IsEditableMode => FormOpenMode == FormOpenMode.Default || FormOpenMode == FormOpenMode.Update || FormOpenMode == FormOpenMode.New;

        public ${tableName}List MainList { get; set; }

        private ${tableName}Contract bindingDataContract;
        public ${tableName}Contract BindingDataContract
        {
            get { return bindingDataContract; }
            set
            {
                if (bindingDataContract != value)
                {
                    bindingDataContract = value;
                    OnPropertyChanged("BindingDataContract");
                }
            }
        }

        #endregion

        #region Commands 

        #region DeleteCommand

        private ICommand _DeleteCommand;
        public ICommand DeleteCommand
        {
            get
            {
                if (_DeleteCommand == null)
                {
                    _DeleteCommand = new DelegateCommand(DeleteExecute, CanDeleteExecute);
                }
                return _DeleteCommand;
            }
        }

        private void DeleteExecute()
        {

            string isLockResult = DataLockUtils.IsLockRecord(this, BindingDataContract.Id, "${tableName}");

            if (isLockResult.Length == 0)
            {
                ShowStatusMessage(langGlobal.FormTimeout, DialogTypes.Error, true);
                return;
            }

            TResultDialog resultDialog = new TResultDialog(VisibleType.Approve);
            resultDialog.SetMessage(langGlobal.ConfirmCancelOperation);
            resultDialog.ShowDialog();

            if (resultDialog.Result == DeleteDataControlResult.Accept)
            {
                ${tableName}Request request = new ${tableName}Request();

                request.DataContract = BindingDataContract;
                request.MethodName = "Delete";

                GenericResponse<int> response = Execute<${tableName}Request, GenericResponse<int>>(request);

                if (response.Success)
                {
                    BindingDataContract.IsActive = false;
                    ShowStatusMessage(string.Format(langGlobal.FormCancelled, lang${namespace}Header.${tableName}Form), DialogTypes.Info);
                    ShowOtherMessage("Timeout: " + DateTimeProperty.GetDateTime.AddMinutes(30).ToString("dd.MM.yy H:mm:ss"));

                    MainList.ApplyItemToList(BindingDataContract);
                }
                else
                {
                    ShowStatusMessage(response.Results[0].ErrorMessage);
                }

                NotifyFormOpenModeBindings();
            }
        }

        private bool CanDeleteExecute()
        {
            return FormOpenMode == FormOpenMode.Update && BindingDataContract.IsActive;
        }

        #endregion

        #region InsertCommand

        private ICommand _InsertCommand;
        public ICommand InsertCommand
        {
            get
            {
                if (_InsertCommand == null)
                {
                    _InsertCommand = new DelegateCommand(InsertExecute, CanInsertExecute);
                }
                return _InsertCommand;
            }
        }

        private void InsertExecute()
        {
            string validationMessage = FormControl();

            if (!string.IsNullOrEmpty(validationMessage))
            {
                ShowStatusMessage(validationMessage.ToString(), DialogTypes.Warning);
                return;
            }

            ${tableName}Request request = new ${tableName}Request()
            {
                MethodName = "Insert",
                DataContract = BindingDataContract
            };
            request.DataContract.InsertUserId = ApplicationContext.User.Userid;

            GenericResponse<Int16> response = Execute<${tableName}Request, GenericResponse<Int16>>(request);

            if (!response.Success)
            {
                ShowStatusMessage(string.Format(langGlobal.OperationFailedWithError, response.Results.FirstOrDefault()?.ErrorMessage), DialogTypes.Error);
                return;
            }

            ShowStatusMessage(string.Format(langGlobal.FormSaved, lang${namespace}Header.${tableName}Form), DialogTypes.Info, true);
            ShowOtherMessage("Timeout: " + DateTimeProperty.GetDateTime.AddMinutes(30).ToString("dd.MM.yy H:mm:ss"));

            BindingDataContract.Id = response.Value;
            FormOpenMode = FormOpenMode.Update;

            DataLockUtils.LockRecord(this, response.Value, ApplicationContext.User.Description, "${tableName}");

            MainList.ApplyItemToList(BindingDataContract);
        }

        private bool CanInsertExecute()
        {
            return FormOpenMode == FormOpenMode.Default || FormOpenMode == FormOpenMode.New;
        }

        #endregion

        #region UpdateCommand

        private ICommand _UpdateCommand;
        public ICommand UpdateCommand
        {
            get
            {
                if (_UpdateCommand == null)
                {
                    _UpdateCommand = new DelegateCommand(UpdateExecute, CanUpdateExecute);
                }
                return _UpdateCommand;
            }
        }

        private void UpdateExecute()
        {
            string isLockResult = DataLockUtils.IsLockRecord(this, BindingDataContract.Id, "${tableName}");

            if (isLockResult.Length == 0)
            {
                ShowStatusMessage(langGlobal.FormTimeout, DialogTypes.Error, true);
                return;
            }

            string validationMessage = FormControl();

            if (string.Equals(validationMessage, ""))
            {
                ${tableName}Request request = new ${tableName}Request()
                {
                    MethodName = "Update",
                    DataContract = BindingDataContract
                };
                request.DataContract.UpdateUserId = ApplicationContext.User.Userid;

                GenericResponse<short> response = Execute<${tableName}Request, GenericResponse<short>>(request);

                if (response.Success)
                {
                    ShowStatusMessage(string.Format(langGlobal.FormUpdated,lang${namespace}Header.${tableName}Form), DialogTypes.Info);
                    ShowOtherMessage("Timeout: " + DateTimeProperty.GetDateTime.AddMinutes(30).ToString("dd.MM.yy H:mm:ss"));

                    MainList.ApplyItemToList(BindingDataContract);
                }
                else
                {
                    ShowStatusMessage(string.Format(langGlobal.OperationFailedWithError, response.Results.FirstOrDefault()?.ErrorMessage), DialogTypes.Error, response.Results, true);
                }
            }
            else
            {
                ShowStatusMessage(validationMessage, DialogTypes.Warning, "", true);
            }
        }

        private bool CanUpdateExecute()
        {
            return FormOpenMode == FormOpenMode.Update;
        }

        #endregion

        #endregion

        #region Constructors
        public ${tableName}Form(${tableName}List mainList)
        {
            InitializeComponent();

            MainList = mainList;

            BindingDataContract = new ${tableName}Contract();

            ShowOtherMessage("Timeout: " + DateTimeProperty.GetDateTime.AddMinutes(30).ToString("dd.MM.yy H:mm:ss"));
        }

        public ${tableName}Form(${tableName}List mainList, ${tableName}Contract contract, FormOpenMode formOpenMode) : this(mainList)
        {
            BindingDataContract = contract;
            FormOpenMode = formOpenMode;
        }

        #endregion

        #region Events

        public override void OnClosed()
        {
            base.OnClosed();

            if (this.FormOpenMode == FormOpenMode.Update)
            {
                DataLockUtils.RemoveRecordLock(this, Convert.ToInt16(BindingDataContract.Id), "${tableName}");
            }
        }

        #endregion

        #region Functions

        private string FormControl()
        {
            string validationMessage = string.Empty;

            if (!base.Validate())
            {
                validationMessage = GlobalKeysProperties.Instance.NecessaryField;
            }

            return validationMessage;
        }

        private void NotifyFormOpenModeBindings()
        {
            OnPropertyChanged(nameof(FormOpenMode));
            OnPropertyChanged(nameof(IsNewMode));
            OnPropertyChanged(nameof(IsEditableMode));
        }

        public override void LoadData()
        {
            base.LoadData();

            GlobalKeysLabelKeys.CheckLangSetting((byte)ApplicationContext.User.LanguageId);
            ${namespace}LangSettings.CheckLangSetting((byte)ApplicationContext.User.LanguageId);

            if (FormOpenMode == FormOpenMode.Update || FormOpenMode == FormOpenMode.Show)
            {
                SelectByKeyExecute(BindingDataContract.Id);
            }
        }

        public void SelectByKeyExecute(short Id)
        {
            ${tableName}Request request = new ${tableName}Request();

            request.MethodName = "SelectByKey";
            request.DataContract = new ${tableName}Contract() { Id = Id };

            GenericResponse<${tableName}Contract> response = Execute<${tableName}Request, GenericResponse<${tableName}Contract>>(request);

            if (!response.Success)
            {
                ShowStatusMessage(string.Format("{0}: {1}", langGlobal.Error, response.Results.FirstOrDefault().ErrorMessage), DialogTypes.Error, true);
                return;
            }

            BindingDataContract = null;
            BindingDataContract = new ${tableName}Contract();
            BindingDataContract = response.Value;
        }

        #endregion
    }
}`;
}

// SQL Script Templates
function generateTableScript(params: any): string {
  const { tableName, schema, fields } = params;

  return `IF NOT EXISTS (
    SELECT * 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${tableName}'
)
BEGIN
    CREATE TABLE [${schema}].[${tableName}]
    (
        [Id] [smallint] NOT NULL PRIMARY KEY,
${fields.filter((f: any) => f.name !== 'Id').map((field: any) => {
    let sqlType = '[nvarchar](50)';
    let nullable = 'NULL';

    if (field.name === 'Code') {
      sqlType = '[nvarchar](10)';
      nullable = 'NOT NULL';
    } else if (field.name === 'InsertUserId' || field.name === 'UpdateUserId') {
      sqlType = '[int]';
      nullable = field.name === 'InsertUserId' ? 'NOT NULL' : 'NULL';
    } else if (field.name === 'InsertDate' || field.name === 'UpdateDate') {
      sqlType = '[datetime]';
      nullable = field.name === 'InsertDate' ? 'NOT NULL' : 'NULL';
    } else if (field.name === 'IsActive') {
      sqlType = '[bit]';
      nullable = 'NOT NULL';
    }

    return `        [${field.name}] ${sqlType} ${nullable}${field.name === 'IsActive' ? '' : ','}`;
  }).join('\n')}${fields.find((f: any) => f.name === 'Code') ? `,
        CONSTRAINT UQ_${tableName}_Code UNIQUE (Code)` : ''}
    )
END`;
}

function generateDeleteProc(params: any): string {
  const { tableName, schema } = params;
  const date = new Date().toLocaleString('tr-TR');

  return `/*  Delta Software Inc
 *   
 *  All rights are reserved. Reproduction or transmission in whole or in part, in          
 *  any form or by any means, electronic, mechanical or otherwise, is prohibited
 *  without the prior written consent of the copyright owner. 
 * 
 * 
 *  Generator Information
 *      Generator				: OSYS.Tools.CodeGenerator
 *      Generated By			: MCP Server
 *      Generated Date			: ${date}
 *		File Version            : 1.1
 *		Purpose                 : Lütfen doldurunuz.
 *		Last Modified By        : MCP Server
 *		Last Modification Date  : ${date}
 *
 */
IF NOT EXISTS (
    SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[${schema}].[del_${tableName}]') AND type = N'P'
)
BEGIN
	EXEC('
    CREATE PROCEDURE [${schema}].[del_${tableName}]
    (
        @Id SMALLINT 
    )
    AS
    BEGIN
        UPDATE  ${schema}.${tableName} SET IsActive = 0
        WHERE Id = @Id
    END
    ')
END`;
}

function generateInsertProc(params: any): string {
  const { tableName, schema, fields } = params;
  const date = new Date().toLocaleString('tr-TR');

  const insertFields = fields.filter((f: any) => !['Id', 'InsertDate', 'UpdateUserId', 'UpdateDate'].includes(f.name));

  return `/*  Delta Software Inc
 *   
 *  All rights are reserved. Reproduction or transmission in whole or in part, in          
 *  any form or by any means, electronic, mechanical or otherwise, is prohibited
 *  without the prior written consent of the copyright owner. 
 * 
 * 
 *  Generator Information
 *      Generator				: OSYS.Tools.CodeGenerator
 *      Generated By			: MCP Server
 *      Generated Date			: ${date}
 *		File Version            : 1.1
 *		Purpose                 : Lütfen doldurunuz.
 *		Last Modified By        : MCP Server
 *		Last Modification Date  : ${date}
 *
 */
IF NOT EXISTS (
    SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[${schema}].[ins_${tableName}]') AND type = N'P'
)
BEGIN
	EXEC('
    CREATE PROCEDURE [${schema}].[ins_${tableName}]
    (
${insertFields.map((field: any) => {
    let sqlType = 'NVARCHAR(255)';
    let defaultValue = '= null';

    if (field.name === 'Code') {
      sqlType = 'NVARCHAR(50)';
      defaultValue = '';
    } else if (field.name === 'InsertUserId') {
      sqlType = 'INT';
      defaultValue = '';
    } else if (field.name === 'IsActive') {
      sqlType = 'BIT';
      defaultValue = '';
    }

    return `        @${field.name} ${sqlType}${defaultValue}`;
  }).join(',\n')}
    )
    AS 
    BEGIN
		    DECLARE @Id smallint;
				SELECT @Id = ISNULL(MAX(Id),0) +1 FROM [${schema}].[${tableName}];
	
        INSERT INTO [${schema}].[${tableName}] (
		        Id,
${insertFields.map((field: any) => `            ${field.name}`).join(',\n')},
            InsertDate
        )
        VALUES (
		        @Id,
${insertFields.map((field: any) => `            @${field.name}`).join(',\n')},
            GETDATE()
        )

        SELECT @Id
    END
    ')
END`;
}

function generateSelectProc(params: any): string {
  const { tableName, schema, fields } = params;
  const date = new Date().toLocaleString('tr-TR');

  return `/*  Delta Software Inc
 *   
 *  All rights are reserved. Reproduction or transmission in whole or in part, in          
 *  any form or by any means, electronic, mechanical or otherwise, is prohibited
 *  without the prior written consent of the copyright owner. 
 * 
 * 
 *  Generator Information
 *      Generator				: OSYS.Tools.CodeGenerator
 *      Generated By			: MCP Server
 *      Generated Date			: ${date}
 *		File Version            : 1.1
 *		Purpose                 : Lütfen doldurunuz.
 *		Last Modified By        : MCP Server
 *		Last Modification Date  : ${date}
 *
 */
IF NOT EXISTS (
    SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[${schema}].[sel_${tableName}]') AND type = N'P'
)
BEGIN
	EXEC('
    CREATE PROCEDURE [${schema}].[sel_${tableName}]
    AS
    BEGIN
        SELECT 
${fields.map((field: any) => `            ${field.name}`).join(',\n')}
        FROM [${schema}].[${tableName}] WITH (NOLOCK)
    END
    ')
END`;
}

function generateSelectByKeyProc(params: any): string {
  const { tableName, schema, fields } = params;
  const date = new Date().toLocaleString('tr-TR');

  return `/*  Delta Software Inc
 *   
 *  All rights are reserved. Reproduction or transmission in whole or in part, in          
 *  any form or by any means, electronic, mechanical or otherwise, is prohibited
 *  without the prior written consent of the copyright owner. 
 * 
 * 
 *  Generator Information
 *      Generator				: OSYS.Tools.CodeGenerator
 *      Generated By			: MCP Server
 *      Generated Date			: ${date}
 *		File Version            : 1.1
 *		Purpose                 : Lütfen doldurunuz.
 *		Last Modified By        : MCP Server
 *		Last Modification Date  : ${date}
 *
 */
IF NOT EXISTS (
    SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[${schema}].[sel_${tableName}ByKey]') AND type = N'P'
)
BEGIN
	EXEC('
    CREATE PROCEDURE [${schema}].[sel_${tableName}ByKey]
    (
        @Id SMALLINT
    )
    AS
    BEGIN
        SELECT 
${fields.map((field: any) => `            ${field.name}`).join(',\n')}
        FROM ${schema}.${tableName} WITH (NOLOCK)
        WHERE Id = @Id
    END
    ')
END`;
}

function generateUpdateProc(params: any): string {
  const { tableName, schema, fields } = params;
  const date = new Date().toLocaleString('tr-TR');

  const updateFields = fields.filter((f: any) => ['Description', 'UpdateUserId', 'IsActive'].includes(f.name));

  return `/*  Delta Software Inc
 *   
 *  All rights are reserved. Reproduction or transmission in whole or in part, in          
 *  any form or by any means, electronic, mechanical or otherwise, is prohibited
 *  without the prior written consent of the copyright owner. 
 * 
 * 
 *  Generator Information
 *      Generator				: OSYS.Tools.CodeGenerator
 *      Generated By			: MCP Server
 *      Generated Date			: ${date}
 *		File Version            : 1.1
 *		Purpose                 : Lütfen doldurunuz.
 *		Last Modified By        : MCP Server
 *		Last Modification Date  : ${date}
 *
 */
IF NOT EXISTS (
    SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[${schema}].[upd_${tableName}]') AND type = N'P'
)
BEGIN
	EXEC('
    CREATE PROCEDURE [${schema}].[upd_${tableName}]
    (
        @Id SMALLINT,
${updateFields.map((field: any) => {
    let sqlType = 'NVARCHAR(255)';
    let defaultValue = '= null';

    if (field.name === 'UpdateUserId') {
      sqlType = 'INT';
    } else if (field.name === 'IsActive') {
      sqlType = 'BIT';
      defaultValue = '';
    }

    return `        @${field.name} ${sqlType}${defaultValue}`;
  }).join(',\n')}
    )
    AS 
    BEGIN
        UPDATE T SET 
${updateFields.map((field: any) => `            T.${field.name} = @${field.name},`).join('\n')}
            T.UpdateDate = GETDATE()
        FROM ${schema}.${tableName} T
        WHERE 
            T.Id = @Id
    END
    ')
    END`;
}