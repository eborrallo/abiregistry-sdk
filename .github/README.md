# GitHub Actions Workflows

This directory contains automated workflows for the ABI Registry SDK.

## Workflows

### 📦 `publish.yml` - Publish to NPM

**Triggers when you publish a draft release** - Publishes the SDK to NPM automatically.

**Triggers:**
- When a **draft release** is **published** on GitHub

**Steps:**
1. ✅ Runs tests automatically
2. ✅ Builds package
3. ✅ Publishes to NPM

**How to Publish:**

1. **Create a draft release** (Release Drafter does this automatically, or create manually):
   - Go to repository → **Releases**
   - Click **"Draft a new release"**
   - Choose/create a tag (e.g., `v0.1.4`)
   - Add release title: "Release v0.1.4"
   - Add release notes (or use auto-generated from Release Drafter)
   - Click **"Save draft"**

2. **Publish the release:**
   - Go to repository → **Releases**
   - Find your draft release
   - Click **"Edit"**
   - Click **"Publish release"** button

3. **Workflow runs automatically:**
   - Tests run ✅
   - Package builds ✅
   - Publishes to NPM ✅

**What Happens:**
```
1. You click "Publish release" in GitHub UI
   ↓
2. Workflow triggers automatically
   ↓
3. Tests run ✅
   ↓
4. Package builds ✅
   ↓
5. Publishes to NPM ✅
   ↓
6. Users can install: npm install @abiregistry/sdk
```

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

**Recommended Workflow:**

```bash
# 1. Make your changes and push to main
git add .
git commit -m "feat: add awesome feature"
git push origin main

# 2. Release Drafter automatically creates a draft release

# 3. Go to GitHub → Releases
# 4. Find your draft release
# 5. Click "Edit"
# 6. Review release notes
# 7. Update tag/version if needed (e.g., v0.1.4)
# 8. Click "Publish release"
# 
# GitHub Action will automatically:
# ✅ Run tests
# ✅ Build the package
# ✅ Publish to NPM
```

**Manual Publish (if needed):**

```bash
# 1. Bump version locally
npm version patch  # or minor, or major

# 2. Push changes
git push origin main --tags

# 3. Create a release on GitHub with the tag

# 4. Publish the release → triggers workflow
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

