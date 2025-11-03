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

    // Use config defaults if options not provided
    const scriptDir = options.scriptDir || foundryConfig.scriptDir
    const label = options.label  // Label is optional, not set from config
    const allowedContracts = foundryConfig.contracts || []

    if (!scriptDir) {
        throw new Error(
            'Script directory is required.\n' +
            'Provide it via --script flag or set "foundry.scriptDir" in abiregistry.config.json'
        )
    }

    console.log('🔨 Reading Foundry broadcast...')

    // Construct file path
    const filename = options.filename || 'run-latest.json'
    const broadcastPath = path.join(process.cwd(), 'broadcast', scriptDir, filename)

    // Check if broadcast file exists
    try {
        await fs.access(broadcastPath)
    } catch {
        throw new Error(
            `Broadcast file not found at ${broadcastPath}\n\n` +
            `Make sure:\n` +
            `  1. You've run the deployment: forge script <script> --broadcast\n` +
            `  2. You're in the project root directory\n` +
            `  3. The script name matches (e.g., "DeployScript.s.sol")`
        )
    }

    // Parse broadcast file
    const broadcast = await parseBroadcastFile(broadcastPath)
    const network = getNetworkFromChainId(broadcast.chain)

    // Extract deployment timestamp (use broadcast timestamp or current time)
    const deployedAt = broadcast.timestamp
        ? new Date(broadcast.timestamp)
        : new Date()

    console.log(`📡 Network: ${network} (Chain ID: ${broadcast.chain})`)
    console.log(`⏰ Deployment time: ${deployedAt.toISOString()}`)

    // Extract CREATE transactions (contract deployments)
    let deployments = broadcast.transactions.filter(
        (tx) => tx.transactionType === 'CREATE'
    )

    if (deployments.length === 0) {
        throw new Error('No contract deployments found in broadcast file')
    }

    // Filter by allowed contracts if specified in config
    if (allowedContracts.length > 0) {
        const before = deployments.length
        deployments = deployments.filter((tx) => allowedContracts.includes(tx.contractName))

        if (deployments.length === 0) {
            throw new Error(
                `No matching contracts found. Config allows: [${allowedContracts.join(', ')}]\n` +
                `But broadcast contains: [${broadcast.transactions
                    .filter((tx) => tx.transactionType === 'CREATE')
                    .map((tx) => tx.contractName)
                    .join(', ')}]`
            )
        }

        console.log(`📝 Found ${before} contract deployment(s), filtered to ${deployments.length} based on config`)
    } else {
        console.log(`📝 Found ${deployments.length} contract deployment(s)`)
    }

    // Prepare ABIs for push
    const client = new AbiRegistry({ apiKey: options.apiKey })
    const abis: PushAbiInput[] = []

    for (const deployment of deployments) {
        console.log(`\n📄 Processing ${deployment.contractName}...`)
        console.log(`  📍 Address: ${deployment.contractAddress}`)

        try {
            const abi = await loadContractAbi(deployment.contractName)
            const abiHash = calculateAbiHash(abi)

            abis.push({
                contractName: deployment.contractName,
                network,
                label,  // Optional label from CLI flag
                address: deployment.contractAddress,
                chainId: broadcast.chain,
                deployedAt,
                abiHash,
                abi,
            })

            console.log(`  ✅ ABI loaded from out/ folder`)
            console.log(`  🔐 Hash: ${abiHash.substring(0, 10)}...`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error(`  ❌ Failed to load ABI: ${message}`)
            throw error
        }
    }

    // Show confirmation table
    console.log('\n📋 ABIs ready to push:\n')

    const tableRows = abis.map((abi) => [
        abi.contractName,
        abi.address,
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
        console.log('   Example:')
        console.log('   {')
        console.log('     "foundry": {')
        console.log('       "scriptDir": "Deploy.s.sol",')
        console.log('       "contracts": ["MyToken", "MyNFT"]')
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
    console.log(`\n🚀 Pushing ${abis.length} ABI(s) to registry...`)

    let newCount = 0
    let duplicateCount = 0

    try {
        for (const abi of abis) {
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

