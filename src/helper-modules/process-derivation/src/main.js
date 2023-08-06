// import modules
const XLSX = require('xlsx');
const semanticBuilder = require('./semanticProcessBuilder.js');
const graphicBuilder = require('./graphicProcessBuilder.js');
const Constants = require('./constants.js');

/**
 * Function that derives a process from given data and settings
 *
 * @param {Object} processSettings - Configuration object to specify derivation settings
 * @param {string} processSettings.id - Id of the process to be derived (pass through)
 * @param {string} processSettings.name - Name of the process to be derived (pass through)
 * @param {string} processSettings.processType - Visibility of process: Public, Private, None (pass through)
 * @param {boolean} processSettings.isExecutable - Executability of the process (pass through)
 * @param {string} processSettings.taskType - Default type of derived tasks: Task, ManualTask, UserTask (or any other valid Task type in BPMN)
 * @param {boolean} processSettings.concurrentTasks - Indication if a work step can start without all requiered materials ready
 * @param {boolean} processSettings.concurrentIntermediateEvent - Indication if concurrent work steps should end with an intermediate
 * @param {boolean} processSettings.useSubProcesses - Indication if subprocesses should be used
 * @param {string[]} processSettings.subProcessesMaterials - Materilas that should be derived as subprocesses: only valid material-ids (H-699620)
 * @param {string[]} processSettings.textAnnotationsContents - Information that should be included into the annotations: ["Material", "Workplace", "Duration", "Worksteps"]
 * @param {string[]} processSettings.stopOnMaterialTypes - Indication the the derivation shoud not include the manufacotring process of sourced materials of the given type (e.g. RAW, HIBE)
 * @param {string[]} processSettings.elementAlignment - How elements should be aligned behind gatways ('Aligned', 'TOP', 'DOWN', 'Steps')
 *
 * @param {Object} processData - Dynamic data object, containing a SINGLE BOM and ANY NUMBER OF allocation and operation fory any material within the BOM
 * @param {Object[]} processData.XXXXX_BOM - BOM for the material XXXXX
 * @param {string} processData.XXXXX_BOM.material - Material identifier: technical id of the material in the material master data
 * @param {string} processData.XXXXX_BOM.materialName - Material Name: Human readable name of the material
 * @param {number} processData.XXXXX_BOM.layer - Depth of the materila in the BOM
 * @param {string} processData.XXXXX_BOM.materialType - Categroy of material in terms of production state and usage (ROH, HALB, FERT)
 * @param {number} processData.XXXXX_BOM.quantity - Quantity of the component required
 * @param {string} processData.XXXXX_BOM.unit - Measure for the component quantity
 * @param {string} [processData.XXXXX_BOM.category] - Defines how an entry should be interpreted, e.g. as separately registered material (L) or as description for material (T)
 *
 * @param {Object[]} processData.YYYYY_Operations - Operations for the material YYYYY
 * @param {number} processData.YYYYY_Operations.operation - Unique id of operation
 * @param {string} processData.YYYYY_Operations.workCenter - Workplace a action is to be performed on
 * @param {string} processData.YYYYY_Operations.description - Action that is to be performed
 * @param {number} processData.YYYYY_Operations.quantity - Quantity of the component required
 * @param {string} processData.YYYYY_Operations.unit - Measure for the component quantity
 *
 * @param {Object[]} processData.ZZZZZ_Allocations - Allocations for the material ZZZZZ
 * @param {number} processData.ZZZZZ_Allocations.operation - Reference to a operation (unique id of operation)
 * @param {string} processData.ZZZZZ_Allocations.component - Reference to a material (material id / XXXXX_BOM.material)
 * @param {number} processData.ZZZZZ_Allocations.quantity - Quantity of the component required
 * @param {string} processData.ZZZZZ_Allocations.unit - Measure for the component quantity
 * @param {number} [processData.ZZZZZ_Allocations.itemNr] - Unique id of allocation
 * @param {string} [processData.ZZZZZ_Allocations.itemCategory] - Defines how an entry should be interpreted, e.g. as separately registered material (L) or as description for material (T)
 * @param {string} [processData.ZZZZZ_Allocations.materialDescription] - Material Name: Human readable name of the material (XXXXX_BOM.materialName)
 *
 * @returns {string} BPMN XML
 */

async function deriveProcessFromData(processSettings, processData) {
  // create template
  let data = semanticBuilder.build(processSettings, processData);
  graphicBuilder.build(data);

  // create callback Promise
  let promise = new Promise((resolve, reject) => {
    data.model.toXML(data.definitions, { format: true }, (saveErr, xml) => {
      if (saveErr) {
        reject(saveErr);
      }
      resolve(xml);
    });
  });

  return await promise;
}

/**
 * Function that derives a process from given settings and a Excel file with optional mappings
 *
 * @param {Object} processSettings - Configuration object to specify derivation settings
 * @param {string} processSettings.id - Id of the process to be derived (pass through)
 * @param {string} processSettings.name - Name of the process to be derived (pass through)
 * @param {string} processSettings.processType - Visibility of process: Public, Private, None (pass through)
 * @param {boolean} processSettings.isExecutable - Executability of the process (pass through)
 * @param {string} processSettings.taskType - Default type of derived tasks: Task, ManualTask, UserTask (or any other valid Task type in BPMN)
 * @param {boolean} processSettings.concurrentTasks - Indication if a work step can start without all requiered materials ready
 * @param {boolean} processSettings.concurrentIntermediateEvent - Indication if concurrent work steps should end with an intermediate
 * @param {boolean} processSettings.useSubProcesses - Indication if subprocesses should be used
 * @param {string[]} processSettings.subProcessesMaterials - Materilas that should be derived as subprocesses: only valid material-ids (H-699620)
 * @param {string[]} processSettings.textAnnotationsContents - Information that should be included into the annotations: ["Material", "Workplace", "Duration", "Worksteps"]
 * @param {string[]} processSettings.stopOnMaterialTypes - Indication the the derivation shoud not include the manufacotring process of sourced materials of the given type (e.g. RAW, HIBE)
 * @param {string[]} processSettings.elementAlignment - How elements should be aligned behind gatways ('Aligned', 'TOP', 'DOWN', 'Steps')
 *
 * @param {Buffer} excelBinary - Binary of a excel file containing BOM data. Use FileReader.readAsBinaryString(file).onload((e)=> e.target.result) as parameter OR fs.readFileSync('./__tests__/data/BOM.xlsx', 'binary');
 *
 * @param {Object} colnameMappings - Mapping of column names of (several) Excel file sheet(s)
 * @param {Object} columnMappings.XXXXX_BOM - Mapping of column names of a singel Sheet within the Excel file
 * @param {string} columnMappings.XXXXX_BOM.material - Mapping within the Excel file for the internal name "material". for all internal names see jsdoc of deriveProcessFromData()
 * @param {string} columnMappings.XXXXX_BOM.quantity - Mapping within the Excel file for the internal name "quantity". for all internal names see jsdoc of deriveProcessFromData()
 *   columnMappings are optinal. If no columnMappings are provided, the mapping is condcted automatically
 *
 * @returns {string} BPMN XML
 */
async function deriveProcessFromExcel(processSettings, excelBinary, colnameMappings) {
  let processData;
  let workbook = XLSX.read(excelBinary, { type: 'binary' });

  let sheets = {};
  workbook.SheetNames.forEach((name) => {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
  });

  if (colnameMappings === undefined) colnameMappings = finfColumnNameMappings(sheets);

  processData = mapColumns(sheets, colnameMappings);

  return await deriveProcessFromData(processSettings, processData);
}

function mapColumns(sheets, columnMappings) {
  let sheetNames = Object.keys(sheets);
  let mappedSheets = {};

  sheetNames.forEach((sheetName) => {
    let mappedRows = [];
    let sheetRows = sheets[sheetName];
    let mappings = columnMappings[sheetName];

    sheetRows.forEach((row) => {
      let mappedEntrys = {};
      Object.entries(mappings).forEach(([internalName, externalName]) => {
        mappedEntrys[internalName] = row[externalName];
      });
      mappedRows.push(mappedEntrys);
    });
    mappedSheets[sheetName] = mappedRows;
  });
  return mappedSheets;
}

function finfColumnNameMappings(sheets) {
  let colnameMappings = {};
  let sheetNames = Object.keys(sheets);

  sheetNames.forEach((sheetName) => {
    colnameMappings[sheetName] = {};
    let expectedColNames = {};

    if (sheetName.includes('_BOM')) expectedColNames = Constants.ExpectedColNames.BOM;
    else if (sheetName.includes('_Operations'))
      expectedColNames = Constants.ExpectedColNames.operations;
    else if (sheetName.includes('_Allocations'))
      expectedColNames = Constants.ExpectedColNames.allocations;

    let providedColNames = Object.keys(sheets[sheetName][0]);

    Object.entries(expectedColNames).forEach(([internalName, externalNames]) => {
      let foundMaping;

      externalNames.forEach((externalName) => {
        if (providedColNames.includes(externalName)) foundMaping = externalName;
      });
      colnameMappings[sheetName][internalName] = foundMaping;

      if (foundMaping === undefined)
        throw new Error(
          'The provided File does not match the required format. \n Missing Parameter: ' +
            internalName +
            ' in Sheet: ' +
            sheetName
        );
    });
  });

  return colnameMappings;
}

module.exports = {
  deriveProcessFromData,
  deriveProcessFromExcel,
};
