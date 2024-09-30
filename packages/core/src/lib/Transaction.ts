import { env } from '@latitude-data/env'
import { DatabaseError } from 'pg'

import { database, Database } from '../client'
import * as schema from '../schema'
import { ConflictError, UnprocessableEntityError } from './errors'
import { ErrorResult, Result, TypedResult } from './Result'

export type DBSchema = typeof schema
export type PromisedResult<F, E extends Error = Error> = Promise<
  TypedResult<F, E>
>

export type ITransaction = {
  db: Database
  depth: number
  sideEffects: Array<() => void>
}

const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  INPUT_SYTAXT_ERROR: '22P02',
  TRANSACTION_ABORTED: '25P02',
}

export default class Transaction {
  public static async call<ResultType>(
    callback: (trx: ITransaction) => PromisedResult<ResultType>,
    transactionInstance: ITransaction = {
      db: database,
      depth: 1,
      sideEffects: [],
    },
  ): PromisedResult<ResultType> {
    return new Transaction().call(callback, transactionInstance)
  }

  public async call<ResultType>(
    callback: ({
      db,
      depth,
      sideEffects,
    }: {
      db: Database
      depth: number
      sideEffects: Array<() => void>
    }) => PromisedResult<ResultType>,
    { db, depth = 1, sideEffects = [] }: ITransaction = {
      db: database,
      sideEffects: [],
      depth: 1,
    },
  ): PromisedResult<ResultType> {
    try {
      let result: TypedResult<ResultType, Error>
      await db.transaction(
        async (trx) =>
          (result = await callback({ db: trx, depth, sideEffects })),
      )
      depth -= 1
      if (depth === 0) {
        sideEffects.forEach(
          (sideEffect: (result: TypedResult<ResultType, Error>) => void) =>
            sideEffect(result),
        )
      }

      return result!
    } catch (error) {
      return Transaction.toResultError(error)
    }
  }

  /**
   * Refer to the errors list at
   * https://github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/postgresql_adapter.rb#L769.
   */
  static toResultError(error: unknown): ErrorResult<Error> {
    if (env.NODE_ENV !== 'production') {
      console.error(error)
    }

    const code = (error as DatabaseError)?.code
    switch (code) {
      case DB_ERROR_CODES.UNIQUE_VIOLATION:
        return Result.error(new ConflictError((error as DatabaseError).message))
      case DB_ERROR_CODES.INPUT_SYTAXT_ERROR:
        return Result.error(new UnprocessableEntityError('Invalid input', {}))
      default:
        return Result.error(error as Error)
    }
  }
}
