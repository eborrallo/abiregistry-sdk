# @abiregistry/sdk

Official TypeScript/JavaScript SDK for ABI Registry - Push and pull smart contract ABIs seamlessly.

## Installation

```bash
npm install @abiregistry/sdk
# or
yarn add @abiregistry/sdk
# or
pnpm add @abiregistry/sdk
```

## Quick Start

```typescript
import { AbiRegistry } from '@abiregistry/sdk'

// Initialize the client
const client = new AbiRegistry({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
})

// Push an ABI
await client.push({
  contractName: 'MyContract',
  address: '0x...',
  chainId: 1,
  network: 'mainnet',
  abi: [...], // Your ABI array
})

// Pull ABIs
const abis = await client.pull()
```

## Features

- 🚀 Push ABIs to your registry
- 📦 Pull ABIs from your registry
- 🔄 Automatic versioning
- 🎯 TypeScript support
- 🔐 Secure API key authentication

## Documentation

Full documentation is available at [https://abiregistry.dev/docs](https://abiregistry.dev/docs)

## License

MIT

