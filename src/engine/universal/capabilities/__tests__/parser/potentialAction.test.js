const potentialAction = require('../../parser/potentialActionParser');
const list = require('../data/list');
const expandedList = require('../data/expandedJSONLD');
const photographActionExpandedJSONLD = require('../data/photographActionExpandedJSONLD');
const turnOnActionExpandedJSONLD = require('../data/turnOnActionExpandedJSONLD');

describe('potentialAction', () => {
  describe('#getPotentialActions', () => {
    it('gets the potential actions from the expanded jsonld object', () => {
      expect(potentialAction.getPotentialActions(expandedList)).toEqual([
        'https://schema.org/PhotographAction',
        'http://iotschema.org/TurnOn',
      ]);
    });
  });

  describe('#removeFunctionUri', () => {
    it('removes the function uri from the potential actions array', () => {
      const potentialActionsArray = [
        'https://schema.org/PhotographAction',
        'https://w3id.org/function/ontology#Function',
        'http://iotschema.org/TurnOn',
        'https://w3id.org/function/ontology#Function',
      ];
      expect(potentialAction.removeFunctionUri(potentialActionsArray)).toEqual([
        'https://schema.org/PhotographAction',
        'http://iotschema.org/TurnOn',
      ]);
    });
  });

  describe('#findIdAndDesc', () => {
    it('finds the corresponding description and id for the given capability name: PhotographAction', async () => {
      const result = await potentialAction.findIdAndDesc('PhotographAction', list);
      expect(result).toEqual(photographActionExpandedJSONLD);
    });

    it('finds the corresponding description and id for the given capability name as url ', async () => {
      const result = await potentialAction.findIdAndDesc('http://iotschema.org/TurnOn', list);
      expect(result).toEqual(turnOnActionExpandedJSONLD);
    });
  });
});
