export async function asyncMap(array: Array<any>, cb: (entry: any, index: Number) => Promise<any>) {
  const mappingCallbacks = array.map(async (entry, index) => await cb(entry, index));

  const mappedValues = await Promise.all(mappingCallbacks);

  return mappedValues;
}

export async function asyncForEach(
  array: Array<any>,
  cb: (entry: any, index: Number) => Promise<any>,
) {
  await asyncMap(array, cb);
}

export async function asyncFilter(array: Array<any>, cb: (entry: any) => Promise<any>) {
  // map the elements to their value or undefined and then filter undefined entries
  return (
    await asyncMap(array, async (entry) => {
      const keep = await cb(entry);
      return keep ? entry : undefined;
    })
  ).filter((entry) => entry);
}
