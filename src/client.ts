import type { AbiRegistryConfig, PushAbiInput, AbiItem, ApiResponse } from './types'

export class AbiRegistry {
  private apiKey: string
  private projectId: string
  private baseUrl: string

  constructor(config: AbiRegistryConfig) {
    this.apiKey = config.apiKey
    this.projectId = config.projectId
    this.baseUrl = config.baseUrl || 'https://abiregistry.dev'
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

