# Changelog

All notable changes to the ABI Registry SDK will be documented in this file.

## [0.1.0] - 2025-11-01

### Added

- Initial release of @abiregistry/sdk
- **AbiRegistry Client** - Programmatic API for push/pull operations
- **CLI Tool** - Command-line interface (`npx abiregistry`)
- **Etherscan Integration** - Fetch ABIs directly from verified contracts
- **Code Generation** - Automatic TypeScript/JavaScript file generation
- **Simplified Configuration** - Only API key required
- **Type Safety** - Full TypeScript support with `as const` assertions
- **Multi-library Support** - Compatible with Viem, Ethers.js, Wagmi
- **Network Filtering** - Filter ABIs by network or address
- **Comprehensive Tests** - 88 tests with 60%+ coverage

### Features

#### Client API
- `push()` - Upload ABIs to registry
- `pull()` - Download ABIs from registry
- `pullAndGenerate()` - Pull and generate typed files
- `getAbi()` - Get specific ABI by ID
- `getByNetwork()` - Filter by network
- `getByAddress()` - Filter by address

#### CLI Commands
- `init` - Create config file
- `fetch` - Fetch ABIs from Etherscan (mainnet & sepolia)
- `push` - Upload ABIs from files/directories
- `pull` - Download and generate typed files
- `help` - Show usage information

#### Code Generator
- TypeScript generation with type safety
- JavaScript generation
- Automatic file organization
- Smart naming (kebab-case files, camelCase variables)
- Network to Chain ID mapping
- Config objects for easy integration

### Documentation
- Comprehensive README with examples
- CLI usage guide (CLI.md)
- Example folder with ERC20 reference
- Integration examples (Viem, Ethers.js, Wagmi)
- Foundry integration guide

### Testing
- Unit tests for all major components
- Integration tests for core functionality
- Mocked server responses
- 84%+ code coverage
- Vitest test runner

