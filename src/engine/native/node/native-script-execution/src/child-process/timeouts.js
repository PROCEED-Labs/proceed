// @ts-check

// It could be possible to implement this a bit easier, by creating a reference of the callback
// function (inside the isolate) and passing it to the main node program, however that would require
// us to expose ivm in the isolate, and I'm not so sure how safe that is.

// TODO: consider what to do with errors thrown inside the callback (cb) functions

/**
 * @param {{
 *  context: import('isolated-vm').Context
 *  callToExecutor: (endpoint: string, body: any) => Promise<any>
 *  processId: string,
 *  processInstanceId: string,
 *  tokenId: string
 * }} data
 * */
module.exports = function setupTimeouts({ context }) {
  // Timeouts

  context.evalSync(`
    let _timeout_counter = 0;
    const _active_timeouts = new Set();
  `);

  context.evalClosureSync(
    async function _timeoutExecutor(cb, ms, timeoutId) {
      await waitAsync(ms);

      if (!_active_timeouts.has(timeoutId)) return;

      try {
        cb();
      } catch (e) {}

      _active_timeouts.delete(timeoutId);
    }.toString() + `globalThis["_timeoutExecutor"] = _timeoutExecutor;`,
  );

  context.evalClosureSync(
    function setTimeout(cb, ms) {
      const timeoutId = _timeout_counter++;
      _active_timeouts.add(timeoutId);
      _timeoutExecutor(cb, ms, timeoutId);
      return timeoutId;
    }.toString() + `globalThis["setTimeout"] = setTimeout;`,
  );

  context.evalClosureSync(
    function clearTimeout(timeoutId) {
      return _active_timeouts.delete(timeoutId);
    }.toString() + `globalThis["clearTimeout"] = clearTimeout;`,
  );

  // Intervals

  context.evalSync(`
    let _interval_counter = 0;
    const _active_intervals = new Set();
  `);

  context.evalClosureSync(
    async function _intervalExecutor(cb, ms, intervalId) {
      while (true) {
        await waitAsync(ms);

        if (!_active_intervals.has(intervalId)) return;

        try {
          await cb();
        } catch (e) {}
      }
    }.toString() + 'globalThis["_intervalExecutor"]=_intervalExecutor;',
  );

  context.evalClosureSync(
    function setInterval(cb, ms) {
      const intervalId = _interval_counter++;
      _active_intervals.add(intervalId);
      _intervalExecutor(cb, ms, intervalId);
      return intervalId;
    }.toString() + 'globalThis["setInterval"]=setInterval;',
  );

  context.evalClosureSync(
    function clearInterval(intervalId) {
      return _active_intervals.delete(intervalId);
    }.toString() + 'globalThis["clearInterval"]=clearInterval;',
  );
};
