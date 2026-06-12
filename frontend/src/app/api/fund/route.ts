import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getNetworkConfig } from "../../../lib/rosa";

export async function POST(request: Request) {
  try {
    const { address, chainId } = await request.json();
    if (!address || !address.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Default to Robinhood Chain Testnet (46630) if not specified
    const selectedChainId = chainId ? Number(chainId) : 46630;
    const network = getNetworkConfig(selectedChainId);

    // Read private key from process.env (Next.js automatically loads .env in backend)
    const privateKey = process.env.DEPLOY_PK;
    if (!privateKey) {
      console.error("DEPLOY_PK is not defined in environment variables");
      return NextResponse.json({ error: "Faucet PK not configured on server" }, { status: 500 });
    }

    const formattedPK = privateKey.startsWith("0x") ? (privateKey as Address) : (`0x${privateKey}` as Address);
    const account = privateKeyToAccount(formattedPK);

    const publicClient = createPublicClient({
      chain: network.chain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: network.chain,
      transport: http(),
    });

    console.log(`Faucet funding request for ${address} on ${network.chain.name} from faucet ${account.address}`);

    // Determine funding amount based on chain ID
    // Robinhood Chain gas is cheap but we send 0.001 ETH. Sepolia gas we send 0.0002 ETH.
    const fundAmount = selectedChainId === 46630 ? "0.001" : "0.0002";

    // Send native gas ETH to the user for transactions
    const ethTxHash = await walletClient.sendTransaction({
      to: address as Address,
      value: parseEther(fundAmount),
    });
    console.log(`Sent gas ETH tx: ${ethTxHash}`);

    // Wait for the transaction to be confirmed
    await publicClient.waitForTransactionReceipt({ hash: ethTxHash });

    return NextResponse.json({
      success: true,
      ethTxHash,
      message: `Successfully funded with ${fundAmount} ETH gas on ${network.chain.name}`
    });
  } catch (error: any) {
    console.error("Faucet error:", error);
    return NextResponse.json({ error: error.message || "Failed to fund address" }, { status: 500 });
  }
}
