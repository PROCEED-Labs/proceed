# Process derivation

Module that allows the derivation of BPMN processes from SAP BOM data

## About this module

Use src/main.js to derive processes from SAP BOM data.
It provides two functions to derive processes from an Excel file (binary) or a JSON array.
The required file format is documented in JSDOC.

The folder "test_with_web_app" contains a test web application that allows uploading an Excel spreadsheet and mapping the spreadsheet to the expected data structure. It uses the src/main.js for process derivation and can dispplay the resulting process.

## Usage

Call the deriveProcessFromData() or deriveProcessFromExcel() function in main.js with the respective parameters. For more details, see also JSDOC and the provided test cases.
A BPMN XML String is returned.

### deriveProcessFromExcel

You can use one of the following exampels to read a Excel file as binary data to call the derivation with:

FileReader.readAsBinaryString(file).onload((e)=> e.target.result)

OR

fs.readFileSync('/BOM.xlsx', 'binary');
