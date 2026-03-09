import { GoalStatus, Prisma } from '@prisma/client';

export async function recomputeGoalStatus(
  tx: Prisma.TransactionClient,
  goalId: string,
  targetValue: Prisma.Decimal
): Promise<void> {
  const progress = await tx.progressEvent.aggregate({
    where: { goalId },
    _sum: { deltaValue: true },
  });

  const cumulative = progress._sum.deltaValue ?? new Prisma.Decimal(0);
  const status = cumulative.greaterThanOrEqualTo(targetValue) ? GoalStatus.completed : GoalStatus.active;

  await tx.goal.update({
    where: { id: goalId },
    data: { status },
  });
}
