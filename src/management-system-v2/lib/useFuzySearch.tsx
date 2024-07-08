import Fuse, { FuseResult } from 'fuse.js';
import { useMemo, useState, JSX } from 'react';
import { Prettify, UnionAwareOmit } from './typescript-utils';
import { useSearchParamState } from './use-search-param-state';

export type ReplaceKeysWithHighlighted<
  TData extends Record<string, any>,
  TKeys extends keyof TData,
> = Prettify<UnionAwareOmit<TData, TKeys> & Record<TKeys, ReturnType<typeof highlightText<TData>>>>;

function highlightText<TObj>(
  fuseElement: FuseResult<TObj>,
  dataIndexElement: keyof TObj,
  color: string = '#3e93de',
) {
  let value;
  if (typeof fuseElement.item[dataIndexElement] === 'string')
    value = (fuseElement.item[dataIndexElement] as string) || '';
  else {
    // if it is a ConfigField
    if ('content' in (fuseElement.item[dataIndexElement] as object))
      value =
        (fuseElement.item[dataIndexElement] as { content: [{ value: string }] }).content[0].value ||
        '';
  }
  const matches = fuseElement.matches?.find((match) => match.key === dataIndexElement);

  if (!matches || !value) return { highlighted: <span>{value}</span>, value };

  const result: JSX.Element[] = [];
  let lastIndex = 0;
  const sortedMatches = matches.indices.toSorted((a, b) => a[0] - b[0]);

  for (let [start, end] of sortedMatches) {
    if (end <= lastIndex) continue;
    if (start < lastIndex) start = lastIndex;

    if (lastIndex < start) {
      result.push(<span key={lastIndex}>{value.slice(lastIndex, start)}</span>);
    }

    result.push(
      <span key={start} style={{ color }}>
        {value.slice(start, end + 1)}
      </span>,
    );
    lastIndex = end + 1;
  }
  if (lastIndex !== value.length)
    result.push(<span key={lastIndex}>{value.slice(lastIndex)}</span>);

  return { highlighted: <span>{result}</span>, value };
}

type UseFuzySearchOptions<TData, TKeys, THighlightKeys, TTransformFunc> = {
  data: TData[];
  /** Keys on which the search should be performed on */
  keys: TKeys[] | readonly TKeys[];
  /** Highlight keys in hook's output */
  highlightedKeys?: THighlightKeys[] | readonly THighlightKeys[];
  /** Color of the highlighted letters, the default color is #3e93de*/
  highlightColor?: string;
  /** Transfrom the hook's output (result is memoized) */
  transformData?: TTransformFunc;
  /** If specified, the search query will be stored as a search param with the given name */
  queryName?: string;
  fuseOptions?: ConstructorParameters<typeof Fuse<TData>>[1];
};

export default function useFuzySearch<
  TData extends Record<string, any>,
  TKeys extends keyof TData,
  THighlightKeys extends TKeys,
  TTransformFunc extends (
    items: FuseResult<ReplaceKeysWithHighlighted<TData, THighlightKeys>>[],
  ) => any = (
    items: FuseResult<ReplaceKeysWithHighlighted<TData, THighlightKeys>>[],
  ) => FuseResult<ReplaceKeysWithHighlighted<TData, THighlightKeys>>[],
>({
  data,
  keys,
  fuseOptions,
  queryName,
  highlightedKeys,
  highlightColor = '#3e93de',
  transformData,
}: UseFuzySearchOptions<TData, TKeys, THighlightKeys, TTransformFunc>) {
  const searchParams = useSearchParamState(queryName ?? '');
  const state = useState('');

  const [searchQuery, setSearchQuery] = queryName ? searchParams : state;

  const fuse = useMemo(
    () =>
      new Fuse(data, {
        findAllMatches: true,
        threshold: 0.75,
        useExtendedSearch: true,
        ignoreLocation: true,
        includeMatches: !!highlightedKeys,
        keys: keys as string[],
        ...fuseOptions,
      }),
    [data, keys, fuseOptions, highlightedKeys],
  );

  const filteredData: ReturnType<TTransformFunc> = useMemo(() => {
    let results;

    if (!searchQuery)
      results = data.map((val, idx) => ({
        item: Object.assign(val, {}),
        matches: [],
        score: 1,
        refIndex: idx,
      }));
    else results = fuse.search(searchQuery);

    // @ts-ignore
    const highlightedResults = results.map((result) => {
      if (highlightedKeys) {
        // shallow copy of item, to avoid overwrithing data input
        result.item = { ...result.item };

        for (const highlightKey of highlightedKeys) {
          // @ts-ignore
          result.item[highlightKey] = highlightText(result, highlightKey, highlightColor);
        }
      }

      return result;
    }) as FuseResult<ReplaceKeysWithHighlighted<TData, THighlightKeys>>[];

    if (transformData) return transformData(highlightedResults);
    else return highlightedResults;
  }, [data, fuse, searchQuery, transformData, highlightColor, highlightedKeys]);

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
  };
}
