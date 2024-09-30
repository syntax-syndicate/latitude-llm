import { Membership, User } from '../../browser'
import { Result, Transaction } from '../../lib'
import { ITransaction } from '../../lib/Transaction'
import { updateMembership } from '../memberships'
import { updateUser } from '../users'

export function acceptInvitation(
  {
    user,
    membership,
  }: {
    membership: Membership
    user: User
  },
  db: ITransaction,
) {
  return Transaction.call(async ({ db: tx }) => {
    const date = new Date()
    if (!user.confirmedAt) {
      await updateUser(user, { confirmedAt: date }).then((r) => r.unwrap())
    }

    const m = await updateMembership(
      membership,
      {
        confirmedAt: date,
      },
      tx,
    ).then((r) => r.unwrap())

    return Result.ok(m)
  }, db)
}
