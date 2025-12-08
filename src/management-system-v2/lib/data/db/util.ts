import db from '@/lib/data/db';
import { Err, err } from 'neverthrow';

export function ensureTransactionWrapper<Ret extends Err<never, any> | unknown, Args extends any[]>(
  fn: (...args: Args) => Promise<Ret>,
  transactionIdx: number,
): (...args: Args) => Promise<Ret> {
  const wrappedFn = async (...args: any[]) => {
    const tx = args[transactionIdx];

    if (!tx) {
      try {
        return await db.$transaction(async (trx) => {
          args[transactionIdx] = trx;
          const functionResult = await fn(...(args as Args));
          // The error has to be thrown in order to cancel the transaction
          if (functionResult instanceof Err && functionResult.isErr()) throw functionResult.error;

          return functionResult;
        });
      } catch (e) {
        return err(e);
      }
    } else {
      return (await fn(...(args as Args))) as Ret;
    }
  };

  return wrappedFn as (...args: Args) => Promise<Ret>;
}
