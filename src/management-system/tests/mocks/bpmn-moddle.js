import BPMNModdle from 'bpmn-moddle';
import customSchema from '@proceed/bpmn-helper/customSchema.json';

const moddle = new BPMNModdle({ proceed: customSchema });

export default jest.fn().mockImplementation(() => moddle);
