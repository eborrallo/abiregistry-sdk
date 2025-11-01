import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadConfig, validateConfig, createConfigFile } from '../cli/config'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs and path
vi.mock('fs')
vi.mock('path')

describe('Config Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ABI_REGISTRY_API_KEY
    delete process.env.ABIREGISTRY_API_KEY

    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
    vi.spyOn(process, 'cwd').mockReturnValue('/test/dir')
  })

  describe('loadConfig', () => {
    it('should load config from environment variable', () => {
      process.env.ABI_REGISTRY_API_KEY = 'env-api-key'

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()

      expect(config.apiKey).toBe('env-api-key')
    })

    it('should support ABIREGISTRY_API_KEY alias', () => {
      process.env.ABIREGISTRY_API_KEY = 'env-api-key-alias'

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()

      expect(config.apiKey).toBe('env-api-key-alias')
    })

    it('should prefer ABI_REGISTRY_API_KEY over alias', () => {
      process.env.ABI_REGISTRY_API_KEY = 'primary-key'
      process.env.ABIREGISTRY_API_KEY = 'alias-key'

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()

      expect(config.apiKey).toBe('primary-key')
    })

    it('should accept config from overrides', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig({
        outDir: 'custom-dir',
        contracts: [
          {
            chain: 1,
            address: '0x1234567890123456789012345678901234567890',
            name: 'TestContract',
          },
        ],
      })

      expect(config.outDir).toBe('custom-dir')
      expect(config.contracts).toHaveLength(1)
      expect(config.contracts![0].name).toBe('TestContract')
    })

    it('should merge overrides with loaded config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          outDir: 'file-dir',
        })
      )

      const config = loadConfig({
        outDir: 'override-dir',
      })

      expect(config.outDir).toBe('override-dir')
    })

    it('should handle missing config file gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const config = loadConfig()

      expect(config).toBeDefined()
    })

    it('should handle malformed config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json{[')

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const config = loadConfig()

      expect(warnSpy).toHaveBeenCalled()
      expect(config).toBeDefined()

      warnSpy.mockRestore()
    })
  })

  describe('validateConfig', () => {
    it('should pass validation with API key', () => {
      const result = validateConfig({
        apiKey: 'test-key',
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation without API key', () => {
      const result = validateConfig({})

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('API key is required')
    })

    it('should allow optional fields to be missing', () => {
      const result = validateConfig({
        apiKey: 'test-key',
        // outDir and contracts are optional
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('createConfigFile', () => {
    it('should create config file with sample data', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      createConfigFile()

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('abiregistry.config.json'),
        expect.stringContaining('"outDir"'),
        'utf-8'
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created')
      )

      logSpy.mockRestore()
    })

    it('should exit if config file already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })

      expect(() => createConfigFile()).toThrow('process.exit called')
      expect(exitSpy).toHaveBeenCalledWith(1)

      exitSpy.mockRestore()
    })

    it('should include contracts example in created file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      let writtenContent = ''
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = content as string
      })

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      createConfigFile()

      const parsed = JSON.parse(writtenContent)
      expect(parsed.contracts).toBeDefined()
      expect(Array.isArray(parsed.contracts)).toBe(true)
      expect(parsed.contracts.length).toBeGreaterThan(0)
      expect(parsed.contracts[0]).toHaveProperty('chain')
      expect(parsed.contracts[0]).toHaveProperty('address')
      expect(parsed.contracts[0]).toHaveProperty('name')

      logSpy.mockRestore()
    })
  })
})

