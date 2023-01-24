import ExecutionQueue from '../../../../src/shared-frontend-backend/helpers/execution-queue.js';

describe('Tests for the execution queue', () => {
  let queue;

  beforeEach(() => {
    queue = new ExecutionQueue();
  });

  it('allows enqueueing a function and executes it returning a promise that resolves when the function finishes', async () => {
    const operation = async () => {};

    await queue.enqueue(operation);
  });

  it('allows enqueueing multiple async functions that get executed in succession', async () => {
    const times1 = { start: null, end: null };
    const times2 = { start: null, end: null };
    const times3 = { start: null, end: null };

    const createOperation = (times) => {
      return async () => {
        times.start = Date.now();
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 1000);
        });
        times.end = Date.now();
      };
    };

    queue.enqueue(createOperation(times1));
    queue.enqueue(createOperation(times2));
    await queue.enqueue(createOperation(times3));

    expect(times1.end).toBeLessThanOrEqual(times2.start);
    expect(times2.end).toBeLessThanOrEqual(times3.start);
  });

  it('returns a promise that rejects when the function fails', async () => {
    const operation = async () => {
      throw new Error('Test Error');
    };

    await expect(queue.enqueue(operation)).rejects.toThrow('Test Error');
  });

  it('executes all operations even if one fails (throws an error)', async () => {
    const operation = async () => {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      return true;
    };

    const failOperation = async () => {
      throw new Error('Test Error');
    };

    const execution1 = queue.enqueue(operation);
    const execution2 = queue.enqueue(failOperation);
    const execution3 = queue.enqueue(operation);

    expect(await execution1).toBe(true);
    await expect(execution2).rejects.toThrow('Test Error');
    expect(await execution3).toBe(true);
  });
});
