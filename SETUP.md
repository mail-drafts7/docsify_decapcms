# 🔐 Secure Setup Guide - Docsify + Decap CMS

## 🚨 **Important Security Notice**
This repository contains **NO secrets**. You must provide your own GitHub OAuth credentials to use the CMS.

## ⚡ **Quick Setup**

### 1. **Clone Repository**
```bash
git clone https://github.com/mail-drafts7/docsify_decapcms.git
cd docsify_decapcms
npm install
```

### 2. **Create GitHub OAuth App**
1. Go to [GitHub Settings > Applications](https://github.com/settings/applications/new)
2. Create a new OAuth App with:
   - **Application name**: `Your CMS Name`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth`
3. Save your **Client ID** and **Client Secret**

### 3. **Configure Environment Variables**
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your OAuth credentials
nano .env
```

**Your `.env` file should look like:**
```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. **Start the Server**
```bash
node auth-server.js
```

### 5. **Access CMS Dashboard**
1. Open: http://localhost:3000/admin/
2. Click "Login with GitHub"
3. Authorize your OAuth app
4. Start managing content! 📝

## 🔒 **Security Features**

### ✅ **What's Secure:**
- No secrets committed to repository
- Environment variables used for local development
- OAuth secrets fetched only on-demand during login
- Secrets cleared from memory immediately after use
- `.env` file ignored by git

### ❌ **What You Must Do:**
- Create your own `.env` file (not provided)
- Keep your GitHub OAuth secrets private
- Never commit your `.env` file
- Use proper secrets management in production

## 🚀 **Production Deployment**

### **Environment Variables Setup:**
Set these on your hosting platform:
```bash
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
NODE_ENV=production
```

### **Popular Hosting Platforms:**
- **Vercel**: Add in Project Settings > Environment Variables
- **Netlify**: Add in Site Settings > Environment Variables  
- **Railway**: Add in Project > Variables tab
- **Heroku**: Use `heroku config:set` command

## 📚 **CMS Features**

### **Content Management:**
- ✏️ Rich markdown editor with live preview
- 📁 File-based content in `/docs` folder
- 🏷️ Metadata support (title, description, tags, etc.)
- 📊 Automatic sidebar generation
- 🔄 Real-time updates via WebSocket

### **GitHub Integration:**
- 💾 Direct commits to repository
- 🔀 Editorial workflow with PR support
- 📡 Webhook support for live updates
- 👥 Multi-user collaboration

### **Security:**
- 🔐 GitHub OAuth authentication
- 🛡️ Repository permission-based access
- 🧹 No persistent secret storage
- 🔒 Token-based sessions

## 🆘 **Troubleshooting**

### **"Missing OAuth credentials" error:**
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log('Client ID:', !!process.env.GITHUB_CLIENT_ID);"
```

### **Authentication fails:**
1. Verify GitHub OAuth app callback URL: `http://localhost:3000/api/auth`
2. Check GitHub OAuth app is active
3. Ensure `.env` has correct Client ID and Secret

### **Dashboard not loading:**
1. Check server is running: http://localhost:3000/admin/
2. Clear browser cache and localStorage
3. Check browser console for errors

## 🛠️ **Development**

### **File Structure:**
```
docsify_decapcms/
├── admin/           # CMS admin interface
├── docs/           # Content managed by CMS
├── lib/            # Secrets management utilities
├── auth-server.js  # Main server file
├── .env.example    # Template for environment variables
└── SETUP.md        # This file
```

### **Key Components:**
- **`auth-server.js`**: Express server handling OAuth and CMS
- **`lib/github-secrets-manager.js`**: Secure secrets management
- **`admin/config.yml`**: Decap CMS configuration
- **`admin/index.html`**: CMS dashboard interface

---

🔐 **Remember**: This setup ensures maximum security by never storing secrets in the repository. Each developer must provide their own OAuth credentials.
