/**
 * Example: Using the ABI Registry SDK to push and pull ABIs
 */

import { AbiRegistry } from '@abiregistry/sdk'

async function main() {
  // Initialize the SDK client
  const client = new AbiRegistry({
    apiKey: process.env.ABI_REGISTRY_API_KEY || 'your-api-key',
    projectId: process.env.ABI_REGISTRY_PROJECT_ID || 'your-project-id',
  })

  console.log('📦 Pulling ABIs from registry...')

  // Pull all ABIs and generate typed files
  const files = await client.pullAndGenerate({
    outDir: './abiregistry/generated',
    typescript: true,
  })

  console.log(`✅ Generated ${files.length} files:`)
  files.forEach((file) => {
    console.log(`  - ${file.path}`)
  })

  // You can also pull without generating files
  console.log('\n📦 Fetching ABIs without file generation...')
  const abis = await client.pull()
  console.log(`Found ${abis.length} ABIs in the registry:`)
  abis.forEach((abi) => {
    console.log(`  - ${abi.contract} (${abi.network}) at ${abi.address}`)
  })

  // Get ABIs by network
  console.log('\n🌐 Filtering by network...')
  const mainnetAbis = await client.getByNetwork('mainnet')
  console.log(`Mainnet ABIs: ${mainnetAbis.length}`)

  // Get ABIs by address
  console.log('\n📍 Filtering by address...')
  const specificAbi = await client.getByAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
  console.log(`Found ${specificAbi.length} ABI(s) for this address`)
}

// Example: Push a new ABI to the registry
async function pushExample() {
  const client = new AbiRegistry({
    apiKey: process.env.ABI_REGISTRY_API_KEY || 'your-api-key',
    projectId: process.env.ABI_REGISTRY_PROJECT_ID || 'your-project-id',
  })

  console.log('🚀 Pushing ABI to registry...')

  await client.push({
    contractName: 'MyToken',
    address: '0x1234567890123456789012345678901234567890',
    chainId: 1,
    network: 'mainnet',
    version: '1.0.0',
    abi: [
      {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
      {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false },
        ],
      },
    ],
  })

  console.log('✅ ABI pushed successfully!')
}

// Run examples
if (require.main === module) {
  main()
    .then(() => console.log('\n✨ Done!'))
    .catch(console.error)
}

export { main, pushExample }

