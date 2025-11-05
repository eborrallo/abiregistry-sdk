import type { FileSystemService } from './FileSystemService'

export interface FoundryTransaction {
    transactionType: 'CREATE' | 'CALL'
    contractName: string | null
    contractAddress: string
    function: string | null
    additionalContracts?: FoundryAdditionalContract[]
}

export interface FoundryAdditionalContract {
    transactionType: 'CREATE'
    contractName: string | null
    address: string
    initCode: string
}

export interface FoundryBroadcast {
    transactions: FoundryTransaction[]
    chain: number
    timestamp?: number
}

export interface ProxyMapping {
    proxyAddress: string
    implementationName: string
    deploymentIndex: number
}

/**
 * Service for parsing Foundry broadcast files
 */
export class BroadcastParserService {
    constructor(private fs: FileSystemService) {}

    async parseBroadcastFile(filePath: string): Promise<FoundryBroadcast> {
        const content = await this.fs.readFile(filePath)
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
     * Detect ERC1967 proxies in broadcast transactions
     * ERC1967 proxies are identified by:
     * 1. A CALL transaction that deploys additional contracts
     * 2. One of the additional contracts is the proxy (small init code, no contract name)
     * 3. The CREATE transaction before it is the implementation
     */
    detectProxies(transactions: FoundryTransaction[]): ProxyMapping[] {
        const proxies: ProxyMapping[] = []

        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i]

            // Look for CALL transactions with additionalContracts (proxy deployment pattern)
            if (tx.transactionType === 'CALL' && tx.additionalContracts && tx.additionalContracts.length > 0) {
                // Find potential proxy contracts (usually have small init code and no contract name)
                const proxyContracts = tx.additionalContracts.filter(contract =>
                    !contract.contractName && contract.initCode.length < 500
                )

                if (proxyContracts.length > 0) {
                    // Look for the implementation (usually the most recent CREATE transaction before this CALL)
                    for (let j = i - 1; j >= 0; j--) {
                        const prevTx = transactions[j]
                        if (prevTx.transactionType === 'CREATE' && prevTx.contractName) {
                            // Found implementation - map each proxy to this implementation
                            for (const proxyContract of proxyContracts) {
                                proxies.push({
                                    proxyAddress: proxyContract.address,
                                    implementationName: prevTx.contractName,
                                    deploymentIndex: i
                                })
                                console.log(`      🔍 Auto-detected ERC1967 Proxy:`)
                                console.log(`         Proxy: ${proxyContract.address}`)
                                console.log(`         Implementation: ${prevTx.contractName} (${prevTx.contractAddress})`)
                            }
                            break
                        }
                    }
                }
            }
        }

        return proxies
    }

    getNetworkFromChainId(chainId: number): string {
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
}

