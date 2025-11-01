import { AbiRegistry } from '../client'
import type { AbiEntry } from '../types'
import { fetchAbiFromEtherscan, getChainName } from './etherscan'
import type { ContractConfig } from './config'

type FetchOptions = {
  apiKey: string
  contracts?: ContractConfig[]
  chain?: number
  address?: string
  name?: string
}

export async function fetchCommand(options: FetchOptions): Promise<void> {
  const { apiKey, contracts, chain, address, name } = options

  let contractsToFetch: ContractConfig[] = []

  // If CLI args provided, use them
  if (chain && address && name) {
    contractsToFetch = [{ chain, address, name }]
  } else if (contracts && contracts.length > 0) {
    // Use contracts from config file
    contractsToFetch = contracts
  } else {
    console.error('❌ Error: No contracts specified')
    console.error('Either:')
    console.error('  1. Use flags: npx abiregistry fetch --chain 1 --address 0x... --name MyContract')
    console.error('  2. Add contracts to abiregistry.config.json')
    process.exit(1)
  }

  console.log(`📦 Fetching ${contractsToFetch.length} contract(s) from Etherscan...`)

  // Initialize client
  const client = new AbiRegistry({
    apiKey,
  })

  let successCount = 0
  let errorCount = 0

  for (const contract of contractsToFetch) {
    try {
      console.log(`\n🔍 Fetching ${contract.name} from chain ${contract.chain}...`)

      // Fetch ABI from Etherscan
      const abi = await fetchAbiFromEtherscan(contract.chain, contract.address)

      if (!Array.isArray(abi) || abi.length === 0) {
        console.warn(`⚠️  Warning: No ABI found for ${contract.name}`)
        errorCount++
        continue
      }

      // Push to registry
      await client.push({
        contractName: contract.name,
        address: contract.address,
        chainId: contract.chain,
        network: getChainName(contract.chain),
        version: '1.0.0',
        abi: abi as AbiEntry[],
      })

      console.log(`✅ Successfully fetched and pushed ${contract.name}`)
      successCount++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to fetch ${contract.name}: ${message}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)

  if (errorCount > 0) {
    process.exit(1)
  }
}

