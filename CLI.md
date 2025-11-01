# ABI Registry CLI Guide

Complete guide for using the `@abiregistry/sdk` command-line interface.

## Installation

```bash
npm install -g @abiregistry/sdk
# or use npx without installing
npx abiregistry <command>
```

## Setup

### 1. Initialize Configuration

```bash
npx abiregistry init
```

This creates `abiregistry.config.json`:
```json
{
  "projectId": "your-project-id",
  "baseUrl": "https://abiregistry.com",
  "outDir": "abiregistry"
}
```

### 2. Set API Key

```bash
# Copy env.example to .env
cp node_modules/@abiregistry/sdk/env.example .env

# Edit .env and add your API key
echo "ABI_REGISTRY_API_KEY=your-api-key-here" > .env

# Load environment variables
source .env  # or use dotenv
```

## Commands

### `push` - Upload ABIs

Upload ABIs from your project to the registry.

#### Push from Directory

```bash
npx abiregistry push --path ./abis
```

Scans the directory for all `.json` files and pushes them.

#### Push Single File

```bash
npx abiregistry push --path ./MyContract.json
```

**Note:** Project ID and base URL come from `abiregistry.config.json`. Only the API key is an environment variable.

#### ABI File Formats

**Option 1: Metadata Object** (Recommended)
```json
{
  "contractName": "MyToken",
  "address": "0x1234567890123456789012345678901234567890",
  "chainId": 1,
  "network": "mainnet",
  "version": "1.0.0",
  "abi": [
    {
      "type": "function",
      "name": "transfer",
      "stateMutability": "nonpayable",
      "inputs": [...],
      "outputs": [...]
    }
  ]
}
```

**Option 2: Raw ABI Array**
```json
[
  {
    "type": "function",
    "name": "transfer",
    "stateMutability": "nonpayable",
    "inputs": [...],
    "outputs": [...]
  }
]
```

If using raw ABI, the CLI will:
- Use filename as contract name
- Require you to provide address via filename or separately
- Default to mainnet (chainId: 1)

### `pull` - Download ABIs

Download ABIs and generate typed contract files.

#### Basic Pull

```bash
npx abiregistry pull
```

Generates TypeScript files in `./abiregistry/`:
```
abiregistry/
├── index.ts
├── types.ts
├── my-token.ts
└── payment-processor.ts
```

#### Pull with JavaScript

```bash
npx abiregistry pull --js
```

Generates JavaScript files instead.

#### Custom Output Directory

```bash
npx abiregistry pull --out ./contracts
```

Generates files in `./contracts/` instead of `./abiregistry/`.

## Workflows

### Smart Contract Team Workflow

1. Deploy contracts and extract ABIs
2. Save ABIs to `./abis` directory
3. Push to registry:
   ```bash
   npx abiregistry push --path ./abis
   ```

### Frontend/Backend Team Workflow

1. Pull ABIs and generate typed files:
   ```bash
   npx abiregistry pull
   ```

2. Import in your code:
   ```typescript
   import { myTokenConfig } from './abiregistry/my-token'
   
   const contract = useContract(myTokenConfig)
   ```

3. Set up auto-sync in `package.json`:
   ```json
   {
     "scripts": {
       "sync-abis": "abiregistry pull",
       "predev": "npm run sync-abis",
       "prebuild": "npm run sync-abis"
     }
   }
   ```

## CI/CD Integration

### GitHub Actions

```yaml
name: Sync ABIs
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Pull ABIs
        env:
          ABI_REGISTRY_API_KEY: ${{ secrets.ABI_REGISTRY_API_KEY }}
        run: |
          npx abiregistry pull --project ${{ vars.PROJECT_ID }}
      
      - name: Commit changes
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add abiregistry/
          git diff --quiet || git commit -m "chore: sync ABIs"
          git push
```

### GitLab CI

```yaml
sync-abis:
  image: node:20
  script:
    - npx abiregistry pull --project $PROJECT_ID
  only:
    - schedules
  variables:
    ABI_REGISTRY_API_KEY: $ABI_REGISTRY_API_KEY
```

## Troubleshooting

### API Key Not Found

```
❌ Configuration errors:
  - API key is required
```

**Solution:** Set `ABI_REGISTRY_API_KEY` environment variable or use `--api-key` flag.

### Project ID Required

```
❌ Configuration errors:
  - Project ID is required
```

**Solution:** Use `--project` flag, set in config file, or use `ABI_REGISTRY_PROJECT_ID` env var.

### No JSON Files Found

```
❌ Error: No .json files found
```

**Solution:** Ensure `--path` points to `.json` file(s) or directory containing them.

### Permission Denied

```
❌ Failed to push: Insufficient permissions
```

**Solution:** Verify your API key has write permissions for the project.

## Advanced Usage

### Using Config File + Environment Variables

```bash
# abiregistry.config.json
{
  "projectId": "edf99400-6739-438f-9f8b-5b6f323a1048",
  "outDir": "src/contracts"
}

# .env
ABI_REGISTRY_API_KEY=your-secret-key

# Now you can run without flags
npx abiregistry push --path ./abis
npx abiregistry pull
```

### Multiple Projects

```bash
# Push to production project
npx abiregistry push --project prod-project-id --path ./abis

# Pull from staging project
npx abiregistry pull --project staging-project-id --out ./abis-staging
```

### Custom Base URL (Self-hosted)

```bash
# Set in config file
{
  "projectId": "your-project-id",
  "baseUrl": "https://registry.yourcompany.com"
}

# Or via environment variable
export ABI_REGISTRY_BASE_URL="https://registry.yourcompany.com"
npx abiregistry pull --project <project-id>
```

## Best Practices

1. **Keep API Keys Secret**
   - Never commit `.env` or config files with API keys
   - Use environment variables in CI/CD
   - Add `.env` and `abiregistry.config.json` to `.gitignore`

2. **Commit Generated Files**
   - Commit the `abiregistry/` folder to version control
   - This ensures your team has the latest ABIs
   - Makes builds reproducible

3. **Automate Syncing**
   - Add sync commands to `package.json` scripts
   - Run before dev/build to ensure fresh ABIs
   - Use CI/CD for automatic updates

4. **Use Import Aliases**
   ```json
   {
     "imports": {
       "#abiregistry/*": "./abiregistry/*"
     }
   }
   ```

## Learn More

- [Main README](./README.md) - SDK programmatic usage
- [Examples](./abiregistry/) - Code examples
- [API Docs](https://abiregistry.com/docs) - Full documentation

