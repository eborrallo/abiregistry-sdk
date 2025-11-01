# Publishing Guide

Guide for maintainers on how to publish new versions of @abiregistry/sdk to NPM.

## Prerequisites

1. NPM account with publish permissions
2. GitHub repository access
3. NPM_TOKEN secret configured in GitHub repository settings

## Setup NPM Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Navigate to Access Tokens: Settings → Access Tokens
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" type
5. Copy the token
6. Go to your GitHub repository: Settings → Secrets and variables → Actions
7. Create new repository secret:
   - Name: `NPM_TOKEN`
   - Value: (paste your NPM token)

## Publishing Process

### Automatic Publishing (Recommended)

1. **Update version** in `package.json`:
   ```bash
   # For patch releases (bug fixes)
   npm version patch

   # For minor releases (new features)
   npm version minor

   # For major releases (breaking changes)
   npm version major
   ```

2. **Push the tag**:
   ```bash
   git push && git push --tags
   ```

3. **Create a GitHub Release**:
   - Go to: https://github.com/eborrallo/abiregistry-sdk/releases/new
   - Select the tag you just pushed
   - Title: `v0.1.0` (or whatever version)
   - Description: List the changes (copy from CHANGELOG.md)
   - Click "Publish release"

4. **GitHub Actions will automatically**:
   - Run all tests
   - Run linter
   - Build the package
   - Publish to NPM

### Manual Publishing (Not Recommended)

```bash
# Login to NPM
npm login

# Build and test
pnpm install
pnpm test
pnpm build

# Publish
pnpm publish --access public
```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

## Pre-release Checklist

Before creating a release:

- [ ] All tests passing locally
- [ ] Update CHANGELOG.md with changes
- [ ] Update version in package.json
- [ ] Update README.md if API changed
- [ ] Build succeeds: `pnpm build`
- [ ] Test coverage acceptable: `pnpm test:coverage`
- [ ] No TypeScript errors: `pnpm lint`
- [ ] All commits pushed to main

## Post-release

After successful publish:

1. Verify package on NPM: https://www.npmjs.com/package/@abiregistry/sdk
2. Test installation: `npm install @abiregistry/sdk@latest`
3. Update documentation site if needed
4. Announce on social media/Discord/etc.

## Troubleshooting

### Publish fails with "You do not have permission"

- Ensure you're logged in to NPM with correct account
- Verify NPM_TOKEN is set in GitHub secrets
- Check token hasn't expired

### Version already exists

- You can't publish the same version twice
- Increment version and try again

### Tests fail in CI but pass locally

- Check Node version matches
- Verify all dependencies are in package.json
- Check for environment-specific issues

## Emergency Unpublish

If you need to unpublish a broken version:

```bash
npm unpublish @abiregistry/sdk@VERSION
```

⚠️ **Warning**: You can only unpublish within 72 hours, and it's discouraged. Consider publishing a patch instead.

