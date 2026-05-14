import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!apiKey || !entitySecret) {
    console.error(
      "Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in backend/.env first.\n" +
        "Entity secret: generate in Circle docs flow, then register in Developer Console."
    );
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  const res = await client.createWalletSet({ name: "Stable Post (test)" });
  const id = (res.data?.walletSet as { id?: string } | undefined)?.id;

  if (!id) {
    console.error("Unexpected response:", JSON.stringify(res.data, null, 2));
    process.exit(1);
  }

  console.log("Add this line to backend/.env:\n");
  console.log(`CIRCLE_WALLET_SET_ID=${id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
