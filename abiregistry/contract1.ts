/**
 * Contract1
 * Network: mainnet
 * Chain ID: 1
 * Address: 0x1111111111111111111111111111111111111111
 * Version: v1
 */

export const contract1Abi = [
  {
    "type": "function",
    "name": "test"
  }
] as const

export const contract1Address = '0x1111111111111111111111111111111111111111' as const

export const contract1ChainId = 1

export const contract1Config = {
    address: contract1Address,
    abi: contract1Abi,
    chainId: contract1ChainId,
} as const
