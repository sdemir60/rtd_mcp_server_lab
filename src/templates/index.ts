// src/templates/index.ts

interface Field {
  name: string;
  displayName: string;
  constraints?: string[];
}

interface TemplateParams {
  tableName: string;
  screenTitle: string;
  schema: string;
  namespacePart: string;
  fields: Field[];
  resourceIdList?: number;
  resourceIdForm?: number;
}

export function getListTemplate(params: TemplateParams): string {
  return `using System;
using System.Collections.Generic;
using System.Linq;
using OSYS.UI.Core.Grid;
using OSYS.Common.Types;
using OSYS.Types.${params.namespacePart};

namespace OSYS.UI.${params.namespacePart}.Lists
{
    /// <summary>
    /// ${params.screenTitle} liste ekranı
    /// </summary>
    public class ${params.tableName}List : GridListBase<${params.tableName}Contract>
    {
        #region Properties
        
        public override string Title => "${params.screenTitle}";
        
        #endregion

        #region Constructor
        
        public ${params.tableName}List()
        {
            InitializeGrid();
        }
        
        #endregion

        #region Methods
        
        protected override void InitializeGrid()
        {
            base.InitializeGrid();
            
            // Grid kolonları
${params.fields.map((field: Field) => `            AddColumn("${field.name}", "${field.displayName}");`).join('\n')}
        }
        
        protected override IList<${params.tableName}Contract> GetData()
        {
            var request = new ${params.tableName}Request();
            var service = ServiceFactory.Create<I${params.tableName}Service>();
            var response = service.GetList(request);
            
            return response.DataList;
        }
        
        #endregion
    }
}`;
}

export function getFormTemplate(params: TemplateParams): string {
  return `using System;
using OSYS.UI.Core.Form;
using OSYS.Common.Types;
using OSYS.Types.${params.namespacePart};

namespace OSYS.UI.${params.namespacePart}.Forms
{
    /// <summary>
    /// ${params.screenTitle} form ekranı
    /// </summary>
    public class ${params.tableName}Form : FormBase<${params.tableName}Contract>
    {
        #region Properties
        
        public override string Title => "${params.screenTitle}";
        
        #endregion

        #region Constructor
        
        public ${params.tableName}Form()
        {
            InitializeForm();
        }
        
        #endregion

        #region Methods
        
        protected override void InitializeForm()
        {
            base.InitializeForm();
            
            // Form alanları
${params.fields.map((field: Field) => `            AddField("${field.name}", "${field.displayName}");`).join('\n')}
        }
        
        protected override void OnSave()
        {
            var service = ServiceFactory.Create<I${params.tableName}Service>();
            
            if (IsNewRecord)
            {
                var request = new ${params.tableName}Request { DataContract = DataContract };
                service.Insert(request);
            }
            else
            {
                var request = new ${params.tableName}Request { DataContract = DataContract };
                service.Update(request);
            }
            
            base.OnSave();
        }
        
        #endregion
    }
}`;
}

export function getContractTemplate(params: TemplateParams): string {
  const primaryKeyField = params.fields.find((f: Field) => f.constraints?.includes('Primary')) || params.fields[0];
  
  return `using System;
using System.Runtime.Serialization;
using OSYS.Common.Types;

namespace OSYS.Types.${params.namespacePart}
{
    /// <summary>
    /// ${params.screenTitle} data contract
    /// </summary>
    [DataContract]
    [Serializable]
    public class ${params.tableName}Contract : ContractBase
    {
        #region Properties
        
${params.fields.map((field: Field) => {
    const isPrimary = field.constraints?.includes('Primary');
    return `        /// <summary>
        /// ${field.displayName}
        /// </summary>
        [DataMember]
        public ${isPrimary ? 'int' : 'string'} ${field.name} { get; set; }`;
}).join('\n\n')}
        
        #endregion

        #region Constructor
        
        public ${params.tableName}Contract()
        {
            ${primaryKeyField.name} = 0;
${params.fields.filter((f: Field) => !f.constraints?.includes('Primary')).map((field: Field) => `            ${field.name} = string.Empty;`).join('\n')}
        }
        
        #endregion
    }
}`;
}

export function getRequestTemplate(params: TemplateParams): string {
  return `using System;
using OSYS.Common.Types;

namespace OSYS.Types.${params.namespacePart}
{
    /// <summary>
    /// ${params.screenTitle} request class
    /// </summary>
    [Serializable]
    public partial class ${params.tableName}Request : RequestBase
    {
        #region Constructor

        public ${params.tableName}Request()
        {
        }

        #endregion

        #region Public Members

        public ${params.tableName}Contract DataContract { get; set; }

        #endregion
    }
}`;
}

export function getResponseTemplate(params: TemplateParams): string {
  return `using System;
using System.Collections.Generic;
using OSYS.Common.Types;

namespace OSYS.Types.${params.namespacePart}
{
    /// <summary>
    /// ${params.screenTitle} response class
    /// </summary>
    [Serializable]
    public partial class ${params.tableName}Response : ResponseBase
    {
        #region Constructor

        public ${params.tableName}Response()
        {
            DataContract = new ${params.tableName}Contract();
            DataList = new List<${params.tableName}Contract>();
        }

        #endregion

        #region Public Members

        public ${params.tableName}Contract DataContract { get; set; }
        public IList<${params.tableName}Contract> DataList { get; set; }

        #endregion
    }
}`;
}

export function getServiceTemplate(params: TemplateParams): string {
  return `using System;
using System.Linq;
using OSYS.Business.Core;
using OSYS.Common.Types;
using OSYS.Types.${params.namespacePart};

namespace OSYS.Business.${params.namespacePart}
{
    /// <summary>
    /// ${params.screenTitle} service interface
    /// </summary>
    public interface I${params.tableName}Service : IServiceBase
    {
        ${params.tableName}Response GetList(${params.tableName}Request request);
        ${params.tableName}Response GetById(${params.tableName}Request request);
        ${params.tableName}Response Insert(${params.tableName}Request request);
        ${params.tableName}Response Update(${params.tableName}Request request);
        ${params.tableName}Response Delete(${params.tableName}Request request);
    }

    /// <summary>
    /// ${params.screenTitle} service implementation
    /// </summary>
    public class ${params.tableName}Service : ServiceBase, I${params.tableName}Service
    {
        #region Methods

        public ${params.tableName}Response GetList(${params.tableName}Request request)
        {
            var response = new ${params.tableName}Response();
            
            try
            {
                using (var context = new DataContext())
                {
                    var query = context.${params.tableName}.AsQueryable();
                    response.DataList = query.ToList();
                }
            }
            catch (Exception ex)
            {
                response.AddError(ex);
            }
            
            return response;
        }

        public ${params.tableName}Response GetById(${params.tableName}Request request)
        {
            var response = new ${params.tableName}Response();
            
            try
            {
                using (var context = new DataContext())
                {
                    var primaryKey = request.DataContract.${params.fields.find((f: Field) => f.constraints?.includes('Primary'))?.name || 'Id'};
                    response.DataContract = context.${params.tableName}.Find(primaryKey);
                }
            }
            catch (Exception ex)
            {
                response.AddError(ex);
            }
            
            return response;
        }

        public ${params.tableName}Response Insert(${params.tableName}Request request)
        {
            var response = new ${params.tableName}Response();
            
            try
            {
                using (var context = new DataContext())
                {
                    context.${params.tableName}.Add(request.DataContract);
                    context.SaveChanges();
                    response.DataContract = request.DataContract;
                }
            }
            catch (Exception ex)
            {
                response.AddError(ex);
            }
            
            return response;
        }

        public ${params.tableName}Response Update(${params.tableName}Request request)
        {
            var response = new ${params.tableName}Response();
            
            try
            {
                using (var context = new DataContext())
                {
                    context.${params.tableName}.Update(request.DataContract);
                    context.SaveChanges();
                    response.DataContract = request.DataContract;
                }
            }
            catch (Exception ex)
            {
                response.AddError(ex);
            }
            
            return response;
        }

        public ${params.tableName}Response Delete(${params.tableName}Request request)
        {
            var response = new ${params.tableName}Response();
            
            try
            {
                using (var context = new DataContext())
                {
                    context.${params.tableName}.Remove(request.DataContract);
                    context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                response.AddError(ex);
            }
            
            return response;
        }

        #endregion
    }
}`;
}

export function getControllerTemplate(params: TemplateParams): string {
  return `using System;
using System.Web.Http;
using OSYS.API.Core;
using OSYS.Types.${params.namespacePart};
using OSYS.Business.${params.namespacePart};

namespace OSYS.API.Controllers.${params.namespacePart}
{
    /// <summary>
    /// ${params.screenTitle} API Controller
    /// </summary>
    [RoutePrefix("api/${params.tableName.toLowerCase()}")]
    public class ${params.tableName}Controller : ApiControllerBase
    {
        private readonly I${params.tableName}Service _service;

        public ${params.tableName}Controller()
        {
            _service = ServiceFactory.Create<I${params.tableName}Service>();
        }

        /// <summary>
        /// Tüm kayıtları getirir
        /// </summary>
        [HttpPost]
        [Route("list")]
        public ${params.tableName}Response GetList(${params.tableName}Request request)
        {
            return _service.GetList(request);
        }

        /// <summary>
        /// ID'ye göre kayıt getirir
        /// </summary>
        [HttpPost]
        [Route("get")]
        public ${params.tableName}Response GetById(${params.tableName}Request request)
        {
            return _service.GetById(request);
        }

        /// <summary>
        /// Yeni kayıt ekler
        /// </summary>
        [HttpPost]
        [Route("insert")]
        public ${params.tableName}Response Insert(${params.tableName}Request request)
        {
            return _service.Insert(request);
        }

        /// <summary>
        /// Kayıt günceller
        /// </summary>
        [HttpPost]
        [Route("update")]
        public ${params.tableName}Response Update(${params.tableName}Request request)
        {
            return _service.Update(request);
        }

        /// <summary>
        /// Kayıt siler
        /// </summary>
        [HttpPost]
        [Route("delete")]
        public ${params.tableName}Response Delete(${params.tableName}Request request)
        {
            return _service.Delete(request);
        }
    }
}`;
}

export function getResourceRegistrationTemplate(params: TemplateParams): string {
  return `-- ==================================================
-- RESOURCE REGISTRATION SCRIPT
-- ${params.screenTitle}
-- ==================================================

-- Common variables
DECLARE @UserName NVARCHAR(MAX) = 'system'
DECLARE @HostName NVARCHAR(MAX) = 'localhost'
DECLARE @HostIP NVARCHAR(MAX) = '127.0.0.1'
DECLARE @SystemDate DATETIME = GETDATE()

-- Resource configuration
DECLARE @ModuleName NVARCHAR(MAX) = '${params.screenTitle}'
DECLARE @FormName NVARCHAR(MAX) = '${params.screenTitle} Formu'
DECLARE @IconPath NVARCHAR(MAX) = 'mnu_Tanimlar.png'
DECLARE @AssemblyName NVARCHAR(MAX) = 'OSYS.UI.${params.namespacePart}'

-- Resource IDs
DECLARE @ListResourceId INT = ${params.resourceIdList}
DECLARE @FormResourceId INT = ${params.resourceIdForm}
DECLARE @ListParentId INT = 2150  -- Tanımlar menüsü ID
DECLARE @FormParentId INT = 200012  -- Form parent ID

-- Class names
DECLARE @ListClassName NVARCHAR(MAX) = 'OSYS.UI.${params.namespacePart}.Lists.${params.tableName}List'
DECLARE @FormClassName NVARCHAR(MAX) = 'OSYS.UI.${params.namespacePart}.Forms.${params.tableName}Form'

-- ==================================================
-- LIST RESOURCE REGISTRATION
-- ==================================================

-- Insert List Resource
IF NOT EXISTS(SELECT * FROM AUT.Resource WHERE ResourceId = @ListResourceId)
BEGIN
    INSERT INTO AUT.Resource (ResourceId, [Name], ParentId, TypeId, IconPath, UserName, HostName, SystemDate, HostIP, SortId)
    VALUES (@ListResourceId, @ModuleName, @ListParentId, 2, @IconPath, @UserName, @HostName, @SystemDate, @HostIP, 10)
END

-- Insert List Resource Properties
IF NOT EXISTS(SELECT * FROM AUT.ResourceProp WHERE ResourceId = @ListResourceId)
BEGIN
    INSERT INTO AUT.ResourceProp (ResourceId, AssemblyName, ClassName, Description, ToolTipImagePath, ResourceCode, UserName, HostName, SystemDate, HostIP, IsWorkflow, RibbonSizingMode)
    VALUES (@ListResourceId, @AssemblyName, @ListClassName, @ModuleName, @ModuleName, @ListResourceId, @UserName, @HostName, @SystemDate, @HostIP, 0, 0)
END

-- Insert List Resource Actions
IF NOT EXISTS(SELECT * FROM AUT.ResourceAction WHERE ResourceId = @ListResourceId)
BEGIN
    INSERT INTO AUT.ResourceAction 
    (ResourceId, ActionId, [Name], CommandName, Description, IconPath, IsVirtual, IsAssignable, HasAccounting, HasSlip, HasCommission, SortId, UserName, HostName, SystemDate, HostIP, ActionType)
    VALUES
    (@ListResourceId, 1, 'Yeni Kayıt', 'NewFormCommand', 'Yeni kayıt oluşturur.', 'act_AddNew.png', 0, 1, 1, 0, 0, 1, @UserName, @HostName, @SystemDate, @HostIP, 1),
    (@ListResourceId, 2, 'Detay', 'DetailCommand', 'Kayıt detayını gösterir.', 'act_Detail.png', 0, 1, 1, 0, 0, 2, @UserName, @HostName, @SystemDate, @HostIP, 1),
    (@ListResourceId, 3, 'Değiştir', 'ChangeCommand', 'Kaydı değiştirir.', 'act_Change.png', 0, 1, 1, 0, 0, 3, @UserName, @HostName, @SystemDate, @HostIP, 1),
    (@ListResourceId, 4, 'Yenile', 'FullListCommand', 'Listeyi yeniler.', 'act_Refresh.png', 0, 1, 1, 0, 0, 4, @UserName, @HostName, @SystemDate, @HostIP, 1)
END

-- ==================================================
-- FORM RESOURCE REGISTRATION
-- ==================================================

-- Insert Form Resource
IF NOT EXISTS(SELECT * FROM AUT.Resource WHERE ResourceId = @FormResourceId)
BEGIN
    INSERT INTO AUT.Resource (ResourceId, [Name], ParentId, TypeId, IconPath, UserName, HostName, SystemDate, HostIP, SortId)
    VALUES (@FormResourceId, @FormName, @FormParentId, 2, @IconPath, @UserName, @HostName, @SystemDate, @HostIP, 1)
END

-- Insert Form Resource Properties
IF NOT EXISTS(SELECT * FROM AUT.ResourceProp WHERE ResourceId = @FormResourceId)
BEGIN
    INSERT INTO AUT.ResourceProp (ResourceId, AssemblyName, ClassName, Description, ToolTipImagePath, ResourceCode, UserName, HostName, SystemDate, HostIP, IsWorkflow, RibbonSizingMode)
    VALUES (@FormResourceId, @AssemblyName, @FormClassName, @FormName, @FormName, @FormResourceId, @UserName, @HostName, @SystemDate, @HostIP, 0, 0)
END

-- Insert Form Resource Actions
IF NOT EXISTS(SELECT * FROM AUT.ResourceAction WHERE ResourceId = @FormResourceId)
BEGIN
    INSERT INTO AUT.ResourceAction
    (ResourceId, ActionId, [Name], CommandName, Description, IconPath, IsVirtual, IsAssignable, HasAccounting, HasSlip, HasCommission, SortId, UserName, HostName, SystemDate, HostIP, ActionType)
    VALUES
    (@FormResourceId, 1, 'Kaydet', 'InsertCommand', 'Kaydı ekler.', 'act_save.png', 0, 1, 1, 0, 0, 1, @UserName, @HostName, @SystemDate, @HostIP, 1),
    (@FormResourceId, 2, 'Güncelle', 'UpdateCommand', 'Kaydı günceller.', 'act_Update.png', 0, 1, 1, 0, 0, 2, @UserName, @HostName, @SystemDate, @HostIP, 1),
    (@FormResourceId, 3, 'İptal', 'DeleteCommand', 'Kaydı iptal eder.', 'act_Cancel.png', 0, 1, 1, 0, 0, 3, @UserName, @HostName, @SystemDate, @HostIP, 1)
END

PRINT '✓ Resource registration completed for ${params.screenTitle}'`;
}

export function getViewCodeBehindTemplate(params: TemplateParams): string {
  return `using System.Windows.Controls;

namespace OSYS.UI.${params.namespacePart}.Views
{
    /// <summary>
    /// ${params.screenTitle} view code-behind
    /// </summary>
    public partial class ${params.tableName}View : UserControl
    {
        public ${params.tableName}View()
        {
            InitializeComponent();
        }
    }
}`;
}