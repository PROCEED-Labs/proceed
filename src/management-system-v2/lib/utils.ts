import { AuthenticatedUser, User } from './data/user-schema';

export function generateDateString(date?: Date | string, includeTime: boolean = false): string {
  if (!date) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: includeTime ? 'numeric' : undefined,
    minute: includeTime ? 'numeric' : undefined,
  };

  return new Date(date).toLocaleDateString('en-UK', options);
}
type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

/**
 * Allows to create a function that will only run its logic if it has not been called for a specified amount of time
 *
 * example use-case: you don't want to check some text entered by a user on every keystroke but only when the user has stopped entering new text
 *
 * found here: https://www.freecodecamp.org/news/javascript-debounce-example/
 *
 * @param func the function to call after the debounce timeout has elapsed
 * @param timeout the time that needs to elapse without a function call before the logic is executed
 * @returns the function to call for the debounced behaviour
 */
export function debounce(func: Function, timeout = 1000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), timeout);
  };

  /**
   * Immediatly execute the debounced function and cancel any pending executions
   */
  debounced.immediate = (...args: any[]) => {
    clearTimeout(timer);
    func(...args);
  };

  /**
   * Immediatly execute the debounced (async) function and cancel any pending executions
   *
   * Allows the function to be awaited
   */
  debounced.asyncImmediate = async (...args: any[]) => {
    clearTimeout(timer);
    await func(...args);
  };

  return debounced;
}

/**
 * Returns the canonical URL for a path including the spaceId for organization
 * spaces and without for personal spaces.
 *
 * @param space The space to use for the URL.
 * @param path The path to the resource.
 * @returns The canonical URL for the resource.
 */
export const spaceURL = (space: { spaceId: string; isOrganization: boolean }, path: string) => {
  return `${space.isOrganization ? '/' + space.spaceId : ''}${path}`;
};

type ObjectSetArrayType = Array<JSONObject> & {
  add(elements: JSONObject[] | JSONObject): void;
  toArray(): JSONObject[];
};

/**
 * Creates a Set-Array that only allows unique entries.
 *
 * The Set-Array is a wrapper around an array that only allows unique entries.
 * The uniqueness of an entry is determined by the values of the properties specified in the ids argument.
 *
 * Besides the standard array methods, the Set-Array provides the following methods:
 * - add(elements: JSONObject[] | JSONObject): JSONObject[] — Adds new elements to the end of the Set-Array. Duplicates will overwrite exisiting values.
 * - has(element: JSONObject): boolean — Checks if the Set-Array contains a specific element.
 * - toArray(): JSONObject[] — Returns a copy of the Set-Array.
 *
 * @throws Error when setting identical entries via indexing or when trying to fill the Set-Array with multiple identical elements.
 */
export class ObjectSetArray {
  #array: JSONObject[] = [];
  private ids: string[] = [];
  private idSets: Set<string> = new Set();

  /**
   * @param array - The array to turn into a Set-Array. It should contain objects.
   * @param ids - The properties that identify an object. If a single string is provided, the value of that property will be used to identify an object. If an array of strings is provided, the concatenated string of the values of those properties will be used to identify an object. If no ids are provided, all keys of the first object in the array will be used (therfore elements should be uniform).
   *
   * @example
   * const array = [{ name: 'Alice', age: 20 }, { name: 'Alice', age: 20 }, { name: 'Alice', age: 24 }, { name: 'Bob', age: 30 }];
   * const uniqueArray1 = new ObjectSetArray(array, ['name', 'age']);
   *
   * uniqueArray1.toArray(); // [{ name: 'Alice', age: 20 }, { name: 'Alice', age: 24 }, { name: 'Bob', age: 30 }]
   *
   * const uniqueArray2 = new ObjectSetArray(array, 'name');
   *
   * uniqueArray2.toArray(); // [{ name: 'Alice', age: 20 }, { name: 'Bob', age: 30 }] // First occurence of Alice is kept
   */
  constructor(array: JSONObject[], ids: string | string[] | undefined) {
    /* Check if the passes array is an array of objects */
    if (!Array.isArray(array) || array.some((item) => typeof item !== 'object')) {
      throw new Error(
        'The array passed to ObjectSetArray must be an array of objects. passed: ' + typeof array,
      );
    }
    /* Check if all ids exist on all elements of the array */
    if (ids) {
      const checkIds = Array.isArray(ids) ? ids : [ids];
      if (array.some((item) => !checkIds.every((id) => id in item))) {
        throw new Error(
          `Not all ids exist on all elements of the array. ids: ${checkIds.join(', ')}`,
        );
      }
    }
    this.setIds(ids);
    this.array = array;
    // @ts-ignore
    return new Proxy(this, this.getProxyHandler()) as any as ObjectSetArrayType;
  }

  private setIds(ids: string | string[] | undefined) {
    /* Determine what identifies an object */
    switch (typeof ids) {
      case 'string':
        this.ids = [ids];
        break;
      case 'undefined':
        /* All keys are ids */
        this.ids = this.#array[0] ? Object.keys(this.#array[0]) : [];
        break;
      case 'object':
        if (Array.isArray(ids)) {
          this.ids = ids;
          break;
        }
      default:
        throw new Error(
          `Invalid ids argument, expected string or string[] but got ${typeof ids} ${ids}`,
        );
    }
  }

  private set array(array: JSONObject[]) {
    /* Reset known keys */
    this.idSets = new Set();
    /* Create set-like structure of the array */
    this.#array = array.filter((item) => {
      /* The complete key is the concatenated string of the entries for the id properties */
      let entry = '';
      for (const id of this.ids) {
        entry += JSON.stringify(item[id]);
      }
      /* Check if that key(-combination) already exists */
      if (this.idSets.has(entry)) {
        return false;
      } else {
        this.idSets.add(entry);
        return true;
      }
    });
  }

  private get array() {
    return this.#array;
  }

  public toArray() {
    return structuredClone(this.#array);
  }

  private filterDuplicates(elements: JSONObject[] | JSONObject) {
    const newArray = Array.isArray(elements) ? elements : [elements];

    const duplicates: JSONObject[] = [],
      newElements: JSONObject[] = [];
    newArray.forEach((element) => {
      let entry = '';
      for (const id of this.ids) {
        entry += JSON.stringify(element[id]);
      }
      if (this.idSets.has(entry)) {
        duplicates.push(element);
      } else {
        newElements.push(element);
        this.idSets.add(entry);
      }
    });

    return { duplicates, newElements };
  }

  private overwriteEntrys(elements: JSONObject[] | JSONObject) {
    const array = Array.isArray(elements) ? elements : [elements];

    /* Find indicies of elements */
    const indicies = array.map((element) =>
      this.array.findIndex((entry) => {
        for (const id of this.ids) {
          if (entry[id] !== element[id]) {
            return false;
          }
        }
        return true;
      }),
    );

    const overwrittenElements: JSONObject[] = [];

    /* Overwrite elements */
    indicies.forEach((index, i) => {
      if (index !== -1) {
        overwrittenElements.push(this.array[index]);
        this.array[index] = array[i];
      }
    });

    return overwrittenElements;
  }

  /**
   * Checks if the Set-Array contains a specific element.
   *
   * @param element — The element to check for.
   *
   * @returns true if the element is in the Set-Array, false otherwise.
   */
  public has(element: JSONObject) {
    let entry = '';
    for (const id of this.ids) {
      entry += JSON.stringify(element[id]);
    }
    return this.idSets.has(entry);
  }

  /**
   * Adds new elements to the end of the Set-Array. Duplicates will overwrite exisiting values.
   *
   * @param elements — New elements to add to the array.
   *
   * @returns An array containing the (old) elements that were overwritten.
   */
  public add(elements: JSONObject[] | JSONObject) {
    /* Elements could either overwrite an exisiting entry or be appended to the array if they are new */
    const { duplicates: overwritingElements, newElements: appendingElements } =
      this.filterDuplicates(elements);

    /* Overwrite existing entries to maintain order */
    const oldEntrys = this.overwriteEntrys(overwritingElements);

    /* Append new elements */
    this.array = [...this.array, ...appendingElements];

    return oldEntrys;
  }
  /**
   * Appends new elements to the end of an array, and returns the new length of the array.
   * Duplicates will overwrite exisiting values.
   *
   * @param elements — New elements to add to the array.
   *
   * @returns The new length of the Set-Array.
   */
  public push(...elements: JSONObject[]): number {
    this.add(elements); /* This overwrites duplicates, and the rest will be appended */

    return this.array.length;
  }

  /**
   * Inserts new elements at the start of an array, and returns the new length of the array.
   * Duplicates will overwrite exisiting values.
   *
   * @param elements — New elements to add to the array.
   *
   * @returns The new length of the Set-Array.
   */
  public unshift(...elements: JSONObject[]): number {
    this.array = [...elements, ...this.array];

    return this.array.length;
  }

  /**
   * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
   *
   * @param start — The zero-based location in the array from which to start removing elements.
   * @param deleteCount — The number of elements to remove. If deleteCount is omitted, or if its value is greater than or equal to the number of elements after the position specified by start, then all the elements from start to the end of the array will be deleted. However, if you wish to pass any itemN parameter, you should pass Infinity.
   *
   * @params items — Elements to insert into the array in place of the deleted elements. If the passed elements are duplicates, they will overwrite the existing values at their old position (this means the number of elements inserted decreases for all duplicates). The number of firstly removed elements is not affected by this.
   *
   * @returns — An array containing the elements that were deleted.
   */
  public splice(start: number, deleteCount?: number, ...items: JSONObject[]): JSONObject[] {
    const firstHalf: JSONObject[] = [],
      secondHalf: JSONObject[] = [],
      deletedElements: JSONObject[] = [];

    /* Split the array into two parts */
    for (let i = 0; i < this.array.length; i++) {
      if (i < start) {
        firstHalf.push(this.array[i]);
      } else if (i >= start + (deleteCount || 0)) {
        secondHalf.push(this.array[i]);
      } else {
        deletedElements.push(this.array[i]);
      }
    }

    this.array = [...firstHalf, ...secondHalf];

    /* Get duplicates */
    const { duplicates, newElements } = this.filterDuplicates(items);

    this.array = [...firstHalf, ...newElements, ...secondHalf];
    this.add(duplicates);

    return deletedElements;
  }

  /**
   * Since filling an Set-Multiple with multiple identical elements is not possible, this method is not supported.
   */
  public fill(value: JSONObject, start?: number, end?: number): JSONObject[] {
    throw new Error(
      'Filling an ObjectSetArray with multiple identical elements is not possible. If you want to add multiple identical elements, convert the Set-Array to an array first by calling .toArray() on it.',
    );
  }

  *[Symbol.iterator]() {
    for (const element of this.array) {
      yield element;
    }
  }

  private getProxyHandler() {
    return {
      get: (target: ObjectSetArray, prop: string | symbol) => {
        if (prop in target) {
          return (target as any)[prop];
        }

        const array = target.array as any;
        if (prop in array) {
          const value = array[prop];

          if (typeof value === 'function') {
            return (...args: any[]) => {
              const result = value.apply(array, args);

              // If the result is an array, convert it to an ObjectSetArray
              if (Array.isArray(result)) {
                return new ObjectSetArray(result, target.ids) as any as ObjectSetArrayType;
              }

              return result;
            };
          }

          return value;
        }

        return undefined;
      },
      set: (target: ObjectSetArray, prop: string | symbol, value: any) => {
        /* Indexing */
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const index = Number(prop);
          /* Overwriting existing entry */
          if (index < target.array.length) {
            let entry = '';
            for (const id of target.ids) {
              entry += JSON.stringify(value[id]);
            }
            /* Entry already exists: */
            if (target.idSets.has(entry)) {
              throw new Error(
                'Duplicate entry not allowed, if you want to overwrite use the add method.',
              );
            }

            /* Entry does not exist yet */
            const oldEntry = target.array[index];
            target.array[index] = value;
            let oldEntryStr = '';
            for (const id of target.ids) {
              oldEntryStr += JSON.stringify(oldEntry[id]);
            }
            target.idSets.delete(oldEntryStr);
            target.idSets.add(entry);
            return true;
          }
        }
        if (prop in target) {
          (target as any)[prop] = value;
          return true;
        }
        const array = target.array as any;
        array[prop] = value;
        return true;
      },
    } as any as ObjectSetArrayType;
  }
}

export function getUniqueArray(array: JSONObject[], ids: string | string[] | undefined) {
  /* Helper function to get Array-Props on instance */
  return new ObjectSetArray(array, ids) as any as ObjectSetArrayType;
  /* 
  TODO:
  - Correct type on class itself rather than helper function
  - after using an array method that returns an array (returned array is wrapped in ObjectSetArray) - e.g. .map / .filter / ... - the proxy wraps it, so the return type should not be array but ObjectSetArray
  */
}

/** Returns a string representation for a user */
export function userRepresentation(
  member: Pick<AuthenticatedUser, 'firstName' | 'lastName' | 'username'>,
) {
  if (!!member.firstName && !!member.lastName) return `${member.firstName} ${member.lastName}`;

  if (!!member.firstName !== !!member.lastName) return member.firstName || member.lastName;

  return member.username || 'unknown';
}
