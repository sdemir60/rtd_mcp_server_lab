export function getContractTemplate(params: any): string {
  const { tableName, fields } = params;
  
  return `using System;
using System.Runtime.Serialization;
using OSYS.Common.Types;

namespace OSYS.Types.${params.schema}
{
    [DataContract]
    public class ${tableName}Contract : BaseDataContract
    {
${fields.map((field: any) => `        private ${getFieldType(field.name)} ${field.name.charAt(0).toLowerCase() + field.name.slice(1)};
        [DataMember]
        public ${getFieldType(field.name)} ${field.name}
        {
            get { return ${field.name.charAt(0).toLowerCase() + field.name.slice(1)}; }
            set { ${field.name.charAt(0).toLowerCase() + field.name.slice(1)} = value; }
        }`).join('\n\n')}
    }
}`;
}

function getFieldType(fieldName: string): string {
  const typeMap: { [key: string]: string } = {
    'Id': 'short',
    'Code': 'string',
    'Description': 'string',
    'InsertUserId': 'int',
    'InsertDate': 'DateTime',
    'UpdateUserId': 'int?',
    'UpdateDate': 'DateTime?',
    'IsActive': 'bool'
  };
  
  return typeMap[fieldName] || 'string';
}