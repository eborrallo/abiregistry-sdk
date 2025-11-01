import * as fs from 'fs'
import * as path from 'path'

export type ContractConfig = {
    chain: number
    address: string
    name: string
}

export type AbiRegistryCliConfig = {
    apiKey?: string
    outDir?: string
    contracts?: ContractConfig[]
}

const CONFIG_FILE_NAME = 'abiregistry.config.json'

/**
 * Load configuration from file, environment variables, and defaults
 */
export function loadConfig(overrides: Partial<AbiRegistryCliConfig> = {}): AbiRegistryCliConfig {
    const fileConfig = loadConfigFile()
    const envConfig = loadEnvConfig()

    return {
        ...fileConfig,
        ...envConfig,
        ...overrides,
    }
}

/**
 * Load configuration from abiregistry.config.json
 */
function loadConfigFile(): Partial<AbiRegistryCliConfig> {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)

    if (!fs.existsSync(configPath)) {
        return {}
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(content) as AbiRegistryCliConfig
    } catch (error) {
        console.warn(`Warning: Failed to parse ${CONFIG_FILE_NAME}:`, error)
        return {}
    }
}

/**
 * Load configuration from environment variables
 * Only API key should come from env (it's a secret)
 */
function loadEnvConfig(): Partial<AbiRegistryCliConfig> {
    return {
        apiKey: process.env.ABI_REGISTRY_API_KEY || process.env.ABIREGISTRY_API_KEY,
        outDir: process.env.ABI_REGISTRY_OUT_DIR || process.env.ABIREGISTRY_OUT_DIR,
    }
}

/**
 * Validate required configuration
 */
export function validateConfig(config: AbiRegistryCliConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.apiKey) {
        errors.push('API key is required. Set ABI_REGISTRY_API_KEY environment variable')
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Create a sample config file
 */
export function createConfigFile(): void {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)

    if (fs.existsSync(configPath)) {
        console.error(`Error: ${CONFIG_FILE_NAME} already exists`)
        process.exit(1)
    }

    const sampleConfig: AbiRegistryCliConfig = {
        outDir: 'abiregistry',
        contracts: [
            {
                chain: 1,
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                name: 'USDC',
            },
        ],
    }

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8')
    console.log(`✅ Created ${CONFIG_FILE_NAME}`)
    console.log('⚠️  Remember to set your API key via ABI_REGISTRY_API_KEY environment variable')
    console.log('💡 Add contracts to fetch from Etherscan in the "contracts" array')
}

