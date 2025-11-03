import * as fs from 'fs'
import * as path from 'path'
import { config as loadDotenv } from 'dotenv'

export type ContractConfig = {
    chain: number
    address: string
    name: string
    isProxy?: boolean  // If true, fetch implementation ABI instead
}

export type FoundryConfig = {
    scriptDir?: string  // Default script directory (e.g., "Deploy.s.sol")
    contracts?: string[]  // Specific contract names to push (if empty, push all)
    version?: string  // Default version for ABIs
}

export type AbiRegistryCliConfig = {
    apiKey?: string
    outDir?: string
    contracts?: ContractConfig[]
    foundry?: FoundryConfig
}

const CONFIG_FILE_NAME = 'abiregistry.config.json'

/**
 * Load configuration from file, environment variables, and defaults
 * Priority order (highest to lowest):
 * 1. Command-line overrides
 * 2. Environment variables
 * 3. Config file (abiregistry.config.json)
 * 4. .env file
 */
export function loadConfig(overrides: Partial<AbiRegistryCliConfig> = {}): AbiRegistryCliConfig {
    // Load .env file first (lowest priority)
    loadDotenvFile()

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
 * Load .env file from current working directory
 * Supports .env, .env.local, and .env.production
 */
function loadDotenvFile(): void {
    const cwd = process.cwd()

    // Try loading in priority order
    const envFiles = [
        path.join(cwd, '.env.local'),      // Local overrides (highest priority)
        path.join(cwd, '.env'),            // Default .env file
    ]

    for (const envFile of envFiles) {
        if (fs.existsSync(envFile)) {
            loadDotenv({ path: envFile })
            // Don't break - dotenv will merge, with first values taking precedence
        }
    }
}

/**
 * Load configuration from environment variables
 * Supports multiple variable name formats for flexibility
 */
function loadEnvConfig(): Partial<AbiRegistryCliConfig> {
    return {
        // API Key - try multiple formats
        apiKey: process.env.ABI_REGISTRY_API_KEY ||
            process.env.ABIREGISTRY_API_KEY ||
            process.env.API_KEY,

        // Output directory
        outDir: process.env.ABI_REGISTRY_OUT_DIR ||
            process.env.ABIREGISTRY_OUT_DIR,
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
                isProxy: false,
            },
        ],
        foundry: {
            scriptDir: 'Deploy.s.sol',
            contracts: [],  // Empty = push all deployed contracts
            version: '1.0.0',
        },
    }

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8')
    console.log(`✅ Created ${CONFIG_FILE_NAME}`)
    console.log('⚠️  Remember to set your API key via ABI_REGISTRY_API_KEY environment variable')
    console.log('💡 Add contracts to fetch from Etherscan in the "contracts" array')
    console.log('💡 Configure Foundry defaults in the "foundry" section')
}

/**
 * Check if config file exists
 */
export function configFileExists(): boolean {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)
    return fs.existsSync(configPath)
}

