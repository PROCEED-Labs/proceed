import { findLast } from '@/shared-frontend-backend/helpers/arrayHelpers.js';

describe('Test for functions that provide extended array functionalities', () => {
  describe('findLast()', () => {
    it('returns undefined when no element exists that satisifies the cb function', () => {
      const array = [{ val: 5 }, { val: 3 }, { val: 6 }, { val: 5 }, { val: 2 }];

      expect(findLast(array, (el) => el.val === 4)).toBe(undefined);
    });
    it('returns the element that satisfies the callback if one exists', () => {
      const array = [{ val: 5 }, { val: 3 }, { val: 6 }, { val: 5 }, { val: 2 }];

      expect(findLast(array, (el) => el.val === 2)).toBe(array[4]);
      expect(findLast(array, (el) => el.val === 3)).toBe(array[1]);
    });
    it('returns the last element that satisfies the callback if there are multiple candidates', () => {
      const array = [{ val: 5 }, { val: 3 }, { val: 6 }, { val: 5 }, { val: 2 }];

      expect(findLast(array, (el) => el.val === 5)).toBe(array[3]);
    });
  });
});
