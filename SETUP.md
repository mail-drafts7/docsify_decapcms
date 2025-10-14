# Complete Setup Guide - Knowledge Pack Platform

This guide provides detailed setup instructions for Docsify, Decap CMS, GitHub integration, and OAuth authentication.

## Table of Contents
- [Overview](#overview)
- [Docsify Setup](#docsify-setup)
- [Decap CMS Configuration](#decap-cms-configuration)
- [GitHub Integration](#github-integration)
- [OAuth Authentication Setup](#oauth-authentication-setup)
- [Environment Configuration](#environment-configuration)
- [Testing the Setup](#testing-the-setup)

## Overview

The Knowledge Pack platform combines four key technologies:
- **Docsify**: Static site generator for beautiful documentation
- **Decap CMS**: Git-based content management system
- **GitHub**: Repository hosting and OAuth provider
- **OAuth 2.0**: Secure authentication flow

## Docsify Setup

### What is Docsify?
Docsify is a magical documentation site generator that creates beautiful documentation websites from markdown files without building static HTML files.

### Configuration Files

#### 1. Main HTML File (`index.html`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Knowledge Pack</title>
  <meta name="description" content="Knowledge Pack Documentation">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css">
</head>
<body>
  <div id="app"></div>
  <script>
    window.$docsify = {
      name: 'Knowledge Pack',
      homepage: 'home.md',              // Homepage file
      loadSidebar: 'docs/_sidebar.md',  // Sidebar navigation
      autoHeader: true,                 // Auto generate headers
      subMaxLevel: 2,                   // Sidebar depth
      auto2top: true,                   // Scroll to top on route change
      search: {                         // Search configuration
        maxAge: 86400000,
        paths: 'auto',
        placeholder: 'Type to search',
        noData: 'No Results!',
        depth: 4
      }
    }
  </script>
  <script src="//cdn.jsdelivr.net/npm/docsify@4"></script>
  <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>
</body>
</html>
```

#### 2. Sidebar Configuration (`docs/_sidebar.md`)
```markdown
* 🏠 **Home**
  * [📋 Knowledge Pack Overview](/home)

* 🔐 **Authentication Service Pack**
  * [📋 Business Overview](/docs/auth-service-overview)
  * [🔧 Technical Setup](/docs/auth-service-setup)

* 🚪 **API Gateway Pack**
  * [📋 Business Overview](/docs/api-gateway-overview)
  * [🔧 Technical Setup](/docs/api-gateway-setup)
```

#### 3. Homepage Content (`home.md`)
```markdown
# 🚀 Knowledge Pack
Welcome to our documentation platform...
```

### Docsify Features Used
- **Auto Header**: Automatically generate page headers
- **Sidebar Navigation**: Dynamic sidebar from markdown
- **Search Plugin**: Full-text search capability
- **Responsive Design**: Mobile-friendly layout
- **Hot Reload**: Development server with live updates

### Customization
- **Themes**: Vue.js theme for modern appearance
- **Custom CSS**: Enhanced styling for Knowledge Pack branding
- **Plugins**: Search, copy-code, and other extensions

## Decap CMS Configuration

### What is Decap CMS?
Decap CMS (formerly Netlify CMS) is a Git-based content management system that provides a user-friendly interface for editing markdown files stored in your Git repository.

### Core Configuration (`admin/config.yml`)

```yaml
# Backend Configuration
backend:
  name: github                    # Git provider
  repo: username/repository-name  # Your GitHub repository
  branch: main                   # Target branch
  auth_endpoint: /api/auth       # OAuth endpoint

# Media and Public Folders
media_folder: "assets/images"     # Image storage
public_folder: "/assets/images"   # Public URL path
publish_mode: editorial_workflow  # Draft/Review workflow

# Collections Configuration
collections:
  - name: "documentation"
    label: "📚 Documentation"
    folder: "docs"
    create: true
    slug: "{{slug}}"
    editor:
      preview: true
    fields:
      - label: "Title"
        name: "title"
        widget: "string"
      - label: "Description"
        name: "description"
        widget: "text"
      - label: "Category"
        name: "category"
        widget: "select"
        options: ["overview", "setup", "guide"]
      - label: "Body"
        name: "body"
        widget: "markdown"
```

### Admin Interface (`admin/index.html`)

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Knowledge Pack CMS</title>
  <link rel="cms-config-url" type="text/yaml" href="/api/admin/config" />
</head>
<body>
  <!-- CMS will be loaded here -->
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</body>
</html>
```

### Content Management Features
- **Visual Editor**: WYSIWYG markdown editor
- **Media Management**: Image and file upload
- **Preview Mode**: Real-time content preview
- **Editorial Workflow**: Draft → Review → Publish
- **Role-based Access**: User permissions management

### Collection Types
- **Files**: Individual pages (homepage, about, etc.)
- **Folders**: Document collections (blog posts, guides, etc.)
- **Custom Widgets**: Rich text, image, date, select, etc.

## GitHub Integration

### Repository Setup

#### 1. Create GitHub Repository
```bash
# Create new repository
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repository-name.git
git push -u origin main
```

#### 2. Repository Structure
```
your-repository/
├── docs/                    # Documentation content
│   ├── _sidebar.md         # Auto-managed navigation
│   ├── *.md                # Documentation pages
├── admin/                  # CMS configuration
│   ├── config.yml         # CMS settings
│   └── index.html         # Admin interface
├── assets/                # Static assets
├── home.md               # Homepage content
├── index.html            # Main Docsify site
├── auth-server.js        # OAuth server
├── package.json          # Dependencies
└── README.md             # Project documentation
```

#### 3. Branch Configuration
- **Main Branch**: Production content
- **Feature Branches**: Content development
- **Pull Requests**: Content review workflow

### GitHub Pages Setup (Optional)
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## OAuth Authentication Setup

### What is OAuth 2.0?
OAuth 2.0 is an authorization framework that enables secure, delegated access to user accounts. In our setup, it allows users to authenticate with GitHub credentials to access the CMS.

### GitHub OAuth Application Setup

#### Step 1: Create OAuth App
1. **Navigate to GitHub Settings**
   - Go to GitHub.com → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"

2. **Configure Application Details**
   ```
   Application name: Knowledge Pack CMS
   Homepage URL: http://localhost:3000
   Application description: Content management for Knowledge Pack documentation
   Authorization callback URL: http://localhost:3000/api/auth
   ```

3. **Register and Save Credentials**
   - Click "Register application"
   - **Copy Client ID**: `Ov23li5kbNATaXdde6rE` (example)
   - **Generate Client Secret**: `github_pat_xxxxx` (example)
   - **Save these securely** - you'll need them for configuration

#### Step 2: OAuth Flow Implementation

Our authentication server (`auth-server.js`) handles the OAuth flow:

```javascript
// OAuth Configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth';

// OAuth endpoints
app.get('/api/auth', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code,
    })
  });
  
  const tokenData = await tokenResponse.json();
  // Redirect to admin with token
  res.redirect(`/admin/?token=${tokenData.access_token}`);
});
```

#### Step 3: Frontend OAuth Integration

The admin interface handles OAuth authentication:

```javascript
// Check for OAuth token
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // Verify token with GitHub API
  fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(response => response.json())
  .then(userData => {
    // Store authentication data
    const authData = {
      backendName: 'github',
      token: token,
      login: userData.login,
      name: userData.name || userData.login
    };
    localStorage.setItem('decap-cms-user', JSON.stringify(authData));
  });
}
```

### Security Considerations

#### Environment Variables
Never commit secrets to Git. Use environment variables:

```bash
# .env file
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=your_repository_name
```

#### Token Management
- **Access Tokens**: Short-lived, used for API calls
- **Refresh Tokens**: Not used in our implementation
- **Scope Limitation**: Request minimal necessary permissions
- **Secure Storage**: Never expose tokens in client-side code

#### CORS Configuration
```javascript
// Allow CMS domain
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

## Environment Configuration

### Development Environment (`.env`)
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=Ov23li5kbNATaXdde6rE
GITHUB_CLIENT_SECRET=github_pat_xxxxxxxxxxxxx
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=your-repository

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Database (if using)
DATABASE_URL=postgresql://localhost:5432/knowledge_pack
```

### Production Environment
```bash
# Use secure, production-ready values
GITHUB_CLIENT_ID=production_client_id
GITHUB_CLIENT_SECRET=production_client_secret
PORT=80
NODE_ENV=production

# Add additional security headers
SECURITY_HEADERS=true
SSL_REDIRECT=true
```

### Environment Loading
```javascript
// Load environment variables
require('dotenv').config();

// Validate required variables
const requiredEnvVars = [
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

## Testing the Setup

### 1. Basic Functionality Test
```bash
# Start the server
node auth-server.js

# Test endpoints
curl http://localhost:3000/api/admin/config
curl http://localhost:3000/api/health
```

### 2. OAuth Flow Test
1. **Visit Admin**: http://localhost:3000/admin
2. **Click Login**: Should redirect to GitHub
3. **Authorize**: Grant permissions to your app
4. **Verify Redirect**: Should return to CMS with authentication
5. **Check Console**: Look for successful authentication logs

### 3. Content Management Test
1. **Create Content**: Use CMS to create a new document
2. **Verify Git**: Check that changes appear in your GitHub repository
3. **Check Frontend**: Verify content appears on documentation site
4. **Test Sidebar**: Confirm navigation updates automatically

### 4. Error Handling Test
```bash
# Test with invalid credentials
GITHUB_CLIENT_ID=invalid node auth-server.js

# Test CORS
curl -H "Origin: http://evil.com" http://localhost:3000/api/admin/config
```

### 5. Performance Test
```bash
# Install testing tools
npm install -g artillery

# Basic load test
artillery quick --count 10 --num 2 http://localhost:3000
```

## Troubleshooting Common Issues

### OAuth Errors
```bash
# Error: redirect_uri_mismatch
# Solution: Check callback URL in GitHub OAuth app matches exactly

# Error: bad_verification_code
# Solution: Verify client ID and secret are correct

# Error: access_denied
# Solution: User denied permission, try authentication again
```

### CMS Loading Issues
```bash
# Error: Config file not found
# Solution: Verify /api/admin/config endpoint returns valid YAML

# Error: Repository not accessible
# Solution: Check repository permissions and OAuth scopes

# Error: Branch not found
# Solution: Verify target branch exists in repository
```

### Docsify Problems
```bash
# Error: Sidebar not loading
# Solution: Check _sidebar.md file exists and is valid markdown

# Error: Search not working
# Solution: Verify search plugin is loaded and files are indexable

# Error: Images not displaying
# Solution: Check image paths and ensure they're accessible
```

---

## Next Steps

After completing this setup:

1. **Customize Content**: Add your own documentation pages
2. **Style Customization**: Modify CSS for your brand
3. **Advanced Features**: Add plugins, custom widgets
4. **Production Deployment**: Configure for production environment
5. **User Management**: Set up additional OAuth providers if needed

For ongoing support, refer to the main README.md file and official documentation for each technology.
