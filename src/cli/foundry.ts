import * as fs from 'fs/promises'
import * as path from 'path'
import { AbiRegistry } from '../client'
import type { PushAbiInput } from '../types'

interface FoundryTransaction {
    transactionType: 'CREATE' | 'CALL'
    contractName: string
    contractAddress: string
    function: string | null
}

interface FoundryBroadcast {
    transactions: FoundryTransaction[]
    chain: number
}

interface FoundryPushOptions {
    apiKey: string
    scriptDir: string
    filename?: string
    version?: string
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
 */
async function loadContractAbi(contractName: string): Promise<unknown[]> {
    // Try common patterns for Foundry out directory
    const possiblePaths = [
        path.join(process.cwd(), 'out', `${contractName}.sol`, `${contractName}.json`),
        path.join(process.cwd(), 'out', `${contractName}.json`),
    ]

    for (const abiPath of possiblePaths) {
        try {
            const content = await fs.readFile(abiPath, 'utf-8')
            const artifact = JSON.parse(content)
            
            if (artifact.abi && Array.isArray(artifact.abi)) {
                return artifact.abi
            }
        } catch {
            // Try next path
            continue
        }
    }

    throw new Error(`Could not find ABI for contract ${contractName}. Make sure the contract is compiled.`)
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
    console.log('🔨 Reading Foundry broadcast...')

    // Construct file path
    const filename = options.filename || 'run-latest.json'
    const broadcastPath = path.join(process.cwd(), 'broadcast', options.scriptDir, filename)

    // Check if file exists
    try {
        await fs.access(broadcastPath)
    } catch {
        throw new Error(
            `Broadcast file not found at ${broadcastPath}\n` +
            `Make sure you specify the correct script directory name (e.g., "DeployScript.s.sol")`
        )
    }

    // Parse broadcast file
    const broadcast = await parseBroadcastFile(broadcastPath)
    const network = getNetworkFromChainId(broadcast.chain)

    console.log(`📡 Network: ${network} (Chain ID: ${broadcast.chain})`)

    // Extract CREATE transactions (contract deployments)
    const deployments = broadcast.transactions.filter(
        (tx) => tx.transactionType === 'CREATE'
    )

    if (deployments.length === 0) {
        throw new Error('No contract deployments found in broadcast file')
    }

    console.log(`📝 Found ${deployments.length} contract deployment(s)`)

    // Prepare ABIs for push
    const client = new AbiRegistry(options.apiKey)
    const version = options.version || '1.0.0'
    const abis: PushAbiInput[] = []

    for (const deployment of deployments) {
        console.log(`\n📄 Processing ${deployment.contractName}...`)
        
        try {
            const abi = await loadContractAbi(deployment.contractName)
            
            abis.push({
                contract: deployment.contractName,
                network,
                version,
                address: deployment.contractAddress,
                chainId: broadcast.chain,
                abi,
            })

            console.log(`  ✅ Address: ${deployment.contractAddress}`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error(`  ❌ Failed to load ABI: ${message}`)
            throw error
        }
    }

    // Push to registry
    console.log(`\n🚀 Pushing ${abis.length} ABI(s) to registry...`)
    
    try {
        const result = await client.push(abis)
        console.log('✅ Successfully pushed ABIs to registry!')
        console.log(`📊 Total ABIs: ${result.count}`)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to push ABIs: ${message}`)
    }
}

