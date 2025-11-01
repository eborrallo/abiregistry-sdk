# NPM Publishing Setup

Quick guide to enable automatic NPM publishing for this repository.

## 1. Create NPM Account

If you don't have one:
1. Go to [npmjs.com](https://www.npmjs.com/signup)
2. Create an account
3. Verify your email

## 2. Generate NPM Access Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Click your profile → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select type: **Automation**
5. Copy the token (starts with `npm_...`)

## 3. Add Token to GitHub Secrets

1. Go to your repository: https://github.com/eborrallo/abiregistry-sdk
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: (paste your NPM token)
6. Click **Add secret**

## 4. Publish Your First Release

```bash
# 1. Ensure you're on main branch and everything is committed
git checkout main
git pull

# 2. Run tests and build
pnpm test
pnpm build

# 3. Update version (choose one)
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (new features)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)

# 4. Push the version and tag
git push && git push --tags

# 5. Create a release on GitHub
# Go to: https://github.com/eborrallo/abiregistry-sdk/releases/new
# - Select the tag you just pushed (e.g., v0.1.0)
# - Title: v0.1.0
# - Description: Copy changes from CHANGELOG.md
# - Click "Publish release"
```

## 5. Automatic Publishing Happens!

Once you publish the GitHub release:
1. GitHub Actions triggers
2. Runs all tests
3. Builds the package
4. Publishes to NPM automatically

## Verify Publication

After a few minutes:
1. Check NPM: https://www.npmjs.com/package/@abiregistry/sdk
2. Test installation:
   ```bash
   npx @abiregistry/sdk@latest help
   ```

## Future Releases

Just repeat step 4:
```bash
npm version patch  # or minor/major
git push && git push --tags
# Create GitHub release
```

That's it! 🎉

## Troubleshooting

### "Package name already exists"

If `@abiregistry/sdk` is taken, you can:
1. Change name in package.json to `@yourorg/abiregistry-sdk`
2. Or request transfer of the package name

### "Permission denied"

Ensure:
- NPM_TOKEN is correctly set in GitHub secrets
- Token has "Automation" permissions
- You're a member of @abiregistry org (if using scoped package)

### "Tests failed"

The workflow won't publish if tests fail. Fix tests first, then retry.

