import { config } from "dotenv";

// Load .env variables
config({ quiet: true });

export const RPC_URL = process.env.RPC_URL!;
export const PRIVATE_KEY = process.env.PRIVATE_KEY!;
export const LBTC_USD_PRICE_ORACLE = process.env.LBTC_USD_PRICE_ORACLE!;
export const LBTC_TOKEN_CONTRACT_ADDRESS = process.env.LBTC_TOKEN_CONTRACT_ADDRESS!;
export const VAULT_CONTRACT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS!;

if (!RPC_URL) {
  throw new Error("Missing required environment variables: RPC_URL");
}

if (!PRIVATE_KEY) {
  throw new Error("Missing required environment variables: PRIVATE_KEY");
}

if (!LBTC_USD_PRICE_ORACLE) {
  throw new Error("Missing required environment variables: LBTC_USD_PRICE_ORACLE");
}

if (!LBTC_TOKEN_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables: LBTC_TOKEN_CONTRACT_ADDRESS");
}

if (!VAULT_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables: VAULT_CONTRACT_ADDRESS");
}
