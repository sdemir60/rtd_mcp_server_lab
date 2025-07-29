export function getServiceTemplate(params: any): string {
  const { tableName, schema } = params;
  
  return `using System;
using System.Collections.Generic;
using OSYS.Base;
using OSYS.Business.${schema};
using OSYS.Common.Types;
using OSYS.Types.${schema};

namespace OSYS.Service.${schema}
{
    public class ${tableName}Service : ServiceHelper
    {
        public GenericResponse<Int16> Insert(${tableName}Request request)
        {
            ${tableName} businessObject = new ${tableName}(this.Context);
            return businessObject.Insert(request.DataContract);
        }
        
        public GenericResponse<Int16> Update(${tableName}Request request)
        {
            ${tableName} businessObject = new ${tableName}(this.Context);
            return businessObject.Update(request.DataContract);
        }
        
        public GenericResponse<bool> Delete(${tableName}Request request)
        {
            ${tableName} businessObject = new ${tableName}(this.Context);
            return businessObject.Delete(request.DataContract.Id);
        }
        
        public GenericResponse<List<${tableName}Contract>> Select(${tableName}Request request)
        {
            ${tableName} businessObject = new ${tableName}(this.Context);
            return businessObject.Select(request.DataContract);
        }
        
        public GenericResponse<${tableName}Contract> SelectById(${tableName}Request request)
        {
            ${tableName} businessObject = new ${tableName}(this.Context);
            return businessObject.SelectById(request.DataContract.Id);
        }
    }
}`;
}