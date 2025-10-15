const axios = require('axios');

/**
 * GitHub Secrets Manager
 * Fetches secrets from GitHub repository via API during login process
 * Secrets are never stored locally, only fetched on-demand
 */
class GitHubSecretsManager {
  constructor(options = {}) {
    this.repoOwner = options.repoOwner || 'mail-drafts7';
    this.repoName = options.repoName || 'docsify_decapcms';
    this.baseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}`;
    this.secretsFile = '.secrets.json';
  }

  /**
   * Fetch secrets from GitHub repository for login process
   * This is called only when user clicks login button
   */
  async fetchSecretsForLogin() {
    try {
      console.log('🔐 Fetching OAuth secrets from GitHub repository...');
      
      // Fetch the .secrets.json file from GitHub API (no auth required for public repos)
      const response = await axios.get(`${this.baseUrl}/contents/${this.secretsFile}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Docsify-DecapCMS'
        }
      });

      if (response.data && response.data.content) {
        // Decode base64 content
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        const secretsConfig = JSON.parse(content);
        
        // Get environment-specific secrets
        const environment = process.env.NODE_ENV || 'development';
        const envConfig = secretsConfig[environment];
        
        if (!envConfig) {
          throw new Error(`No secrets found for environment: ${environment}`);
        }

        const loginSecrets = {
          GITHUB_CLIENT_ID: envConfig.GITHUB_CLIENT_ID,
          GITHUB_CLIENT_SECRET: envConfig.GITHUB_CLIENT_SECRET
        };

        // Validate required secrets
        if (!loginSecrets.GITHUB_CLIENT_ID || !loginSecrets.GITHUB_CLIENT_SECRET) {
          throw new Error('Missing required GitHub OAuth credentials in secrets file');
        }

        console.log('✅ OAuth secrets fetched successfully from GitHub repository');
        console.log(`ℹ️  Environment: ${environment}`);
        
        // Return secrets for immediate use (will be cleared after use)
        return loginSecrets;
      } else {
        throw new Error('No content found in secrets file');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch secrets from GitHub:`, error.message);
      
      // If GitHub API fails, try to fall back to local environment variables
      console.log('⚠️  Falling back to local environment variables...');
      const fallbackSecrets = {
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
      };
      
      if (fallbackSecrets.GITHUB_CLIENT_ID && fallbackSecrets.GITHUB_CLIENT_SECRET) {
        console.log('✅ Using fallback environment variables');
        return fallbackSecrets;
      }
      
      throw new Error(`Cannot fetch secrets from GitHub API and no local fallback available: ${error.message}`);
    }
  }

  /**
   * Clear secrets from memory (called after login process)
   */
  clearSecrets(secretsObject) {
    if (secretsObject) {
      // Clear all properties
      Object.keys(secretsObject).forEach(key => {
        secretsObject[key] = null;
        delete secretsObject[key];
      });
      console.log('🧹 Secrets cleared from memory');
    }
  }

  /**
   * Test connection to GitHub API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/contents/${this.secretsFile}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Docsify-DecapCMS'
        }
      });
      return {
        success: true,
        fileExists: !!response.data,
        size: response.data?.size || 0,
        lastModified: response.data?.sha || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Get repository information
   */
  getRepositoryInfo() {
    return {
      owner: this.repoOwner,
      name: this.repoName,
      secretsFile: this.secretsFile,
      apiUrl: `${this.baseUrl}/contents/${this.secretsFile}`
    };
  }
}

module.exports = GitHubSecretsManager;
