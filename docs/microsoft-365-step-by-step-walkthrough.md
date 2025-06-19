# Microsoft 365 Connection - Step-by-Step Walkthrough
Zero Gate ESO Platform Integration Guide

## Quick Start Checklist

Follow these steps in order to set up Microsoft 365 integration:

### Phase 1: Azure Portal Setup (15-20 minutes)

#### Step 1: Access Azure Portal
- [ ] Go to https://portal.azure.com
- [ ] Sign in with your organizational admin account
- [ ] Verify you have "Application Administrator" or "Global Administrator" role

#### Step 2: Create App Registration
- [ ] Navigate to **Azure Active Directory** → **App registrations**
- [ ] Click **"New registration"**
- [ ] Enter details:
  - **Name**: `Zero Gate ESO Platform`
  - **Account types**: `Accounts in this organizational directory only`
  - **Redirect URI**: Skip for now (we'll add later)
- [ ] Click **"Register"**

#### Step 3: Record Key Information
After registration, immediately copy these values:
- [ ] **Application (client) ID**: `_________________________________`
- [ ] **Directory (tenant) ID**: `_________________________________`

#### Step 4: Create Client Secret
- [ ] Go to **"Certificates & secrets"** tab
- [ ] Click **"New client secret"**
- [ ] Description: `Zero Gate ESO Production Secret`
- [ ] Expires: `24 months`
- [ ] Click **"Add"**
- [ ] **IMMEDIATELY COPY THE SECRET VALUE**: `_________________________________`
  ⚠️ **This is your only chance to copy the secret value!**

### Phase 2: Configure Permissions (10-15 minutes)

#### Step 5: Add API Permissions
- [ ] Go to **"API permissions"** tab
- [ ] Click **"Add a permission"**
- [ ] Select **"Microsoft Graph"**
- [ ] Choose **"Application permissions"**

#### Step 6: Add Required Permissions One by One
Add each of these permissions:

**User and Directory Access:**
- [ ] `User.Read.All` - Read all users' full profiles
- [ ] `Directory.Read.All` - Read directory data

**Communication Analysis:**
- [ ] `Mail.Read` - Read mail in all mailboxes
- [ ] `Calendars.Read` - Read calendars in all mailboxes

**File Processing:**
- [ ] `Files.Read.All` - Read files in all site collections
- [ ] `Sites.Read.All` - Read items in all site collections

#### Step 7: Grant Admin Consent
- [ ] Click **"Grant admin consent for [Your Organization Name]"**
- [ ] Confirm by clicking **"Yes"**
- [ ] Verify all permissions show green checkmarks with "Granted for [Your Organization]"

### Phase 3: Configure Authentication (5 minutes)

#### Step 8: Set Redirect URIs
- [ ] Go to **"Authentication"** tab
- [ ] Click **"Add a platform"**
- [ ] Select **"Web"**
- [ ] Add redirect URIs:
  - [ ] `https://your-actual-replit-domain.replit.app/api/microsoft/callback`
  - [ ] `http://localhost:5000/api/microsoft/callback` (for testing)
- [ ] Click **"Configure"**

#### Step 9: Advanced Settings
- [ ] Under **"Advanced settings"**:
  - [ ] **Allow public client flows**: `No`
  - [ ] **Enable tokens**: Check both `Access tokens` and `ID tokens`
- [ ] Click **"Save"**

### Phase 4: Configure Replit Environment (5 minutes)

#### Step 10: Add Secrets to Replit
- [ ] In your Replit project, go to **Tools** → **Secrets**
- [ ] Add these three secrets with your actual values:

```
MICROSOFT_CLIENT_ID = [paste your Application ID here]
MICROSOFT_CLIENT_SECRET = [paste your secret value here]  
MICROSOFT_TENANT_ID = [paste your Directory ID here]
```

⚠️ **Make sure to use the actual values, not the placeholder text!**

#### Step 11: Restart Application
- [ ] Stop your Replit application (if running)
- [ ] Start it again to load the new environment variables
- [ ] Check the console for any Microsoft-related error messages

### Phase 5: Test the Connection (10 minutes)

#### Step 12: Verify Basic Connectivity
- [ ] Open your application in browser
- [ ] Navigate to `/api/microsoft/test` (if this endpoint exists)
- [ ] Or check the application logs for Microsoft Graph connection status

#### Step 13: Test Data Access
- [ ] Try accessing the organizational data features
- [ ] Test email pattern analysis (if available in UI)
- [ ] Test Excel file upload and processing

### Phase 6: Troubleshooting Common Issues

#### If you get "Invalid client secret" error:
- [ ] Double-check you copied the secret **VALUE** not the secret **ID**
- [ ] Verify the secret hasn't expired
- [ ] Make sure there are no extra spaces in the environment variable

#### If you get "Insufficient privileges" error:
- [ ] Verify admin consent was granted for all permissions
- [ ] Check that your Azure account has sufficient admin rights
- [ ] Ensure the application is enabled and not disabled

#### If you get "Application not found" error:
- [ ] Verify the CLIENT_ID is correct
- [ ] Check that the TENANT_ID matches your organization
- [ ] Ensure the application is registered in the correct Azure directory

## What Each Permission Does for Zero Gate ESO Platform

### `User.Read.All`
**What it's for**: Building organizational relationship maps
**Data accessed**: Employee names, titles, departments, manager relationships
**Platform use**: Creates the network of people for relationship discovery

### `Directory.Read.All`
**What it's for**: Understanding organizational structure
**Data accessed**: Groups, teams, organizational units
**Platform use**: Maps reporting structures and team relationships

### `Mail.Read`
**What it's for**: Analyzing communication patterns
**Data accessed**: Email frequency and patterns (not content)
**Platform use**: Calculates relationship strength based on interaction frequency

### `Files.Read.All`
**What it's for**: Processing data files
**Data accessed**: Excel files in SharePoint/OneDrive
**Platform use**: Imports grant data, sponsor information, and relationship data

## Security and Privacy Notes

### Data Protection
- Zero Gate ESO Platform only accesses metadata and patterns, not personal content
- All data processing follows organizational privacy policies
- Access is logged and can be audited

### Minimum Permissions
- These are the minimum required permissions for full functionality
- Each permission serves a specific platform feature
- Permissions can be reviewed and revoked at any time by administrators

## Need Help?

### Common Questions

**Q: Do I need to be a Global Administrator?**
A: You need at least "Application Administrator" role, but Global Admin works too.

**Q: Can I test with a personal Microsoft account?**
A: No, this requires an organizational Microsoft 365 account with Azure AD.

**Q: How long do these permissions last?**
A: Client secrets expire (24 months recommended), but permissions are permanent until revoked.

**Q: Can other people in my organization see this app?**
A: Only if you explicitly assign them permissions or make it available organization-wide.

### Getting Support
- Check the Azure portal for detailed error messages
- Review the application logs in Replit for specific issues
- Microsoft Graph has excellent documentation at docs.microsoft.com/graph

---

**Final Step**: Once everything is working, update the Zero Gate ESO Platform documentation with your specific organizational details and any custom configurations you made.