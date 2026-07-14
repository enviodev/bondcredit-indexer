import { describe, it, expect } from "vitest";
import { createTestIndexer, type MamoUser } from "envio";
import { TestHelpers } from "envio";
const { Addresses } = TestHelpers;

describe("USDC Transfer -> DailyFlow", () => {
  it("counts a transfer to a known MamoUser as a deposit", async () => {
    const indexer = createTestIndexer();

    const userAddress = Addresses.mockAddresses[0]!;
    const externalAddress = Addresses.mockAddresses[1]!;

    const user: MamoUser = {
      id: userAddress,
      createdAt: 0n,
      createdAtBlock: 0n,
    };
    indexer.MamoUser.set(user);

    // Block timestamp 86_400 -> day = 1
    await indexer.process({
      chains: {
        8453: {
          simulate: [
            {
              contract: "USDC",
              event: "Transfer",
              block: { timestamp: 86_400 },
              params: {
                from: externalAddress,
                to: userAddress,
                value: 1_000_000n, // 1.0 USDC (6 decimals)
              },
            },
          ],
        },
      },
    });

    const flow = await indexer.DailyFlow.getOrThrow("1");
    expect(flow.deposits.toString()).toBe("1");
    expect(flow.withdrawals.toString()).toBe("0");
    expect(flow.netFlow.toString()).toBe("1");
  });
});
