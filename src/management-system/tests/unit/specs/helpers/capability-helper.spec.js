import {
  getParameterInfo,
  getCapabilityInfo,
} from '@/frontend/../backend/shared-electron-server/network/capabilities/capability-helper.js';

const expDefinition = require('../../../data/helpers/expandedCapabilityDef');
const exampleCapability = require('../../../data/helpers/exampleCapability');

describe('Test of conversion of smaller parts of a capability object', () => {
  describe('getParameterInfo', () => {
    test('getParameterInfo basic functionality', () => {
      const expectedResult = {
        schema: 'https://schema.org/height',
        name: 'height',
        type: 'https://schema.org/Integer',
        unit: 'px',
        required: true,
        validators: [],
      };
      expect(getParameterInfo(expDefinition[2]['@id'], expDefinition)).toStrictEqual(
        expectedResult,
      );
    });

    test('getParameterInfo additional description', () => {
      const expectedResult = {
        schema: '/dpi',
        name: 'dpi',
        type: 'https://schema.org/Integer',
        required: false,
        description: 'required Dots Per Inch value, resolution',
        validators: [],
      };
      expect(getParameterInfo(expDefinition[4]['@id'], expDefinition)).toStrictEqual(
        expectedResult,
      );
    });

    test('getParameterInfo additional defaultValue', () => {
      const expectedResult = {
        schema: '/rotation',
        name: 'rotation',
        type: 'https://schema.org/Integer',
        required: false,
        default: 0,
        validators: [
          { type: 'max', rule: 359 },
          { type: 'min', rule: 0 },
        ],
      };
      const optionsSubTypes = expDefinition[5]['http://purl.org/dc/terms/hasPart'][0]['@list'];
      const semanticRotation = optionsSubTypes[1]['@id'];
      expect(getParameterInfo(semanticRotation, optionsSubTypes)).toStrictEqual(expectedResult);
    });

    test('getParameterInfo complexType', () => {
      const expectedResult = {
        schema: 'https://schema.org/ImageObject',
        name: 'ImageObject',
        type: 'http://www.w3.org/2001/XMLSchema#complexType',
        validators: [],
        subTypes: [
          {
            schema: 'https://schema.org/GeoCoordinates',
            name: 'GeoCoordinates',
            type: 'http://www.w3.org/2001/XMLSchema#complexType',
            validators: [],
            subTypes: [
              {
                schema: 'https://schema.org/latitude',
                name: 'latitude',
                type: 'https://schema.org/Float',
                validators: [],
              },
              {
                schema: 'https://schema.org/longitude',
                name: 'longitude',
                type: 'https://schema.org/Float',
                validators: [],
              },
            ],
          },
          {
            schema: 'https://schema.org/Photograph',
            name: 'Photograph',
            encoding: 'image/png',
            validators: [],
          },
        ],
      };
      expect(getParameterInfo(expDefinition[6]['@id'], expDefinition)).toStrictEqual(
        expectedResult,
      );
    });
  });

  describe('getCapabilityInfo', () => {
    test('basic functionality', () => {
      expect(
        getCapabilityInfo(
          { uri: 'https://schema.org/PhotographAction', id: '_:PhotographActionDefinition' },
          expDefinition,
        ),
      ).toStrictEqual(exampleCapability);
    });
  });
});
