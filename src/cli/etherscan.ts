type EtherscanConfig = {
  apiUrl: string
  apiKey?: string
}

const ETHERSCAN_CONFIGS: Record<number, EtherscanConfig> = {
  1: {
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  11155111: {
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

type EtherscanAbiResponse = {
  status: string
  message: string
  result: string | unknown[]
}

export async function fetchAbiFromEtherscan(chainId: number, address: string): Promise<unknown[]> {
  const config = ETHERSCAN_CONFIGS[chainId]

  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: 1 (mainnet), 11155111 (sepolia)`)
  }

  // Etherscan API works without key but has rate limits
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getabi',
    address,
  })

  if (config.apiKey) {
    params.set('apikey', config.apiKey)
  }

  const url = `${config.apiUrl}?${params.toString()}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Etherscan API request failed: ${response.statusText}`)
    }

    const data = (await response.json()) as EtherscanAbiResponse

    if (data.status !== '1') {
      throw new Error(data.message || 'Failed to fetch ABI from Etherscan')
    }

    // Etherscan returns ABI as a JSON string
    if (typeof data.result === 'string') {
      return JSON.parse(data.result) as unknown[]
    }

    // Sometimes it's already parsed
    if (Array.isArray(data.result)) {
      return data.result
    }

    throw new Error('Unexpected ABI format from Etherscan')
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch ABI from Etherscan')
  }
}

export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'mainnet',
    11155111: 'sepolia',
  }
  return names[chainId] || String(chainId)
}

