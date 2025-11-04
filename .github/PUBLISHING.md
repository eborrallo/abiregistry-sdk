# 📦 How to Publish the SDK to NPM

Simple guide to publish `@abiregistry/sdk` using GitHub Releases.

---

## 🚀 Publishing Workflow

### **The Process:**

```
1. Push changes to main
   ↓
2. Release Drafter creates draft release (automatic)
   ↓
3. Review draft in GitHub Releases
   ↓
4. Click "Publish release"
   ↓
5. Workflow publishes to NPM (automatic)
```

---

## 📋 Step-by-Step Guide

### **Step 1: Push Your Changes**

```bash
git add .
git commit -m "feat: add foundry init command"
git push origin main
```

### **Step 2: Wait for Release Drafter**

- Release Drafter runs automatically when you push to main
- Creates or updates a **draft release**
- Auto-generates release notes from your commits
- Suggests the next version number

### **Step 3: Go to Releases**

1. Open your GitHub repository
2. Click the **"Releases"** tab (right side)
3. You'll see a draft release at the top

### **Step 4: Edit the Draft**

1. Click **"Edit"** on the draft release
2. Review the auto-generated release notes
3. Update the **tag** if needed:
   - `v0.1.4` - Patch (bug fixes)
   - `v0.2.0` - Minor (new features)
   - `v1.0.0` - Major (breaking changes)
4. Update the **title**: "Release v0.2.0"
5. Add any additional notes or screenshots

### **Step 5: Publish! 🎯**

1. Uncheck **"Set as a pre-release"** (if checked)
2. Click the big green **"Publish release"** button
3. This triggers the publish workflow automatically!

### **Step 6: Workflow Runs**

Watch the progress (or wait for completion):

```
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
✅ Run tests (all must pass!)
✅ Build package
✅ Publish to NPM
```

### **Step 7: Verify**

Check that everything worked:

1. **NPM:** https://www.npmjs.com/package/@abiregistry/sdk
   - New version should appear
   - Download stats update

2. **GitHub Release:**
   - Release is now public (not draft)
   - Shows up in Releases tab

3. **Test Installation:**
   ```bash
   npm install @abiregistry/sdk@latest
   npx abiregistry --help
   ```

---

## 🎯 Version Numbering Guide

### **Semantic Versioning:**

| Type | Current | Next | When to Use |
|------|---------|------|-------------|
| **Patch** | 0.1.2 | 0.1.3 | 🐛 Bug fixes, docs, cleanup |
| **Minor** | 0.1.3 | 0.2.0 | ✨ New features (backward compatible) |
| **Major** | 0.2.0 | 1.0.0 | 💥 Breaking changes |

### **Examples:**

**Patch (0.1.2 → 0.1.3):**
- Fixed typo in error message
- Updated README
- Fixed broken CLI flag

**Minor (0.1.3 → 0.2.0):**
- Added `foundry init` command ✅
- Added proxy support ✅
- Added multi-chain support ✅

**Major (0.2.0 → 1.0.0):**
- Changed config file structure (breaking)
- Removed deprecated commands
- Changed API interface

---

## 🔐 One-Time Setup

### **NPM Token:**

1. **Create token on NPM:**
   - Go to https://www.npmjs.com/
   - Log in → Profile → **Access Tokens**
   - Click **"Generate New Token"**
   - Select **"Automation"** type
   - Copy the token (starts with `npm_...`)

2. **Add to GitHub:**
   - GitHub repository → **Settings**
   - **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - Name: `NPM_TOKEN`
   - Value: (paste your token)
   - Click **"Add secret"**

---

## 💡 Tips & Best Practices

### **Before Publishing:**

✅ Run tests locally:
```bash
cd packages/sdk
npm test
```

✅ Build locally:
```bash
npm run build
```

✅ Test the CLI:
```bash
./dist/cli.js --help
```

✅ Update documentation if needed

### **Choosing the Right Version:**

- **v0.x.x** → Pre-release, can have breaking changes freely
- **v1.0.0** → First stable release (use when API is stable)
- **v1.x.x** → Stable versions, backward compatible only
- **v2.0.0+** → Major versions with breaking changes

### **Release Notes:**

Release Drafter auto-generates notes, but you can enhance them:

```markdown
## 🚀 Features
- Added `foundry init` command for easy setup
- Added proxy contract support in Foundry integration
- Added multi-chain deployment support

## 🐛 Bug Fixes
- Fixed broadcast file path detection

## 📚 Documentation
- Updated README with new examples
- Added PUBLISHING.md guide
```

---

## 📊 Workflow Overview

### **What Happens:**

```
Your Action                    GitHub Actions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. git push origin main  ────→  Release Drafter runs
                                 ├─ Analyzes commits
                                 ├─ Suggests version
                                 └─ Creates draft release

2. GitHub → Releases
   Review draft ✓
   Update tag: v0.2.0
   Click "Publish release"  ──→  Publish workflow triggers
                                 ├─ npm ci
                                 ├─ npm test
                                 ├─ npm run build
                                 └─ npm publish
                                     ↓
3. Package published! ✅   ←────  Published to NPM

4. npm install @abiregistry/sdk
   Users get new version! 🎉
```

---

## ❌ Troubleshooting

### **Tests Failed:**

```
Error: Tests must pass before publishing
```

**Solution:**
- Fix the failing tests locally
- Push the fixes to main
- Create a new release (or edit the draft)
- Publish again

### **"Version already exists on NPM":**

```
Error: You cannot publish over previously published versions
```

**Solution:**
- Update the tag to a higher version
- Edit the release
- Change tag from `v0.1.3` to `v0.1.4`
- Publish again

### **"NPM_TOKEN not set":**

```
Error: npm ERR! need auth
```

**Solution:**
- Add NPM_TOKEN to GitHub secrets (see setup above)
- Make sure it's an **Automation** token
- Re-publish the release

### **"Package not found after publishing":**

**Wait a few minutes:**
- NPM can take 1-2 minutes to update
- Check again after a short wait

---

## 🎉 Success Checklist

After publishing, verify:

- [ ] NPM shows new version: https://www.npmjs.com/package/@abiregistry/sdk
- [ ] GitHub release is published (not draft)
- [ ] Git tag exists in repository
- [ ] Can install: `npm install @abiregistry/sdk@latest`
- [ ] CLI works: `npx abiregistry --help`
- [ ] Documentation is up to date

---

## 📞 Need Help?

- Check workflow logs in GitHub Actions
- Review NPM package page
- Check GitHub release status
- Verify NPM_TOKEN is set correctly

---

**Publishing is now as simple as clicking "Publish release" in GitHub!** 🚀

No command-line steps needed - just review and click!
