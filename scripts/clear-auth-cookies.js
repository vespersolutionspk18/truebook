#!/usr/bin/env node

/**
 * Script to clear authentication cookies
 * Run this after auth configuration changes that break JWT decryption
 */

console.log(`
============================================
AUTH COOKIE CLEANUP INSTRUCTIONS
============================================

Due to changes in the authentication configuration,
existing session tokens are no longer valid.

Please follow these steps to fix the authentication:

1. Clear your browser cookies for localhost:3000
   - In Chrome: Developer Tools > Application > Cookies > localhost
   - Delete all cookies starting with "next-auth"
   
2. Restart the development server:
   - Stop the current server (Ctrl+C)
   - Run: npm run dev
   
3. Try logging in again with your credentials

If you still have issues:
- Clear all browser data for localhost:3000
- Try an incognito/private window
- Check that .env file has AUTH_SECRET set

============================================
`);