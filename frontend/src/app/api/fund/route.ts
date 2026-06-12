import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import contractAddresses from "../../../lib/contractAddresses.json";
import { ERC20_ABI, robinhoodChain } from "../../../lib/rosa";

const MOCK_USDC_ADDRESS = contractAddresses.mockUsdc as Address;

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address || !address.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Read private key from process.env (Next.js automatically loads .env in backend)
    const privateKey = process.env.DEPLOY_PK;
    if (!privateKey) {
      console.error("DEPLOY_PK is not defined in environment variables");
      return NextResponse.json({ error: "Faucet PK not configured on server" }, { status: 500 });
    }

    const formattedPK = privateKey.startsWith("0x") ? (privateKey as Address) : (`0x${privateKey}` as Address);
    const account = privateKeyToAccount(formattedPK);

    const publicClient = createPublicClient({
      chain: robinhoodChain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: robinhoodChain,
      transport: http(),
    });

    console.log(`Faucet funding request for ${address} from faucet ${account.address}`);

    // Send 0.005 ETH to the user for gas
    const ethTxHash = await walletClient.sendTransaction({
      to: address as Address,
      value: parseEther("0.005"),
    });
    console.log(`Sent ETH gas tx: ${ethTxHash}`);

    // Mint 1000 mUSDC (6 decimals = 1,000,000,000)
    const usdcTxHash = await walletClient.writeContract({
      address: MOCK_USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address as Address, BigInt(1000 * 10**6)],
    });
    console.log(`Minted mUSDC tx: ${usdcTxHash}`);

    // Wait for the transactions to be confirmed
    await publicClient.waitForTransactionReceipt({ hash: ethTxHash });
    await publicClient.waitForTransactionReceipt({ hash: usdcTxHash });

    return NextResponse.json({
      success: true,
      ethTxHash,
      usdcTxHash,
      message: "Successfully funded with 0.005 ETH and 1,000 mUSDC"
    });
  } catch (error: any) {
    console.error("Faucet error:", error);
    return NextResponse.json({ error: error.message || "Failed to fund address" }, { status: 500 });
  }
}
