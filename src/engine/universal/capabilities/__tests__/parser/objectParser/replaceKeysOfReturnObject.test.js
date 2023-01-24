const replaceKeysOfReturnObject = require('../../../parser/objectParser/replaceKeysOfReturnObject');

describe('#replaceKeysOfReturnObject', () => {
  it('matches the keys with the corresponding semantic description of the key', () => {
    const outputObject = {
      photo: 'picture.png',
      gps: { lat: 38.8951, long: -77.0364 },
    };
    const argList = [
      { photo: 'schema:Photograph' },
      { gps: 'schema:GeoCoordinates' },
      { lat: 'schema:latitude' },
      { long: 'schema:longitude' },
    ];
    const resultObject = {
      Photograph: 'picture.png',
      GeoCoordinates: { latitude: 38.8951, longitude: -77.0364 },
    };
    expect(replaceKeysOfReturnObject(outputObject, argList)).toEqual(resultObject);
  });

  it('matches the keys with the corresponding semantic description of the key used with an random example', () => {
    const outputObject = {
      result: 2,
    };
    const resultList = [{ result: 'expectedResult' }];
    const resultObject = { expectedResult: 2 };
    expect(replaceKeysOfReturnObject(outputObject, resultList)).toEqual(resultObject);
  });

  it('matches the keys with the corresponding semantic description of the key used with an random address object', () => {
    const outputObject = {
      address: {
        country: 'TR',
        postalCode: 12345,
        city: { name: 'Istanbul', district: 'Beyoglu' },
      },
    };
    const address = [
      { address: 'schema:Address' },
      { country: 'country' },
      { postalCode: 'schema:postalCode' },
      { city: 'schema:city' },
      { name: 'schema:name' },
      { district: 'og:district' },
    ];

    const resultObject = {
      Address: {
        country: 'TR',
        postalCode: 12345,
        city: { name: 'Istanbul', district: 'Beyoglu' },
      },
    };

    expect(replaceKeysOfReturnObject(outputObject, address)).toEqual(resultObject);
  });
});
