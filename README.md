# @abiregistry/sdk

Official TypeScript/JavaScript SDK for ABI Registry - Push and pull smart contract ABIs seamlessly with automatic TypeScript generation, version tracking, and multi-instance support.

## Installation

```bash
npm install @abiregistry/sdk
# or
yarn add @abiregistry/sdk
# or
pnpm add @abiregistry/sdk
```

## Quick Start

### CLI Usage (Recommended)

```bash
# Option 1: Use .env file (recommended)
echo "ABI_REGISTRY_API_KEY=your-api-key" > .env

# Option 2: Export environment variable
export ABI_REGISTRY_API_KEY="your-api-key"

# Initialize config file
npx abiregistry init

# Fetch ABI from Etherscan (NO API key needed for fetch)
npx abiregistry fetch --chain 1 --address 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --name USDC

# Fetch proxy contract (automatically gets implementation ABI)
npx abiregistry fetch --chain 1 --address 0xProxyAddress... --name MyToken --proxy

# Or add contracts to abiregistry.config.json and run
npx abiregistry fetch

# Setup Foundry integration (first time only)
npx abiregistry foundry init

# Push Foundry deployments to registry
npx abiregistry foundry

# Pull ABIs and generate TypeScript files
npx abiregistry pull
```

### Programmatic Usage

```typescript
import { AbiRegistry } from '@abiregistry/sdk'

// Initialize the client (API key has project permissions)
const client = new AbiRegistry({
  apiKey: process.env.ABI_REGISTRY_API_KEY,
})

// Push an ABI (version auto-increments: 1, 2, 3...)
const result = await client.push({
  contractName: 'MyContract',
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  label: 'Production',  // Optional label
  abi: [...], // Your ABI array
})

console.log(result.isDuplicate)  // true if ABI already exists
console.log(result.abiId)        // ABI identifier

// Pull ABIs and generate typed files
await client.pullAndGenerate({
  outDir: 'abiregistry', // default
  typescript: true,       // default
})
```

### Using Generated Files

The SDK generates a typed registry for easy access:

```typescript
import { contracts } from './abiregistry/registry'

// Access by network name
const balance = await publicClient.readContract({
  ...contracts.mainnet.USDC,
  functionName: 'balanceOf',
  args: [userAddress]
})

// Access by chain ID (same object)
const sameContract = contracts[1].USDC

// Multiple instances of same contract (addresses array)
contracts.sepolia.MockERC20.addresses  // ["0x123...", "0x456...", "0x789..."]
contracts.sepolia.MockERC20.address    // Primary address (first in array)

// Works great with different ABIs per network
contracts.mainnet.MyToken   // Mainnet deployment
contracts.sepolia.MyToken   // Sepolia deployment  
contracts[137].MyToken      // Polygon deployment
```

## Features

- 🔍 **Fetch from Etherscan** - Automatically fetch ABIs from verified contracts (NO API key needed!)
- 🔓 **Proxy Contract Support** - Automatically fetch implementation ABIs for proxy contracts
- 🔨 **Foundry Integration** - Push deployment artifacts directly from Foundry broadcast folder
- 📦 **Pull ABIs** - Download all ABIs from your project
- 🎯 **TypeScript Generation** - Auto-generate typed contract files with full type safety
- 📁 **Smart Grouping** - Identical ABIs deployed to multiple addresses automatically grouped
- 🔄 **Auto-Increment Versioning** - Versions automatically increment (v1, v2, v3...)
- 🏷️ **Custom Labels** - Add semantic labels to deployments ("Production", "Staging", etc.)
- 🔐 **Duplicate Detection** - Automatically skips pushing identical ABIs
- 🔐 **Secure Authentication** - API key-based authentication for push/pull
- 🌐 **40+ Chain Support** - Ethereum, Polygon, Arbitrum, Base, Optimism, and more

## Generated Files

When you run `pullAndGenerate()`, the SDK creates:

### TypeScript Output (default)

```
generated/
├── index.ts              # Exports all contracts
├── types.ts              # TypeScript type definitions
├── my-contract.ts        # Individual contract file
└── payment-processor.ts  # Another contract file
```

Each contract file includes:

```typescript
/**
 * MyContract
 * Network: Ethereum Mainnet
 * Chain ID: 1
 * Address: 0x1234... (or multiple addresses if deployed multiple times)
 * Version: v1
 */

export const myContractAbi = [...] as const

// Single address export
export const myContractAddress = '0x1234...' as const

// OR multiple addresses (when same ABI deployed multiple times)
export const myContractAddresses = [
  "0x1234...",
  "0x5678...",
  "0x9abc..."
] as const
export const myContractAddress = myContractAddresses[0]  // Primary

export const myContractChainId = 1

export const myContractConfig = {
  address: myContractAddress,      // or addresses: myContractAddresses
  abi: myContractAbi,
  chainId: myContractChainId,
} as const
```

### JavaScript Output

Set `typescript: false` for plain JavaScript:

```typescript
await client.pullAndGenerate({
  outDir: 'contracts',
  typescript: false,
})
```

## CLI Reference

### Commands

#### `init`
Create a configuration file:
```bash
npx abiregistry init
```

Creates `abiregistry.config.json`:
```json
{
  "outDir": "abiregistry",
  "contracts": [
    {
      "chain": 1,
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "name": "USDC"
    }
  ]
}
```

#### `fetch`
Fetch ABIs from Etherscan:
```bash
# Fetch single contract
npx abiregistry fetch --chain 1 --address 0xA0b... --name USDC

# Fetch all contracts from config file
npx abiregistry fetch
```

Supported chains:
- `1` - Ethereum Mainnet
- `11155111` - Sepolia Testnet

**Note:** Etherscan API works without a key but has rate limits. Set `ETHERSCAN_API_KEY` for higher limits.

#### `foundry`
Push Foundry deployment artifacts to the registry:

**First time setup:**
```bash
# Initialize Foundry config
npx abiregistry foundry init

# Edit abiregistry.config.json with your deploy scripts
```

**Usage:**
```bash
# Push all scripts from config (with confirmation)
npx abiregistry foundry

# Add a label for this deployment
npx abiregistry foundry --label "Post-Audit"

# Skip confirmation prompt
npx abiregistry foundry --yes

# Override config and push specific script
npx abiregistry foundry --script DeployScript.s.sol
```

Features:
- ✅ **Multi-script support** - Track multiple deploy scripts in config
- ✅ **Proxy contract support** - Automatically loads implementation ABI for proxies
- ✅ **Multi-chain support** - Detects and pushes all chain deployments automatically
- ✅ Automatically reads from `broadcast/` folder and extracts deployed contract ABIs
- ✅ Extracts deployment timestamps from Foundry broadcast data
- ✅ Auto-increments version numbers (1, 2, 3...)
- ✅ Detects and skips duplicate ABIs automatically
- ✅ Shows confirmation table before pushing (use `--yes` to skip)
- ✅ Smart broadcast path detection (handles both old and new Foundry formats)

#### `pull`
Pull ABIs and generate files:
```bash
# Pull with TypeScript (default)
npx abiregistry pull

# Pull with JavaScript
npx abiregistry pull --js

# Custom output directory
npx abiregistry pull --out ./contracts
```

### Configuration

Configuration sources (in priority order, highest to lowest):

1. **Command-line flags** - `--api-key`, `--out`, `--script`, etc.
2. **Environment variables** - `ABI_REGISTRY_API_KEY`, `process.env.*`
3. **Config file** - `abiregistry.config.json` (optional settings)
4. **`.env` file** - Auto-loaded from project root (lowest priority)

**Environment Variable (Required):**

**Option 1: Using `.env` file (Recommended)**
```bash
# Create .env file in your project root
echo "ABI_REGISTRY_API_KEY=your-api-key-here" > .env

# Add to .gitignore (IMPORTANT!)
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# The CLI will automatically load this
npx abiregistry fetch
```

**Option 2: Using environment variable**
```bash
# Export in your shell
export ABI_REGISTRY_API_KEY="your-api-key"

# Or prefix the command
ABI_REGISTRY_API_KEY="your-api-key" npx abiregistry fetch
```

**Supported environment variable names:**
- `ABI_REGISTRY_API_KEY` (recommended)
- `ABIREGISTRY_API_KEY` (alternative)
- `API_KEY` (fallback)

**Config File (Optional):**

Create with `npx abiregistry foundry init`, then customize:

```json
{
  "foundry": {
    "scripts": [
      {
        "name": "Deploy.s.sol",
        "contracts": [
          { "name": "MyToken" },
          { "name": "MyNFT" },
          {
            "name": "TokenProxy",
            "proxy": { "implementation": "TokenV1" }
          }
        ]
      },
      {
        "name": "DeployGovernance.s.sol",
        "contracts": [
          {
            "name": "GovernanceProxy",
            "proxy": { "implementation": "GovernorV1" }
          }
        ]
      }
    ]
  }
}
```

**Foundry Config Structure:**
- `scripts` - Array of deploy scripts to track
  - `name` - Script file name (e.g., "Deploy.s.sol")
  - `contracts` - Array of contracts to push from this script (optional)
    - `name` - Contract name
    - `proxy` - Proxy configuration (optional)
      - `implementation` - Implementation contract name to load ABI from

**Features:**
- ✅ Track multiple deploy scripts
- ✅ Filter specific contracts per script
- ✅ Inline proxy configuration
- ✅ Multi-chain support (automatically pushes all chain deployments)
- ✅ Omit `contracts` array to push all contracts from a script

**Note:** Versions are auto-incremented by the server (1, 2, 3...). Use `--label` to add semantic meaning.

⚠️ **Security**: 
- ✅ API key contains your project permissions
- ✅ Never commit API keys - use `.env` files
- ✅ Add `.env` to `.gitignore`

## API Reference

### `new AbiRegistry(config)`

Create a new registry client.

```typescript
const client = new AbiRegistry({
  apiKey: 'your-api-key',
})
```

### `push(input)`

Upload an ABI to the registry. Returns info about whether it was a new version or duplicate.

```typescript
const result = await client.push({
  contractName: 'MyContract',
  address: '0x...',
  chainId: 1,
  label: 'Production',  // Optional: "Production", "Staging", "Post-Audit", etc.
  deployedAt: new Date(),  // Optional: deployment timestamp
  abi: [...],
})

console.log(result.isDuplicate)  // true if this exact ABI already exists
console.log(result.abiId)        // Unique ABI identifier
```

**Note:** Version numbers are auto-incremented (v1, v2, v3...). You cannot set them manually.

### `pull()`

Fetch all ABIs from the registry.

```typescript
const abis = await client.pull()
```

### `pullAndGenerate(options)`

Pull ABIs and generate typed contract files.

```typescript
await client.pullAndGenerate({
  outDir: 'generated',  // Output directory (default: 'generated')
  typescript: true,     // Generate TypeScript (default: true)
})
```

### `getAbi(abiId)`

Get a specific ABI by ID.

```typescript
const abi = await client.getAbi('abi-id')
```

### `getByNetwork(network)`

Get all ABIs for a specific network.

```typescript
const mainnetAbis = await client.getByNetwork('mainnet')
```

### `getByAddress(address)`

Get all ABIs for a specific contract address.

```typescript
const abis = await client.getByAddress('0x...')
```

## Usage with Web3 Libraries

### With Viem

```typescript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { myContractConfig } from './generated/my-contract'

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const result = await client.readContract({
  ...myContractConfig,
  functionName: 'balanceOf',
  args: ['0x...'],
})
```

### With Ethers.js

```typescript
import { ethers } from 'ethers'
import { myContractAbi, myContractAddress } from './generated/my-contract'

const provider = new ethers.JsonRpcProvider('https://...')
const contract = new ethers.Contract(
  myContractAddress,
  myContractAbi,
  provider
)

const balance = await contract.balanceOf('0x...')
```

### With Wagmi

```typescript
import { useReadContract } from 'wagmi'
import { myContractConfig } from './generated/my-contract'

function Component() {
  const { data } = useReadContract({
    ...myContractConfig,
    functionName: 'balanceOf',
    args: ['0x...'],
  })
  
  return <div>Balance: {data?.toString()}</div>
}
```

## Documentation

Full documentation is available at [https://abiregistry.com/docs](https://abiregistry.com/docs)

## License

MIT

