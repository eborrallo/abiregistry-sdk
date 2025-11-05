import type { FileSystemService } from './FileSystemService'
import type { AbiEntry } from '../../types'

/**
 * Service for loading ABIs from Foundry artifacts
 */
export class AbiLoaderService {
    constructor(private fs: FileSystemService) { }

    /**
     * Load ABI for a contract from Foundry out directory
     * Matches broadcast contract names with compiled artifacts
     */
    async loadContractAbi(contractName: string): Promise<AbiEntry[]> {
        // Foundry structure: out/<ContractName>.sol/<ContractName>.json
        const cwd = this.fs.getCwd()
        const abiPath = this.fs.join(cwd, 'out', `${contractName}.sol`, `${contractName}.json`)

        try {
            const content = await this.fs.readFile(abiPath)
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
}

