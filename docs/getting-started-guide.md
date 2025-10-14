---
title: Getting Started with Our Platform
description: Step-by-step tutorial to get up and running with our platform in 15 minutes
order: 2
category: docs
date: 2024-01-15T11:00:00.000Z
author: Platform Team
tags:
  - tutorial
  - getting-started
  - beginner
---

# Getting Started with Our Platform

Welcome! This step-by-step tutorial will help you get up and running with our platform in just 15 minutes. By the end, you'll have created your first project and understand the core concepts.

## What You'll Learn

- How to create your first account
- Setting up your development environment
- Creating and configuring your first project
- Making your first API call
- Understanding the dashboard

## Prerequisites

Before we begin, make sure you have:

- ✅ A modern web browser (Chrome, Firefox, Safari, or Edge)
- ✅ Basic understanding of web technologies
- ✅ Text editor or IDE (VS Code recommended)
- ✅ Internet connection

## Step 1: Create Your Account

Let's start by creating your account:

1. **Visit our signup page**: Go to [https://platform.example.com/signup](https://platform.example.com/signup)

2. **Fill in your details**:
   ```
   Name: Your Full Name
   Email: your-email@example.com
   Password: Choose a strong password (8+ characters)
   ```

3. **Verify your email**: Check your inbox for a verification email and click the confirmation link

4. **Complete your profile**: Add your organization details and use case information

> 💡 **Tip**: Use a professional email address as this will be associated with your API usage and billing.

## Step 2: Set Up Your Development Environment

Now let's prepare your local environment:

### Install Required Tools

1. **Install Node.js** (if you haven't already):
   - Visit [nodejs.org](https://nodejs.org)
   - Download and install the LTS version
   - Verify installation: `node --version`

2. **Install our CLI tool**:
   ```bash
   npm install -g @example/platform-cli
   ```

3. **Verify the installation**:
   ```bash
   platform --version
   ```

### Authenticate Your CLI

1. **Login to the CLI**:
   ```bash
   platform auth login
   ```

2. **Follow the browser authentication flow**

3. **Verify authentication**:
   ```bash
   platform auth status
   ```

## Step 3: Create Your First Project

Let's create a simple project to get familiar with the platform:

1. **Initialize a new project**:
   ```bash
   mkdir my-first-project
   cd my-first-project
   platform init
   ```

2. **Follow the interactive setup**:
   ```
   Project name: my-first-project
   Description: Learning the platform basics
   Template: starter-template
   Region: us-east-1
   ```

3. **Review the generated files**:
   ```
   my-first-project/
   ├── platform.config.js
   ├── src/
   │   └── index.js
   ├── tests/
   │   └── basic.test.js
   └── README.md
   ```

## Step 4: Configure Your Project

Let's customize the basic configuration:

1. **Open `platform.config.js`**:
   ```javascript
   module.exports = {
     name: 'my-first-project',
     version: '1.0.0',
     environment: 'development',
     features: {
       authentication: true,
       logging: true,
       monitoring: false
     },
     resources: {
       memory: 512,
       timeout: 30
     }
   };
   ```

2. **Update your main function** in `src/index.js`:
   ```javascript
   exports.handler = async (event, context) => {
     console.log('Hello from my first project!');
     
     return {
       statusCode: 200,
       body: JSON.stringify({
         message: 'Welcome to the platform!',
         timestamp: new Date().toISOString(),
         requestId: context.requestId
       })
     };
   };
   ```

## Step 5: Deploy and Test

Now let's deploy your project and test it:

1. **Deploy your project**:
   ```bash
   platform deploy
   ```

2. **Wait for deployment to complete** (usually takes 1-2 minutes)

3. **Test your deployment**:
   ```bash
   platform invoke --function handler
   ```

4. **Expected output**:
   ```json
   {
     "statusCode": 200,
     "body": {
       "message": "Welcome to the platform!",
       "timestamp": "2024-01-15T11:15:00.000Z",
       "requestId": "req_12345"
     }
   }
   ```

## Step 6: Explore the Dashboard

Let's explore the web dashboard to monitor your project:

1. **Open the dashboard**: Visit [https://dashboard.platform.example.com](https://dashboard.platform.example.com)

2. **Navigate to your project**: Click on "my-first-project" in the projects list

3. **Explore key sections**:
   - **Overview**: Project status and quick metrics
   - **Logs**: Real-time application logs
   - **Metrics**: Performance and usage statistics
   - **Settings**: Configuration and team management

4. **View your recent invocation**: Check the logs section for your test execution

## Step 7: Make Your First API Call

Let's interact with your deployed project via API:

1. **Get your project URL** from the dashboard or CLI:
   ```bash
   platform info --url
   ```

2. **Make an HTTP request**:
   ```bash
   curl -X POST https://your-project-url.platform.example.com \
        -H "Content-Type: application/json" \
        -d '{"test": true}'
   ```

3. **Or use JavaScript**:
   ```javascript
   fetch('https://your-project-url.platform.example.com', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ test: true })
   })
   .then(response => response.json())
   .then(data => console.log('Success:', data));
   ```

## Next Steps

Congratulations! 🎉 You've successfully:

- ✅ Created your platform account
- ✅ Set up your development environment
- ✅ Created and deployed your first project
- ✅ Made your first API call
- ✅ Explored the dashboard

### What's Next?

1. **Explore Advanced Features**: 
   - [Database Integration Tutorial](/tutorials/database-integration)
   - [Authentication Setup Guide](/tutorials/auth-setup)

2. **Join the Community**:
   - [Developer Discord](https://discord.gg/example)
   - [Community Forum](https://community.platform.example.com)

3. **Read More Documentation**:
   - [API Reference](/docs/api-reference)
   - [Best Practices Guide](/guides/best-practices)

## Need Help?

If you run into any issues:

- 📧 **Email Support**: support@platform.example.com
- 💬 **Live Chat**: Available in the dashboard
- 📚 **Documentation**: [docs.platform.example.com](https://docs.platform.example.com)
- 🎥 **Video Tutorials**: [YouTube Channel](https://youtube.com/example)

Happy building! 🚀
