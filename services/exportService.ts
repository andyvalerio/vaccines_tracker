import { Vaccine } from '../types';

export const ExportService = {
  exportToExcel: (vaccines: Vaccine[]) => {
    if (vaccines.length === 0) return;

    // Helper to safely escape XML characters
    const escapeXML = (str: string | undefined) => {
      if (!str) return '';
      return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
    };

    // Generate Rows
    const rows = vaccines.map(v => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXML(v.name)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXML(v.dateTaken)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXML(v.nextDueDate)}</Data></Cell>
      <Cell ss:StyleID="sNotes"><Data ss:Type="String">${escapeXML(v.notes)}</Data></Cell>
    </Row>`).join('');

    // XML Spreadsheet 2003 Template
    const excelTemplate = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Vertical="Bottom"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sNotes">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Vaccine History">
  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">
   <Column ss:AutoFitWidth="0" ss:Width="200"/>
   <Column ss:AutoFitWidth="0" ss:Width="100"/>
   <Column ss:AutoFitWidth="0" ss:Width="100"/>
   <Column ss:AutoFitWidth="0" ss:Width="300"/>
   <Row ss:AutoFitHeight="0" ss:Height="20" ss:StyleID="sHeader">
    <Cell><Data ss:Type="String">Vaccine Name</Data></Cell>
    <Cell><Data ss:Type="String">Date Taken</Data></Cell>
    <Cell><Data ss:Type="String">Next Due Date</Data></Cell>
    <Cell><Data ss:Type="String">Notes</Data></Cell>
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;

    // Create a Blob with Excel MIME type
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    // We use .xls extension so the OS knows to open it with Excel
    link.setAttribute('download', `vaccines_history_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};