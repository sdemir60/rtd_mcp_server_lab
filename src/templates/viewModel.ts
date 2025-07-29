export function getViewModelTemplate(params: any): string {
  const { tableName, screenTitle, fields } = params;
  
  return `using System;
using System.Windows.Input;
using OSYS.UI.Core;
using OSYS.Types.${params.schema};
using OSYS.Common.Types;

namespace OSYS.UI.${params.schema}.Form
{
    public class ${tableName}ViewModel : ViewModelBase
    {
        #region Properties
        
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
        
        private FormOpenMode formOpenMode;
        public FormOpenMode FormOpenMode
        {
            get { return formOpenMode; }
            set
            {
                if (formOpenMode != value)
                {
                    formOpenMode = value;
                    OnPropertyChanged("FormOpenMode");
                    OnPropertyChanged("IsNewMode");
                }
            }
        }
        
        public bool IsNewMode
        {
            get { return FormOpenMode == FormOpenMode.Default || FormOpenMode == FormOpenMode.New; }
        }
        
        #endregion
        
        #region Commands
        
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
                ShowStatusMessage(validationMessage, DialogTypes.Warning);
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
            
            ShowStatusMessage(string.Format(langGlobal.FormSaved, "${screenTitle}"), DialogTypes.Info, true);
            BindingDataContract.Id = response.Value;
            FormOpenMode = FormOpenMode.Update;
        }
        
        private bool CanInsertExecute()
        {
            return FormOpenMode == FormOpenMode.Default || FormOpenMode == FormOpenMode.New;
        }
        
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
            string validationMessage = FormControl();
            
            if (!string.IsNullOrEmpty(validationMessage))
            {
                ShowStatusMessage(validationMessage, DialogTypes.Warning);
                return;
            }
            
            ${tableName}Request request = new ${tableName}Request()
            {
                MethodName = "Update",
                DataContract = BindingDataContract
            };
            request.DataContract.UpdateUserId = ApplicationContext.User.Userid;
            
            GenericResponse<short> response = Execute<${tableName}Request, GenericResponse<short>>(request);
            
            if (response.Success)
            {
                ShowStatusMessage(string.Format(langGlobal.FormUpdated, "${screenTitle}"), DialogTypes.Info);
            }
            else
            {
                ShowStatusMessage(string.Format(langGlobal.OperationFailedWithError, response.Results.FirstOrDefault()?.ErrorMessage), DialogTypes.Error);
            }
        }
        
        private bool CanUpdateExecute()
        {
            return FormOpenMode == FormOpenMode.Update;
        }
        
        #endregion
        
        #region Methods
        
        private string FormControl()
        {
            if (string.IsNullOrWhiteSpace(BindingDataContract.Code))
            {
                return "Kod alanı boş bırakılamaz!";
            }
            
            return string.Empty;
        }
        
        #endregion
    }
}`;
}