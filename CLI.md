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

The CLI automatically loads your API key from:
1. Command-line flag: `--api-key=xxx`
2. Environment variables (current shell)
3. `.env` file (auto-loaded, **recommended**)
4. `.env.local` file (local overrides, auto-loaded)
5. `abiregistry.config.json` (not recommended for secrets)

**Recommended: Use `.env` file**
```bash
# Create .env file
echo "ABI_REGISTRY_API_KEY=your-api-key-here" > .env

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# That's it! The CLI will auto-load it
npx abiregistry fetch
```

**Alternative: Export environment variable**
```bash
# Export in current shell
export ABI_REGISTRY_API_KEY="your-api-key-here"

# Or prefix each command
ABI_REGISTRY_API_KEY="your-key" npx abiregistry fetch
```

**Supported variable names:**
- `ABI_REGISTRY_API_KEY` (recommended)
- `ABIREGISTRY_API_KEY` (alternative)
- `API_KEY` (fallback)

## Commands

### `fetch` - Fetch from Etherscan

Fetch ABIs from Etherscan for verified contracts and generate local files. **NO API key needed!**

#### Fetch Single Contract

```bash
npx abiregistry fetch --chain 1 --address 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --name USDC
```

#### Fetch Proxy Contract

Automatically fetch the implementation ABI for proxy contracts:

```bash
npx abiregistry fetch --chain 1 --address 0xProxyAddress... --name MyToken --proxy
```

The `--proxy` flag will:
1. Query the proxy contract to find the implementation address
2. Fetch the implementation contract's ABI
3. Use the implementation ABI (not the proxy ABI)

#### Fetch from Config File

Add contracts to `abiregistry.config.json`:
```json
{
  "outDir": "abiregistry",
  "contracts": [
    {
      "chain": 1,
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "name": "USDC"
    },
    {
      "chain": 1,
      "address": "0xProxyContractAddress...",
      "name": "USDCProxy",
      "isProxy": true
    },
    {
      "chain": 11155111,
      "address": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      "name": "SepoliaUSDC"
    }
  ]
}
```

Then run:
```bash
npx abiregistry fetch
```

#### Supported Chains

- `1` - Ethereum Mainnet
- `11155111` - Sepolia Testnet

#### Etherscan API Key

The fetch command works without an API key but has rate limits. For better performance:

```bash
export ETHERSCAN_API_KEY="your-etherscan-api-key"
```

Get your key at [https://etherscan.io/myapikey](https://etherscan.io/myapikey)

### `foundry` - Push Foundry Deployments

Push Foundry deployment artifacts from the broadcast folder to the registry.

#### Push Latest Deployment

```bash
# With confirmation prompt
npx abiregistry foundry --script DeployScript.s.sol

# Add a label for this deployment
npx abiregistry foundry --script DeployScript.s.sol --label "Post-Audit"

# Skip confirmation (for automation)
npx abiregistry foundry --script DeployScript.s.sol --yes
```

Reads from `broadcast/DeployScript.s.sol/run-latest.json` and extracts deployed contract ABIs.

#### Push Specific Broadcast

```bash
npx abiregistry foundry --script DeployScript.s.sol --file run-1234.json --label "Hotfix"
```

#### Use Config Defaults

Create `abiregistry.config.json`:
```json
{
  "foundry": {
    "scriptDir": "DeployScript.s.sol",
    "contracts": ["MyToken", "MyNFT"]
  }
}
```

Then run without flags:
```bash
npx abiregistry foundry
```

**How it works:**
1. Parses the broadcast JSON file to find CREATE transactions
2. Extracts deployment timestamps from Foundry data
3. Calculates ABI hash for duplicate detection
4. Filters contracts if specified in config (or pushes all)
5. Loads ABIs from the `out/` folder for each deployed contract
6. Shows confirmation table with contract details
7. Pushes ABIs to the registry
   - **Auto-increments version** (v1, v2, v3...)
   - **Skips duplicates** automatically
   - **Adds optional labels** for semantic meaning

**Features:**
- ✅ Versions auto-increment - you don't set them manually
- ✅ Duplicate detection - same ABI won't create duplicate versions
- ✅ Labels for context - "Production", "Staging", "Post-Audit", etc.
- ✅ Label "latest" is reserved and cannot be used
- ✅ Always shows what will be pushed before confirmation
- ✅ Use `--yes` flag to skip confirmation (for automation)

**Requirements:**
- Run `forge build` to compile contracts
- Run `forge script <script> --broadcast` to deploy
- Execute from your Foundry project root directory

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

**Option 1: Fetch from Etherscan (Easiest)**

1. Deploy and verify contracts on Etherscan
2. Add to `abiregistry.config.json`:
   ```json
   {
     "contracts": [
       {
         "chain": 1,
         "address": "0x...",
         "name": "MyContract"
       }
     ]
   }
   ```
3. Fetch:
   ```bash
   npx abiregistry fetch
   ```

**Option 2: Foundry Deployment** (Recommended)

1. Deploy contracts using Foundry:
   ```bash
   forge script script/Deploy.s.sol --broadcast --rpc-url $RPC_URL
   ```
2. Push to registry (with confirmation):
   ```bash
   npx abiregistry foundry --script Deploy.s.sol --label "Production"
   ```
3. Or skip confirmation for automation:
   ```bash
   npx abiregistry foundry --script Deploy.s.sol --label "Production" --yes
   ```

**What happens:**
- ✅ Version auto-increments (v1 → v2 → v3...)
- ✅ Duplicate ABIs are automatically skipped
- ✅ Deployment timestamp extracted from Foundry broadcast
- ✅ Label helps identify deployment context

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

## Automation

### Automated Deployment with Foundry

Integrate ABI pushing into your deployment scripts:

```bash
#!/bin/bash
# deploy.sh

# Deploy contracts
forge script script/Deploy.s.sol --broadcast --rpc-url $RPC_URL

# Push ABIs to registry (with auto-confirmation)
npx abiregistry foundry --script Deploy.s.sol --label "Production" --yes

echo "✅ Deployment and ABI sync complete!"
```

### CI/CD Integration

Use the `--yes` flag to skip confirmation prompts in automated environments:

```bash
# In your CI/CD pipeline
npx abiregistry foundry --script Deploy.s.sol --yes
```

**Security Note:** Store your `ABI_REGISTRY_API_KEY` as a secret in your CI/CD platform.

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
❌ Failed to push ABIs: Insufficient permissions
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
npx abiregistry foundry --script Deploy.s.sol
npx abiregistry pull
```

### Multiple Projects

```bash
# Push Foundry deployments to production project
npx abiregistry foundry --script Deploy.s.sol

# Pull from staging project
npx abiregistry pull --out ./abis-staging
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

