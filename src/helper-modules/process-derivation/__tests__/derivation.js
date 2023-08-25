const derivation = require('../src/main.js');
const derivationData = require('./data/testdata.json');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

describe('Tests for the derivation function of this library directly', () => {
  beforeEach(() => {});

  test('test derivation', async () => {
    let process = await derivation.deriveProcessFromData(
      derivationData.processSettings,
      derivationData.processData
    );

    expect(typeof process).toBe('string');
    expect(process).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(process).toContain('<definitions ');
    expect(process).toContain('<process ');
    expect(process).toContain('<startEvent ');
    expect(process).toContain('<endEvent ');
    expect(process).toContain('<task ');
    expect(process).toContain('<sequenceFlow ');
    expect(process).toContain('<parallelGateway ');
    expect(process).toContain('<bpmndi:BPMNDiagram ');
    expect(process).toContain('<bpmndi:BPMNPlane ');
    expect(process).toContain('<bpmndi:BPMNShape ');
    expect(process).toContain('<bpmndi:BPMNEdge ');
    expect(process).toContain('<dc:Bounds ');
    expect(process).toContain('<di:waypoint ');
  });

  test('test derivation of Excel file without mappings', async () => {
    let BOM = fs.readFileSync(path.join(__dirname, '/data/BOM.xlsx'), 'binary');
    let process = await derivation.deriveProcessFromExcel(derivationData.processSettings, BOM);

    expect(typeof process).toBe('string');
    expect(process).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(process).toContain('<definitions ');
    expect(process).toContain('<process ');
    expect(process).toContain('<startEvent ');
    expect(process).toContain('<endEvent ');
    expect(process).toContain('<task ');
    expect(process).toContain('<sequenceFlow ');
    expect(process).toContain('<parallelGateway ');
    expect(process).toContain('<bpmndi:BPMNDiagram ');
    expect(process).toContain('<bpmndi:BPMNPlane ');
    expect(process).toContain('<bpmndi:BPMNShape ');
    expect(process).toContain('<bpmndi:BPMNEdge ');
    expect(process).toContain('<dc:Bounds ');
    expect(process).toContain('<di:waypoint ');
  });
});
