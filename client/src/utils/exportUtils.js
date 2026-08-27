import * as XLSX from 'xlsx';

/**
 * Exporta un arreglo de objetos JSON a un archivo Excel (.xlsx) y dispara la descarga en el navegador.
 * 
 * @param {Array<Object>} dataArray - Arreglo de objetos a exportar.
 * @param {string} fileName - Nombre del archivo resultante (ej: 'denuncias.xlsx').
 * @param {string} [sheetName='Datos'] - Nombre de la pestaña en la hoja de cálculo.
 */
export const exportToExcel = (dataArray, fileName = 'exportacion.xlsx', sheetName = 'Datos') => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    alert('No hay datos disponibles para exportar.');
    return;
  }

  try {
    // 1. Sanitizar y aplanar objetos complejos si existen arreglos o anidaciones
    const flattenedData = dataArray.map((item) => {
      const row = {};
      for (const [key, value] of Object.entries(item)) {
        if (value === null || value === undefined) {
          row[key] = '';
        } else if (Array.isArray(value)) {
          row[key] = value.join(', ');
        } else if (typeof value === 'object') {
          row[key] = JSON.stringify(value);
        } else {
          row[key] = value;
        }
      }
      return row;
    });

    // 2. Crear la hoja de trabajo (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);

    // 3. Crear el libro de trabajo (Workbook)
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Asegurar extensión .xlsx
    const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

    // 5. Descargar archivo
    XLSX.writeFile(workbook, cleanFileName);
  } catch (error) {
    console.error('Error al exportar datos a Excel:', error);
    alert('Ocurrió un error al generar el archivo Excel. Consulta la consola para más detalles.');
  }
};

export default exportToExcel;
