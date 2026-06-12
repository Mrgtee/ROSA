import { createKernelAccount } from "@zerodev/sdk";
import { KERNEL_V3_3 } from "@zerodev/sdk/constants";
import { 
  toWebAuthnKey, 
  toPasskeyValidator, 
  WebAuthnMode, 
  PasskeyValidatorContractVersion 
} from "@zerodev/passkey-validator";
import { http, createPublicClient } from "viem";

const ROBINHOOD_TESTNET_RPC = "https://rpc.testnet.chain.robinhood.com";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727E53fc824ae655664d5d39d22b27" as any;

export const publicClient = createPublicClient({
  chain: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [ROBINHOOD_TESTNET_RPC] },
      public: { http: [ROBINHOOD_TESTNET_RPC] },
    },
  },
  transport: http(),
});

export async function createPasskeyAccount(username: string, mode: "register" | "login") {
  if (typeof window === "undefined") return null;

  try {
    const webAuthnMode = mode === "register" ? WebAuthnMode.Register : WebAuthnMode.Login;

    const webAuthnKey = await toWebAuthnKey({
      passkeyName: username,
      passkeyServerUrl: "",
      mode: webAuthnMode,
    });

    const passkeyValidator = await toPasskeyValidator(publicClient, {
      webAuthnKey,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      kernelVersion: KERNEL_V3_3,
      validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
    });

    const account = await createKernelAccount(publicClient, {
      plugins: {
        sudo: passkeyValidator,
      },
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      kernelVersion: KERNEL_V3_3,
    });

    return account;
  } catch (error) {
    console.error("Failed to initialize Passkey Smart Account:", error);
    return null;
  }
}
