<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Vm-45zoi_27QnCZA1IJno_luXtaNpVfF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy with GitHub Actions

This repository includes a GitHub Actions workflow that builds and deploys the Vite site to GitHub Pages whenever changes are pushed to the `main` branch.

1. Add a `GEMINI_API_KEY` secret in your repository settings so the build can inline your API key at deploy time.
2. Push to `main` or trigger the **Deploy to GitHub Pages** workflow manually from the Actions tab.
3. The site will be available from the GitHub Pages environment URL once the workflow completes.
