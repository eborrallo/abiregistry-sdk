import type { FileSystemService } from './FileSystemService'
import type { BroadcastParserService } from './BroadcastParserService'

export interface ScriptDiscovery {
    scriptName: string
    contracts: Array<{
        name: string
        proxy?: { implementation: string }
    }>
}

/**
 * Service for scanning broadcast folder and discovering deployed contracts
 */
export class BroadcastScannerService {
    constructor(
        private fs: FileSystemService,
        private parser: BroadcastParserService
    ) {}

    /**
     * Scan the broadcast folder and discover all deploy scripts with their contracts
     * Automatically detects proxies and builds config structure
     */
    async scanBroadcastFolder(): Promise<ScriptDiscovery[]> {
        const cwd = this.fs.getCwd()
        const broadcastDir = this.fs.join(cwd, 'broadcast')

        try {
            await this.fs.access(broadcastDir)
        } catch {
            // No broadcast folder exists
            return []
        }

        const scripts: ScriptDiscovery[] = []

        try {
            const entries = await this.fs.readdir(broadcastDir, { withFileTypes: true })

            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.endsWith('.s.sol')) {
                    const scriptName = entry.name
                    const scriptDiscovery = await this.scanScript(broadcastDir, scriptName)
                    
                    if (scriptDiscovery) {
                        scripts.push(scriptDiscovery)
                    }
                }
            }
        } catch (error) {
            console.warn('Warning: Could not read broadcast directory:', error)
            return []
        }

        return scripts
    }

    /**
     * Scan a specific script directory and extract contracts
     */
    private async scanScript(broadcastDir: string, scriptName: string): Promise<ScriptDiscovery | null> {
        const scriptDir = this.fs.join(broadcastDir, scriptName)
        const contracts = new Set<string>()
        const proxyMappings = new Map<string, string>() // proxy name -> implementation name

        try {
            // Try direct path first (old format)
            const directPath = this.fs.join(scriptDir, 'run-latest.json')
            try {
                await this.fs.access(directPath)
                await this.processBroadcastFile(directPath, contracts, proxyMappings)
            } catch {
                // Try chainId subdirectories (new format)
                const entries = await this.fs.readdir(scriptDir, { withFileTypes: true })
                
                for (const entry of entries) {
                    if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                        const chainPath = this.fs.join(scriptDir, entry.name, 'run-latest.json')
                        try {
                            await this.fs.access(chainPath)
                            await this.processBroadcastFile(chainPath, contracts, proxyMappings)
                        } catch {
                            // This chain doesn't have run-latest.json
                            continue
                        }
                    }
                }
            }

            if (contracts.size === 0) {
                return null
            }

            // Build contract configs
            const contractConfigs = Array.from(contracts).map(contractName => {
                const implementation = proxyMappings.get(contractName)
                if (implementation) {
                    return {
                        name: contractName,
                        proxy: { implementation }
                    }
                }
                return { name: contractName }
            })

            return {
                scriptName,
                contracts: contractConfigs
            }
        } catch (error) {
            console.warn(`Warning: Could not scan script ${scriptName}:`, error)
            return null
        }
    }

    /**
     * Process a broadcast file and extract contract names and proxy mappings
     */
    private async processBroadcastFile(
        filePath: string,
        contracts: Set<string>,
        proxyMappings: Map<string, string>
    ): Promise<void> {
        try {
            const broadcast = await this.parser.parseBroadcastFile(filePath)
            
            // Detect proxies first
            const detectedProxies = this.parser.detectProxies(broadcast.transactions)
            
            // Build a set of implementation names that have proxies
            const implementationsWithProxies = new Set(
                detectedProxies.map(p => p.implementationName)
            )
            
            // Add all CREATE transactions (except implementations that have proxies)
            for (const tx of broadcast.transactions) {
                if (tx.transactionType === 'CREATE' && tx.contractName) {
                    // Skip implementation if it has a proxy (we'll add the proxy instead)
                    if (!implementationsWithProxies.has(tx.contractName)) {
                        contracts.add(tx.contractName)
                    }
                }
            }
            
            // Add detected proxies (these replace their implementations in the config)
            for (const proxy of detectedProxies) {
                const proxyName = `${proxy.implementationName}Proxy`
                contracts.add(proxyName)
                proxyMappings.set(proxyName, proxy.implementationName)
            }
        } catch (error) {
            // Ignore invalid broadcast files
            console.warn(`Warning: Could not parse ${filePath}:`, error)
        }
    }
}

