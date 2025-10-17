const axios = require('axios');

/**
 * GitHub Secrets Manager
 * Fetches secrets from GitHub repository via API during login process
 * Secrets are never stored locally, only fetched on-demand
 */
class GitHubSecretsManager {
  constructor(options = {}) {
    this.repoOwner = options.repoOwner || 'twlabs';
    this.repoName = options.repoName || 'warp37-spike-docsify-decapcms';
    this.baseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}`;
    this.secretsFile = '.secrets.json';
  }

  /**
   * Fetch secrets dynamically from API for login process
   * Fetches secrets from remote API endpoint on-demand
   * No local storage of secrets
   */
  async fetchSecretsForLogin() {
    try {
      console.log('🔐 Fetching OAuth secrets from API...');
      
      // Try multiple secret sources in priority order
      const secretsSources = [
        // 1. Try GitHub repository secrets.json (primary source)
        { url: `${this.baseUrl}/contents/.secrets.json`, name: 'GitHub Repository' },
        // 2. Try environment variables as fallback
        { url: null, name: 'Environment Variables' }
      ];

      for (const source of secretsSources) {
        try {
          const secrets = await this.fetchFromSource(source);
          if (secrets && secrets.GITHUB_CLIENT_ID && secrets.GITHUB_CLIENT_SECRET) {
            console.log(`✅ OAuth secrets fetched successfully from ${source.name}`);
            return secrets;
          }
        } catch (sourceError) {
          console.log(`⚠️  Failed to fetch from ${source.name}: ${sourceError.message}`);
          continue;
        }
      }

      throw new Error('All secrets sources failed - no OAuth credentials available');
    } catch (error) {
      console.error(`❌ Failed to fetch secrets:`, error.message);
      throw new Error(`Cannot fetch OAuth secrets: ${error.message}`);
    }
  }

  /**
   * Fetch secrets from a specific source
   */
  async fetchFromSource(source) {
    if (!source.url) {
      // Environment variables fallback
      const secrets = {
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
      };
      if (!secrets.GITHUB_CLIENT_ID || !secrets.GITHUB_CLIENT_SECRET) {
        throw new Error('Environment variables not set');
      }
      return secrets;
    }

    if (source.url.includes('github.com/repos')) {
      // GitHub API format
      const response = await axios.get(source.url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Docsify-DecapCMS'
        },
        timeout: 5000
      });

      if (response.data && response.data.content) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        const secretsConfig = JSON.parse(content);
        const environment = process.env.NODE_ENV || 'development';
        return secretsConfig[environment] || secretsConfig.development;
      }
    } else {
      // Custom API format
      const response = await axios.get(source.url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Docsify-DecapCMS'
        },
        timeout: 5000
      });

      return response.data;
    }

    throw new Error('Invalid response format');
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
   * Test OAuth credentials
   */
  async testConnection() {
    try {
      const secrets = await this.fetchSecretsForLogin();
      return {
        success: true,
        hasClientId: !!secrets.GITHUB_CLIENT_ID,
        hasClientSecret: !!secrets.GITHUB_CLIENT_SECRET,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        environment: process.env.NODE_ENV || 'development'
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
      environment: process.env.NODE_ENV || 'development',
      secretsSource: 'dynamic_api_fetch'
    };
  }
}

module.exports = GitHubSecretsManager;
