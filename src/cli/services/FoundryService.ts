import type { AbiRegistry } from '../../client'
import type { PushAbiInput } from '../../types'
import { calculateAbiHash } from '../../utils/hash'
import type { FileSystemService } from './FileSystemService'
import type { AbiLoaderService } from './AbiLoaderService'
import type { BroadcastParserService, FoundryTransaction, ProxyMapping } from './BroadcastParserService'
import type { BroadcastDiscoveryService } from './BroadcastDiscoveryService'

export interface FoundryConfig {
    scripts?: Array<{
        name: string
        contracts?: Array<{
            name: string
            proxy?: { implementation: string }
        }>
    }>
    scriptDir?: string  // Legacy
}

export interface FoundryPushOptions {
    apiKey: string
    scriptDir?: string
    filename?: string
    label?: string
    yes?: boolean
}

export interface FoundryServiceDependencies {
    client: AbiRegistry
    fs: FileSystemService
    abiLoader: AbiLoaderService
    broadcastParser: BroadcastParserService
    broadcastDiscovery: BroadcastDiscoveryService
    confirm: (message: string) => Promise<boolean>
    displayTable: (headers: string[], rows: string[][]) => void
}

/**
 * Main service for Foundry integration
 */
export class FoundryService {
    constructor(private deps: FoundryServiceDependencies) {}

    /**
     * Push Foundry deployment artifacts to ABI Registry
     */
    async push(options: FoundryPushOptions, config: FoundryConfig): Promise<void> {
        const foundryConfig = config || {}
        const label = options.label

        // Determine which scripts to process
        const scriptsToProcess = this.getScriptsToProcess(options, foundryConfig)

        console.log(`🔨 Processing ${scriptsToProcess.length} deploy script(s)...`)

        // Collect all ABIs from all scripts
        const allAbis: PushAbiInput[] = []

        for (const scriptDir of scriptsToProcess) {
            console.log(`\n📜 Script: ${scriptDir}`)

            const abis = await this.processScript(scriptDir, options, foundryConfig, label)
            allAbis.push(...abis)
        }

        if (allAbis.length === 0) {
            throw new Error('No ABIs to push. Check your deploy scripts and configuration.')
        }

        // Show confirmation table
        this.showConfirmationTable(allAbis)

        // Ask for confirmation unless --yes flag is provided
        if (!options.yes) {
            console.log('\n⚠️  You are about to push these ABIs to the registry.')
            const confirmed = await this.deps.confirm('Do you want to continue?')

            if (!confirmed) {
                console.log('❌ Operation cancelled by user')
                process.exit(0)
            }
        }

        // Push to registry
        await this.pushToRegistry(allAbis)
    }

    private getScriptsToProcess(options: FoundryPushOptions, foundryConfig: FoundryConfig): string[] {
        if (options.scriptDir) {
            // CLI flag takes precedence
            return [options.scriptDir]
        } else if (foundryConfig.scripts && foundryConfig.scripts.length > 0) {
            // Use scripts array from config
            return foundryConfig.scripts.map(s => s.name)
        } else if (foundryConfig.scriptDir) {
            // Fallback to legacy scriptDir
            return [foundryConfig.scriptDir]
        } else {
            throw new Error(
                'Script directory is required.\n' +
                'Provide it via --script flag or set "foundry.scripts" in abiregistry.config.json'
            )
        }
    }

    private async processScript(
        scriptDir: string,
        options: FoundryPushOptions,
        foundryConfig: FoundryConfig,
        label?: string
    ): Promise<PushAbiInput[]> {
        const filename = options.filename || 'run-latest.json'
        const broadcastPaths = await this.deps.broadcastDiscovery.findBroadcastFiles(scriptDir, filename)

        if (broadcastPaths.length === 0) {
            const cwd = this.deps.fs.getCwd()
            const broadcastDir = this.deps.fs.join(cwd, 'broadcast', scriptDir)
            const directPath = this.deps.fs.join(broadcastDir, filename)
            
            console.warn(`⚠️  Skipping ${scriptDir} - no broadcast files found`)
            console.warn(`      Searched: ${directPath}`)
            console.warn(`      And subdirectories in: ${broadcastDir}`)
            return []
        }

        this.logBroadcastPaths(broadcastPaths, scriptDir)

        const allAbis: PushAbiInput[] = []

        // Process each broadcast file (one per chain)
        for (const broadcastPath of broadcastPaths) {
            const abis = await this.processBroadcastFile(broadcastPath, broadcastPaths.length, scriptDir, foundryConfig, label)
            allAbis.push(...abis)
        }

        return allAbis
    }

    private logBroadcastPaths(broadcastPaths: string[], scriptDir: string): void {
        if (broadcastPaths.length > 1) {
            console.log(`   📂 Found ${broadcastPaths.length} deployment(s):`)
            for (const p of broadcastPaths) {
                const cwd = this.deps.fs.getCwd()
                console.log(`      - ${this.deps.fs.relative(cwd, p)}`)
            }
        } else {
            const cwd = this.deps.fs.getCwd()
            console.log(`   📂 Found: ${this.deps.fs.relative(cwd, broadcastPaths[0])}`)
        }
    }

    private async processBroadcastFile(
        broadcastPath: string,
        totalBroadcasts: number,
        scriptDir: string,
        foundryConfig: FoundryConfig,
        label?: string
    ): Promise<PushAbiInput[]> {
        // Parse broadcast file
        const broadcast = await this.deps.broadcastParser.parseBroadcastFile(broadcastPath)
        const network = this.deps.broadcastParser.getNetworkFromChainId(broadcast.chain)

        // Extract deployment timestamp
        const deployedAt = broadcast.timestamp ? new Date(broadcast.timestamp) : new Date()

        if (totalBroadcasts > 1) {
            console.log(`\n   🔗 Chain: ${network} (${broadcast.chain})`)
        }
        console.log(`      📡 Network: ${network} (Chain ID: ${broadcast.chain})`)
        console.log(`      ⏰ Deployment: ${deployedAt.toISOString()}`)

        // Detect ERC1967 proxies automatically
        const detectedProxies = this.deps.broadcastParser.detectProxies(broadcast.transactions)

        // Extract CREATE transactions (contract deployments)
        let deployments = broadcast.transactions.filter(
            (tx) => tx.transactionType === 'CREATE'
        )

        if (deployments.length === 0) {
            console.warn(`      ⚠️  No contract deployments found on chain ${broadcast.chain}`)
            return []
        }

        // Get contract filter for this specific script
        const scriptConfig = foundryConfig.scripts?.find(s => s.name === scriptDir)
        const contractConfigs = scriptConfig?.contracts

        // Build contract config map (includes auto-detected proxies)
        const contractConfigMap = this.buildContractConfigMap(contractConfigs, detectedProxies)

        // Add auto-detected proxies to deployments list
        for (const proxyMapping of detectedProxies) {
            deployments.push({
                transactionType: 'CREATE',
                contractName: `${proxyMapping.implementationName}Proxy`,
                contractAddress: proxyMapping.proxyAddress,
                function: null
            })
        }

        // Filter deployments if needed
        deployments = this.filterDeployments(deployments, contractConfigs, broadcast)

        if (deployments.length === 0) {
            return []
        }

        // Process each deployment
        const abis: PushAbiInput[] = []
        for (const deployment of deployments) {
            const abi = await this.processDeployment(
                deployment,
                contractConfigMap,
                network,
                broadcast.chain,
                deployedAt,
                label
            )
            if (abi) {
                abis.push(abi)
            }
        }

        return abis
    }

    private buildContractConfigMap(
        contractConfigs: Array<{ name: string; proxy?: { implementation: string } }> | undefined,
        detectedProxies: ProxyMapping[]
    ): Map<string, { name: string; proxy?: { implementation: string } }> {
        const contractConfigMap = new Map<string, { name: string; proxy?: { implementation: string } }>()

        // Add manual configs
        if (contractConfigs) {
            for (const config of contractConfigs) {
                contractConfigMap.set(config.name, config)
            }
        }

        // Add auto-detected proxies
        for (const proxyMapping of detectedProxies) {
            const proxyName = `${proxyMapping.implementationName}Proxy`
            contractConfigMap.set(proxyName, {
                name: proxyName,
                proxy: { implementation: proxyMapping.implementationName }
            })
        }

        return contractConfigMap
    }

    private filterDeployments(
        deployments: FoundryTransaction[],
        contractConfigs: Array<{ name: string }> | undefined,
        broadcast: any
    ): FoundryTransaction[] {
        if (contractConfigs && contractConfigs.length > 0) {
            const before = deployments.length
            const allowedNames = contractConfigs.map(c => c.name)
            const filtered = deployments.filter((tx) => allowedNames.includes(tx.contractName ?? ''))

            if (filtered.length === 0) {
                console.warn(
                    `      ⚠️  No matching contracts found. Config allows: [${allowedNames.join(', ')}]\n` +
                    `      But broadcast contains: [${broadcast.transactions
                        .filter((tx: FoundryTransaction) => tx.transactionType === 'CREATE')
                        .map((tx: FoundryTransaction) => tx.contractName)
                        .join(', ')}]`
                )
                return []
            }

            console.log(`      📝 Found ${before} deployment(s), filtered to ${filtered.length}`)
            return filtered
        } else {
            console.log(`      📝 Found ${deployments.length} deployment(s)`)
            return deployments
        }
    }

    private async processDeployment(
        deployment: FoundryTransaction,
        contractConfigMap: Map<string, { name: string; proxy?: { implementation: string } }>,
        network: string,
        chainId: number,
        deployedAt: Date,
        label?: string
    ): Promise<PushAbiInput | null> {
        if (!deployment.contractName) {
            return null
        }

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

            const abi = await this.deps.abiLoader.loadContractAbi(contractToLoad)
            const abiHash = calculateAbiHash(abi)

            if (isProxy) {
                console.log(`         ✅ Implementation ABI loaded: ${contractToLoad}`)
            } else {
                console.log(`         ✅ ABI loaded from out/ folder`)
            }
            console.log(`         🔐 Hash: ${abiHash.substring(0, 10)}...`)

            return {
                contractName: deployment.contractName,
                network,
                label,
                address: deployment.contractAddress,
                chainId,
                deployedAt,
                abiHash,
                abi,
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error(`         ❌ Failed to load ABI: ${message}`)
            throw error
        }
    }

    private showConfirmationTable(allAbis: PushAbiInput[]): void {
        console.log('\n📋 ABIs ready to push:\n')

        const tableRows = allAbis.map((abi) => [
            abi.contractName,
            abi.address.substring(0, 10) + '...',
            abi.network || 'unknown',
            abi.label || '(no label)',
            `${abi.abi.length} entries`,
        ])

        this.deps.displayTable(
            ['Contract', 'Address', 'Network', 'Label', 'ABI Size'],
            tableRows
        )
    }

    private async pushToRegistry(allAbis: PushAbiInput[]): Promise<void> {
        console.log(`\n🚀 Pushing ${allAbis.length} ABI(s) to registry...`)

        let newCount = 0
        let duplicateCount = 0

        try {
            for (const abi of allAbis) {
                const result = await this.deps.client.push(abi)
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
}

