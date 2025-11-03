<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Azure App Registration Setup Guide for JobHunter](#azure-app-registration-setup-guide-for-jobhunter)
  - [Overview: What You're Setting Up](#overview-what-youre-setting-up)
  - [Prerequisites](#prerequisites)
  - [Step 1: Access Azure Portal](#step-1-access-azure-portal)
  - [Step 2: Navigate to App Registrations](#step-2-navigate-to-app-registrations)
  - [Step 3: Register a New Application](#step-3-register-a-new-application)
  - [Step 4: Copy Your Application (Client) ID](#step-4-copy-your-application-client-id)
  - [Step 5: Create a Client Secret](#step-5-create-a-client-secret)
  - [Step 6: Configure API Permissions](#step-6-configure-api-permissions)
  - [Step 7: Update Your `.env` File](#step-7-update-your-env-file)
  - [Step 8: Verify Your Configuration](#step-8-verify-your-configuration)
  - [Troubleshooting](#troubleshooting)
    - ["Redirect URI mismatch" error](#redirect-uri-mismatch-error)
    - ["Invalid client secret" error](#invalid-client-secret-error)
    - ["Insufficient privileges" error during consent](#insufficient-privileges-error-during-consent)
    - [Can't find "App registrations" in Azure Portal](#cant-find-app-registrations-in-azure-portal)
  - [Next Steps](#next-steps)
    - [After Backend Implementation (Claude will do this next):](#after-backend-implementation-claude-will-do-this-next)
  - [Security Notes](#security-notes)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Azure App Registration Setup Guide for JobHunter

This guide walks you through setting up Microsoft Graph API access for JobHunter's email integration with `sam@samkirk.com`.

---

## Overview: What You're Setting Up

**Goal**: Get credentials from Microsoft Azure so JobHunter can access your email via Microsoft Graph API.

**The Complete Flow**:
1. ✅ **You do this first**: Complete Azure setup (this guide) → Get Client ID & Secret
2. ⏭️ **Then**: Backend implementation → Claude adds API endpoints (`/api/email/microsoft/auth-url`, etc.)
3. 🧪 **Finally**: Test with `microsoft-oauth.html` → Verify OAuth flow works

**About `microsoft-oauth.html`**:
- This is a simple test page (already created in your project root)
- It will be used AFTER the backend endpoints are implemented
- It helps verify the OAuth flow works correctly
- You'll use it by running: `open microsoft-oauth.html` (but only after backend is ready)

**This guide focuses on Step 1** - getting your Azure credentials ready.

---

## Prerequisites

- A Microsoft account (your sam@samkirk.com account)
- Access to Azure Portal (free, no subscription required for personal accounts)

---

## Step 1: Access Azure Portal

1. Go to **[Azure Portal](https://portal.azure.com)**
2. Sign in with your Microsoft account (sam@samkirk.com)
3. If this is your first time, you may see a "Welcome to Azure" screen - just click through

---

## Step 2: Navigate to App Registrations

1. In the Azure Portal search bar at the top, type: **"App registrations"**
2. Click on **"App registrations"** from the search results
3. You'll see the App registrations page (it may be empty if this is your first time)

---

## Step 3: Register a New Application

1. Click the **"+ New registration"** button at the top
2. Fill in the registration form:

   **Name**: `JobHunter Email Integration`

   **Supported account types**: ⚠️ **IMPORTANT - Select the THIRD option:**
   - ✅ **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**
   - This is the **3rd option from the top** (NOT "Personal Microsoft accounts only")
   - This allows access to:
     - Microsoft 365 custom domain accounts (like sam@samkirk.com)
     - Personal Microsoft accounts (like @outlook.com, @hotmail.com)

   **Redirect URI**:
   - Platform: Select **"Web"** from the dropdown
   - URI: Enter `http://localhost:8080/api/email/microsoft/callback`

3. Click **"Register"** button at the bottom

**Why the 3rd option?** If your email uses a custom domain with Microsoft 365 (like sam@samkirk.com), it's an organizational account, not a personal account. The 3rd option supports both types.

---

## Step 4: Copy Your Application (Client) ID

1. After registration, you'll see the app's **Overview** page
2. Find the **"Application (client) ID"** field (looks like: `12345678-1234-1234-1234-123456789abc`)
3. Click the copy icon next to it
4. **Save this somewhere** - you'll need it for your `.env` file

---

## Step 5: Create a Client Secret

1. In the left sidebar, click **"Certificates & secrets"**
2. Under the **"Client secrets"** tab, click **"+ New client secret"**
3. Fill in:
   - **Description**: `JobHunter OAuth Secret`
   - **Expires**: Select **"24 months"** (or your preference)
4. Click **"Add"**
5. **IMPORTANT**: Copy the **"Value"** field immediately (it looks like a long random string)
   - This is shown only ONCE - you cannot retrieve it later
   - If you lose it, you'll need to create a new secret
6. **Save this somewhere secure** - you'll need it for your `.env` file

---

## Step 6: Configure API Permissions

1. In the left sidebar, click **"API permissions"**
2. You'll see "Microsoft Graph" with "User.Read" already added (default)
3. Click **"+ Add a permission"**
4. Click **"Microsoft Graph"**
5. Click **"Delegated permissions"**
6. Search for and add these permissions:
   - `Mail.Read` - Read user mail
   - `Mail.ReadWrite` - Read and write access to user mail
   - `MailboxSettings.Read` - Read user mailbox settings

7. Click **"Add permissions"** at the bottom
8. You should now see:
   - User.Read (default)
   - Mail.Read
   - Mail.ReadWrite
   - MailboxSettings.Read

9. **Optional**: Click **"Grant admin consent for [your account]"**
   - This pre-approves the permissions so you don't see the consent screen during OAuth
   - Not required, but makes the flow smoother

---

## Step 7: Update Your `.env` File

Open your `backend/.env` file and add these lines:

```bash
# Microsoft Azure App Registration
MICROSOFT_CLIENT_ID=paste_your_client_id_here
MICROSOFT_CLIENT_SECRET=paste_your_client_secret_here
MICROSOFT_REDIRECT_URI=http://localhost:8080/api/email/microsoft/callback
MICROSOFT_TENANT_ID=common
```

Replace:
- `paste_your_client_id_here` with the Application (client) ID from Step 4
- `paste_your_client_secret_here` with the secret value from Step 5

---

## Step 8: Verify Your Configuration

Your app registration should now have:

- ✅ **Name**: JobHunter Email Integration
- ✅ **Supported account types**: Personal Microsoft accounts
- ✅ **Redirect URI**: http://localhost:8080/api/email/microsoft/callback (Web platform)
- ✅ **Client ID**: Saved to `.env`
- ✅ **Client Secret**: Saved to `.env`
- ✅ **API Permissions**:
  - User.Read (default)
  - Mail.Read
  - Mail.ReadWrite
  - MailboxSettings.Read

---

## Troubleshooting

### "Redirect URI mismatch" error
- Double-check that the redirect URI in Azure Portal **exactly** matches: `http://localhost:8080/api/email/microsoft/callback`
- No trailing slash
- `http` (not `https`) for local development
- Port `8080`

### "Invalid client secret" error
- The secret may have expired or was copied incorrectly
- Go back to "Certificates & secrets" and create a new secret
- Update your `.env` file with the new secret

### "Insufficient privileges" error during consent
- Make sure you selected **"Personal Microsoft accounts only"** for supported account types
- Check that you added the correct permissions in Step 6

### Can't find "App registrations" in Azure Portal
- Try the direct link: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- Or search for "Azure Active Directory" first, then click "App registrations" in the left sidebar

---

## Next Steps

Once you've completed this setup:

1. ✅ Azure app is registered
2. ✅ Client ID and Secret are in your `.env` file
3. 🚀 Ready to implement the Microsoft OAuth flow in the backend!

### After Backend Implementation (Claude will do this next):

Once the backend endpoints are implemented, you can test the OAuth flow:

```bash
# Open the test page in your browser
open microsoft-oauth.html

# This will:
# 1. Fetch the auth URL from your backend
# 2. Redirect to Microsoft login
# 3. After you sign in, redirect back to your backend
# 4. Complete the OAuth flow and store your tokens
```

**Note**: The `microsoft-oauth.html` page won't work until the backend endpoints are implemented. Claude will implement those next!

---

## Security Notes

- **Never commit your `.env` file** to version control (should already be in `.gitignore`)
- **Client secrets should be treated like passwords** - keep them secure
- For production deployment, you'll need to:
  - Update the redirect URI to your production domain
  - Use environment variables instead of `.env` files
  - Consider using Azure Key Vault for secret management

---

## References

- [Microsoft Graph Mail API Documentation](https://docs.microsoft.com/en-us/graph/api/resources/mail-api-overview)
- [Microsoft Identity Platform OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Azure App Registration Quickstart](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
