import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchCommand } from '../cli/fetch'
import * as etherscan from '../cli/etherscan'
import { getChainName } from '../cli/etherscan'

// Mock dependencies
vi.mock('../client')
vi.mock('../cli/etherscan', async () => {
  const actual = await vi.importActual('../cli/etherscan')
  return {
    ...actual,
    fetchAbiFromEtherscan: vi.fn(),
    fetchAbiWithProxyDetection: vi.fn(),
  }
})

describe('Fetch Command', () => {
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush = vi.fn().mockResolvedValue(undefined)

    // Mock AbiRegistry
    vi.doMock('../client', () => ({
      AbiRegistry: vi.fn().mockImplementation(() => ({
        push: mockPush,
      })),
    }))

    // Mock console methods
    global.console.log = vi.fn()
    global.console.error = vi.fn()
    global.console.warn = vi.fn()
  })

  describe('with CLI arguments', () => {
    it('should fetch single contract from CLI args', async () => {
      const mockAbi = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ]

      vi.mocked(etherscan.fetchAbiWithProxyDetection).mockResolvedValueOnce(mockAbi)

      await fetchCommand({
        chain: 1,
        address: '0x1234567890123456789012345678901234567890',
        name: 'TestContract',
      })

      expect(etherscan.fetchAbiWithProxyDetection).toHaveBeenCalledWith(
        1,
        '0x1234567890123456789012345678901234567890',
        undefined
      )
    })

    it('should validate all required CLI args are present', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(
        fetchCommand({
          chain: 1,
          address: '0x1234567890123456789012345678901234567890',
          // Missing name
        })
      ).rejects.toThrow('process.exit called')

      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
    })
  })

  describe('with config file', () => {
    it('should fetch multiple contracts from config', async () => {
      const mockAbi = [{ type: 'function', name: 'test' }]

      vi.mocked(etherscan.fetchAbiWithProxyDetection).mockResolvedValue(mockAbi)

      const contracts = [
        {
          chain: 1,
          address: '0x1111111111111111111111111111111111111111',
          name: 'Contract1',
        },
        {
          chain: 11155111,
          address: '0x2222222222222222222222222222222222222222',
          name: 'Contract2',
        },
      ]

      await fetchCommand({
        contracts,
      })

      expect(etherscan.fetchAbiWithProxyDetection).toHaveBeenCalledTimes(2)
      expect(etherscan.fetchAbiWithProxyDetection).toHaveBeenCalledWith(1, '0x1111111111111111111111111111111111111111', undefined)
      expect(etherscan.fetchAbiWithProxyDetection).toHaveBeenCalledWith(11155111, '0x2222222222222222222222222222222222222222', undefined)
    })

    it('should exit if no contracts provided', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(
        fetchCommand({})
      ).rejects.toThrow('process.exit called')

      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should handle Etherscan fetch errors', async () => {
      vi.mocked(etherscan.fetchAbiWithProxyDetection).mockRejectedValueOnce(
        new Error('Contract not verified')
      )

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(
        fetchCommand({
          contracts: [
            {
              chain: 1,
              address: '0x1234567890123456789012345678901234567890',
              name: 'TestContract',
            },
          ],
        })
      ).rejects.toThrow('process.exit called')

      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
    })

    it('should continue processing other contracts if one fails', async () => {
      const mockAbi = [{ type: 'function', name: 'test' }]

      vi.mocked(etherscan.fetchAbiWithProxyDetection)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockAbi)

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(
        fetchCommand({
          contracts: [
            {
              chain: 1,
              address: '0x1111111111111111111111111111111111111111',
              name: 'Contract1',
            },
            {
              chain: 1,
              address: '0x2222222222222222222222222222222222222222',
              name: 'Contract2',
            },
          ],
        })
      ).rejects.toThrow('process.exit called')

      expect(etherscan.fetchAbiWithProxyDetection).toHaveBeenCalledTimes(2)
      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
    })

    it('should handle empty ABI arrays', async () => {
      vi.mocked(etherscan.fetchAbiWithProxyDetection).mockResolvedValueOnce([])

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      await expect(
        fetchCommand({
          contracts: [
            {
              chain: 1,
              address: '0x1234567890123456789012345678901234567890',
              name: 'EmptyContract',
            },
          ],
        })
      ).rejects.toThrow('process.exit called')

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No ABI found')
      )
      exitSpy.mockRestore()
    })
  })

  describe('chain name mapping', () => {
    it('should map chain IDs to network names', () => {
      expect(getChainName(1)).toBe('mainnet')
      expect(getChainName(11155111)).toBe('sepolia')
      expect(getChainName(137)).toBe('polygon')
      expect(getChainName(42161)).toBe('arbitrum')
      expect(getChainName(56)).toBe('bsc')
      expect(getChainName(10)).toBe('optimism')
      expect(getChainName(8453)).toBe('base')
    })

    it('should return string chain ID for unmapped chains', () => {
      expect(getChainName(999999)).toBe('999999')
      expect(getChainName(12345)).toBe('12345')
    })
  })
})

