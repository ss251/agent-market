import { networkFrom } from "@stacks/network";

export const network = networkFrom("testnet");

export const DEPLOYER = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
export const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4";
export const SBTC_TOKEN = "sbtc-token";
