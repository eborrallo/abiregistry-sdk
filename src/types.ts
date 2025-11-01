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
    version?: string
    abi: AbiEntry[]
}

export type AbiItem = {
    id: string
    contract: string
    network: string
    version: string
    syncedAt: string
    status: 'synced' | 'pending' | 'outdated'
    address: string
    abi: AbiEntry[]
}

export type PullOptions = {
    outDir?: string
    typescript?: boolean
}

export type GeneratedFile = {
    path: string
    content: string
}

export type ApiResponse<T> = {
    project?: T
    error?: string
}
