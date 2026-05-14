import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

function upsertEnvVar(envPath: string, key: string, value: string) {
  let content = fs.readFileSync(envPath, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*\\r?\\n?`, "m");
  if (re.test(content)) {
    content = content.replace(re, `${line}\n`);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  fs.writeFileSync(envPath, content, "utf8");
}

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    console.error("Add CIRCLE_API_KEY to backend/.env");
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("backend/.env not found");
    process.exit(1);
  }

  let entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();

  if (!entitySecret) {
    entitySecret = randomBytes(32).toString("hex");
    const recoveryDir = path.join(process.cwd(), "circle-recovery");
    fs.mkdirSync(recoveryDir, { recursive: true });

    console.log("Registering entity secret with Circle (first-time setup)...");
    try {
      await registerEntitySecretCiphertext({
        apiKey,
        entitySecret,
        recoveryFileDownloadPath: recoveryDir,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already|registered|duplicate/i.test(msg)) {
        console.error(
          "Circle may already have an entity secret for this API key.\n" +
            "Paste your entity secret from Circle Developer Console into CIRCLE_ENTITY_SECRET in backend/.env, then run:\n" +
            "  npm run circle:create-wallet-set"
        );
      }
      throw e;
    }

    upsertEnvVar(envPath, "CIRCLE_ENTITY_SECRET", entitySecret);
    console.log(
      "Updated backend/.env with CIRCLE_ENTITY_SECRET. Recovery files may be in circle-recovery/."
    );
    process.env.CIRCLE_ENTITY_SECRET = entitySecret;
  }

  let walletSetId = process.env.CIRCLE_WALLET_SET_ID?.trim();
  if (!walletSetId) {
    const secretForClient =
      entitySecret ?? process.env.CIRCLE_ENTITY_SECRET?.trim();
    if (!secretForClient) {
      console.error("Missing entity secret after bootstrap step.");
      process.exit(1);
    }

    console.log("Creating wallet set...");
    const client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret: secretForClient,
    });

    const res = await client.createWalletSet({ name: "Stable Post (bootstrap)" });
    const id = (res.data?.walletSet as { id?: string } | undefined)?.id;
    if (!id) {
      console.error("Unexpected response:", JSON.stringify(res.data, null, 2));
      process.exit(1);
    }
    walletSetId = id;
    upsertEnvVar(envPath, "CIRCLE_WALLET_SET_ID", walletSetId);
    console.log("Updated backend/.env with CIRCLE_WALLET_SET_ID.");
  }

  console.log("Circle bootstrap finished. Restart the API (npm run dev).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
