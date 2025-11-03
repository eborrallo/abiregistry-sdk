export type AbiRegistryConfig = {
    apiKey: string
}

export type AbiEntry = {
    type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive'
    name?: string
    inputs?: Array<{
        name?: string
        type: string
        indexed?: boolean
        components?: unknown[]
    }>
    outputs?: Array<{
        name?: string
        type: string
        components?: unknown[]
    }>
    stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable'
    anonymous?: boolean
}

export type PushAbiInput = {
    contractName: string
    address: string
    chainId: number
    network?: string
    label?: string          // Optional label (e.g., "Initial", "Post-Audit", cannot be "latest")
    deployedAt?: Date      // Deployment timestamp (auto-extracted from Foundry)
    abiHash?: string       // SHA-256 hash of ABI (auto-calculated)
    abi: AbiEntry[]
    // Note: version is auto-incremented by the server (1, 2, 3, ...)
}

export type AbiItem = {
    id: string
    contractName: string    // Human-readable contract name
    contract: string        // Deprecated: use contractName (kept for backward compatibility)
    network: string         // Human-readable chain name (e.g., "Ethereum Mainnet")
    address: string
    chainId: number
    abi: AbiEntry[]

    // Version tracking
    version?: number        // Auto-incremented version number (1, 2, 3, ...)
    label?: string          // Optional label (e.g., "Initial", "Post-Audit")
    deployedAt: string      // ISO timestamp when deployed
    pushedAt: string        // ISO timestamp when pushed to registry
    abiHash: string         // SHA-256 hash for duplicate detection
    isLatest: boolean       // Is this the current version for this address?
}

export type PullOptions = {
    outDir?: string
    typescript?: boolean
}

export type GeneratedFile = {
    path: string
    content: string
}

export type ApiResponse<T> = T & {
    error?: string
}
