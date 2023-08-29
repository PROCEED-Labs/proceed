const parseHttpAndReplaceHash = require('../../parser/urlParser');

describe('#parseHttpAndReplaceHash', () => {
  it('parses URIs', () => {
    expect(parseHttpAndReplaceHash('https://schema.org/PhotographAction')).toEqual(
      'schema:PhotographAction',
    );
    expect(parseHttpAndReplaceHash('https://w3id.org/saref#LightingDevice')).toEqual(
      'saref:LightingDevice',
    );
    expect(parseHttpAndReplaceHash('http://iotschema.org/TurnOn')).toEqual('iotschema:TurnOn');
  });
});
