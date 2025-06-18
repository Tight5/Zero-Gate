# IntegrationAgent Microsoft Graph Implementation Guide

## Overview

The IntegrationAgent provides comprehensive Microsoft Graph integration using MSAL authentication to extract organizational data, analyze email communication patterns, and process Excel files for dashboard insights.

## Core Features

### 1. MSAL Authentication
- **Client Credentials Flow**: Secure app-only access to Microsoft Graph
- **Token Management**: Automatic token refresh with 5-minute buffer
- **Error Handling**: Comprehensive authentication error management
- **Rate Limiting**: Built-in throttling and retry logic

### 2. Organizational Data Extraction
- **User Management**: Extract all organizational users with detailed profiles
- **Hierarchy Mapping**: Manager and direct report relationship discovery
- **Department Analysis**: User distribution across departments
- **Office Location Tracking**: Physical location mapping for users

### 3. Email Communication Analysis
- **Pattern Recognition**: Analyze email frequency and communication strength
- **Topic Extraction**: Identify common communication topics from subjects
- **Relationship Scoring**: Calculate communication-based relationship strength
- **Time-based Analysis**: Configurable date ranges for historical analysis

### 4. Excel File Processing
- **Multi-sheet Support**: Process complex Excel workbooks with multiple sheets
- **Data Summarization**: Extract key metrics and data summaries
- **Type Detection**: Automatic identification of numeric and categorical data
- **Business Metrics**: Pattern-based extraction of revenue, cost, and quantity metrics

## API Endpoints

### Authentication
```
POST /api/integration/auth/initialize
Content-Type: application/json
X-Tenant-ID: {tenant-id}

{
  "client_id": "your-app-client-id",
  "client_secret": "your-app-client-secret", 
  "ms_tenant_id": "your-microsoft-tenant-id",
  "authority": "https://login.microsoftonline.com/{tenant-id}",
  "scopes": ["https://graph.microsoft.com/.default"]
}
```

### User Extraction
```
POST /api/integration/extract/users
X-Tenant-ID: {tenant-id}
```

### Email Pattern Analysis
```
POST /api/integration/analyze/email-patterns
X-Tenant-ID: {tenant-id}

{
  "days_back": 30
}
```

### Relationship Extraction
```
POST /api/integration/extract/relationships
X-Tenant-ID: {tenant-id}
```

### Excel Processing
```
POST /api/integration/process/excel
Content-Type: multipart/form-data
X-Tenant-ID: {tenant-id}

excel_file: [file upload]
```

### Integration Summary
```
GET /api/integration/summary
X-Tenant-ID: {tenant-id}
```

### Connectivity Test
```
POST /api/integration/test/connectivity
X-Tenant-ID: {tenant-id}
```

### Organization Sync
```
POST /api/integration/sync/organization
X-Tenant-ID: {tenant-id}

{
  "sync_users": true,
  "sync_relationships": true,
  "analyze_communications": false
}
```

## Data Models

### OrganizationUser
```python
@dataclass
class OrganizationUser:
    id: str
    display_name: str
    email: str
    job_title: str
    department: str
    manager_id: Optional[str]
    direct_reports: List[str]
    office_location: str
    tenant_context: str
```

### EmailCommunication
```python
@dataclass
class EmailCommunication:
    sender: str
    recipient: str
    subject: str
    timestamp: datetime
    message_id: str
    conversation_id: str
    importance: str
    categories: List[str]
    tenant_context: str
```

### CommunicationPattern
```python
@dataclass
class CommunicationPattern:
    user_pair: Tuple[str, str]
    email_count: int
    frequency_score: float
    last_communication: datetime
    communication_strength: float
    topics: List[str]
    relationship_type: str
    tenant_context: str
```

### ExcelDataInsight
```python
@dataclass
class ExcelDataInsight:
    source_file: str
    sheet_name: str
    total_rows: int
    data_summary: Dict[str, Any]
    key_metrics: Dict[str, float]
    processed_at: datetime
    tenant_context: str
```

### OrganizationalRelationship
```python
@dataclass
class OrganizationalRelationship:
    source_user_id: str
    target_user_id: str
    relationship_type: str  # 'manager', 'direct_report', 'peer', 'frequent_collaborator'
    strength: float
    context: str
    discovered_through: str  # 'org_chart', 'email_patterns', 'shared_projects'
    tenant_context: str
```

## Configuration Requirements

### Microsoft Graph App Registration
1. **Register Application** in Azure AD portal
2. **API Permissions** required:
   - `User.Read.All` - Read all user profiles
   - `Mail.Read` - Read user mailboxes (optional)
   - `Directory.Read.All` - Read directory data
3. **Authentication** - Configure client credentials
4. **Certificates & Secrets** - Generate client secret

### Environment Variables
```bash
# Optional: Set default Graph configuration
MS_GRAPH_CLIENT_ID=your-default-client-id
MS_GRAPH_CLIENT_SECRET=your-default-client-secret
MS_GRAPH_TENANT_ID=your-default-tenant-id
```

## Error Handling

### Authentication Errors
- **Invalid Credentials**: Check client ID, secret, and tenant ID
- **Permission Denied**: Verify app permissions in Azure AD
- **Token Expired**: Automatic refresh with error fallback

### API Rate Limiting
- **429 Too Many Requests**: Automatic retry with exponential backoff
- **Retry-After Header**: Respect Microsoft Graph throttling guidelines
- **Batch Processing**: Process large datasets in configurable chunks

### Data Processing Errors
- **Excel Format Issues**: Graceful handling of corrupted or unsupported files
- **Email Access Denied**: Fallback to organizational data only
- **User Not Found**: Skip missing users with warning logs

## Performance Optimization

### Caching Strategy
- **User Cache**: Store organizational users for session duration
- **Relationship Cache**: Cache computed relationships
- **Communication Cache**: Store analyzed email patterns

### Batch Processing
- **User Extraction**: Process users in batches of 50
- **Email Analysis**: Limit concurrent requests
- **Rate Limiting**: 1-second delays between API calls

### Resource Management
- **Memory Monitoring**: Track cache size and clear when needed
- **Connection Pooling**: Reuse HTTP connections
- **Timeout Handling**: Configurable request timeouts

## Testing

### Unit Tests
- Authentication flow validation
- Data extraction accuracy
- Excel processing capabilities
- Error handling robustness

### Integration Tests
- End-to-end API workflows
- Multi-tenant isolation
- Performance benchmarks
- Error recovery scenarios

### Mock Testing
- Test suite runs without actual Microsoft Graph credentials
- Validates error handling and core logic
- Ensures proper API contract compliance

## Security Considerations

### Data Protection
- **Tenant Isolation**: Complete separation of organizational data
- **Token Security**: Secure storage of access tokens
- **Data Encryption**: Encrypt sensitive data in transit and at rest

### Access Control
- **Principle of Least Privilege**: Request minimal required permissions
- **Audit Logging**: Track all data access and modifications
- **Rate Limiting**: Prevent abuse and excessive API usage

### Compliance
- **GDPR Compliance**: Respect data subject rights and retention policies
- **SOC 2**: Follow security and availability standards
- **Privacy**: Minimize data collection and processing