type EtherscanConfig = {
  chainId: number
  name: string
}

// Etherscan API V2 - unified endpoint for all chains
// https://docs.etherscan.io/v2-migration
const ETHERSCAN_V2_BASE_URL = 'https://api.etherscan.io/v2/api'

const SUPPORTED_CHAINS: Record<number, EtherscanConfig> = {
  1: {
    chainId: 1,
    name: 'mainnet',
  },
  11155111: {
    chainId: 11155111,
    name: 'sepolia',
  },
  // More chains can be added - V2 supports 60+ networks
  56: {
    chainId: 56,
    name: 'bsc',
  },
  137: {
    chainId: 137,
    name: 'polygon',
  },
  42161: {
    chainId: 42161,
    name: 'arbitrum',
  },
  10: {
    chainId: 10,
    name: 'optimism',
  },
  8453: {
    chainId: 8453,
    name: 'base',
  },
}

type EtherscanAbiResponse = {
  status: string
  message: string
  result: string | unknown[]
}

export async function fetchAbiFromEtherscan(chainId: number, address: string): Promise<unknown[]> {
  const config = SUPPORTED_CHAINS[chainId]

  if (!config) {
    const supportedChainIds = Object.keys(SUPPORTED_CHAINS).join(', ')
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chains: ${supportedChainIds}\n` +
      `See https://docs.etherscan.io/getting-started/supported-chains for all available chains.`
    )
  }

  // Etherscan API V2 - unified endpoint with chainid parameter
  // https://docs.etherscan.io/v2-migration
  const params = new URLSearchParams({
    chainid: String(chainId), // V2 requires chainid parameter
    module: 'contract',
    action: 'getabi',
    address,
  })

  // Add API key if available (optional but recommended for higher rate limits)
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (apiKey) {
    params.set('apikey', apiKey)
  }

  const url = `${ETHERSCAN_V2_BASE_URL}?${params.toString()}`

  try {
    console.log(`Fetching ABI from Etherscan V2 (${config.name})...`)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Etherscan API request failed: ${response.statusText}`)
    }

    const data = (await response.json()) as EtherscanAbiResponse

    if (data.status !== '1') {
      // Check for V1 deprecation error
      if (data.message?.includes('deprecated V1 endpoint')) {
        throw new Error(
          'Etherscan API V1 is deprecated. Please update to V2.\n' +
          'See https://docs.etherscan.io/v2-migration for details.'
        )
      }
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
  const config = SUPPORTED_CHAINS[chainId]
  return config?.name || String(chainId)
}

/**
 * Get implementation address for a proxy contract
 * Supports EIP-1967 (most common) and EIP-1822 (UUPS) proxies
 */
export async function getProxyImplementation(chainId: number, proxyAddress: string): Promise<string | null> {
  const config = SUPPORTED_CHAINS[chainId]

  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  // EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1
  // = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
  const params = new URLSearchParams({
    chainid: String(chainId),
    module: 'proxy',
    action: 'eth_getStorageAt',
    address: proxyAddress,
    position: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    tag: 'latest',
  })

  const apiKey = process.env.ETHERSCAN_API_KEY
  if (apiKey) {
    params.set('apikey', apiKey)
  }

  const url = `${ETHERSCAN_V2_BASE_URL}?${params.toString()}`

  try {
    console.log(`Checking if ${proxyAddress} is a proxy contract...`)
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const data = await response.json() as EtherscanAbiResponse

    if (data.status !== '1' || typeof data.result !== 'string') {
      return null
    }

    // Result is a hex string, convert to address
    const implementationHex = data.result
    
    if (!implementationHex || implementationHex === '0x' || implementationHex === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null
    }

    // Extract address from storage slot (last 40 hex chars)
    const implementationAddress = '0x' + implementationHex.slice(-40)
    
    console.log(`✓ Proxy detected! Implementation: ${implementationAddress}`)
    return implementationAddress
  } catch (error) {
    console.debug('Failed to check proxy implementation:', error)
    return null
  }
}

/**
 * Fetch ABI for a contract, handling proxy detection
 */
export async function fetchAbiWithProxyDetection(
  chainId: number,
  address: string,
  isProxy?: boolean
): Promise<unknown[]> {
  let targetAddress = address

  // If explicitly marked as proxy, get implementation
  if (isProxy) {
    console.log(`Contract marked as proxy, fetching implementation...`)
    const implementation = await getProxyImplementation(chainId, address)
    
    if (!implementation) {
      throw new Error(`Failed to get implementation address for proxy ${address}`)
    }
    
    targetAddress = implementation
  }

  // Fetch the ABI
  return fetchAbiFromEtherscan(chainId, targetAddress)
}

