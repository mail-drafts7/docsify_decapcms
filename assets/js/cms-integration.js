// Enhanced CMS Integration Script for Docsify + Decap CMS
// Handles real-time sidebar updates and content synchronization

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        githubRepo: 'mail-drafts7/docsify_decapcms',
        githubBranch: 'main',
        sidebarFile: '_sidebar.md',
        contentFolders: ['docs', 'tutorials', 'guides'],
        checkInterval: 30000, // Check for updates every 30 seconds
        enableAutoUpdate: true
    };

    // GitHub API helper with caching
    class GitHubAPI {
        constructor() {
            this.baseUrl = 'https://api.github.com/repos/' + CONFIG.githubRepo;
            this.cache = new Map();
            this.lastUpdate = 0;
        }

        async getFileContent(path, useCache = true) {
            const cacheKey = `file:${path}`;
            
            if (useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                    return cached.content;
                }
            }

            try {
                const response = await fetch(`${this.baseUrl}/contents/${path}?ref=${CONFIG.githubBranch}&t=${Date.now()}`);
                if (!response.ok) return null;
                const data = await response.json();
                const content = atob(data.content);
                
                this.cache.set(cacheKey, {
                    content,
                    timestamp: Date.now()
                });
                
                return content;
            } catch (error) {
                console.warn('Failed to fetch file:', path, error);
                return null;
            }
        }

        async getDirectoryContents(path, useCache = true) {
            const cacheKey = `dir:${path}`;
            
            if (useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 30000) { // 30 second cache for directories
                    return cached.content;
                }
            }

            try {
                const response = await fetch(`${this.baseUrl}/contents/${path}?ref=${CONFIG.githubBranch}&t=${Date.now()}`);
                if (!response.ok) return [];
                const content = await response.json();
                
                this.cache.set(cacheKey, {
                    content,
                    timestamp: Date.now()
                });
                
                return content;
            } catch (error) {
                console.warn('Failed to fetch directory:', path, error);
                return [];
            }
        }

        clearCache() {
            this.cache.clear();
        }
    }

    // Enhanced Content Manager with real-time updates
    class ContentManager {
        constructor() {
            this.github = new GitHubAPI();
            this.currentSidebar = '';
            this.lastContentHash = '';
            this.updateInterval = null;
        }

        // Extract metadata from markdown frontmatter
        parseMarkdownMeta(content) {
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) return {};

            const frontmatter = frontmatterMatch[1];
            const meta = {};
            
            frontmatter.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                    if (key) meta[key] = value;
                }
            });

            return meta;
        }

        // Get all content files and their metadata with improved sorting
        async getAllContent(useCache = true) {
            const allContent = [];

            for (const folder of CONFIG.contentFolders) {
                const files = await this.github.getDirectoryContents(folder, useCache);
                
                for (const file of files) {
                    if (file.name.endsWith('.md') && file.type === 'file') {
                        const content = await this.github.getFileContent(file.path, useCache);
                        if (content) {
                            const meta = this.parseMarkdownMeta(content);
                            const title = meta.title || file.name.replace('.md', '').replace(/-/g, ' ');
                            const order = parseInt(meta.order) || 999;
                            
                            allContent.push({
                                path: file.path,
                                name: file.name,
                                title: title,
                                order: order,
                                date: meta.date ? new Date(meta.date) : new Date(file.updated_at || file.created_at),
                                category: meta.category || folder,
                                difficulty: meta.difficulty,
                                time: meta.time,
                                folder: folder,
                                url: `/${file.path.replace('.md', '')}`
                            });
                        }
                    }
                }
            }

            // Sort by folder order first, then by order number, then by title
            const folderOrder = { 'docs': 1, 'tutorials': 2, 'guides': 3 };
            return allContent.sort((a, b) => {
                const folderOrderA = folderOrder[a.folder] || 999;
                const folderOrderB = folderOrder[b.folder] || 999;
                
                if (folderOrderA !== folderOrderB) return folderOrderA - folderOrderB;
                if (a.order !== b.order) return a.order - b.order;
                return a.title.localeCompare(b.title);
            });
        }

        // Generate sidebar content with improved structure
        generateSidebar(content) {
            let sidebar = '<!-- This sidebar is automatically managed by Decap CMS -->\n\n';
            sidebar += '* [🏠 Home](/)\n\n';

            // Group content by folder
            const grouped = content.reduce((acc, item) => {
                if (!acc[item.folder]) acc[item.folder] = [];
                acc[item.folder].push(item);
                return acc;
            }, {});

            // Generate sections with proper ordering
            const sectionIcons = {
                'docs': '📚 Documentation',
                'tutorials': '🎓 Tutorials',
                'guides': '📋 User Guides'
            };

            CONFIG.contentFolders.forEach(folder => {
                if (grouped[folder] && grouped[folder].length > 0) {
                    const sectionTitle = sectionIcons[folder] || folder;
                    sidebar += `* ${sectionTitle}\n`;
                    
                    grouped[folder].forEach(item => {
                        sidebar += `  * [${item.title}](${item.url})\n`;
                    });
                    
                    sidebar += '\n';
                }
            });

            sidebar += '* 🔧 CMS Admin\n';
            sidebar += '  * <a href="admin/" target="_self">📝 Content Management</a>\n';

            return sidebar;
        }

        // Check if content has changed
        async hasContentChanged() {
            try {
                const content = await this.getAllContent(false); // Force fresh fetch
                const contentHash = JSON.stringify(content.map(item => ({
                    path: item.path,
                    title: item.title,
                    order: item.order
                })));
                
                const hasChanged = contentHash !== this.lastContentHash;
                this.lastContentHash = contentHash;
                
                return hasChanged;
            } catch (error) {
                console.warn('Error checking content changes:', error);
                return false;
            }
        }

        // Update sidebar in the DOM dynamically
        updateSidebarDOM(newSidebar) {
            try {
                // Parse the sidebar markdown to update Docsify's sidebar
                if (window.$docsify && window.Docsify) {
                    // Clear GitHub API cache
                    this.github.clearCache();
                    
                    // Force Docsify to re-render sidebar
                    if (window.vm && window.vm._updateRender) {
                        window.vm._updateRender();
                    }
                    
                    // Removed automatic page reload to prevent multiple renders
                    // Alternative: reload the page if dynamic update fails
                    // setTimeout(() => {
                    //     if (document.querySelector('.sidebar-nav')) {
                    //         location.reload();
                    //     }
                    // }, 1000);
                }
                
                console.log('Sidebar updated in DOM');
                return true;
            } catch (error) {
                console.error('Failed to update sidebar DOM:', error);
                return false;
            }
        }

        // Auto-update sidebar with content changes
        async autoUpdateSidebar() {
            try {
                if (await this.hasContentChanged()) {
                    console.log('Content changes detected, updating sidebar...');
                    
                    const content = await this.getAllContent(false);
                    const newSidebar = this.generateSidebar(content);
                    
                    if (newSidebar !== this.currentSidebar) {
                        this.currentSidebar = newSidebar;
                        this.updateSidebarDOM(newSidebar);
                        
                        // Dispatch custom event for other scripts to listen
                        window.dispatchEvent(new CustomEvent('sidebarUpdated', {
                            detail: { content, sidebar: newSidebar }
                        }));
                        
                        console.log('Sidebar auto-updated successfully!');
                    }
                }
            } catch (error) {
                console.error('Auto-update failed:', error);
            }
        }

        // Start monitoring for changes
        startAutoUpdate() {
            if (CONFIG.enableAutoUpdate && !this.updateInterval) {
                console.log('Starting auto-update monitoring...');
                this.updateInterval = setInterval(() => {
                    this.autoUpdateSidebar();
                }, CONFIG.checkInterval);
            }
        }

        // Stop monitoring
        stopAutoUpdate() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
                console.log('Auto-update monitoring stopped');
            }
        }

        // Manual sidebar update
        async updateSidebar() {
            try {
                const content = await this.getAllContent(false);
                const newSidebar = this.generateSidebar(content);
                
                console.log('Generated sidebar content:');
                console.log(newSidebar);
                
                this.currentSidebar = newSidebar;
                this.updateSidebarDOM(newSidebar);
                
                return newSidebar;
            } catch (error) {
                console.error('Failed to generate sidebar:', error);
                return null;
            }
        }
    }

    // Initialize enhanced CMS integration
    function initializeCMSIntegration() {
        const contentManager = new ContentManager();
        
        // Start auto-update monitoring
        contentManager.startAutoUpdate();
        
        // Initial sidebar generation
        setTimeout(() => {
            contentManager.updateSidebar();
        }, 2000);
        
        // Add to global scope
        window.cmsIntegration = {
            contentManager,
            config: CONFIG,
            // Manual functions
            updateSidebar: () => contentManager.updateSidebar(),
            getAllContent: () => contentManager.getAllContent(false),
            startAutoUpdate: () => contentManager.startAutoUpdate(),
            stopAutoUpdate: () => contentManager.stopAutoUpdate(),
            hasContentChanged: () => contentManager.hasContentChanged()
        };

        // Listen for visibility changes to refresh when tab becomes active
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => contentManager.autoUpdateSidebar(), 1000);
            }
        });

        console.log('Enhanced CMS Integration loaded with auto-update capability!');
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
