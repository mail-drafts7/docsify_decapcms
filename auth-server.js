const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const GitHubSecretsManager = require('./lib/github-secrets-manager');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Initialize GitHub Secrets Manager
const secretsManager = new GitHubSecretsManager();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // Serve static files

// Fix admin routing - serve admin/index.html for all admin paths
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.use('/admin', express.static('admin')); // Serve admin static files

// Content management utilities  
class ContentManager {
  constructor() {
    // Keep scanning all content folders for sidebar generation
    // even though CMS only manages 'docs'
    this.contentFolders = ['docs', 'tutorials', 'guides'];
    this.sidebarFile = '_sidebar.md';
  }

  async readMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseMarkdownMeta(content);
    } catch (error) {
      return null;
    }
  }

  parseMarkdownMeta(content) {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    let meta = {};
    let body = content;

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      body = content.substring(frontmatterMatch[0].length).trim();
      
      frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim().replace(/"/g, '');
          meta[key.trim()] = value;
        }
      });
    }

    return { meta, body, fullContent: content };
  }

  async scanDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      const markdownFiles = [];

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(dirPath, file);
          const fileData = await this.readMarkdownFile(filePath);
          if (fileData) {
            const title = fileData.meta.title || file.replace('.md', '').replace(/-/g, ' ');
            markdownFiles.push({
              name: file,
              path: filePath,
              title: title,
              order: parseInt(fileData.meta.order) || 999,
              category: fileData.meta.category || path.basename(dirPath),
              url: `/${dirPath}/${file.replace('.md', '')}`
            });
          }
        }
      }

      return markdownFiles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    } catch (error) {
      console.warn(`Cannot read directory ${dirPath}:`, error.message);
      return [];
    }
  }

  async getAllContent() {
    const allContent = {};
    
    for (const folder of this.contentFolders) {
      allContent[folder] = await this.scanDirectory(folder);
    }

    return allContent;
  }

  generateSidebar(content) {
    let sidebar = '<!-- This sidebar is automatically managed by Decap CMS -->\n\n';
    sidebar += '* [🏠 Home](/)\n\n';

    const sectionIcons = {
      'docs': '📚 Documentation',
      'tutorials': '🎓 Tutorials', 
      'guides': '📋 User Guides'
    };

    Object.entries(content).forEach(([folder, items]) => {
      if (items.length > 0) {
        const sectionTitle = sectionIcons[folder] || folder;
        sidebar += `* ${sectionTitle}\n`;
        
        items.forEach(item => {
          sidebar += `  * [${item.title}](${item.url})\n`;
        });
        
        sidebar += '\n';
      }
    });

    sidebar += '* 🔧 CMS Admin\n';
    sidebar += '  * <a href="admin/" target="_self">📝 Content Management</a>\n';

    return sidebar;
  }

  async updateSidebar() {
    try {
      const content = await this.getAllContent();
      const newSidebar = this.generateSidebar(content);
      await fs.writeFile(this.sidebarFile, newSidebar, 'utf-8');
      console.log('✅ Sidebar updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update sidebar:', error);
      return false;
    }
  }
}

const contentManager = new ContentManager();

// OAuth callback endpoint with dynamic GitHub API secret fetching
app.get('/api/auth', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  let loginSecrets = null;
  try {
    // 🔐 STEP 1: Fetch OAuth secrets from GitHub API dynamically
    loginSecrets = await secretsManager.fetchSecretsForLogin();
    console.log('🔑 Secrets fetched successfully for OAuth exchange');
    
    // 🔐 STEP 2: Exchange code for access token using fetched secrets
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: loginSecrets.GITHUB_CLIENT_ID,
      client_secret: loginSecrets.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // 🔐 STEP 3: Clear secrets from memory immediately after use
    secretsManager.clearSecrets(loginSecrets);
    loginSecrets = null;
    console.log('🧹 OAuth secrets cleared from memory after token exchange');

    const { access_token, error } = response.data;
    
    if (error) {
      return res.status(400).json({ error: error });
    }

    // Return success page that stores auth and redirects to admin with token in URL
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white;
            }
            .container { text-align: center; }
            .spinner { 
              border: 4px solid rgba(255,255,255,0.3); 
              border-top: 4px solid white; 
              border-radius: 50%; 
              width: 40px; 
              height: 40px; 
              animation: spin 1s linear infinite; 
              margin: 20px auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <div class="spinner"></div>
            <p>Redirecting to CMS dashboard...</p>
          </div>
          <script>
            console.log('Auth callback received, setting up authentication...');
            
            // Redirect to admin with token as URL parameter for manual injection
            const token = "${access_token}";
            const adminUrl = '/admin/?token=' + encodeURIComponent(token);
            
            console.log('Redirecting to admin with token parameter...');
            
            // Slight delay to show the success message
            setTimeout(() => {
              window.location.href = adminUrl;
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Serve DecapCMS config with dynamically fetched GitHub secrets
app.get('/api/admin/config', async (req, res) => {
  try {
    const configContent = await fs.readFile(__dirname + '/admin/config.yml', 'utf-8');
    
    let clientId = '';
    try {
      // 🔐 Fetch Client ID from GitHub API dynamically for config generation
      console.log('🔐 Fetching Client ID from GitHub for admin config...');
      const configSecrets = await secretsManager.fetchSecretsForLogin();
      clientId = configSecrets.GITHUB_CLIENT_ID;
      
      // Clear secrets immediately after getting client ID
      secretsManager.clearSecrets(configSecrets);
      console.log('✅ Client ID fetched and config secrets cleared');
    } catch (error) {
      console.warn('⚠️  Failed to fetch Client ID from GitHub, trying fallback...');
      clientId = process.env.GITHUB_CLIENT_ID || '';
      if (clientId) {
        console.log('✅ Using fallback Client ID from environment');
      } else {
        console.error('❌ No Client ID available from any source');
      }
    }
    
    // Replace placeholder with dynamically fetched client ID
    const updatedConfig = configContent.replace(
      '{{GITHUB_CLIENT_ID}}', 
      clientId
    );
    
    res.setHeader('Content-Type', 'text/yaml');
    res.send(updatedConfig);
  } catch (error) {
    console.error('Error serving config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// API endpoint to manually update sidebar
app.post('/api/update-sidebar', async (req, res) => {
  try {
    const success = await contentManager.updateSidebar();
    if (success) {
      res.json({ success: true, message: 'Sidebar updated successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update sidebar' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API endpoint to get all content
app.get('/api/content', async (req, res) => {
  try {
    const content = await contentManager.getAllContent();
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to save content from CMS
app.post('/api/save-content', async (req, res) => {
  try {
    const { collection, entry } = req.body;
    
    if (!collection || !entry) {
      return res.status(400).json({ error: 'Collection and entry are required' });
    }

    // Generate filename
    const slug = entry.slug || entry.data.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled';
    const filename = `${slug}.md`;
    const filepath = path.join('docs', filename);

    // Create frontmatter
    const frontmatter = Object.entries(entry.data)
      .filter(([key]) => key !== 'body')
      .map(([key, value]) => {
        if (typeof value === 'string' && value.includes('\n')) {
          return `${key}: |\n  ${value.replace(/\n/g, '\n  ')}`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    // Create full content
    const fullContent = `---\n${frontmatter}\n---\n\n${entry.data.body || ''}`;

    // Save file
    await fs.writeFile(filepath, fullContent, 'utf-8');
    
    console.log(`✅ Content saved: ${filepath}`);

    // Update sidebar after saving
    setTimeout(async () => {
      await contentManager.updateSidebar();
    }, 500);

    res.json({ 
      success: true, 
      message: 'Content saved successfully',
      filepath: filepath 
    });
  } catch (error) {
    console.error('❌ Save content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced GitHub webhook endpoint for immediate updates
app.post('/api/webhook', async (req, res) => {
  try {
    const { action, commits, pull_request, repository } = req.body;
    
    console.log('📡 Webhook received:', { 
      action, 
      ref: req.body.ref,
      event: req.headers['x-github-event']
    });
    
    // Check if this is a push to main branch, PR merge, or release
    const isMainBranchPush = req.body.ref === 'refs/heads/main';
    const isPRMerged = action === 'closed' && pull_request?.merged === true;
    const isPublished = action === 'published';
    const isContentChange = req.headers['x-github-event'] === 'push';
    
    if (isMainBranchPush || isPRMerged || isPublished || isContentChange) {
      console.log('🔄 Triggering immediate update process...');
      
      // Check if any markdown files were modified
      let hasMarkdownChanges = false;
      if (commits) {
        hasMarkdownChanges = commits.some(commit => 
          commit.added?.some(file => file.match(/\.(md)$/)) ||
          commit.modified?.some(file => file.match(/\.(md)$/)) ||
          commit.removed?.some(file => file.match(/\.(md)$/))
        );
      } else {
        // For PR merges and other events, assume there might be changes
        hasMarkdownChanges = true;
      }

      if (hasMarkdownChanges || isPRMerged || isPublished) {
        console.log('📥 Content changes detected, updating immediately...');
        
        // Pull latest changes from GitHub
        const { exec } = require('child_process');
        const gitCommand = process.env.NODE_ENV === 'production' 
          ? 'git pull origin main'
          : `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_personal" git pull origin main`;
          
        exec(gitCommand, async (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Git pull error:', error);
            // Even if git pull fails, try to update sidebar with current content
            setTimeout(async () => {
              await contentManager.updateSidebar();
              console.log('⚠️  Sidebar updated with current content (git pull failed)');
            }, 500);
            return;
          }
          
          console.log('✅ Git pull successful:', stdout);
          
          // Immediate sidebar update
          setTimeout(async () => {
            console.log('🔄 Updating sidebar immediately...');
            const success = await contentManager.updateSidebar();
            if (success) {
              console.log('✅ Sidebar updated successfully after webhook');
              
              // Broadcast update to any connected clients
              if (global.wsClients) {
                global.wsClients.forEach(client => {
                  client.send(JSON.stringify({
                    type: 'content-updated',
                    message: 'Content updated, please refresh',
                    timestamp: new Date().toISOString()
                  }));
                });
              }
            } else {
              console.error('❌ Sidebar update failed');
            }
          }, 500);
        });
      } else {
        console.log('ℹ️  No content changes detected, skipping update');
      }
    } else {
      console.log('ℹ️  Non-triggering webhook event, ignoring');
    }
    
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      processed: isMainBranchPush || isPRMerged || isPublished || isContentChange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
  }
});

// WebSocket endpoint for real-time updates (optional)
const WebSocket = require('ws');
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server: server, path: '/ws' });

global.wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  global.wsClients.add(ws);
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
    global.wsClients.delete(ws);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Real-time updates enabled',
    timestamp: new Date().toISOString()
  }));
});

// Enhanced content change notification
app.post('/api/notify-change', async (req, res) => {
  try {
    console.log('🔔 Content change notification received');
    
    // Immediate sidebar update
    const success = await contentManager.updateSidebar();
    
    if (success) {
      // Notify all connected WebSocket clients
      if (global.wsClients) {
        global.wsClients.forEach(client => {
          client.send(JSON.stringify({
            type: 'sidebar-updated',
            message: 'Sidebar updated, refreshing...',
            timestamp: new Date().toISOString()
          }));
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Content updated and clients notified',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update content',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Content notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub API utilities for PR creation
class GitHubIntegration {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com/repos/mail-drafts7/docsify_decapcms';
  }

  async createPullRequest(title, body, head, base = 'main') {
    try {
      const response = await axios.post(`${this.baseUrl}/pulls`, {
        title,
        body,
        head,
        base
      }, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`PR creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createBranch(branchName, fromBranch = 'main') {
    try {
      // Get the SHA of the base branch
      const baseResponse = await axios.get(`${this.baseUrl}/git/refs/heads/${fromBranch}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      // Create new branch
      const response = await axios.post(`${this.baseUrl}/git/refs`, {
        ref: `refs/heads/${branchName}`,
        sha: baseResponse.data.object.sha
      }, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Branch creation failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// API endpoint to create PR for content changes
app.post('/api/create-pr', async (req, res) => {
  try {
    const { title, description, changes } = req.body;
    const token = req.headers.authorization?.replace('token ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const github = new GitHubIntegration(token);
    const branchName = `content-update-${Date.now()}`;
    
    // Create branch
    await github.createBranch(branchName);
    
    // Create PR
    const pr = await github.createPullRequest(
      title || 'Content Update via CMS',
      description || 'Automated content update from Decap CMS',
      branchName
    );

    res.json({ 
      success: true, 
      pr_url: pr.html_url,
      pr_number: pr.number,
      branch: branchName
    });
  } catch (error) {
    console.error('PR creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to serve client configuration for frontend
app.get('/api/config', (req, res) => {
  res.json({
    clientId: process.env.GITHUB_CLIENT_ID,
    redirectUri: `http://localhost:${PORT}/api/auth`,
    scope: 'repo user'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Auth server is running' });
});

// Initialize sidebar on server start
contentManager.updateSidebar().then(() => {
  console.log('🔄 Initial sidebar update completed');
});

app.listen(PORT, () => {
  console.log(`🚀 Auth server running at http://localhost:${PORT}`);
  console.log(`📝 Admin interface: http://localhost:${PORT}/admin/`);
  console.log(`🔧 Make sure to set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`🔄 Sidebar auto-update enabled`);
});
