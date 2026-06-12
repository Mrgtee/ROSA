const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// Arbitrum Sepolia RPC and Chain ID
const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const chain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ARBITRUM_SEPOLIA_RPC] },
    public: { http: [ARBITRUM_SEPOLIA_RPC] },
  },
};

// Solidity Source for MockERC20
const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockERC20 {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        _mint(msg.sender, 1000000 * 10**6);
    }
    
    function transfer(address to, uint256 value) external returns (bool) {
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        if (from != msg.sender && allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= value;
        }
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
    
    // Public mint allows anyone to claim test USDC on-chain
    function mint(address to, uint256 value) external {
        _mint(to, value);
    }
    
    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}
`;

function compileContract() {
  console.log("Compiling MockERC20 Solidity contract...");
  const input = {
    language: 'Solidity',
    sources: {
      'MockERC20.sol': {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    let hasError = false;
    output.errors.forEach(err => {
      console.error(err.formattedMessage);
      if (err.severity === 'error') hasError = true;
    });
    if (hasError) throw new Error("Compilation failed");
  }

  const contract = output.contracts['MockERC20.sol']['MockERC20'];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

async function main() {
  // Read private key from root .env file
  const envContent = fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8');
  let privateKey = '';
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.trim().startsWith('DEPLOY_PK')) {
      const parts = line.split('=');
      if (parts.length > 1) {
        privateKey = parts.slice(1).join('=').trim().replace(/['"\s;]/g, '');
      }
    }
  }
  if (!privateKey) {
    throw new Error("Could not find DEPLOY_PK in .env");
  }
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  const { abi, bytecode } = compileContract();

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  console.log(`Deploying from account: ${account.address}`);
  console.log("Sending deployment transaction...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  console.log(`Deployment tx hash: ${hash}`);
  console.log("Waiting for transaction confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`MockERC20 successfully deployed at: ${contractAddress}`);

  // Save the address to a local file so the frontend can read it
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'frontend', 'src', 'lib', 'contractAddresses.json'),
    JSON.stringify({
      rosaPool: "0x315f644ca5d477dcbb17ced6de90fd8f9e593d0b",
      mockUsdc: contractAddress
    }, null, 2)
  );
  console.log("Updated contractAddresses.json");
}

main().catch(err => {
  console.error("Error during deployment:", err);
  process.exit(1);
});
