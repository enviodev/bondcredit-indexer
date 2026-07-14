import { indexer, BigDecimal, type DailyFlow } from "envio";

const SECONDS_PER_DAY = 86_400;
// USDC on Base has 6 decimals.
const USDC_DECIMALS = new BigDecimal(10).pow(6);

const ZERO_BD = new BigDecimal(0);

const dayFromTimestamp = (timestamp: number): number =>
  Math.floor(timestamp / SECONDS_PER_DAY);

const loadOrCreateDailyFlow = async (
  context: Parameters<Parameters<typeof indexer.onEvent>[1]>[0]["context"],
  day: number,
): Promise<DailyFlow> => {
  const id = day.toString();
  const existing = await context.DailyFlow.get(id);
  if (existing) return existing;
  return {
    id,
    day,
    deposits: ZERO_BD,
    withdrawals: ZERO_BD,
    netFlow: ZERO_BD,
  };
};

indexer.onEvent(
  { contract: "USDC", event: "Transfer" },
  async ({ event, context }) => {
    const fromUser = await context.MamoUser.get(event.params.from.toString());
    const toUser = await context.MamoUser.get(event.params.to.toString());

    // Only count flows that involve a known MamoUser.
    if (!fromUser && !toUser) return;

    const day = dayFromTimestamp(event.block.timestamp);
    const amount = new BigDecimal(event.params.value.toString()).div(
      USDC_DECIMALS,
    );

    const flow = await loadOrCreateDailyFlow(context, day);

    // Transfer TO a MamoUser is a deposit; transfer FROM a MamoUser is a
    // withdrawal. A user-to-user transfer counts as both.
    let deposits = flow.deposits;
    let withdrawals = flow.withdrawals;
    if (toUser) deposits = deposits.plus(amount);
    if (fromUser) withdrawals = withdrawals.plus(amount);

    context.DailyFlow.set({
      ...flow,
      deposits,
      withdrawals,
      netFlow: deposits.minus(withdrawals),
    });
  },
);
