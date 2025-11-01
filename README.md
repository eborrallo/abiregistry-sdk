# @abiregistry/sdk

Official TypeScript/JavaScript SDK for ABI Registry - Push and pull smart contract ABIs seamlessly with automatic TypeScript generation.

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
# Set your API key (keep this secret!)
export ABI_REGISTRY_API_KEY="your-api-key"

# Optional: Initialize config file for custom output directory
npx abiregistry init
# Edit abiregistry.config.json:
# {
#   "outDir": "abiregistry"
# }

# Push ABIs from a directory
npx abiregistry push --path ./abis

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

// Push an ABI
await client.push({
  contractName: 'MyContract',
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  network: 'mainnet',
  abi: [...], // Your ABI array
})

// Pull ABIs and generate typed files
await client.pullAndGenerate({
  outDir: 'abiregistry', // default
  typescript: true,       // default
})
```

## Features

- 🚀 **Push ABIs** - Upload contract ABIs to your registry
- 📦 **Pull ABIs** - Download all ABIs from your project
- 🎯 **TypeScript Generation** - Auto-generate typed contract files
- 📁 **File Organization** - Contracts organized by name with metadata
- 🔄 **Automatic Versioning** - Track ABI versions across deployments
- 🔐 **Secure Authentication** - API key-based authentication

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
 * Network: mainnet
 * Address: 0x1234...
 * Version: 1.0.0
 * Synced: 2025-01-01T12:00:00Z
 */

export const myContractAbi = [...] as const

export const myContractAddress = '0x1234...' as const

export const myContractChainId = 1

export const myContractConfig = {
  address: myContractAddress,
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
  "outDir": "abiregistry"
}
```

#### `push`
Push ABIs to the registry:
```bash
# Push from directory
npx abiregistry push --path ./abis

# Push single file
npx abiregistry push --path ./MyContract.json
```

Supports:
- Single JSON files
- Directories with multiple JSON files
- Metadata objects or raw ABI arrays

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

Configuration sources (in priority order):

1. **Command-line flags** - `--path`, `--out`, `--js`
2. **Config file** - `abiregistry.config.json` (optional settings)
3. **Environment variable** - `ABI_REGISTRY_API_KEY` (required!)

**Environment Variable (Required):**
```bash
export ABI_REGISTRY_API_KEY="your-api-key"  # KEEP SECRET!
```

**Config File (Optional):**
```json
{
  "outDir": "abiregistry"  // Customize output directory
}
```

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

Upload an ABI to the registry.

```typescript
await client.push({
  contractName: 'MyContract',
  address: '0x...',
  chainId: 1,
  network: 'mainnet',
  version: '1.0.0',
  abi: [...],
})
```

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

