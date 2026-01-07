# GitHub Pages Deployment Guide

## Step 1: Create/Choose GitHub Repository

If creating a new repository:
1. Go to GitHub and create a new repository
2. **Don't** initialize with README, .gitignore, or license (you already have these)

If using an existing repository:
- Use your existing GitHub Pages repository

## Step 2: Configure Base Path (if needed)

**If your site will be at:**
- `username.github.io` (root domain) → **No basePath needed** ✅
- `username.github.io/repo-name` → **Set basePath in next.config.ts** (see below)
- Custom domain (e.g., `yourdomain.com`) → **No basePath needed** ✅

**To set basePath:**
Edit `next.config.ts` and uncomment/update:
```typescript
basePath: '/your-repo-name',
```

## Step 3: Connect Local Repo to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

## Step 4: Commit and Push

```bash
# Stage all changes
git add .

# Commit
git commit -m "Configure for GitHub Pages deployment"

# Push to main branch
git push -u origin main
```

## Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Source**: `GitHub Actions` (this will use the workflow we created)
4. Save

## Step 6: Deploy

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:
- Build your Next.js app as static files
- Deploy to GitHub Pages
- Run on every push to `main`

After pushing, go to **Actions** tab to see the deployment progress.

## Step 7: Access Your Site

- If using `username.github.io`: `https://username.github.io`
- If using `username.github.io/repo-name`: `https://username.github.io/repo-name`
- If using custom domain: Your custom domain URL

## Troubleshooting

**If the site shows 404:**
- Check that `basePath` in `next.config.ts` matches your repository name
- Wait a few minutes for GitHub Pages to propagate changes
- Check the Actions tab for build errors

**If styles/images don't load:**
- Verify `basePath` is correctly set
- Check browser console for 404 errors
- Ensure `images: { unoptimized: true }` is in `next.config.ts`
