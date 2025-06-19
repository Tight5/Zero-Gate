# Microsoft 365 Integration Setup Guide
Zero Gate ESO Platform - Complete Microsoft Graph API Configuration

## Overview

This guide walks through obtaining Microsoft 365 permissions for organizational data access, email analysis, and Excel file processing as implemented in the Zero Gate ESO Platform.

## Prerequisites

- Azure Active Directory admin access
- Microsoft 365 tenant with appropriate licenses
- Organization approval for data access permissions

## Step 1: Azure App Registration

### 1.1 Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your organizational admin account
3. Navigate to **Azure Active Directory** > **App registrations**

### 1.2 Create New App Registration
1. Click **"New registration"**
2. Fill in the application details:
   - **Name**: `Zero Gate ESO Platform`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: `https://your-replit-domain.replit.app/api/microsoft/callback`
3. Click **"Register"**

### 1.3 Record Application Details
After registration, copy these values (you'll need them later):
- **Application (client) ID** → This becomes `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** → This becomes `MICROSOFT_TENANT_ID`

## Step 2: Create Client Secret

### 2.1 Generate Secret
1. In your app registration, go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. Add description: `Zero Gate ESO Platform Secret`
4. Set expiration: `24 months` (recommended)
5. Click **"Add"**

### 2.2 Copy Secret Value
**IMPORTANT**: Copy the secret **Value** immediately (not the Secret ID)
- This becomes your `MICROSOFT_CLIENT_SECRET`
- You cannot view this value again after leaving the page

## Step 3: Configure API Permissions

### 3.1 Add Microsoft Graph Permissions
1. Go to **"API permissions"**
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Choose **"Application permissions"** (for service-to-service access)

### 3.2 Required Permissions for Zero Gate ESO Platform

Add these specific permissions:

#### User and Organization Data
- `User.Read.All` - Read all users' profiles
- `Directory.Read.All` - Read directory data
- `Organization.Read.All` - Read organization information

#### Email and Communication Analysis
- `Mail.Read` - Read mail in all mailboxes
- `Calendars.Read` - Read calendars in all mailboxes
- `Contacts.Read` - Read contacts in all mailboxes

#### File and Document Access
- `Files.Read.All` - Read all files
- `Sites.Read.All` - Read items in all site collections

#### Optional Enhanced Permissions (if needed)
- `Reports.Read.All` - Read usage reports
- `AuditLog.Read.All` - Read audit log data

### 3.3 Grant Admin Consent
1. After adding all permissions, click **"Grant admin consent for [Your Organization]"**
2. Confirm by clicking **"Yes"**
3. Verify all permissions show **"Granted for [Your Organization]"**

## Step 4: Configure Authentication

### 4.1 Authentication Settings
1. Go to **"Authentication"**
2. Under **"Platform configurations"**, add:
   - **Platform**: Web
   - **Redirect URIs**: 
     - `https://your-replit-domain.replit.app/api/microsoft/callback`
     - `http://localhost:5000/api/microsoft/callback` (for development)

### 4.2 Advanced Settings
1. **Allow public client flows**: No
2. **Supported account types**: Single tenant
3. **Enable ID tokens**: Yes
4. **Enable access tokens**: Yes

## Step 5: Add Environment Secrets to Replit

### 5.1 Access Replit Secrets
1. In your Replit project, go to **Tools** > **Secrets**
2. Add the following secrets:

### 5.2 Required Environment Variables
```
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
MICROSOFT_TENANT_ID=your-directory-tenant-id
```

**Note**: Use the actual values you copied from Azure, not the placeholders.

## Step 6: Test the Integration

### 6.1 Verify Configuration
1. Restart your Replit application
2. Check the logs for Microsoft integration status
3. Navigate to `/api/microsoft/test` to verify connectivity

### 6.2 Test Authentication Flow
1. Access the Microsoft Graph service endpoints
2. Verify organizational data can be retrieved
3. Test email pattern analysis functionality
4. Confirm Excel file processing capabilities

## Step 7: Production Considerations

### 7.1 Security Best Practices
- Regularly rotate client secrets (every 12-24 months)
- Monitor API usage and permissions
- Implement proper error handling for permission changes
- Use least-privilege principle for permissions

### 7.2 Compliance and Privacy
- Ensure GDPR/privacy law compliance
- Document data processing activities
- Implement data retention policies
- Provide user privacy notices

## Troubleshooting Common Issues

### Issue 1: "Insufficient privileges"
**Solution**: Ensure admin consent has been granted for all required permissions

### Issue 2: "Client secret has expired"
**Solution**: Generate a new client secret and update the environment variable

### Issue 3: "Application not found"
**Solution**: Verify the client ID and tenant ID are correct

### Issue 4: "Access token invalid"
**Solution**: Check that the application is properly configured for the tenant

## Permission Scope Details

### Core Permissions Required by Zero Gate ESO Platform

#### `User.Read.All`
- **Purpose**: Extract organizational user data for relationship mapping
- **Data Access**: User profiles, manager relationships, department information
- **Use Case**: Building organizational hierarchy for relationship discovery

#### `Directory.Read.All`
- **Purpose**: Access organizational structure and group memberships
- **Data Access**: Groups, roles, organizational units
- **Use Case**: Understanding organizational relationships and reporting structures

#### `Mail.Read`
- **Purpose**: Analyze email communication patterns for relationship strength
- **Data Access**: Email metadata, communication frequency
- **Use Case**: Calculating relationship strength based on interaction patterns

#### `Files.Read.All`
- **Purpose**: Process Excel files for dashboard data insights
- **Data Access**: SharePoint documents, OneDrive files
- **Use Case**: Importing grant data, sponsor information, and relationship data

## API Usage Limits

### Microsoft Graph Throttling
- **User-based requests**: 10,000 requests per 10 minutes per user
- **App-based requests**: 100,000 requests per 10 minutes per application
- **Large file downloads**: Special handling required for files > 4MB

### Best Practices
- Implement retry logic with exponential backoff
- Use batch requests when possible
- Cache frequently accessed data
- Monitor throttling responses and adjust accordingly

## Support and Documentation

### Microsoft Resources
- [Microsoft Graph Documentation](https://docs.microsoft.com/en-us/graph/)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph Permissions Reference](https://docs.microsoft.com/en-us/graph/permissions-reference)

### Zero Gate ESO Platform Integration
- Integration Agent implementation: `server/agents/integration_new.py`
- Microsoft Graph Service: `client/src/services/microsoftGraphService.ts`
- Authentication flow: `server/routes/microsoft.ts`

## Next Steps After Setup

1. **Verify Connection**: Test the Microsoft Graph integration endpoints
2. **Data Import**: Begin importing organizational data for relationship mapping
3. **Email Analysis**: Start analyzing communication patterns for relationship strength
4. **Excel Processing**: Upload and process grant/sponsor data files
5. **Monitor Usage**: Track API usage and performance metrics

---

**Important**: Keep your client secret secure and never commit it to version control. Always use environment variables for sensitive configuration data.