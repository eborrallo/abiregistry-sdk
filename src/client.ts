import * as fs from 'fs'
import * as path from 'path'
import type { AbiRegistryConfig, PushAbiInput, AbiItem, ApiResponse, PullOptions, GeneratedFile } from './types'
import { CodeGenerator } from './generator'

export class AbiRegistry {
    private apiKey: string
    private projectId: string
    private baseUrl: string

    constructor(config: AbiRegistryConfig) {
        this.apiKey = config.apiKey
        this.projectId = config.projectId
        this.baseUrl = config.baseUrl || 'https://abiregistry.com'
    }

    /**
     * Push an ABI to the registry
     */
    async push(input: PushAbiInput): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/abis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                contractName: input.contractName,
                address: input.address,
                chainId: input.chainId,
                network: input.network,
                version: input.version,
                abi: input.abi,
            }),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({})) as ApiResponse<unknown>
            throw new Error(data.error || `Failed to push ABI: ${response.statusText}`)
        }
    }

    /**
     * Pull all ABIs from the registry
     */
    async pull(): Promise<AbiItem[]> {
        const response = await fetch(`${this.baseUrl}/api/projects/${this.projectId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({})) as ApiResponse<unknown>
            throw new Error(data.error || `Failed to pull ABIs: ${response.statusText}`)
        }

        const data = await response.json() as ApiResponse<{ abis: AbiItem[] }>
        return data.project?.abis || []
    }

    /**
     * Pull ABIs and generate typed contract files
     */
    async pullAndGenerate(options: PullOptions = {}): Promise<GeneratedFile[]> {
        const outDir = options.outDir || 'generated'
        const typescript = options.typescript !== false

        // Pull ABIs
        const abis = await this.pull()

        if (abis.length === 0) {
            console.warn('No ABIs found in the registry')
            return []
        }

        // Generate files
        const generator = new CodeGenerator(typescript)
        const files = generator.generateFiles(abis)

        // Write files to disk
        const fullOutDir = path.resolve(process.cwd(), outDir)

        // Create output directory
        if (!fs.existsSync(fullOutDir)) {
            fs.mkdirSync(fullOutDir, { recursive: true })
        }

        // Write each file
        for (const file of files) {
            const filePath = path.join(fullOutDir, file.path)
            fs.writeFileSync(filePath, file.content, 'utf-8')
        }

        console.log(`✅ Generated ${files.length} files in ${outDir}/`)

        return files
    }

    /**
     * Get a specific ABI by ID
     */
    async getAbi(abiId: string): Promise<AbiItem | null> {
        const abis = await this.pull()
        return abis.find((abi) => abi.id === abiId) || null
    }

    /**
     * Get ABIs filtered by network
     */
    async getByNetwork(network: string): Promise<AbiItem[]> {
        const abis = await this.pull()
        return abis.filter((abi) => abi.network.toLowerCase() === network.toLowerCase())
    }

    /**
     * Get ABIs filtered by contract address
     */
    async getByAddress(address: string): Promise<AbiItem[]> {
        const abis = await this.pull()
        return abis.filter((abi) => abi.address.toLowerCase() === address.toLowerCase())
    }
}

