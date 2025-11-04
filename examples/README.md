# @abiregistry/sdk Examples

This directory contains example usage of the ABI Registry SDK.

## Setup Import Alias (Recommended)

To make imports cleaner, add this alias to your `package.json`:

```json
{
  "imports": {
    "#contracts/*": "./examples/*"
  }
}
```

Or in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@contracts/*": ["./examples/*"]
    }
  }
}
```

Then import like:

```typescript
import { contracts } from '@contracts/registry'
// instead of
import { contracts } from './examples/registry'
```

## Files

### Generated Files

Example output from `pullAndGenerate()` or `fetch`:

- **`erc20-token.ts`** - ERC20 token contract with full type safety
- **`registry.ts`** - 🆕 Typed mapping object (contracts.mainnet.ERC20Token or contracts[1].ERC20Token)
- **`index.ts`** - Re-exports all generated contracts + registry
- **`types.ts`** - TypeScript type definitions

### Usage Examples

- **`usage-sdk.ts`** - SDK methods (push, pull, pullAndGenerate)
- **`usage-viem.ts`** - Using generated files with Viem
- **`usage-ethers.ts`** - Using generated files with Ethers.js

## Using the Registry

The `registry.ts` file provides a typed mapping for easy contract access:

```typescript
import { contracts, getContract } from './examples/registry'

// Access by network name
const token = contracts.mainnet.ERC20Token

// Access by chain ID  
const sameToken = contracts[1].ERC20Token

// Type-safe helper
const config = getContract('mainnet', 'ERC20Token')

// Use with Viem
const balance = await client.readContract({
  ...contracts.mainnet.ERC20Token,
  functionName: 'balanceOf',
  args: [address]
})
```

### Multi-Network Contracts

When you have the same contract on different networks (e.g., upgradeable contracts):

```typescript
// Files generated:
// - my-token-mainnet.ts
// - my-token-sepolia.ts
// - my-token-polygon.ts

import { contracts } from './examples/registry'

// Each network has its own ABI (important for upgraded contracts!)
contracts.mainnet.MyToken  // v1.0.0 ABI
contracts.sepolia.MyToken  // v2.0.0 ABI with new functions
contracts.polygon.MyToken  // v2.0.0 ABI

// Or by chain ID
contracts[1].MyToken        // Mainnet
contracts[11155111].MyToken // Sepolia
contracts[137].MyToken      // Polygon
```

## Running Examples

### 1. Install Dependencies

```bash
npm install viem ethers
```

### 2. Set Environment Variables

```bash
export ABI_REGISTRY_API_KEY="your-api-key"
export ABI_REGISTRY_PROJECT_ID="your-project-id"
```

### 3. Run Examples

```bash
# Pull ABIs and generate files
npx tsx usage-sdk.ts

# Use with Viem
npx tsx usage-viem.ts

# Use with Ethers.js
npx tsx usage-ethers.ts
```

## Generated File Structure

When you run `pullAndGenerate()`, files are organized like:

```
abiregistry/
├── index.ts              # Export all contracts
├── types.ts              # TypeScript types
└── erc20-token.ts        # Contract with ABI, address, chainId
```

## Type Safety

All generated files include TypeScript `as const` assertions for maximum type safety:

```typescript
import { erc20TokenConfig } from './generated/erc20-token'

// ✅ Fully typed!
const result = await client.readContract({
  ...erc20TokenConfig,
  functionName: 'balanceOf', // autocomplete works!
  args: ['0x...'],
})
```

## Integration Examples

### Viem

```typescript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { erc20TokenConfig } from './generated/erc20-token'

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const balance = await client.readContract({
  ...erc20TokenConfig,
  functionName: 'balanceOf',
  args: ['0x...'],
})
```

### Ethers.js

```typescript
import { ethers } from 'ethers'
import { erc20TokenAbi, erc20TokenAddress } from './generated/erc20-token'

const provider = new ethers.JsonRpcProvider('https://...')
const contract = new ethers.Contract(erc20TokenAddress, erc20TokenAbi, provider)

const balance = await contract.balanceOf('0x...')
```

### Wagmi

```typescript
import { useReadContract } from 'wagmi'
import { erc20TokenConfig } from './generated/erc20-token'

function Component() {
  const { data } = useReadContract({
    ...erc20TokenConfig,
    functionName: 'balanceOf',
    args: ['0x...'],
  })
  
  return <div>Balance: {data?.toString()}</div>
}
```

## Workflow

1. **Smart Contract Team**: Push ABIs using the SDK CLI
   ```bash
   npx abiregistry foundry  # Push from Foundry deployments
   # or
   npx abiregistry fetch --chain 1 --address 0x... --name MyContract
   ```

2. **Frontend/Backend Team**: Pull ABIs and generate typed files
   ```bash
   npx abiregistry pull
   ```

3. **Use in Your App**: Import and use with full type safety
   ```typescript
   import { myContractConfig } from './abiregistry'
   ```

## Learn More

- [SDK Documentation](../README.md)
- [ABI Registry Docs](https://abiregistry.com/docs)

