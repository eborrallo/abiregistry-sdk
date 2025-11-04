# Publishing to NPM

Simple guide to manually publish `@abiregistry/sdk` to NPM.

## Prerequisites

1. **NPM Account**
   - Create an account at [npmjs.com](https://www.npmjs.com/signup)
   - Verify your email

2. **Organization Access** (for scoped packages)
   - Join the `@abiregistry` organization on NPM
   - Or change package name in `package.json` to use your own scope

3. **NPM Authentication**
   ```bash
   npm login
   # Enter your username, password, and email
   ```

## Publishing Process

### 1. Prepare the Release

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Ensure all tests pass
pnpm test

# Build the package
pnpm build
```

### 2. Update Version

Choose the appropriate version bump:

```bash
# For bug fixes (0.1.0 → 0.1.1)
npm version patch

# For new features (0.1.0 → 0.2.0)
npm version minor

# For breaking changes (0.1.0 → 1.0.0)
npm version major
```

This will:
- Update version in `package.json`
- Create a git commit
- Create a git tag

### 3. Update CHANGELOG

Edit `CHANGELOG.md` and add release notes:

```markdown
## [0.2.0] - 2024-01-15

### Added
- New `foundry init` command
- Multi-script support
- Proxy contract handling

### Fixed
- Broadcast path detection

### Changed
- Config structure for Foundry integration
```

```bash
# Commit the changelog
git add CHANGELOG.md
git commit --amend --no-edit
```

### 4. Push Changes

```bash
# Push commits and tags
git push origin main
git push origin --tags
```

### 5. Publish to NPM

```bash
# Publish as public package
npm publish --access public

# Or if you want to do a dry run first
npm publish --access public --dry-run
```

### 6. Verify Publication

1. **Check NPM:**
   - Visit: https://www.npmjs.com/package/@abiregistry/sdk
   - Verify new version is listed

2. **Test Installation:**
   ```bash
   # In a test directory
   npm install @abiregistry/sdk@latest
   npx abiregistry --help
   ```

## Semantic Versioning Guide

Follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0)
  - Breaking changes
  - Incompatible API changes
  - Remove/rename commands or options

- **MINOR** (1.0.0 → 1.1.0)
  - New features
  - Backward-compatible additions
  - New commands or options

- **PATCH** (1.0.0 → 1.0.1)
  - Bug fixes
  - Documentation updates
  - Performance improvements

## Troubleshooting

### "You do not have permission to publish"

**Solution:**
1. Verify you're logged in: `npm whoami`
2. Check organization membership
3. Or change package scope in `package.json`

### "You cannot publish over the previously published version"

**Solution:**
- Each version must be unique
- Run `npm version patch` (or minor/major) again
- Cannot unpublish and republish same version

### "Package name already taken"

**Solution:**
1. Change the package name in `package.json`
2. Or use your own scope: `@yourusername/abiregistry-sdk`
3. Or request package name transfer on NPM

### Tests Fail

**Solution:**
- Fix failing tests before publishing
- Run `pnpm test` locally to debug
- Ensure all dependencies are installed

## Quick Publish Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] Code builds successfully (`pnpm build`)
- [ ] Version bumped (`npm version patch|minor|major`)
- [ ] CHANGELOG.md updated
- [ ] Changes committed and tagged
- [ ] Pushed to remote (`git push && git push --tags`)
- [ ] Logged into NPM (`npm whoami`)
- [ ] Published (`npm publish --access public`)
- [ ] Verified on npmjs.com
- [ ] Test installation works

## Notes

- Always publish from the `main` branch
- Ensure working directory is clean (no uncommitted changes)
- The `prepublishOnly` script will run `pnpm build` automatically
- Published packages cannot be unpublished after 24-72 hours
- Be careful with version numbers - they cannot be reused

## Environment Variables

No environment variables are needed for publishing. Authentication is done via `npm login`.

For automation (CI/CD), you can use NPM tokens:

```bash
# Create an automation token at npmjs.com
# Then use it in your CI environment
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
npm publish --access public
```

