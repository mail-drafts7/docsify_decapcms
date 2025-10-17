const fs = require('fs').promises;
const path = require('path');

/**
 * User Management System
 * Handles user authentication, roles, and permissions
 */
class UserManagement {
  constructor() {
    this.usersFile = path.join(__dirname, '..', 'admin', 'users', 'users.json');
    this.rolesConfig = {
      admin: {
        label: "Administrator",
        permissions: ["publish", "delete", "create", "edit", "review", "manage_users"],
        auto_publish: true
      },
      editor: {
        label: "Editor", 
        permissions: ["create", "edit", "draft", "review"],
        auto_publish: false
      },
      contributor: {
        label: "Contributor",
        permissions: ["create", "draft"],
        auto_publish: false
      }
    };
    this.defaultUsers = [
      {
        id: "admin-001",
        email: "maildrafts7@gmail.com",
        username: "admin",
        password: "admin123",
        role: "admin",
        name: "Primary Administrator",
        active: true,
        join_date: new Date().toISOString(),
        github_username: "twlabs",
        last_login: null
      }
    ];
    this.initializeUsers();
  }

  /**
   * Initialize users file if it doesn't exist
   */
  async initializeUsers() {
    try {
      await fs.mkdir(path.dirname(this.usersFile), { recursive: true });
      
      try {
        await fs.access(this.usersFile);
      } catch {
        // File doesn't exist, create it with default users
        await fs.writeFile(this.usersFile, JSON.stringify(this.defaultUsers, null, 2));
        console.log('✅ Users file initialized with default admin user');
      }
    } catch (error) {
      console.error('❌ Failed to initialize users file:', error);
    }
  }

  /**
   * Load users from file
   */
  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      return this.defaultUsers;
    }
  }

  /**
   * Save users to file
   */
  async saveUsers(users) {
    try {
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Failed to save users:', error);
      return false;
    }
  }

  /**
   * Get user by GitHub username or email
   */
  async getUserBy(field, value) {
    const users = await this.loadUsers();
    return users.find(user => user[field] === value && user.active);
  }

  /**
   * Get user by GitHub token (fetch GitHub user info)
   * First GitHub user becomes admin, others need to be created locally
   */
  async getUserByToken(token) {
    try {
      const axios = require('axios');
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      const githubUser = response.data;
      let user = await this.getUserBy('github_username', githubUser.login) || 
                 await this.getUserBy('email', githubUser.email);

      if (!user) {
        // Check if this is the first user (no users exist yet)
        const allUsers = await this.loadUsers();
        const hasUsers = allUsers && allUsers.length > 0;
        
        if (!hasUsers) {
          // First GitHub user becomes admin automatically
          user = {
            id: "admin-001",
            email: githubUser.email || `${githubUser.login}@github.local`,
            name: githubUser.name || githubUser.login,
            role: "admin",
            active: true,
            join_date: new Date().toISOString(),
            github_username: githubUser.login,
            last_login: null,
            created_by: "System (First User)"
          };
          
          await this.saveUsers([user]);
          console.log(`👑 First user automatically set as admin: ${user.name} (${githubUser.login})`);
        } else {
          console.log(`🚫 Access denied: User ${githubUser.login} (${githubUser.email}) not found in system. Admin must create user first.`);
          return null;
        }
      }

      // Update last login
      await this.updateUserLastLogin(user.id);
      
      console.log(`✅ User authenticated: ${user.name} (${user.role})`);
      return user;
    } catch (error) {
      console.error('❌ Failed to get user by token:', error);
      return null;
    }
  }

  /**
   * Create new user (Admin only)
   */
  async createUser(userData, adminUser = null) {
    // Ensure only admin can create users
    if (adminUser && adminUser.role !== 'admin') {
      throw new Error('Only administrators can create users');
    }

    const users = await this.loadUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email || u.github_username === userData.github_username);
    if (existingUser) {
      throw new Error('User already exists with this email or GitHub username');
    }

    // Validate user data
    const validation = this.validateUserData(userData);
    if (!validation.isValid) {
      throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      username: userData.username,
      password: userData.password,
      name: userData.name,
      role: userData.role || 'contributor',
      active: userData.active !== undefined ? userData.active : true,
      join_date: new Date().toISOString(),
      github_username: userData.github_username || null,
      last_login: null,
      created_by: adminUser ? adminUser.name : 'System',
      ...userData
    };

    users.push(newUser);
    await this.saveUsers(users);
    
    console.log(`✅ Admin created new user: ${newUser.name} (${newUser.role})`);
    return newUser;
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    const users = await this.loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex] = { ...users[userIndex], ...updateData };
    await this.saveUsers(users);
    
    console.log(`✅ Updated user: ${users[userIndex].name}`);
    return users[userIndex];
  }

  /**
   * Update user last login
   */
  async updateUserLastLogin(userId) {
    return this.updateUser(userId, { last_login: new Date().toISOString() });
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    return this.loadUsers();
  }

  /**
   * Get active users
   */
  async getActiveUsers() {
    const users = await this.loadUsers();
    return users.filter(user => user.active);
  }

  /**
   * Check if user has permission
   */
  hasPermission(user, permission) {
    if (!user || !user.role) return false;
    
    const roleConfig = this.rolesConfig[user.role];
    if (!roleConfig) return false;
    
    return roleConfig.permissions.includes(permission);
  }

  /**
   * Check if user can perform action on content
   */
  canPerformAction(user, action, content = null) {
    if (!user) return false;

    // Admin can do everything
    if (user.role === 'admin') return true;

    // Check basic permission
    if (!this.hasPermission(user, action)) return false;

    // Additional checks based on content and action
    if (content && content.author) {
      // Users can edit their own content
      if (action === 'edit' && content.author === user.name) return true;
      
      // Users can delete their own drafts
      if (action === 'delete' && content.author === user.name && content.status === 'draft') return true;
    }

    return true;
  }

  /**
   * Get user role configuration
   */
  getRoleConfig(role) {
    return this.rolesConfig[role] || null;
  }

  /**
   * Get all roles
   */
  getAllRoles() {
    return this.rolesConfig;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId) {
    return this.updateUser(userId, { active: false });
  }

  /**
   * Activate user
   */
  async activateUser(userId) {
    return this.updateUser(userId, { active: true });
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(userId) {
    return this.deactivateUser(userId);
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const users = await this.loadUsers();
    const stats = {
      total: users.length,
      active: users.filter(u => u.active).length,
      inactive: users.filter(u => !u.active).length,
      by_role: {}
    };

    Object.keys(this.rolesConfig).forEach(role => {
      stats.by_role[role] = users.filter(u => u.role === role && u.active).length;
    });

    return stats;
  }

  /**
   * Validate user data
   */
  validateUserData(userData) {
    const errors = [];

    if (!userData.email || !userData.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!userData.username || userData.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!userData.role || !this.rolesConfig[userData.role]) {
      errors.push('Valid role is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = UserManagement;
