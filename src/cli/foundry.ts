import * as fs from 'fs/promises'
import * as path from 'path'
import { AbiRegistry } from '../client'
import type { PushAbiInput, AbiEntry } from '../types'
import { confirm, displayTable } from './prompt'
import { loadConfig, configFileExists } from './config'
import { calculateAbiHash } from '../utils/hash'

interface FoundryTransaction {
    transactionType: 'CREATE' | 'CALL'
    contractName: string
    contractAddress: string
    function: string | null
}

interface FoundryBroadcast {
    transactions: FoundryTransaction[]
    chain: number
    timestamp?: number  // Milliseconds since epoch
}

interface FoundryPushOptions {
    apiKey: string
    scriptDir?: string
    filename?: string
    label?: string  // Optional label for this deployment
    yes?: boolean  // Skip confirmation
}

/**
 * Parse Foundry broadcast JSON file
 */
async function parseBroadcastFile(filePath: string): Promise<FoundryBroadcast> {
    const content = await fs.readFile(filePath, 'utf-8')
    const broadcast = JSON.parse(content) as FoundryBroadcast

    if (!broadcast.transactions || !Array.isArray(broadcast.transactions)) {
        throw new Error('Invalid broadcast file: missing transactions array')
    }

    if (!broadcast.chain) {
        throw new Error('Invalid broadcast file: missing chain ID')
    }

    return broadcast
}

/**
 * Load ABI for a contract from Foundry out directory
 * Matches broadcast contract names with compiled artifacts
 */
async function loadContractAbi(contractName: string): Promise<AbiEntry[]> {
    // Foundry structure: out/<ContractName>.sol/<ContractName>.json
    const abiPath = path.join(process.cwd(), 'out', `${contractName}.sol`, `${contractName}.json`)

    try {
        const content = await fs.readFile(abiPath, 'utf-8')
        const artifact = JSON.parse(content)

        if (!artifact.abi || !Array.isArray(artifact.abi)) {
            throw new Error('Invalid artifact format: missing or invalid ABI field')
        }

        return artifact.abi as AbiEntry[]
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(
                `Could not find ABI file for contract ${contractName}.\n` +
                `Expected location: ${abiPath}\n\n` +
                `Make sure:\n` +
                `  1. Contracts are compiled: run 'forge build'\n` +
                `  2. You're in the Foundry project root directory\n` +
                `  3. The out/ folder exists with compiled artifacts\n\n` +
                `Foundry creates: out/${contractName}.sol/${contractName}.json`
            )
        }

        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to load ABI for ${contractName}: ${message}`)
    }
}

/**
 * Get network name from chain ID
 */
function getNetworkFromChainId(chainId: number): string {
    const networks: Record<number, string> = {
        1: 'mainnet',
        11155111: 'sepolia',
        137: 'polygon',
        80001: 'mumbai',
        10: 'optimism',
        42161: 'arbitrum',
        8453: 'base',
        31337: 'localhost',
    }

    return networks[chainId] || `chain-${chainId}`
}

/**
 * Push Foundry deployment artifacts to ABI Registry
 */
export async function foundryPushCommand(options: FoundryPushOptions): Promise<void> {
    // Load config file for defaults
    const config = loadConfig()
    const foundryConfig = config.foundry || {}
    const hasConfigFile = configFileExists()
    const label = options.label  // Label is optional, not set from config

    // Determine which scripts to process
    let scriptsToProcess: string[] = []

    if (options.scriptDir) {
        // CLI flag takes precedence
        scriptsToProcess = [options.scriptDir]
    } else if (foundryConfig.scripts && foundryConfig.scripts.length > 0) {
        // Use scripts array from config
        scriptsToProcess = foundryConfig.scripts.map(s => s.name)
    } else if (foundryConfig.scriptDir) {
        // Fallback to legacy scriptDir
        scriptsToProcess = [foundryConfig.scriptDir]
    } else {
        throw new Error(
            'Script directory is required.\n' +
            'Provide it via --script flag or set "foundry.scripts" in abiregistry.config.json'
        )
    }

    console.log(`🔨 Processing ${scriptsToProcess.length} deploy script(s)...`)

    // Collect all ABIs from all scripts
    const client = new AbiRegistry({ apiKey: options.apiKey })
    const allAbis: PushAbiInput[] = []

    for (const scriptDir of scriptsToProcess) {
        console.log(`\n📜 Script: ${scriptDir}`)

        // Construct file path - Foundry can put broadcast files in two locations:
        // 1. broadcast/<script>/run-latest.json (older format)
        // 2. broadcast/<script>/<chainId>/run-latest.json (newer format with chainId subfolder)
        const filename = options.filename || 'run-latest.json'
        const broadcastDir = path.join(process.cwd(), 'broadcast', scriptDir)

        const broadcastPaths: string[] = []

        // First, try direct path (without chainId subfolder)
        const directPath = path.join(broadcastDir, filename)
        try {
            await fs.access(directPath)
            broadcastPaths.push(directPath)
        } catch {
            // Direct path doesn't exist, search for ALL chainId subdirectories
            try {
                const entries = await fs.readdir(broadcastDir, { withFileTypes: true })

                // Look for ALL numeric subdirectories (chainId folders)
                for (const entry of entries) {
                    if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                        const chainIdPath = path.join(broadcastDir, entry.name, filename)
                        try {
                            await fs.access(chainIdPath)
                            broadcastPaths.push(chainIdPath)
                        } catch {
                            // This chainId folder doesn't have the file, try next
                            continue
                        }
                    }
                }
            } catch {
                // Can't read directory
            }
        }

        if (broadcastPaths.length === 0) {
            console.warn(`⚠️  Skipping ${scriptDir} - no broadcast files found`)
            console.warn(`      Searched: ${directPath}`)
            console.warn(`      And subdirectories in: ${broadcastDir}`)
            continue
        }

        if (broadcastPaths.length > 1) {
            console.log(`   📂 Found ${broadcastPaths.length} deployment(s):`)
            for (const p of broadcastPaths) {
                console.log(`      - ${path.relative(process.cwd(), p)}`)
            }
        } else {
            console.log(`   📂 Found: ${path.relative(process.cwd(), broadcastPaths[0])}`)
        }

        // Process each broadcast file (one per chain)
        for (const broadcastPath of broadcastPaths) {
            // Parse broadcast file
            const broadcast = await parseBroadcastFile(broadcastPath)
            const network = getNetworkFromChainId(broadcast.chain)

            // Extract deployment timestamp (use broadcast timestamp or current time)
            const deployedAt = broadcast.timestamp
                ? new Date(broadcast.timestamp)
                : new Date()

            if (broadcastPaths.length > 1) {
                // Show which chain we're processing if there are multiple
                console.log(`\n   🔗 Chain: ${network} (${broadcast.chain})`)
            }
            console.log(`      📡 Network: ${network} (Chain ID: ${broadcast.chain})`)
            console.log(`      ⏰ Deployment: ${deployedAt.toISOString()}`)

            // Extract CREATE transactions (contract deployments)
            let deployments = broadcast.transactions.filter(
                (tx) => tx.transactionType === 'CREATE'
            )

            if (deployments.length === 0) {
                console.warn(`      ⚠️  No contract deployments found on chain ${broadcast.chain}`)
                continue
            }

            // Get contract filter for this specific script
            const scriptConfig = foundryConfig.scripts?.find(s => s.name === scriptDir)
            const contractConfigs = scriptConfig?.contracts

            // Build a map of contract names to their configs for easy lookup
            const contractConfigMap = new Map<string, { name: string; proxy?: { implementation: string } }>()
            if (contractConfigs) {
                for (const config of contractConfigs) {
                    contractConfigMap.set(config.name, config)
                }
            }

            // Filter by allowed contracts if specified
            if (contractConfigs && contractConfigs.length > 0) {
                const before = deployments.length
                const allowedNames = contractConfigs.map(c => c.name)
                deployments = deployments.filter((tx) => allowedNames.includes(tx.contractName))

                if (deployments.length === 0) {
                    console.warn(
                        `      ⚠️  No matching contracts found. Config allows: [${allowedNames.join(', ')}]\n` +
                        `      But broadcast contains: [${broadcast.transactions
                            .filter((tx) => tx.transactionType === 'CREATE')
                            .map((tx) => tx.contractName)
                            .join(', ')}]`
                    )
                    continue
                }

                console.log(`      📝 Found ${before} deployment(s), filtered to ${deployments.length}`)
            } else {
                console.log(`      📝 Found ${deployments.length} deployment(s)`)
            }

            // Process each deployment from this broadcast file
            for (const deployment of deployments) {
                console.log(`\n      📄 Processing ${deployment.contractName}...`)
                console.log(`         📍 Address: ${deployment.contractAddress}`)

                try {
                    // Check if this contract has a specific config (including proxy settings)
                    const contractConfig = contractConfigMap.get(deployment.contractName)

                    let contractToLoad = deployment.contractName
                    let isProxy = false

                    if (contractConfig?.proxy) {
                        // This is a proxy - load the implementation ABI instead
                        contractToLoad = contractConfig.proxy.implementation
                        isProxy = true
                        console.log(`         🔄 Proxy detected - loading implementation: ${contractToLoad}`)
                    }

                    const abi = await loadContractAbi(contractToLoad)
                    const abiHash = calculateAbiHash(abi)

                    allAbis.push({
                        contractName: deployment.contractName,  // Keep the proxy name for identification
                        network,
                        label,  // Optional label from CLI flag
                        address: deployment.contractAddress,  // Proxy address
                        chainId: broadcast.chain,
                        deployedAt,
                        abiHash,
                        abi,  // Implementation ABI
                    })

                    if (isProxy) {
                        console.log(`         ✅ Implementation ABI loaded: ${contractToLoad}`)
                    } else {
                        console.log(`         ✅ ABI loaded from out/ folder`)
                    }
                    console.log(`         🔐 Hash: ${abiHash.substring(0, 10)}...`)
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error'
                    console.error(`         ❌ Failed to load ABI: ${message}`)
                    throw error
                }
            }
        }
    }

    if (allAbis.length === 0) {
        throw new Error('No ABIs to push. Check your deploy scripts and configuration.')
    }

    // Show confirmation table
    console.log('\n📋 ABIs ready to push:\n')

    const tableRows = allAbis.map((abi) => [
        abi.contractName,
        abi.address.substring(0, 10) + '...',
        abi.network || 'unknown',
        abi.label || '(no label)',
        `${abi.abi.length} entries`,
    ])

    displayTable(
        ['Contract', 'Address', 'Network', 'Label', 'ABI Size'],
        tableRows
    )

    // Show tip about config file between table and confirmation
    if (!hasConfigFile) {
        console.log('\n💡 Tip: Create an abiregistry.config.json file to set Foundry defaults:')
        console.log('   npx abiregistry init')
        console.log('')
        console.log('   Example config with multiple scripts and proxy support:')
        console.log('   {')
        console.log('     "foundry": {')
        console.log('       "scripts": [')
        console.log('         {')
        console.log('           "name": "Deploy.s.sol",')
        console.log('           "contracts": [')
        console.log('             { "name": "MyToken" },')
        console.log('             { "name": "TokenProxy", "proxy": { "implementation": "TokenV1" } }')
        console.log('           ]')
        console.log('         },')
        console.log('         {')
        console.log('           "name": "DeployGovernance.s.sol",')
        console.log('           "contracts": [')
        console.log('             { "name": "GovernanceProxy", "proxy": { "implementation": "GovernanceV1" } }')
        console.log('           ]')
        console.log('         }')
        console.log('       ]')
        console.log('     }')
        console.log('   }')
        console.log('')
        console.log('   Note: Versions are auto-incremented (1, 2, 3...). Use --label to add a custom label.')
    }

    // Ask for confirmation unless --yes flag is provided
    if (!options.yes) {
        console.log('\n⚠️  You are about to push these ABIs to the registry.')
        const confirmed = await confirm('Do you want to continue?')

        if (!confirmed) {
            console.log('❌ Operation cancelled by user')
            process.exit(0)
        }
    }

    // Push to registry
    console.log(`\n🚀 Pushing ${allAbis.length} ABI(s) to registry...`)

    let newCount = 0
    let duplicateCount = 0

    try {
        for (const abi of allAbis) {
            const result = await client.push(abi)
            if (result.isDuplicate) {
                console.log(`  ⏭️  ${abi.contractName} - Skipped (duplicate)`)
                duplicateCount++
            } else {
                console.log(`  ✅ ${abi.contractName} - Pushed (new version)`)
                newCount++
            }
        }

        console.log('\n✅ Push complete!')
        console.log(`📊 Summary: ${newCount} new, ${duplicateCount} duplicates skipped`)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to push ABIs: ${message}`)
    }
}

