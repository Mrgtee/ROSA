import { createPublicClient, http, parseAbi, Address } from "viem";
import contractAddresses from "./contractAddresses.json";

export const ROSA_ABI = parseAbi([
  "function getCircleCount() external view returns (uint256)",
  "function createCircle(address token_address, uint256 contribution_amount, uint256 rotation_period) external returns (uint256)",
  "function joinCircle(uint256 circle_id) external",
  "function triggerRotation(uint256 circle_id) external",
  "function getCircleDetails(uint256 circle_id) external view returns (address, uint256, uint64, uint64, uint16, uint16, uint16, bool)",
  "function getMemberInfo(uint256 circle_id, address member) external view returns (bool, uint16, uint256, bool)",
  "function getMemberAddress(uint256 circle_id, uint16 index) external view returns (address)",
  "event CircleCreated(uint256 indexed circle_id, address indexed creator)"
]);

export const ERC20_ABI = parseAbi([
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "function mint(address to, uint256 value) external"
]);

export const ROSA_CONTRACT_ADDRESS = contractAddresses.rosaPool as Address;
export const MOCK_USDC_ADDRESS = contractAddresses.mockUsdc as Address;

const ROBINHOOD_TESTNET_RPC = "https://rpc.testnet.chain.robinhood.com";

export const robinhoodChain = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_TESTNET_RPC] },
    public: { http: [ROBINHOOD_TESTNET_RPC] },
  },
};

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

export interface OnChainMember {
  address: string;
  hasReceived: boolean;
  missed: number;
  yieldEarned: number;
  isCurrentUser: boolean;
}

export interface OnChainCircle {
  id: string;
  name: string;
  tokenAddress: string;
  tokenSymbol: string;
  contribution: number;
  period: string;
  round: number;
  totalPot: number;
  yieldEarned: number;
  members: OnChainMember[];
  activePayoutIndex: number;
  inviteCode: string;
  isActive: boolean;
}

// Fetch all circles and their details from the blockchain
export async function fetchOnChainCircles(userAddress: string): Promise<OnChainCircle[]> {
  try {
    const circleCountBig = await publicClient.readContract({
      address: ROSA_CONTRACT_ADDRESS,
      abi: ROSA_ABI,
      functionName: "getCircleCount",
    });

    const circleCount = Number(circleCountBig);
    const circles: OnChainCircle[] = [];

    // Loop through all circle IDs (1-indexed based on createCircle logic)
    for (let i = 1; i <= circleCount; i++) {
      try {
        const circleId = BigInt(i);
        const details = await publicClient.readContract({
          address: ROSA_CONTRACT_ADDRESS,
          abi: ROSA_ABI,
          functionName: "getCircleDetails",
          args: [circleId],
        });

        const [
          tokenAddress,
          contributionAmount,
          rotationPeriod,
          lastRotationTimestamp,
          currentRound,
          memberCount,
          activePayoutIndex,
          isActive
        ] = details;

        if (!isActive) continue;

        // Fetch members
        const members: OnChainMember[] = [];
        const count = Number(memberCount);

        for (let mIdx = 0; mIdx < count; mIdx++) {
          const mAddr = await publicClient.readContract({
            address: ROSA_CONTRACT_ADDRESS,
            abi: ROSA_ABI,
            functionName: "getMemberAddress",
            args: [circleId, mIdx],
          });

          const mInfo = await publicClient.readContract({
            address: ROSA_CONTRACT_ADDRESS,
            abi: ROSA_ABI,
            functionName: "getMemberInfo",
            args: [circleId, mAddr],
          });

          const [hasReceived, missed, yieldEarned, isMember] = mInfo;

          if (isMember) {
            members.push({
              address: mAddr,
              hasReceived,
              missed: Number(missed),
              yieldEarned: Number(yieldEarned) / 10**6, // assuming 6 decimals for yield token
              isCurrentUser: mAddr.toLowerCase() === userAddress.toLowerCase(),
            });
          }
        }

        // Determine invite code format: e.g. ROSA-1
        const inviteCode = `ROSA-${i}`;

        // Get token symbol (if mockUsdc, otherwise fetch symbol)
        let tokenSymbol = "USDC";
        if (tokenAddress.toLowerCase() !== MOCK_USDC_ADDRESS.toLowerCase()) {
          try {
            tokenSymbol = await publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol",
            });
          } catch (e) {
            tokenSymbol = "TOKEN";
          }
        } else {
          tokenSymbol = "mUSDC";
        }

        const periodSeconds = Number(rotationPeriod);
        let period = "Custom";
        if (periodSeconds === 60) period = "1 Min";
        else if (periodSeconds === 300) period = "5 Min";
        else if (periodSeconds === 3600) period = "Hourly";
        else if (periodSeconds === 86400) period = "Daily";
        else if (periodSeconds === 604800) period = "Weekly";
        else if (periodSeconds === 2592000) period = "Monthly";

        const contribution = Number(contributionAmount) / 10**6; // 6 decimals
        const totalPot = contribution * members.length;

        circles.push({
          id: i.toString(),
          name: `Circle #${i} (${tokenSymbol})`,
          tokenAddress,
          tokenSymbol,
          contribution,
          period,
          round: Number(currentRound),
          totalPot,
          yieldEarned: members.reduce((acc, m) => acc + m.yieldEarned, 0),
          members,
          activePayoutIndex: Number(activePayoutIndex),
          inviteCode,
          isActive,
        });
      } catch (circleErr) {
        console.error(`Error fetching details for circle ${i}:`, circleErr);
      }
    }

    return circles;
  } catch (error) {
    console.error("Failed to fetch on-chain circles:", error);
    return [];
  }
}
