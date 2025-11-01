import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AbiRegistry } from '../client'
import * as fs from 'fs'
import * as path from 'path'
import type { AbiItem } from '../types'

// Mock fs module
vi.mock('fs')
vi.mock('path')

// Mock fetch globally
global.fetch = vi.fn()

describe('pullAndGenerate', () => {
  let client: AbiRegistry
  const mockApiKey = 'test-api-key'
  const mockProjectId = 'test-project-id'

  const mockAbis: AbiItem[] = [
    {
      id: 'abi-1',
      contract: 'ERC20Token',
      network: 'mainnet',
      version: '1.0.0',
      syncedAt: '2025-01-01T12:00:00Z',
      status: 'synced',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      abi: [
        {
          type: 'function',
          name: 'balanceOf',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
    },
  ]

  beforeEach(() => {
    client = new AbiRegistry({
      apiKey: mockApiKey,
      projectId: mockProjectId,
      baseUrl: 'https://test.abiregistry.com',
    })
    vi.clearAllMocks()

    // Mock fs functions
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'))
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should pull ABIs and generate files', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    const files = await client.pullAndGenerate({
      outDir: './test-output',
      typescript: true,
    })

    expect(files).toHaveLength(3) // abi file, index file, types file
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3)
  })

  it('should create output directory if it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    await client.pullAndGenerate({
      outDir: './test-output',
      typescript: true,
    })

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.anything(),
      { recursive: true }
    )
  })

  it('should not create directory if it already exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    await client.pullAndGenerate({
      outDir: './test-output',
      typescript: true,
    })

    expect(fs.mkdirSync).not.toHaveBeenCalled()
  })

  it('should use default outDir if not provided', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    await client.pullAndGenerate()

    expect(path.resolve).toHaveBeenCalledWith(
      expect.any(String),
      'abiregistry'
    )
  })

  it('should generate TypeScript files by default', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    const files = await client.pullAndGenerate()

    const tsFiles = files.filter((f) => f.path.endsWith('.ts'))
    expect(tsFiles.length).toBeGreaterThan(0)
  })

  it('should generate JavaScript files when typescript is false', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    const files = await client.pullAndGenerate({ typescript: false })

    const jsFiles = files.filter((f) => f.path.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)
  })

  it('should return empty array if no ABIs found', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: [] } }),
    })

    const files = await client.pullAndGenerate()

    expect(files).toEqual([])
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('should write files with correct content', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: mockAbis } }),
    })

    const files = await client.pullAndGenerate({
      outDir: './test-output',
      typescript: true,
    })

    // Check that each generated file was written
    files.forEach((file) => {
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(file.path),
        file.content,
        'utf-8'
      )
    })
  })

  it('should handle multiple ABIs', async () => {
    const multipleAbis: AbiItem[] = [
      mockAbis[0],
      {
        ...mockAbis[0],
        id: 'abi-2',
        contract: 'NFTContract',
        address: '0x2222222222222222222222222222222222222222',
      },
      {
        ...mockAbis[0],
        id: 'abi-3',
        contract: 'GovernanceToken',
        address: '0x3333333333333333333333333333333333333333',
      },
    ]

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { abis: multipleAbis } }),
    })

    const files = await client.pullAndGenerate()

    // Should have 3 contract files + 1 index + 1 types = 5 files
    expect(files).toHaveLength(5)
  })

  it('should throw error if pull fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Invalid API key' }),
    })

    await expect(client.pullAndGenerate()).rejects.toThrow('Invalid API key')
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })
})

