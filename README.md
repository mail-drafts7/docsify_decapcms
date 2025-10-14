# Docsify + DecapCMS Integration

A modern documentation platform combining Docsify for beautiful documentation sites with DecapCMS for easy content management.

## Features

- 📚 **Beautiful Documentation**: Powered by Docsify with Vue.js theme
- ✏️ **Content Management**: Easy editing with DecapCMS admin interface
- 🔐 **GitHub Integration**: OAuth authentication and automated deployments
- 🔄 **Auto-sync**: Sidebar automatically updates when content changes
- 📱 **Responsive**: Works perfectly on desktop and mobile devices
- 🔍 **Search**: Built-in search functionality across all content

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.template .env
   # Edit .env with your GitHub OAuth credentials
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Access the Platform**
   - Documentation: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## Configuration

### GitHub OAuth Setup

1. Create a GitHub OAuth App in your repository settings
2. Set the callback URL to: `http://localhost:3000/api/auth`
3. Add your credentials to `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

### Content Management

Content is organized in the `docs/` folder:
- `docs/_sidebar.md` - Navigation structure
- `docs/*.md` - Individual documentation pages

The CMS automatically manages the sidebar structure based on frontmatter in your markdown files.

## Deployment

### Docker
```bash
docker-compose up -d
```

### Manual Deployment
```bash
npm run build
npm run start:prod
```

## Tech Stack

- **Frontend**: Docsify, Vue.js theme
- **CMS**: DecapCMS with GitHub backend
- **Backend**: Node.js, Express
- **Authentication**: GitHub OAuth 2.0
- **Storage**: Git-based content management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
