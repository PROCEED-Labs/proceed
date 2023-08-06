<template>
  <v-container>
    <h3>1. Please klick here upload a Excel File</h3>
    <v-file-input
      accept=".xlsx"
      label="SAP data"
      loading="true"
      @change="onFileUpload"
    ></v-file-input>
    <v-alert closable type="info" v-if="!sheets">
      The file mus have a most one sheet containing a BOM. The name of the sheet must and with
      "_BOM". The file can contain any numer of sheets containing alocations and operations. All
      Sheets should be named: material-ID + "_Operations" or "_Allocations" or "_BOM"
    </v-alert>
    <v-spacer />

    <div v-if="selectedSheetName">
      <h3>2. Please check the data</h3>
      <v-select
        v-model="selectedSheetName"
        :items="sheetNames"
        attach
        label="Select the other sheet"
      ></v-select>

      <v-data-table
        :headers="tableHeaders"
        :items="this.sheets[this.selectedSheetName]"
        class="elevation-1"
      ></v-data-table>

      <v-switch label="Advanced Options" v-model="advanced"></v-switch>

      <v-spacer />
      <h3>3. Check the process settings</h3>
      <v-text-field clearable label="Process ID" v-model="processSettings.id"> </v-text-field>

      <v-text-field clearable label="Process name" v-model="processSettings.name"></v-text-field>
      <!--
        <v-slider
        label="Task scale factor"
        min=0
        max=4
        step=1
        v-model="processSettings.taskScale"
        ></v-slider>
        -->
      <v-spacer />
      <h3>4. Check the derivation settings</h3>
      <v-select
        label="Process type"
        :items="['Private', 'Public', 'None']"
        v-model="processSettings.processType"
      ></v-select>

      <v-checkbox label="Is executable" v-model="processSettings.isExecutable"></v-checkbox>

      <v-select
        label="Type of all tasks"
        :items="['Task', 'UserTask', 'ManualTask']"
        v-model="processSettings.taskType"
      ></v-select>
      <v-checkbox
        label="Force concurrent Tasks (overlapping production) for all work steps"
        v-model="processSettings.concurrentTasks"
      ></v-checkbox>

      <v-checkbox
        label="Use intermediate throw event for concurrent work steps"
        v-model="processSettings.concurrentIntermediateEvent"
      ></v-checkbox>

      <v-checkbox label="Use subprocess" v-model="processSettings.useSubProcesses"></v-checkbox>

      <v-select
        v-if="processSettings.useSubProcesses"
        label="Only create Subprocess at Material"
        :items="materials()"
        v-model="processSettings.subProcessesMaterials"
        chips
        multiple
      ></v-select>

      <v-select
        label="Use Text Annotations for"
        :items="['Material', 'Workplace', 'Duration', 'Worksteps']"
        v-model="processSettings.textAnnotationsContents"
        chips
        multiple
      ></v-select>

      <v-select
        label="Treat the following materials types as sourced materials and do not derive their manufactroing process from the BOM"
        :items="['ROH', 'HIBE', 'FHMI', 'VERP', 'HALB']"
        v-model="processSettings.stopOnMaterialTypes"
        chips
        multiple
      ></v-select>

      <v-select
        label="Align Elements (visually)"
        :items="['Aligned', 'TOP', 'DOWN', 'Steps']"
        v-model="processSettings.elementAlignment"
      ></v-select>

      <div v-if="advanced">
        <h3>5. Please check the mapping of column names</h3>

        <div v-for="sheet in sheetNames" :key="sheet">
          <h4>Column names of table {{ sheet }}</h4>
          <div v-for="colname in getExpectedColNamesBySheetName(sheet)" :key="colname">
            <v-select
              v-if="advanced || colnameMappings[sheet][colname] === undefined"
              v-model="colnameMappings[sheet][colname]"
              :items="Object.keys(sheets[sheet][0])"
              :label="colname"
            ></v-select>
          </div>
        </div>
      </div>
      <v-btn @click="submit()"> Start derivation </v-btn>
      <v-alert type="error" v-if="mappingMissing"
        >Please make sure, all required values are mapped to your prodived input data
      </v-alert>
    </div>
  </v-container>
</template>

<script>
const XLSX = require('xlsx');
export default {
  name: 'UploadFile',
  methods: {
    onFileUpload(file) {
      console.log('new File uploaded');
      var fileReader = new FileReader();
      fileReader.readAsBinaryString(file);
      fileReader.onload = (e) => {
        const bstr = e.target.result;
        this.excelBinary = bstr;
        let sheets = {};

        let workbook = XLSX.read(bstr, { type: 'binary' });
        workbook.SheetNames.forEach((name) => {
          sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        });

        this.sheetNames = Object.keys(sheets);
        this.selectedSheetName = Object.keys(sheets)[0];
        this.sheets = sheets;

        this.validateInput();

        let materialName = this.sheetNames.find((name) => name.includes('_BOM')).split('_BOM')[0];

        (this.processSettings.id = materialName + '_' + Math.random().toString(36).substr(2, 7)),
          (this.processSettings.name =
            'Derived process for: ' + materialName + ' (' + new Date().toLocaleString() + ')');
        this.mappingMissing = false;
        this.advanced = false;
        this.advanced = this.isMappingMissing();

        //this.processSettings.concurrentTasks = this.sheetNames.find(name => name.includes("_Allocations")) !== undefined
      };
    },

    validateInput() {
      this.colnameMappings = {};
      this.sheetNames.forEach((sheetName) => {
        this.colnameMappings[sheetName] = {};
        let expectedColNames = {};

        if (sheetName.includes('_BOM')) expectedColNames = this.expectedColNames.BOM;
        else if (sheetName.includes('_Operations'))
          expectedColNames = this.expectedColNames.operations;
        else if (sheetName.includes('_Allocations'))
          expectedColNames = this.expectedColNames.allocations;

        let providedColNames = Object.keys(this.sheets[sheetName][0]);

        Object.entries(expectedColNames).forEach(([internalName, externalNames]) => {
          let foundMaping;

          externalNames.forEach((externalName) => {
            if (providedColNames.includes(externalName)) foundMaping = externalName;
          });
          this.colnameMappings[sheetName][internalName] = foundMaping;
        });
      });
    },
    getExpectedColNamesBySheetName(sheetName) {
      if (sheetName.includes('_BOM')) return Object.keys(this.expectedColNames.BOM);
      else if (sheetName.includes('_Operations'))
        return Object.keys(this.expectedColNames.operations);
      else if (sheetName.includes('_Allocations'))
        return Object.keys(this.expectedColNames.allocations);
      return [];
    },
    submit() {
      this.mappingMissing = this.isMappingMissing();
      if (this.isMappingMissing()) return;

      console.log('derivation Buton pressed');
      this.$emit('startDerivation', {
        excelBinary: this.excelBinary,
        processSettings: this.processSettings,
        columnMappings: this.colnameMappings,
      });
    },
    materials() {
      let bomSheetName = this.sheetNames.find((name) => name.includes('_BOM'));
      let bomSheet = this.sheets[bomSheetName];

      //console.log(this.colnameMappings)

      let materiaNameMapping = this.colnameMappings[bomSheetName].material;
      if (materiaNameMapping == undefined) return [];
      return bomSheet.map((row) => row[materiaNameMapping]);
    },

    isMappingMissing() {
      let mappingNotFound = false;
      Object.values(this.colnameMappings).forEach((sheet) => {
        Object.keys(sheet).forEach((colname) => {
          if (sheet[colname] === undefined) {
            mappingNotFound = true;
          }
        });
      });

      return mappingNotFound;
    },
  },
  computed: {
    tableHeaders() {
      let firstLineofSelectedTabel = this.sheets[this.selectedSheetName][0];

      return Object.keys(firstLineofSelectedTabel).map((key) => {
        return {
          text: key,
          align: 'start',
          sortable: true,
          value: key,
        };
      });
    },
  },

  data: () => ({
    excelBinary: undefined,
    sheets: undefined,
    sheetNames: [],
    selectedSheetName: undefined,
    colnameMappings: {},
    advanced: false,
    mappingMissing: false,

    expectedColNames: {
      BOM: {
        material: ['Component number', 'MatID', 'material', 'Komponentennummer'],
        materialName: ['Object description', 'name', 'Objektkurztext'],
        layer: ['Layer', 'Level', 'Lvl', 'Stufe'],
        materialType: ['Material type', 'type', 'Positionstyp'], // ROH HALB FERT
        quantity: ['Comp. Qty (CUn)', 'quantity', 'Komponentenmenge'],
        unit: ['Component UoM', 'unit', 'KompMengenEinheit'],
        // category: ["Item category", "category", "Warengruppe"],  // L / T
      },

      operations: {
        operation: ['Operation'],
        workCenter: ['WorkCenter'],
        description: ['Description'],
        quantity: ['Quantity'],
        unit: ['Unit'],
      },

      allocations: {
        operation: ['Operation'],
        component: ['Component'],
        quantity: ['Quantity'],
        unit: ['Unit'],
        // itemNr:["ItemNr"],
        // itemCategory:["ItemCategory"],
        // materialDescription:["MaterialDescription"],
      },
    },
    processSettings: {
      id: 'Derived_Process' + Math.random().toString(36).substr(2, 7),
      name: 'Derived_Process' + new Date().toLocaleString(),
      processType: 'Private',
      isExecutable: 'false',

      // derivation settings
      taskType: 'Task',
      forceConcurrentTasks: false,
      useSubProcesses: false,
      concurrentIntermediateEvent: true,
      subProcessesMaterials: [],
      textAnnotationsContents: [],
      concurrentTasks: false,
      stopOnMaterialTypes: ['ROH', 'HIBE'],
      elementAlignment: 'Aligned',
    },
  }),
};
</script>
