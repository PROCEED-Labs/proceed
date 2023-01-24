const objectDeepKeys = require('../../../parser/objectParser/objectDeepKeys');

describe('#objectDeepKeys', () => {
  const outputObject = {
    photo: 'picture.png',
    gps: { lat: 38.8951, long: -77.0364 },
  };
  const expectedResult = ['photo', 'gps', 'gps.lat', 'gps.long'];
  it('finds all the deep keys of an object recursively', () => {
    expect(objectDeepKeys(outputObject)).toEqual(expectedResult);
  });
});
