import {
  deepEquals,
  isSubset,
  mergeIntoObject,
} from '@/frontend/../shared-frontend-backend/helpers/javascriptHelpers.js';

describe('Tests for some general helper functions', () => {
  describe('deepEquals', () => {
    it('returns correct value when comparing fundamental data types', () => {
      expect(deepEquals(1, 1)).toBe(true);
      expect(deepEquals(1, 2)).toBe(false);

      expect(deepEquals('a', 'b')).toBe(false);
      expect(deepEquals('c', 'c')).toBe(true);

      expect(deepEquals(undefined, null)).toBe(false);
      expect(deepEquals(undefined, undefined)).toBe(true);
      expect(deepEquals(null, null)).toBe(true);
    });

    it("returns false if data types don't match", () => {
      expect(deepEquals(0, null)).toBe(false);
      expect(deepEquals(1, '1')).toBe(false);
    });

    it('returns false for arrays with differing length', () => {
      expect(deepEquals([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEquals([1, 2, 3], [1, 2])).toBe(false);
    });

    it('returns false for arrays with different order', () => {
      expect(deepEquals([1, 2], [2, 1])).toBe(false);
    });

    it('returns value based on comparison of all values in two arrays', () => {
      expect(deepEquals([1, 'a', null], [1, 'a', null])).toBe(true);
      expect(deepEquals([1, 'a', null], [1, 'a', 0])).toBe(false);
    });

    it('returns false for object with different number of keys', () => {
      expect(deepEquals({ a: 0 }, { a: 0, b: 1 })).toBe(false);
      expect(deepEquals({ a: 0, b: 1 }, { a: 0 })).toBe(false);
      expect(deepEquals({ a: 0, b: undefined }, { a: 0 })).toBe(false);
    });

    it('returns false if the compared object have different keys', () => {
      expect(deepEquals({ a: 0 }, { b: 0 })).toBe(false);
    });

    it('returns value based on comparison of all entries of an object', () => {
      expect(deepEquals({ a: 0, b: 'a' }, { b: 'a', a: 0 })).toBe(true);
      expect(deepEquals({ a: 0, b: 'a' }, { a: 0, b: 'b' })).toBe(false);
    });

    it('compares nested objects', () => {
      expect(
        deepEquals({ a: { x: 100 }, b: { y: 20, z: 1 } }, { a: { x: 100 }, b: { y: 20, z: 1 } })
      ).toBe(true);
      expect(
        deepEquals({ a: { x: 100 }, b: { y: 20, z: 1 } }, { a: { x: 100 }, b: { y: 20, z: 2 } })
      ).toBe(false);

      expect(deepEquals([{ x: 100 }, { y: 20, z: 1 }], [{ x: 100 }, { y: 20, z: 2 }])).toBe(false);
      expect(deepEquals([{ x: 100 }, { y: 20, z: 1 }], [{ x: 100 }, { y: 20, z: 1 }])).toBe(true);
    });

    it('compares nested arrays', () => {
      expect(deepEquals({ a: [1, 2], b: ['a', null] }, { a: [1, 2], b: ['a', 0] })).toBe(false);
      expect(deepEquals({ a: [1, 2], b: ['a', null] }, { a: [1, 2], b: ['a', null] })).toBe(true);

      expect(
        deepEquals(
          [
            [1, 2],
            ['a', null],
          ],
          [
            [1, 2],
            ['a', null],
          ]
        )
      ).toBe(true);
      expect(
        deepEquals(
          [
            [1, 2],
            ['a', null],
          ],
          [
            [1, 2],
            ['a', 0],
          ]
        )
      ).toBe(false);
    });
  });
  describe('isSubset', () => {
    it('throws if one of the values is not an object', () => {
      expect(() => {
        isSubset(1, {});
      }).toThrow(/^Expected two objects but got number and object$/);
    });

    it('throws if one of the values is null', () => {
      expect(() => {
        isSubset({}, null);
      }).toThrow(/^Got illegal null value$/);
    });

    it('throws if one value is an object and the other is an array', () => {
      expect(() => {
        isSubset([], {});
      }).toThrow(/^Expected both to be either array or object but got array and object$/);
      expect(() => {
        isSubset({}, []);
      }).toThrow(/^Expected both to be either array or object but got object and array$/);
    });

    it('returns true for an equal array', () => {
      expect(isSubset([1, null], [1, null])).toBe(true);
    });

    it('returns true for an array with less entries that are equivalent to the ones in the compared to array', () => {
      expect(isSubset([1, undefined, 3], [1, undefined])).toBe(true);
    });

    it('returns false for an array with entries differing from the ones of the compared against array', () => {
      expect(isSubset([1, 'a', 3], [1, 'b', 3])).toBe(false);
      expect(isSubset([1, 'a', 3], [1, 'b'])).toBe(false);
    });

    it('returns false for an array with more elements than the one compared against', () => {
      expect(isSubset([1, 'a'], [1, 'a', undefined])).toBe(false);
    });

    it('returns true for equal objects', () => {
      expect(isSubset({ a: 1, b: 'a', c: undefined }, { a: 1, b: 'a', c: undefined })).toBe(true);
    });

    it('returns true if the objects are equal except for some key(s) missing in the subset candidate', () => {
      expect(isSubset({ a: 1, b: 'a', c: undefined }, { a: 1, b: 'a' })).toBe(true);
    });

    it('returns false if the subset candidate contains elements not in the original object', () => {
      expect(isSubset({ a: 1, b: 'a' }, { a: 1, b: 'a', c: undefined })).toBe(false);
    });

    it('can handle nested objects and arrays', () => {
      expect(
        isSubset({ a: 1, b: [0, 1], c: { x: 2, y: 3 } }, { a: 1, b: [0, 1], c: { x: 2, y: 3 } })
      ).toBe(true);
      expect(
        isSubset({ a: 1, b: [0, 1], c: { x: 2, y: 3 } }, { a: 1, b: [null, 1], c: { x: 2, y: 3 } })
      ).toBe(false);
      expect(
        isSubset({ a: 1, b: [1, 2], c: { x: 2, y: 3 } }, { a: 1, b: [1, 2], c: { x: 2, y: 4 } })
      ).toBe(false);
    });
  });

  describe('mergeIntoObject', () => {
    let target;
    beforeEach(() => {
      target = { a: 1, b: 2 };
    });

    it('overwrites the values in the target object with the ones in the given object', () => {
      mergeIntoObject(target, { a: 2, b: '3' });
      expect(target).toStrictEqual({ a: 2, b: '3' });
    });

    it('returns object with changed entries', () => {
      expect(mergeIntoObject(target, { a: 2, b: '3' })).toStrictEqual({ a: 2, b: '3' });
    });

    it('adds new values to the target object', () => {
      mergeIntoObject(target, { c: [] });
      expect(target).toStrictEqual({ a: 1, b: 2, c: [] });
    });

    it('throws if target is not an object', () => {
      expect(() => {
        mergeIntoObject(1, { a: 1 });
      }).toThrow();
    });

    it('throws if object to merge is not an object', () => {
      expect(() => {
        mergeIntoObject(target, 2);
      }).toThrow();
    });

    it('allows to disable addition of new entries', () => {
      expect(mergeIntoObject(target, { c: 3 }, undefined, true)).toStrictEqual({});
      expect(target).toStrictEqual({ a: 1, b: 2 });
    });

    it('can be set to throw when new entries are being added', () => {
      expect(() => {
        mergeIntoObject(target, { c: 3 }, undefined, 'strict');
      }).toThrow();
    });

    it('allows to disable changing an existing entries data type', () => {
      expect(mergeIntoObject(target, { a: '1', c: 3 }, undefined, undefined, true)).toStrictEqual({
        c: 3,
      });
      expect(target).toStrictEqual({ a: 1, b: 2, c: 3 });
    });

    it('can be set to throw when type changes would occur', () => {
      expect(() => {
        mergeIntoObject(target, { a: '1' }, undefined, undefined, 'strict');
      }).toThrow();
    });

    it('overwrites arrays', () => {
      const target = { a: [1, 2, 3] };
      mergeIntoObject(target, { a: [4, 5, 6] });
      expect(target).toStrictEqual({ a: [4, 5, 6] });
    });

    it('overwrites objects', () => {
      const target = { a: { b: 2 } };
      const nestedObject = { c: 3 };
      expect(mergeIntoObject(target, { a: nestedObject })).toStrictEqual({ a: { c: 3 } });
      expect(target).toStrictEqual({ a: { c: 3 } });
      expect(target.a).toBe(nestedObject);
    });

    it('allows to enable deep merging instead of overwrite for objects', () => {
      const nestedObject = { x: 1, y: 2 };
      const target = { a: nestedObject, b: '2' };
      expect(mergeIntoObject(target, { a: { x: 8 } }, true)).toStrictEqual({ a: { x: 8 } });
      expect(target).toStrictEqual({ a: { x: 8, y: 2 }, b: '2' });
      expect(target.a).toBe(nestedObject);
    });
  });
});
