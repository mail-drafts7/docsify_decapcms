// CMS Integration Script for Docsify + Decap CMS
// Handles sidebar updates and content synchronization

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        githubRepo: 'mail-drafts7/docsify_decapcms',
        githubBranch: 'main',
        sidebarFile: '_sidebar.md',
        contentFolders: ['docs', 'tutorials', 'guides']
    };

    // GitHub API helper
    class GitHubAPI {
        constructor() {
            this.baseUrl = 'https://api.github.com/repos/' + CONFIG.githubRepo;
        }

        async getFileContent(path) {
            try {
                const response = await fetch(`${this.baseUrl}/contents/${path}?ref=${CONFIG.githubBranch}`);
                if (!response.ok) return null;
                const data = await response.json();
                return atob(data.content);
            } catch (error) {
                console.warn('Failed to fetch file:', path, error);
                return null;
            }
        }

        async getDirectoryContents(path) {
            try {
                const response = await fetch(`${this.baseUrl}/contents/${path}?ref=${CONFIG.githubBranch}`);
                if (!response.ok) return [];
                return await response.json();
            } catch (error) {
                console.warn('Failed to fetch directory:', path, error);
                return [];
            }
        }
    }

    // Knowledge Pack
    class ContentManager {
        constructor() {
            this.github = new GitHubAPI();
        }

        // Extract metadata from markdown frontmatter
        parseMarkdownMeta(content) {
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) return {};

            const frontmatter = frontmatterMatch[1];
            const meta = {};
            
            frontmatter.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim().replace(/"/g, '');
                    meta[key.trim()] = value;
                }
            });

            return meta;
        }

        // Get all content files and their metadata
        async getAllContent() {
            const allContent = [];

            for (const folder of CONFIG.contentFolders) {
                const files = await this.github.getDirectoryContents(folder);
                
                for (const file of files) {
                    if (file.name.endsWith('.md') && file.type === 'file') {
                        const content = await this.github.getFileContent(file.path);
                        if (content) {
                            const meta = this.parseMarkdownMeta(content);
                            const title = meta.title || file.name.replace('.md', '').replace(/-/g, ' ');
                            
                            allContent.push({
                                path: file.path,
                                name: file.name,
                                title: title,
                                date: meta.date ? new Date(meta.date) : new Date(file.updated_at || file.created_at),
                                category: meta.category || folder,
                                difficulty: meta.difficulty,
                                folder: folder,
                                url: `/${file.path.replace('.md', '')}`
                            });
                        }
                    }
                }
            }

            return allContent.sort((a, b) => a.title.localeCompare(b.title));
        }

        // Generate sidebar content
        generateSidebar(content) {
            let sidebar = '<!-- This sidebar is automatically managed by Decap CMS -->\n\n';
            sidebar += '* [🏠 Home](/)\n\n';

            // Group content by folder
            const grouped = content.reduce((acc, item) => {
                if (!acc[item.folder]) acc[item.folder] = [];
                acc[item.folder].push(item);
                return acc;
            }, {});

            // Generate sections
            const sectionIcons = {
                'docs': '📚 Documentation',
                'tutorials': '🎓 Tutorials',
                'guides': '📋 User Guides'
            };

            Object.entries(grouped).forEach(([folder, items]) => {
                const sectionTitle = sectionIcons[folder] || folder;
                sidebar += `* ${sectionTitle}\n`;
                
                items.forEach(item => {
                    sidebar += `  * [${item.title}](${item.url})\n`;
                });
                
                sidebar += '\n';
            });

            sidebar += '* 🔧 CMS Admin\n';
            sidebar += '  * <a href="admin/" target="_self">📝 Content Management</a>\n';

            return sidebar;
        }

        // Manual sidebar update (call this when needed)
        async updateSidebar() {
            try {
                const content = await this.getAllContent();
                const newSidebar = this.generateSidebar(content);
                
                console.log('Generated sidebar content:');
                console.log(newSidebar);
                console.log('Note: To implement automatic updates, you would need to commit this back to GitHub via API or webhook');
                
                return newSidebar;
            } catch (error) {
                console.error('Failed to generate sidebar:', error);
                return null;
            }
        }
    }

    // Initialize CMS integration
    function initializeCMSIntegration() {
        const contentManager = new ContentManager();
        
        // Add to global scope for manual use
        window.cmsIntegration = {
            contentManager,
            config: CONFIG,
            // Manual functions for testing
            updateSidebar: () => contentManager.updateSidebar(),
            getAllContent: () => contentManager.getAllContent()
        };

        console.log('CMS Integration loaded. Use window.cmsIntegration.updateSidebar() to generate sidebar content.');
    }

    // Initialize when Docsify is ready
    if (window.$docsify) {
        window.$docsify.plugins = (window.$docsify.plugins || []).concat(function(hook) {
            hook.ready(initializeCMSIntegration);
        });
    } else {
        // Fallback for direct loading
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeCMSIntegration);
        } else {
            initializeCMSIntegration();
        }
    }

})();
