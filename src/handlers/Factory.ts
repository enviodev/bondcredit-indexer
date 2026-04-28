import { indexer } from "generated";

// StrategyCreated emits (user EOA, deployed strategy account). USDC flows
// in and out of the strategy account, so we key MamoUser by the strategy
// address — the original subgraph captured this via call traces against the
// factory.
indexer.onEvent(
  { contract: "Factory", event: "StrategyCreated" },
  async ({ event, context }) => {
    const id = event.params.strategy.toString();
    const existing = await context.MamoUser.get(id);
    if (existing) return;

    context.MamoUser.set({
      id,
      createdAt: BigInt(event.block.timestamp),
      createdAtBlock: BigInt(event.block.number),
    });
  },
);
