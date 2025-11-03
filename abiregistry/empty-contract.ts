/**
 * EmptyContract
 * Network: mainnet
 * Chain ID: 1
 * Address: 0x1234567890123456789012345678901234567890
 * Version: 1.0.0
 */

export const emptyContractAbi = [
  {
    "type": "function",
    "name": "test"
  }
] as const

export const emptyContractAddress = '0x1234567890123456789012345678901234567890' as const

export const emptyContractChainId = 1

export const emptyContractConfig = {
    address: emptyContractAddress,
    abi: emptyContractAbi,
    chainId: emptyContractChainId,
} as const
