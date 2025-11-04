# GitHub Actions Workflows

This directory contains automated workflows for the ABI Registry SDK.

## Workflows

### 📦 `publish.yml` - Publish to NPM

Automatically publishes the SDK to NPM when a new version tag is pushed.

**Triggers:**
- Push tags matching `v*` (e.g., `v0.1.3`, `v1.0.0`)
- Manual workflow dispatch (Actions tab in GitHub)

**Steps:**
1. Install dependencies
2. Run tests
3. Build package
4. Publish to NPM

**Usage:**

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Push the tag
git push origin v0.1.4

# 3. GitHub Action will automatically publish to NPM
```

**Manual Trigger:**
1. Go to GitHub Actions tab
2. Select "Publish SDK to NPM"
3. Click "Run workflow"

**Required Secrets:**
- `NPM_TOKEN` - Your NPM automation token

---

### 📝 `release-drafter.yml` - Release Notes

Automatically drafts release notes based on merged PRs and commits.

**Triggers:**
- Push to `main` branch
- Pull request events (opened, reopened, synchronize)

**Features:**
- Auto-categorizes changes (Features, Bug Fixes, Documentation, Maintenance)
- Auto-increments version (based on labels)
- Lists contributors

**Labels for Version Bumping:**
- `major` or `breaking` → Major version bump (1.0.0 → 2.0.0)
- `minor` or `feature` → Minor version bump (1.0.0 → 1.1.0)
- `patch`, `fix`, or `bugfix` → Patch version bump (1.0.0 → 1.0.1)

---

## Setup Instructions

### 1. NPM Token

Create an automation token on npmjs.com:

1. Log in to npmjs.com
2. Go to Account Settings → Access Tokens
3. Generate New Token → Automation
4. Copy the token

Add it to GitHub secrets:

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: (paste your token)
5. Click "Add secret"

### 2. Publishing Process

```bash
# Make your changes
git add .
git commit -m "feat: add awesome feature"

# Update version
npm version patch  # Creates tag and updates package.json

# Push changes and tag
git push origin main
git push origin --tags

# GitHub Action will automatically:
# 1. Run tests
# 2. Build the package
# 3. Publish to NPM
```

---

## Troubleshooting

### Publish Failed

**Check:**
1. NPM_TOKEN secret is set correctly
2. Package version doesn't already exist on NPM
3. All tests pass
4. Package name is available (not taken by another package)

### Release Drafter Not Working

**Check:**
1. Config file exists: `.github/release-drafter.yml`
2. Permissions are set correctly in workflow
3. GITHUB_TOKEN has write permissions

---

## Notes

- Workflows run in the context of `packages/sdk` directory
- Tests must pass before publishing
- Published package is public (@abiregistry/sdk)
- Version must be unique (cannot republish same version)

