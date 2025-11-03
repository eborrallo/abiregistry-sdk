import * as path from 'path'
import * as fs from 'fs/promises'
import { fetchAbiWithProxyDetection, getChainName } from './etherscan'
import { CodeGenerator } from '../generator'
import type { ContractConfig } from './config'
import type { AbiEntry, AbiItem } from '../types'

type FetchOptions = {
  outDir?: string
  js?: boolean
  contracts?: ContractConfig[]
  chain?: number
  address?: string
  name?: string
  isProxy?: boolean
}

export async function fetchCommand(options: FetchOptions): Promise<void> {
  const { outDir = 'abiregistry', js = false, contracts, chain, address, name, isProxy } = options

  let contractsToFetch: ContractConfig[] = []

  // If CLI args provided, use them
  if (chain && address && name) {
    contractsToFetch = [{ chain, address, name, isProxy }]
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

  const abiItems: AbiItem[] = []
  let successCount = 0
  let errorCount = 0

  for (const contract of contractsToFetch) {
    try {
      console.log(`\n🔍 Fetching ${contract.name} from chain ${contract.chain}...`)

      if (contract.isProxy) {
        console.log(`📦 Contract is a proxy, will fetch implementation ABI`)
      }

      // Fetch ABI from Etherscan (with proxy detection)
      const abi = await fetchAbiWithProxyDetection(
        contract.chain,
        contract.address,
        contract.isProxy
      ) as AbiEntry[]

      if (!Array.isArray(abi) || abi.length === 0) {
        console.warn(`⚠️  Warning: No ABI found for ${contract.name}`)
        errorCount++
        continue
      }

      // Create ABI item for generation
      const now = new Date().toISOString()
      abiItems.push({
        id: `${contract.chain}-${contract.address}`,
        contractName: contract.name,
        contract: contract.name,  // Backward compatibility
        network: getChainName(contract.chain),
        version: 1,  // Default version for fetched contracts
        chainId: contract.chain,
        address: contract.address,
        abi,
        deployedAt: now,
        pushedAt: now,
        abiHash: '',  // Not calculated for fetch
        isLatest: true,
      })

      console.log(`✅ Successfully fetched ${contract.name}`)
      successCount++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to fetch ${contract.name}: ${message}`)
      errorCount++
    }
  }

  // Generate files locally
  if (abiItems.length > 0) {
    console.log(`\n📝 Generating ${js ? 'JavaScript' : 'TypeScript'} files in ./${outDir}...`)

    const generator = new CodeGenerator(!js) // Pass boolean for typescript
    const generatedFiles = generator.generateFiles(abiItems)

    // Create output directory
    await fs.mkdir(outDir, { recursive: true })

    // Write all generated files
    for (const file of generatedFiles) {
      const filePath = path.join(outDir, file.path)
      await fs.writeFile(filePath, file.content, 'utf-8')
      console.log(`  ✓ ${file.path}`)
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)
  console.log(`💡 Files generated in ./${outDir}/ - ready to use!`)

  if (errorCount > 0) {
    process.exit(1)
  }
}

