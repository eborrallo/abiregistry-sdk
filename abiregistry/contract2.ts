/**
 * Contract2
 * Network: mainnet
 * Chain ID: 1
 * Address: 0x2222222222222222222222222222222222222222
 * Version: 1.0.0
 */

export const contract2Abi = [
  {
    "type": "function",
    "name": "test"
  }
] as const

export const contract2Address = '0x2222222222222222222222222222222222222222' as const

export const contract2ChainId = 1

export const contract2Config = {
    address: contract2Address,
    abi: contract2Abi,
    chainId: contract2ChainId,
} as const
