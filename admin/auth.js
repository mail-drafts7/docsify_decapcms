// Authentication handler for DecapCMS
(function() {
  'use strict';
  
  // Check if we have a valid authentication token
  function checkAuthentication() {
    const decapUser = localStorage.getItem('decap-cms-user');
    const netlifyUser = localStorage.getItem('netlify-cms-user');
    const sessionToken = sessionStorage.getItem('github-token');
    
    console.log('Checking authentication...');
    console.log('DecapCMS user:', decapUser ? 'Found' : 'Not found');
    console.log('Netlify CMS user:', netlifyUser ? 'Found' : 'Not found');
    console.log('Session token:', sessionToken ? 'Found' : 'Not found');
    
    if (decapUser || netlifyUser) {
      console.log('Authentication found, initializing CMS');
      return true;
    }
    
    console.log('No authentication found');
    return false;
  }
  
  // Initialize authentication when page loads
  function initAuth() {
    // Check if we're on the auth callback page
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      console.log('OAuth code found, processing authentication...');
      return;
    }
    
    // Check for existing authentication
    if (!checkAuthentication()) {
      console.log('No authentication found, user needs to log in');
      
      // If we're trying to access the dashboard directly without auth, redirect to login
      if (window.location.hash.includes('/collections')) {
        console.log('Redirecting to login...');
        window.location.hash = '';
      }
    } else {
      console.log('Authentication found, CMS should load');
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
  
  // Export for use by other scripts
  window.CMSAuth = {
    check: checkAuthentication,
    init: initAuth
  };
})();
