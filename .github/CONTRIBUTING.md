# Contributing to @abiregistry/sdk

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/eborrallo/abiregistry-sdk.git
   cd abiregistry-sdk
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run tests**:
   ```bash
   pnpm test
   ```

4. **Build the project**:
   ```bash
   pnpm build
   ```

## Development Workflow

1. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes** and ensure:
   - Tests pass: `pnpm test`
   - Linter passes: `pnpm lint`
   - Build succeeds: `pnpm build`
   - Coverage is maintained: `pnpm test:coverage`

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Use conventional commits:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test updates
   - `chore:` - Maintenance tasks

4. **Push and create a Pull Request**:
   ```bash
   git push origin feature/my-new-feature
   ```

## Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use descriptive variable names

## Testing

- Write tests for all new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Mock external dependencies (Etherscan, API calls)

Run tests:
```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage report
```

## Adding New Chains

To add support for a new blockchain:

1. **Update `etherscan.ts`**:
   ```typescript
   const ETHERSCAN_CONFIGS: Record<number, EtherscanConfig> = {
     // ... existing chains
     137: {
       apiUrl: 'https://api.polygonscan.com/api',
       apiKey: process.env.POLYGONSCAN_API_KEY,
     },
   }
   ```

2. **Update `getChainName()`**:
   ```typescript
   const names: Record<number, string> = {
     // ... existing names
     137: 'polygon',
   }
   ```

3. **Add tests** in `etherscan.test.ts`

4. **Update documentation** in README.md

## Project Structure

```
src/
├── cli/              # CLI commands
│   ├── index.ts      # CLI entry point
│   ├── config.ts     # Config management
│   ├── push.ts       # Push command
│   ├── pull.ts       # Pull command
│   ├── fetch.ts      # Fetch command
│   └── etherscan.ts  # Etherscan integration
├── __tests__/        # Test files
├── client.ts         # SDK client
├── generator.ts      # Code generator
├── types.ts          # TypeScript types
└── index.ts          # Main export
```

## Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Update relevant documentation
- Add/update tests
- Ensure CI passes
- Link to related issues

## Questions?

- Open an issue for questions
- Check existing issues first
- Be respectful and constructive

Thank you for contributing! 🎉

