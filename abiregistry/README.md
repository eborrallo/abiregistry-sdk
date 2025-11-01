# @abiregistry/sdk Examples

This directory contains example usage of the ABI Registry SDK.

## Setup Import Alias (Recommended)

To make imports cleaner, add this alias to your `package.json`:

```json
{
  "imports": {
    "#abiregistry/*": "./abiregistry/generated/*"
  }
}
```

Or in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@abiregistry/*": ["./abiregistry/generated/*"]
    }
  }
}
```

Then import like:

```typescript
import { erc20TokenConfig } from '@abiregistry/erc20-token'
// instead of
import { erc20TokenConfig } from './abiregistry/generated/erc20-token'
```

## Files

### Generated Files (`generated/`)

Example output from `pullAndGenerate()`:

- **`erc20-token.ts`** - ERC20 token contract with full type safety
- **`index.ts`** - Re-exports all generated contracts
- **`types.ts`** - TypeScript type definitions

### Usage Examples

- **`usage-sdk.ts`** - SDK methods (push, pull, pullAndGenerate)
- **`usage-viem.ts`** - Using generated files with Viem
- **`usage-ethers.ts`** - Using generated files with Ethers.js

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
└── generated/
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

1. **Smart Contract Team**: Push ABIs using the SDK or GitHub Action
   ```typescript
   await client.push({ contractName, address, chainId, abi })
   ```

2. **Frontend/Backend Team**: Pull ABIs and generate typed files
   ```typescript
   await client.pullAndGenerate({ outDir: 'src/contracts' })
   ```

3. **Use in Your App**: Import and use with full type safety
   ```typescript
   import { myContractConfig } from 'src/contracts'
   ```

## Learn More

- [SDK Documentation](../README.md)
- [ABI Registry Docs](https://abiregistry.com/docs)

