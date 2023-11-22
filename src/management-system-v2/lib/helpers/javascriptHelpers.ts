export async function asyncMap<Type>(
  array: Array<Type>,
  cb: (entry: Type, index: Number) => Promise<any>,
) {
  const mappingCallbacks = array.map(async (entry, index) => await cb(entry, index));

  const mappedValues = await Promise.all(mappingCallbacks);

  return mappedValues;
}

export async function asyncForEach<Type>(
  array: Array<Type>,
  cb: (entry: Type, index: Number) => Promise<void>,
) {
  await asyncMap(array, cb);
}

export async function asyncFilter<Type>(array: Array<Type>, cb: (entry: Type) => Promise<boolean>) {
  // map the elements to their value or undefined and then filter undefined entries
  return (
    await asyncMap(array, async (entry) => {
      const keep = await cb(entry);
      return keep ? entry : undefined;
    })
  ).filter((entry) => entry);
}
