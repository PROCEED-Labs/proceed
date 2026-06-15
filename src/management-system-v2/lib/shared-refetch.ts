/**
 * Creates a function that executes a given refetch function only once in a given timeout for all
 * users of the application even if multiple users try to trigger the returned function
 **/
export function getSharedRefetch({
  resource,
  getTimeoutLength,
  refetchFn,
}: {
  resource: string;
  // should return the time (in milliseconds) that has to elapse between two activations of the
  // refetchFn
  // a value of 0 means that the refetchFn is disabled and will not run until a different timeout is
  // returned
  getTimeoutLength: () => Promise<number>;
  refetchFn: () => {};
}) {
  // all connected users are sharing this information
  const global = globalThis as any;
  // init the global variables when called the first time across all users

  // flag that indicates if an update triggered by another user is currently running
  if (global[`isRefetching${resource}`] === undefined) global[`isRefetching${resource}`] = false;
  if (global[`refetchPromiseFor${resource}`] === undefined) {
    global[`refetchPromiseFor${resource}`] = Promise.resolve();
  }
  // value that indicates the time the last update finished to ensure that we have the configured timeout
  // between updates
  if (global[`lastRefetchTimeFor${resource}`] === undefined) {
    global[`lastRefetchTimeFor${resource}`] = 0;
  }

  return async () => {
    const interval = await getTimeoutLength();
    if (
      // if the interval variable is set to 0 we consider this to mean that fetching is deactivated
      interval &&
      Date.now() - global[`lastRefetchTimeFor${resource}`] >= interval &&
      // allow only one refetch for all users in the configured interval
      !global[`isRefetching${resource}`]
    ) {
      // prevent other users from triggering concurrent refetching
      global[`isRefetching${resource}`] = true;
      // allow other users to wait for the result of the refetch function if they try to run it before
      // while this one is running or before the timeout has elapsed
      global[`refetchPromiseFor${resource}`] = refetchFn();
      await global[`refetchPromiseFor${resource}`];
      // allow the next update to happen after the configured interval has elapsed
      global[`isRefetching${resource}`] = false;
      global[`lastRefetchTimeFor${resource}`] = Date.now();
    }

    // allows the calling function to wait until the already running refetch cycle is finished
    return global[`refetchPromiseFor${resource}`];
  };
}
