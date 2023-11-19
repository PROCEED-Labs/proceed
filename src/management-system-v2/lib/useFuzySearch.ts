import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import useDebounce from './useDebounce';

type FuzzySearchOptions = { useSearchParams: true; queryName: string } | { useSearchParams: false };

/**
 * Handles state and search logic for fuzzy search.
 *
 * @warning useSearchParams: true makes the page flicker
 *
 */
export default function useFuzySearch<TData extends Record<string, any>>(
  data: TData[],
  keys: (keyof TData)[],
  fuzzySearchOptions: FuzzySearchOptions,
  fuseOptions: ConstructorParameters<typeof Fuse<TData>>[1] = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get(fuzzySearchOptions.useSearchParams ? fuzzySearchOptions.queryName : '') ?? '',
  );
  const debouncedSearchQuery = useDebounce(searchQuery, 200, fuzzySearchOptions.useSearchParams);

  useEffect(() => {
    if (!fuzzySearchOptions.useSearchParams) return;

    const params = new URLSearchParams(searchParams);
    params.set(fuzzySearchOptions.queryName, debouncedSearchQuery ?? '');

    router.replace(pathname + '?' + params.toString(), { scroll: false });
  }, [debouncedSearchQuery, router, fuzzySearchOptions, pathname, searchParams]);

  const fuse = useMemo(
    () =>
      new Fuse(data, {
        findAllMatches: true,
        threshold: 0.75,
        useExtendedSearch: true,
        ignoreLocation: true,
        keys: keys as string[],
        ...fuseOptions,
      }),
    [data, keys, fuseOptions],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [fuse, searchQuery, data]);

  return { searchQuery, setSearchQuery, filteredData };
}
