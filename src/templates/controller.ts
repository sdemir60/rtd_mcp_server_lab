export function getControllerTemplate(params: any): string {
  const { tableName, schema } = params;
  
  return `using System;
using System.Collections.Generic;
using System.Web.Http;
using OSYS.Common.Types;
using OSYS.Service.${schema};
using OSYS.Types.${schema};

namespace OSYS.Api.Controllers.${schema}
{
    [RoutePrefix("api/${schema.toLowerCase()}/${tableName.toLowerCase()}")]
    public class ${tableName}Controller : ApiController
    {
        private readonly ${tableName}Service service;
        
        public ${tableName}Controller()
        {
            service = new ${tableName}Service();
        }
        
        [HttpPost]
        [Route("insert")]
        public GenericResponse<Int16> Insert([FromBody] ${tableName}Request request)
        {
            return service.Insert(request);
        }
        
        [HttpPut]
        [Route("update")]
        public GenericResponse<Int16> Update([FromBody] ${tableName}Request request)
        {
            return service.Update(request);
        }
        
        [HttpDelete]
        [Route("delete/{id}")]
        public GenericResponse<bool> Delete(short id)
        {
            ${tableName}Request request = new ${tableName}Request
            {
                DataContract = new ${tableName}Contract { Id = id }
            };
            return service.Delete(request);
        }
        
        [HttpPost]
        [Route("select")]
        public GenericResponse<List<${tableName}Contract>> Select([FromBody] ${tableName}Request request)
        {
            return service.Select(request);
        }
        
        [HttpGet]
        [Route("select/{id}")]
        public GenericResponse<${tableName}Contract> SelectById(short id)
        {
            ${tableName}Request request = new ${tableName}Request
            {
                DataContract = new ${tableName}Contract { Id = id }
            };
            return service.SelectById(request);
        }
    }
}`;
}