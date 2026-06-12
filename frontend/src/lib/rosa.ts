import { createPublicClient, http, parseAbi, Address } from "viem";

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
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)"
]);

// Deployed contract addresses on Robinhood Chain Testnet (Chain ID 46630)
export const ROBINHOOD_POOL = "0x707fd662f3877be6ea408cebee3156ee7432efc2" as Address;
export const ROBINHOOD_USDG = "0x7E955252E15c84f5768B83c41a71F9eba181802F" as Address;

// Deployed contract addresses on Arbitrum Sepolia (Chain ID 421614)
export const SEPOLIA_POOL = "0x315f644ca5d477dcbb17ced6de90fd8f9e593d0b" as Address;
export const SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address;

export const robinhoodChain = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
    public: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
};

export const arbitrumSepolia = {
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
    public: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
  },
};

export function getNetworkConfig(chainId: number) {
  if (chainId === 46630) {
    return {
      chain: robinhoodChain,
      poolAddress: ROBINHOOD_POOL,
      tokenAddress: ROBINHOOD_USDG,
      tokenSymbol: "USDG",
      tokenName: "Paxos USDG",
      explorerUrl: "https://explorer.testnet.chain.robinhood.com",
      faucetUrl: "https://explorer.testnet.chain.robinhood.com"
    };
  } else {
    return {
      chain: arbitrumSepolia,
      poolAddress: SEPOLIA_POOL,
      tokenAddress: SEPOLIA_USDC,
      tokenSymbol: "USDC",
      tokenName: "Circle USDC",
      explorerUrl: "https://sepolia.arbiscan.io",
      faucetUrl: "https://faucet.circle.com"
    };
  }
}

export function getPublicClient(chainId: number) {
  const config = getNetworkConfig(chainId);
  return createPublicClient({
    chain: config.chain,
    transport: http(),
  });
}

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

// Fetch all circles and their details from the blockchain dynamically based on Chain ID
export async function fetchOnChainCircles(chainId: number, userAddress: string): Promise<OnChainCircle[]> {
  try {
    const config = getNetworkConfig(chainId);
    const client = getPublicClient(chainId);

    const circleCountBig = await client.readContract({
      address: config.poolAddress,
      abi: ROSA_ABI,
      functionName: "getCircleCount",
    });

    const circleCount = Number(circleCountBig);
    const circles: OnChainCircle[] = [];

    for (let i = 1; i <= circleCount; i++) {
      try {
        const circleId = BigInt(i);
        const details = await client.readContract({
          address: config.poolAddress,
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
          const mAddr = await client.readContract({
            address: config.poolAddress,
            abi: ROSA_ABI,
            functionName: "getMemberAddress",
            args: [circleId, mIdx],
          });

          const mInfo = await client.readContract({
            address: config.poolAddress,
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
              yieldEarned: Number(yieldEarned) / 10**6, // assuming 6 decimals
              isCurrentUser: mAddr.toLowerCase() === userAddress.toLowerCase(),
            });
          }
        }

        let inviteCode = `ROSA-${i}`;
        if (typeof window !== "undefined") {
          try {
            const inviteCodeMap = JSON.parse(localStorage.getItem("rosa_circle_invite_codes") || "{}");
            const savedPrefix = inviteCodeMap[`${chainId}_${i}`];
            if (savedPrefix) {
              inviteCode = `${savedPrefix}-${i}`;
            }
          } catch (e) {
            console.error("Error loading invite code prefix:", e);
          }
        }

        // Get token symbol
        let tokenSymbol = config.tokenSymbol;
        if (tokenAddress.toLowerCase() !== config.tokenAddress.toLowerCase()) {
          try {
            tokenSymbol = await client.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol",
            });
          } catch (e) {
            tokenSymbol = "TOKEN";
          }
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
