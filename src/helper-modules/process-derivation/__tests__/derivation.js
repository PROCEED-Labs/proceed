const derivation = require('../src/processBuilder.js');
const derivationData = require('./data/testdata.json');

describe('Tests for the derivation function of this library', () => {
  beforeEach(() => {});

  test('test derivation', async () => {
    let builder = new derivation(derivationData.processSettings, derivationData.processData);
    const process = await builder.build();

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
