import { workerData } from 'worker_threads';

// WorkerData is provided when the worker is constructed. We expect an object
// with an `onnxLock` SharedArrayBuffer so that all workers can coordinate
// access to the ONNX runtime. If absent, locking is skipped.
const sharedBuffer: SharedArrayBuffer | undefined =
  workerData && workerData.onnxLock instanceof SharedArrayBuffer
    ? (workerData.onnxLock as SharedArrayBuffer)
    : undefined;

const lockView = sharedBuffer ? new Int32Array(sharedBuffer) : null;

function acquire(): void {
  if (!lockView) return;

  while (true) {
    const prev = Atomics.compareExchange(lockView, 0, 0, 1);
    if (prev === 0) {
      return; // we acquired the lock
    }

    Atomics.wait(lockView, 0, 1);
  }
}

function release(): void {
  if (!lockView) return;
  Atomics.store(lockView, 0, 0);
  Atomics.notify(lockView, 0, 1);
}

export async function withOnnxLock<T>(operation: () => Promise<T>): Promise<T> {
  acquire();
  try {
    return await operation();
  } finally {
    release();
  }
}

export function withOnnxLockSync<T>(operation: () => T): T {
  acquire();
  try {
    return operation();
  } finally {
    release();
  }
}
