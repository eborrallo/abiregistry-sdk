import type { AbiItem, GeneratedFile } from './types'

export class CodeGenerator {
    private typescript: boolean

    constructor(typescript = true) {
        this.typescript = typescript
    }

    /**
     * Generate files for all ABIs
     */
    generateFiles(abis: AbiItem[]): GeneratedFile[] {
        const files: GeneratedFile[] = []

        // Group identical ABIs (same contract name + chain + abiHash)
        const abiGroups = this.groupIdenticalAbis(abis)

        // Check for duplicate contract names across networks
        const contractNames = new Map<string, AbiItem[]>()
        for (const abi of abiGroups) {
            const existing = contractNames.get(abi.contract) || []
            existing.push(abi)
            contractNames.set(abi.contract, existing)
        }

        // Generate individual ABI files with network suffix if needed
        for (const abi of abiGroups) {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            files.push(this.generateAbiFile(abi, needsNetworkSuffix))
        }

        // Generate index file
        files.push(this.generateIndexFile(abiGroups, contractNames))

        // Generate types file (TypeScript only)
        if (this.typescript) {
            files.push(this.generateTypesFile(abiGroups, contractNames))
        }

        // Generate registry file with typed mapping
        files.push(this.generateRegistryFile(abiGroups, contractNames))

        return files
    }

    /**
     * Group identical ABIs deployed to multiple addresses
     * Returns one ABI per unique (contractName, chain, abiHash) with all addresses
     */
    private groupIdenticalAbis(abis: AbiItem[]): Array<AbiItem & { addresses: string[] }> {
        const grouped = new Map<string, AbiItem & { addresses: string[] }>()

        for (const abi of abis) {
            const key = `${abi.contract}_${abi.chainId}_${abi.abiHash}`

            if (grouped.has(key)) {
                const existing = grouped.get(key)!
                if (!existing.addresses.includes(abi.address)) {
                    existing.addresses.push(abi.address)
                }
            } else {
                grouped.set(key, {
                    ...abi,
                    addresses: [abi.address]
                })
            }
        }

        return Array.from(grouped.values())
    }

    /**
     * Generate individual ABI file
     */
    private generateAbiFile(abi: AbiItem, includeNetworkSuffix = false): GeneratedFile {
        const baseName = this.sanitizeFileName(abi.contract)
        const fileName = includeNetworkSuffix
            ? `${baseName}-${abi.network.toLowerCase()}`
            : baseName
        const ext = this.typescript ? '.ts' : '.js'

        const content = this.typescript
            ? this.generateTypeScriptAbiFile(abi, includeNetworkSuffix)
            : this.generateJavaScriptAbiFile(abi, includeNetworkSuffix)

        return {
            path: `${fileName}${ext}`,
            content,
        }
    }

    /**
     * Generate TypeScript ABI file
     */
    private generateTypeScriptAbiFile(abi: AbiItem & { addresses?: string[] }, includeNetworkSuffix = false): string {
        const varNameSuffix = includeNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
        const hasMultipleAddresses = abi.addresses && abi.addresses.length > 1
        const primaryAddress = abi.address

        const addressSection = hasMultipleAddresses
            ? `export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Addresses = ${JSON.stringify(abi.addresses, null, 2)} as const

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address = ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Addresses[0] // Primary address`
            : `export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address = '${primaryAddress}' as const`

        return `/**
 * ${abi.contract}
 * Network: ${abi.network}
 * Chain ID: ${abi.chainId}
 * ${hasMultipleAddresses ? `Addresses: ${abi.addresses!.length} instances` : `Address: ${primaryAddress}`}
 * Version: v${abi.version || 1}
 */

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Abi = ${JSON.stringify(abi.abi, null, 2)} as const

${addressSection}

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}ChainId = ${abi.chainId}

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Config = {
    ${hasMultipleAddresses ? 'addresses' : 'address'}: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address${hasMultipleAddresses ? 'es' : ''},
    abi: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Abi,
    chainId: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}ChainId,
} as const
`
    }

    /**
     * Generate JavaScript ABI file
     */
    private generateJavaScriptAbiFile(abi: AbiItem & { addresses?: string[] }, includeNetworkSuffix = false): string {
        const varNameSuffix = includeNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
        const hasMultipleAddresses = abi.addresses && abi.addresses.length > 1
        const primaryAddress = abi.address

        const addressSection = hasMultipleAddresses
            ? `export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Addresses = ${JSON.stringify(abi.addresses, null, 2)}

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address = ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Addresses[0] // Primary address`
            : `export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address = '${primaryAddress}'`

        return `/**
 * ${abi.contract}
 * Network: ${abi.network}
 * Chain ID: ${abi.chainId}
 * ${hasMultipleAddresses ? `Addresses: ${abi.addresses!.length} instances` : `Address: ${primaryAddress}`}
 * Version: v${abi.version || 1}
 */

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Abi = ${JSON.stringify(abi.abi, null, 2)}

${addressSection}

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}ChainId = ${abi.chainId}

export const ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Config = {
    ${hasMultipleAddresses ? 'addresses' : 'address'}: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Address${hasMultipleAddresses ? 'es' : ''},
    abi: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}Abi,
    chainId: ${this.sanitizeVariableName(abi.contract)}${varNameSuffix}ChainId,
}
`
    }

    /**
     * Generate index file that exports all ABIs
     */
    private generateIndexFile(abis: AbiItem[], contractNames: Map<string, AbiItem[]>): GeneratedFile {
        const ext = this.typescript ? '.ts' : '.js'
        const exports = abis.map((abi) => {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            const baseName = this.sanitizeFileName(abi.contract)
            const fileName = needsNetworkSuffix
                ? `${baseName}-${abi.network.toLowerCase()}`
                : baseName
            return `export * from './${fileName}'`
        })

        const content = `/**
 * Auto-generated ABI exports
 * Generated by @abiregistry/sdk
 */

${exports.join('\n')}

// Re-export registry for convenience
export { contracts } from './registry'
`

        return {
            path: `index${ext}`,
            content,
        }
    }

    /**
     * Generate types file for TypeScript
     */
    private generateTypesFile(abis: AbiItem[], contractNames: Map<string, AbiItem[]>): GeneratedFile {
        const typeDefinitions = abis.map((abi) => {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
            const baseName = this.sanitizeFileName(abi.contract)
            const fileName = needsNetworkSuffix
                ? `${baseName}-${abi.network.toLowerCase()}`
                : baseName
            const varName = this.sanitizeVariableName(abi.contract)
            return `export type ${varName}${varNameSuffix}Type = typeof import('./${fileName}').${varName}${varNameSuffix}Abi`
        })

        const content = `/**
 * Auto-generated types
 * Generated by @abiregistry/sdk
 */

${typeDefinitions.join('\n')}

export type AllAbis = {
${abis.map((abi) => {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
            const varName = this.sanitizeVariableName(abi.contract)
            return `    ${varName}${varNameSuffix}: ${varName}${varNameSuffix}Type`
        }).join('\n')}
}
`

        return {
            path: 'types.ts',
            content,
        }
    }

    /**
     * Sanitize contract name for file name
     */
    private sanitizeFileName(name: string): string {
        // Insert hyphens before capital letters (camelCase/PascalCase to kebab-case)
        const withHyphens = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2')

        return withHyphens
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase()
    }

    /**
     * Sanitize contract name for variable name
     */
    private sanitizeVariableName(name: string): string {
        // Split on non-alphanumeric characters and capital letters
        const withSpaces = name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Add space before capitals
            .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special chars with spaces

        const words = withSpaces.split(' ').filter(Boolean)

        if (words.length === 0) return 'contract'

        return words
            .map((word, index) => {
                const lower = word.toLowerCase()
                return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
            })
            .join('')
    }

    /**
     * Capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        if (!str) return ''
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }

    /**
     * Generate registry file with typed contract mapping
     */
    private generateRegistryFile(abis: AbiItem[], contractNames: Map<string, AbiItem[]>): GeneratedFile {
        // Group ABIs by network
        const byNetwork = new Map<string, Map<string, AbiItem>>()
        const chainIds = new Set<number>()

        for (const abi of abis) {
            const network = abi.network.toLowerCase()
            if (!byNetwork.has(network)) {
                byNetwork.set(network, new Map())
            }
            byNetwork.get(network)!.set(abi.contract, abi)
            chainIds.add(abi.chainId)
        }

        if (this.typescript) {
            return this.generateTypeScriptRegistry(abis, contractNames, byNetwork, chainIds)
        } else {
            return this.generateJavaScriptRegistry(abis, contractNames, byNetwork, chainIds)
        }
    }

    private generateTypeScriptRegistry(
        abis: AbiItem[],
        contractNames: Map<string, AbiItem[]>,
        byNetwork: Map<string, Map<string, AbiItem>>,
        chainIds: Set<number>
    ): GeneratedFile {
        // Generate imports
        const imports: string[] = []
        for (const abi of abis) {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
            const baseName = this.sanitizeFileName(abi.contract)
            const fileName = needsNetworkSuffix
                ? `${baseName}-${abi.network.toLowerCase()}`
                : baseName
            const varName = this.sanitizeVariableName(abi.contract)
            imports.push(`import { ${varName}${varNameSuffix}Config } from './${fileName}'`)
        }

        // Generate network objects
        const networkObjects: string[] = []
        for (const [network, contracts] of byNetwork) {
            const contractEntries: string[] = []
            for (const [contractName, abi] of contracts) {
                const duplicates = contractNames.get(contractName) || []
                const needsNetworkSuffix = duplicates.length > 1
                const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
                const varName = this.sanitizeVariableName(contractName)
                contractEntries.push(`    ${contractName}: ${varName}${varNameSuffix}Config`)
            }
            networkObjects.push(`  ${network}: {\n${contractEntries.join(',\n')}\n  }`)
        }

        const content = `/**
 * Auto-generated contract registry
 * Generated by @abiregistry/sdk
 * 
 * Access contracts by network name or chain ID:
 * - contracts.mainnet.MyToken
 * - contracts[1].MyToken
 */

${imports.join('\n')}

// Network-based contract registry
const networkContracts = {
${networkObjects.join(',\n')}
} as const

// Export with chain ID aliases
export const contracts = {
  ...networkContracts,
  // Chain ID aliases (point to same network objects)
${Array.from(chainIds).sort((a, b) => a - b).map(chainId => {
            const network = abis.find(abi => abi.chainId === chainId)?.network.toLowerCase()
            return network ? `  ${chainId}: networkContracts.${network}` : null
        }).filter(Boolean).join(',\n')}
} as const

// Type helpers
export type Network = keyof typeof contracts
export type ContractsOn<T extends Network> = T extends string | number 
  ? typeof contracts[T] extends object ? keyof typeof contracts[T] : never
  : never

/**
 * Get a contract config with full type safety
 * @example
 * const token = getContract('mainnet', 'MyToken')
 * const sameToken = getContract(1, 'MyToken')  // Same as above
 */
export function getContract<
  TNet extends Network,
  TName extends ContractsOn<TNet>
>(
  network: TNet,
  contractName: TName
): typeof contracts[TNet][TName] {
  return contracts[network][contractName]
}

/**
 * Get all deployments of a contract across networks
 */
export function getContractDeployments(contractName: string) {
  const deployments: Array<{
    network: string
    chainId: number
    config: any
  }> = []
  
  for (const [key, networkContracts] of Object.entries(contracts)) {
    if (typeof key === 'string' && !key.match(/^\\d+$/)) {
      const contract = (networkContracts as any)[contractName]
      if (contract) {
        deployments.push({
          network: key,
          chainId: contract.chainId,
          config: contract
        })
      }
    }
  }
  
  return deployments
}
`

        return {
            path: 'registry.ts',
            content,
        }
    }

    private generateJavaScriptRegistry(
        abis: AbiItem[],
        contractNames: Map<string, AbiItem[]>,
        byNetwork: Map<string, Map<string, AbiItem>>,
        chainIds: Set<number>
    ): GeneratedFile {
        // Generate imports
        const imports: string[] = []
        for (const abi of abis) {
            const duplicates = contractNames.get(abi.contract) || []
            const needsNetworkSuffix = duplicates.length > 1
            const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
            const baseName = this.sanitizeFileName(abi.contract)
            const fileName = needsNetworkSuffix
                ? `${baseName}-${abi.network.toLowerCase()}`
                : baseName
            const varName = this.sanitizeVariableName(abi.contract)
            imports.push(`const { ${varName}${varNameSuffix}Config } = require('./${fileName}')`)
        }

        // Generate network objects
        const networkObjects: string[] = []
        for (const [network, contracts] of byNetwork) {
            const contractEntries: string[] = []
            for (const [contractName, abi] of contracts) {
                const duplicates = contractNames.get(contractName) || []
                const needsNetworkSuffix = duplicates.length > 1
                const varNameSuffix = needsNetworkSuffix ? this.capitalizeFirst(abi.network) : ''
                const varName = this.sanitizeVariableName(contractName)
                contractEntries.push(`    ${contractName}: ${varName}${varNameSuffix}Config`)
            }
            networkObjects.push(`  ${network}: {\n${contractEntries.join(',\n')}\n  }`)
        }

        const content = `/**
 * Auto-generated contract registry
 * Generated by @abiregistry/sdk
 */

${imports.join('\n')}

// Network-based contract registry
const networkContracts = {
${networkObjects.join(',\n')}
}

// Export with chain ID aliases
const contracts = {
  ...networkContracts,
  // Chain ID aliases (point to same network objects)
${Array.from(chainIds).sort((a, b) => a - b).map(chainId => {
            const network = abis.find(abi => abi.chainId === chainId)?.network.toLowerCase()
            return network ? `  ${chainId}: networkContracts.${network}` : null
        }).filter(Boolean).join(',\n')}
}

function getContract(network, contractName) {
  return contracts[network][contractName]
}

function getContractDeployments(contractName) {
  const deployments = []
  
  for (const [key, networkContracts] of Object.entries(contracts)) {
    if (typeof key === 'string' && !key.match(/^\\d+$/)) {
      const contract = networkContracts[contractName]
      if (contract) {
        deployments.push({
          network: key,
          chainId: contract.chainId,
          config: contract
        })
      }
    }
  }
  
  return deployments
}

module.exports = { contracts, getContract, getContractDeployments }
`

        return {
            path: 'registry.js',
            content,
        }
    }
}

