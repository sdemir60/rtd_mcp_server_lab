export function getViewTemplate(params: any): string {
  const { tableName, screenTitle, fields } = params;
  
  // Sistem alanları dışındaki alanları al
  const customFields = fields.filter((f: any) => 
    !['Id', 'InsertUserId', 'InsertDate', 'UpdateUserId', 'UpdateDate'].includes(f.name)
  );
  
  return `<controls:TransactionForm
    x:Class="OSYS.UI.${params.schema}.Form.${tableName}Form"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:controls="clr-namespace:OSYS.UI;assembly=OSYS.UI"
    xmlns:langGlobal="clr-namespace:OSYS.UI.LanguageResources.GlobalKeys;assembly=OSYS.UI.LanguageResources"  
    xmlns:langGeneral="clr-namespace:OSYS.UI.LanguageResources.General;assembly=OSYS.UI.LanguageResources"
    x:Name="root"
    DataContext="{Binding ElementName=root}">

    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition />
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="500"/>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>

        <controls:TGroupBox Header="${screenTitle}" 
                            DataContext="{Binding BindingDataContract}" 
                            Grid.Column="0" Grid.Row="0">
            <ScrollViewer>
                <Grid VerticalAlignment="Top">
                    <Grid.RowDefinitions>
${customFields.map(() => '                        <RowDefinition/>').join('\n')}
                    </Grid.RowDefinitions>

${customFields.map((field: any, index: number) => {
    if (field.name === 'Code') {
        return `                    <controls:TTextEditorLabeled Name="txt${field.name}" 
                                                 Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=${field.name}}" 
                                                 Text="{Binding ${field.name}, Mode=TwoWay}" 
                                                 Grid.Row="${index}" 
                                                 LabelWidth="150"
                                                 IsTextEnabled="{Binding Path=IsNewMode, ElementName=root}">
                        <controls:TTextEditorLabeled.Limit>
                            <controls:TLimit Nullable="False" MaxLength="10"/>
                        </controls:TTextEditorLabeled.Limit>
                    </controls:TTextEditorLabeled>`;
    } else if (field.name === 'Description') {
        return `                    <controls:TTextEditorLabeled Name="txt${field.name}" 
                                                 Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=${field.name}}" 
                                                 Text="{Binding ${field.name}, Mode=TwoWay}" 
                                                 Grid.Row="${index}" 
                                                 LabelWidth="150">
                        <controls:TTextEditorLabeled.Limit>
                            <controls:TLimit Nullable="True" MaxLength="50"/>
                        </controls:TTextEditorLabeled.Limit>
                    </controls:TTextEditorLabeled>`;
    } else if (field.name === 'IsActive') {
        return `                    <controls:TCheckEditorLabeled Name="chk${field.name}" 
                                                  Label="{Binding Source={x:Static langGlobal:GlobalKeysProperties.Instance},Path=${field.name}}" 
                                                  IsChecked="{Binding ${field.name}, Mode=TwoWay}" 
                                                  Grid.Row="${index}" 
                                                  LabelWidth="150"/>`;
    } else {
        return `                    <controls:TTextEditorLabeled Name="txt${field.name}" 
                                                 Label="${field.displayName}" 
                                                 Text="{Binding ${field.name}, Mode=TwoWay}" 
                                                 Grid.Row="${index}" 
                                                 LabelWidth="150"/>`;
    }
}).join('\n\n')}
                </Grid>
            </ScrollViewer>
        </controls:TGroupBox>
    </Grid>
</controls:TransactionForm>`;
}