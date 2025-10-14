# Knowledge Pack - Docsify + DecapCMS Integration

A modern documentation platform combining Docsify for beautiful documentation sites with DecapCMS for easy content management with GitHub OAuth authentication.

## 🚀 Features

- 📚 **Beautiful Documentation**: Powered by Docsify with Vue.js theme
- ✏️ **Content Management**: Easy editing with DecapCMS admin interface
- 🔐 **GitHub Integration**: OAuth authentication and automated deployments
- 🔄 **Auto-sync**: Sidebar automatically updates when content changes
- 📱 **Responsive**: Works perfectly on desktop and mobile devices
- 🔍 **Search**: Built-in search functionality across all content

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

### Required Software
- **Node.js** (v16.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)
- **GitHub Account** - For OAuth authentication

### Verify Installation
Check if prerequisites are installed:
```bash
node --version     # Should show v16+ 
npm --version      # Should show npm version
git --version      # Should show git version
```

## 🛠️ Quick Setup

### Step 1: Clone & Install
```bash
git clone <your-repository-url>
cd docsify_decapcms
npm install
```

### Step 2: Configure Environment
```bash
cp .env.template .env
# Edit .env with your GitHub OAuth credentials
```

### Step 3: Setup GitHub OAuth
1. Create GitHub OAuth App in Settings → Developer settings
2. Set callback URL: `http://localhost:3000/api/auth`
3. Add credentials to `.env` file

📖 **For detailed setup instructions, see [SETUP.md](SETUP.md)** - Complete guide covering Docsify, Decap CMS, GitHub integration, and OAuth authentication.

## 🚀 Running the Project

### Start Development Server
```bash
node auth-server.js
```

### Access the Application
Once the server starts, you'll see:
```
Server running on http://localhost:3000
GitHub OAuth configured
CMS Admin available at http://localhost:3000/admin/
```

### URLs to Access
- **Main Documentation Site**: http://localhost:3000
- **CMS Admin Panel**: http://localhost:3000/admin
- **API Endpoint**: http://localhost:3000/api/admin/config

## 📖 Content Types

### 📚 Knowledge Packs
- **Authentication Service Pack**: User authentication and authorization solutions
- **API Gateway Pack**: Microservices API management and orchestration  
- **Real-time Data Processing Pack**: Streaming data processing and analytics

### 📁 File Structure
```
├── docs/                          # Documentation content
│   ├── _sidebar.md               # Navigation structure (auto-managed)
│   ├── auth-service-overview.md  # Authentication pack overview
│   ├── auth-service-setup.md     # Authentication pack setup
│   ├── api-gateway-overview.md   # API Gateway pack overview
│   ├── api-gateway-setup.md      # API Gateway pack setup
│   ├── data-processing-overview.md # Data processing overview
│   └── data-processing-setup.md    # Data processing setup
├── admin/                        # CMS configuration
│   ├── config.yml               # DecapCMS configuration
│   └── index.html              # CMS admin interface
├── assets/                      # Static assets
├── home.md                     # Homepage content
├── index.html                  # Main Docsify site
├── auth-server.js             # OAuth server
└── package.json               # Dependencies
```

## 🔐 Using the CMS Admin

### Access Admin Panel
1. Navigate to http://localhost:3000/admin
2. Click "Login with GitHub"
3. Authenticate with your GitHub account
4. Start managing content!

### Creating Content
1. **Navigate to Collections**: Use the sidebar to select content type
2. **Create New**: Click "New Document" button  
3. **Edit Content**: Use the rich editor interface
4. **Save Changes**: Click "Publish" to commit to GitHub
5. **View Changes**: Refresh the main site to see updates

### Editing Existing Content
1. **Select Document**: Click on any existing document
2. **Edit**: Make your changes using the editor
3. **Preview**: Use preview mode to see formatting
4. **Save**: Publish changes to update the site

## 🔍 Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Kill existing process
npx kill-port 3000
# Or use different port
PORT=3001 node auth-server.js
```

**GitHub OAuth errors:**
- Verify Client ID and Secret in `.env`
- Check callback URL matches: `http://localhost:3000/api/auth`
- Ensure GitHub app is not suspended

**CMS not loading:**
- Check browser console for errors
- Verify `admin/config.yml` has correct repository settings
- Ensure you're logged into GitHub

**Content not updating:**
- Check if changes were committed to GitHub
- Refresh the main documentation site
- Verify sidebar navigation updates

### Debug Mode
Enable detailed logging:
```bash
DEBUG=* node auth-server.js
```

## 🚀 Deployment Options

### Local Development
```bash
node auth-server.js
```

### Production with PM2
```bash
npm install -g pm2
pm2 start auth-server.js --name "knowledge-pack"
```

### Docker
```bash
docker-compose up -d
```

## 🎯 Development Workflow

1. **Start Server**: `node auth-server.js`
2. **Open Browser**: Navigate to http://localhost:3000
3. **Edit Content**: Use http://localhost:3000/admin for content management
4. **View Changes**: Refresh main site to see updates
5. **Commit Changes**: All edits are automatically committed to GitHub

## 📊 Features Overview

- **Real-time Editing**: Changes appear immediately after publishing
- **GitHub Integration**: All content stored in your GitHub repository
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Search Functionality**: Built-in search across all content
- **OAuth Security**: Secure GitHub authentication
- **Auto-navigation**: Sidebar updates automatically with new content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally using the steps above
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🎉 Ready to start!** Run `node auth-server.js` and visit http://localhost:3000 to see your Knowledge Pack documentation platform in action!
