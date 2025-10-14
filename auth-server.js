const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.')); // Serve static files
app.use('/admin', express.static('admin')); // Explicitly serve admin folder

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

// OAuth callback endpoint
app.get('/api/auth', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    // Exchange code for access token
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const { access_token, error } = response.data;
    
    if (error) {
      return res.status(400).json({ error: error });
    }

    // Return success page with automatic redirect to CMS dashboard
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <h1>Authentication Successful!</h1>
          <p>Redirecting to CMS dashboard...</p>
          <script>
            // Store authentication in localStorage for DecapCMS
            localStorage.setItem('decap-cms-user', JSON.stringify({
              token: "${access_token}",
              provider: "github",
              backendName: "github"
            }));
            
            // Store token for session
            sessionStorage.setItem('github-token', "${access_token}");
            
            // Direct redirect to admin dashboard
            setTimeout(() => {
              window.location.href = '/admin/#/collections/docs';
            }, 1000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Serve DecapCMS config
app.get('/api/admin/config', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(__dirname + '/admin/config.yml');
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

// GitHub webhook endpoint for automatic updates
app.post('/api/webhook', async (req, res) => {
  try {
    const { action, commits, pull_request } = req.body;
    
    console.log('📡 Webhook received:', { action, ref: req.body.ref });
    
    // Check if this is a push to main branch or PR merge
    const isMainBranchPush = req.body.ref === 'refs/heads/main';
    const isPRMerged = action === 'closed' && pull_request?.merged === true;
    const isPublished = action === 'published';
    
    if (isMainBranchPush || isPRMerged || isPublished) {
      console.log('🔄 Triggering update process...');
      
      // Check if any markdown files were modified
      let hasMarkdownChanges = false;
      if (commits) {
        hasMarkdownChanges = commits.some(commit => 
          commit.added?.some(file => file.endsWith('.md')) ||
          commit.modified?.some(file => file.endsWith('.md')) ||
          commit.removed?.some(file => file.endsWith('.md'))
        );
      } else if (isPRMerged) {
        // For PR merges, assume there might be changes
        hasMarkdownChanges = true;
      }

      if (hasMarkdownChanges || isPRMerged || isPublished) {
        console.log('📥 Pulling latest changes from GitHub...');
        
        // Pull latest changes from GitHub
        const { exec } = require('child_process');
        exec(`GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_personal" git pull origin main`, async (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Git pull error:', error);
            return;
          }
          
          console.log('✅ Git pull successful:', stdout);
          
          // Wait a moment for files to be updated, then update sidebar
          setTimeout(async () => {
            console.log('🔄 Updating sidebar...');
            await contentManager.updateSidebar();
            console.log('✅ Sidebar updated after PR merge');
          }, 1000);
        });
      }
    }
    
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
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
