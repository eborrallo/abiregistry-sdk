import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchAbiFromEtherscan, getChainName } from '../cli/etherscan'

// Mock fetch globally
global.fetch = vi.fn()

describe('Etherscan Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ETHERSCAN_API_KEY
  })

  describe('fetchAbiFromEtherscan', () => {
    const mockAbi = [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
      },
    ]

    it('should fetch ABI from mainnet', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: JSON.stringify(mockAbi),
        }),
      })

      const abi = await fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')

      // V2 API uses unified endpoint with chainid parameter
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.etherscan.io/v2/api')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('chainid=1')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('module=contract')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action=getabi')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('address=0x1234567890123456789012345678901234567890')
      )
      expect(abi).toEqual(mockAbi)
    })

    it('should fetch ABI from sepolia', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: JSON.stringify(mockAbi),
        }),
      })

      const abi = await fetchAbiFromEtherscan(11155111, '0x1234567890123456789012345678901234567890')

      // V2 API uses unified endpoint with chainid parameter for all chains
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.etherscan.io/v2/api')
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('chainid=11155111')
      )
      expect(abi).toEqual(mockAbi)
    })

    it('should construct correct URL with parameters', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: JSON.stringify(mockAbi),
        }),
      })

      await fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(callUrl).toContain('module=contract')
      expect(callUrl).toContain('action=getabi')
      expect(callUrl).toContain('address=0x1234567890123456789012345678901234567890')
    })

    it('should work without API key', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: JSON.stringify(mockAbi),
        }),
      })

      await fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(callUrl).not.toContain('apikey=')
    })

    it('should handle already parsed ABI array', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: mockAbi, // Already an array, not a string
        }),
      })

      const abi = await fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      expect(abi).toEqual(mockAbi)
    })

    it('should throw error for unsupported chain', async () => {
      await expect(
        fetchAbiFromEtherscan(999, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Unsupported chain ID: 999')
    })

    it('should throw error when Etherscan returns error status', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          message: 'Contract source code not verified',
          result: '',
        }),
      })

      await expect(
        fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Contract source code not verified')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(
        fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Network error')
    })

    it('should handle HTTP errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Too Many Requests',
      })

      await expect(
        fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Too Many Requests')
    })

    it('should handle invalid JSON in result', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: 'invalid json{[',
        }),
      })

      await expect(
        fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow()
    })

    it('should handle unexpected result format', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '1',
          message: 'OK',
          result: { unexpected: 'format' },
        }),
      })

      await expect(
        fetchAbiFromEtherscan(1, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Unexpected ABI format')
    })
  })

  describe('getChainName', () => {
    it('should return mainnet for chain 1', () => {
      expect(getChainName(1)).toBe('mainnet')
    })

    it('should return sepolia for chain 11155111', () => {
      expect(getChainName(11155111)).toBe('sepolia')
    })

    it('should return chain ID as string for unknown chains', () => {
      expect(getChainName(999)).toBe('999')
    })

    it('should handle chain 0', () => {
      expect(getChainName(0)).toBe('0')
    })
  })
})

