# Documentation - Markdown Kanban Roadmap

This folder contains the web documentation for the extension, ready for Vercel deployment.

## 🚀 Deploy to Vercel

### Option 1: Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to docs folder
cd docs

# Deploy
vercel
```

### Option 2: Via GitHub

1. Push this folder to your repository
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Configure:
   - **Root Directory**: `docs`
   - **Build Command**: (leave empty)
   - **Output Directory**: `.` (dot)
5. Deploy!

### Option 3: Via Web Interface

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Drag the `docs/` folder or upload it
4. Automatic deploy!

## 📁 Structure

```
docs/
  ├── index.html      # Main page
  ├── vercel.json     # Vercel configuration
  └── README.md       # This file
```

## 🔧 Customization

Edit `index.html` to customize:
- Colors (CSS variables in `:root`)
- Content
- Sections
- Styles

## 🌐 Custom Domain

In the Vercel dashboard, you can:
1. Add a custom domain
2. Configure automatic SSL
3. Configure redirects if needed

