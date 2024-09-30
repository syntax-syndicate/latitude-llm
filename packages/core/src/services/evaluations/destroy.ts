import { eq } from 'drizzle-orm'

import { Evaluation } from '../../browser'
import { Result, Transaction } from '../../lib'
import { ITransaction } from '../../lib/Transaction'
import { evaluations } from '../../schema'

export function destroyEvaluation(
  { evaluation }: { evaluation: Evaluation },
  db?: ITransaction,
) {
  return Transaction.call(async ({ db: tx }) => {
    const result = await tx
      .delete(evaluations)
      .where(eq(evaluations.id, evaluation.id))
      .returning()
    const deleted = result[0]

    return Result.ok(deleted)
  }, db)
}
