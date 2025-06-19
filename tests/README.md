# Zero Gate ESO Platform Backend Test Suite

Comprehensive pytest suites for testing tenant isolation, grant timeline generation, and path discovery features based on attached asset specifications.

## Test Suites

### 1. Tenant Isolation Tests (`test_tenant_isolation.py`)
Tests multi-tenant data segregation and security boundaries:
- **Cross-tenant data isolation**: Verifies sponsors, grants, and relationships are isolated between tenants
- **Tenant context validation**: Tests proper tenant header validation and authentication
- **Role-based access control**: Validates admin vs user permissions within tenants
- **Invalid tenant handling**: Tests error handling for invalid/missing tenant contexts
- **Performance under load**: Concurrent request testing with tenant switching

### 2. Grant Timeline Tests (`test_grant_timeline.py`)
Tests backwards planning and milestone generation:
- **90/60/30-day milestone generation**: Validates automatic backwards planning from deadlines
- **Task assignment by phase**: Tests appropriate task generation for strategy/development/execution phases
- **Timeline progress tracking**: Verifies days remaining calculations and milestone status updates
- **Content calendar integration**: Tests milestone integration with content scheduling
- **Multiple grants isolation**: Ensures separate timelines for different grants

### 3. Path Discovery Tests (`test_path_discovery.py`)
Tests seven-degree relationship path discovery:
- **Direct path discovery**: Tests 1-degree direct connections
- **Multi-degree paths**: Validates BFS/DFS/Dijkstra algorithms for 2-7 degree paths
- **Confidence scoring**: Tests relationship strength-based path confidence calculation
- **Algorithm comparison**: Compares BFS, DFS, and Dijkstra pathfinding results
- **Network analysis**: Tests centrality metrics and key connector identification
- **Performance testing**: Validates path discovery speed and efficiency

### 4. Mock Integration Tests (`test_integration_mock.py`)
Comprehensive testing with mocked FastAPI endpoints:
- **Mock HTTP responses**: Simulates API responses for all endpoints
- **Data store simulation**: In-memory data storage with tenant isolation
- **Authentication validation**: Tests token-based authentication flows
- **Error scenario testing**: Validates proper error handling and status codes

## Running Tests

### Prerequisites
```bash
# Install Python dependencies
pip install pytest httpx pytest-asyncio pytest-cov networkx
```

### Test Execution Options

#### Run All Tests
```bash
python test_runner.py --suite all --verbose
```

#### Run Specific Test Suite
```bash
# Tenant isolation tests
python test_runner.py --suite tenant --verbose

# Grant timeline tests  
python test_runner.py --suite grant --verbose

# Path discovery tests
python test_runner.py --suite path --verbose
```

#### Run Mock Integration Tests
```bash
python -m pytest test_integration_mock.py -v
```

#### Generate Test Report
```bash
python test_runner.py --suite all --report
```

## Test Configuration

### Environment Setup
- Tests use `conftest.py` for shared fixtures and configuration
- Automatic test environment detection with `TESTING=true`
- Mock implementations when FastAPI modules are unavailable
- Tenant isolation with UUID-based tenant IDs

### Authentication
- JWT token generation for multi-tenant testing
- Role-based testing (admin/user permissions)
- Token validation and authentication boundary testing

### Data Scenarios
- Multiple tenant configurations for isolation testing
- Complex relationship networks for path discovery
- Grant timeline scenarios with various deadlines
- Performance testing with concurrent requests

## Test Results Interpretation

### Success Criteria
- **Tenant Isolation**: 100% data segregation between tenants
- **Grant Timeline**: Accurate milestone generation within 1-day tolerance
- **Path Discovery**: Successful path finding within 7-degree limit
- **Performance**: Sub-1-second response times for path discovery
- **Authentication**: Proper 401/403 responses for unauthorized access

### Common Issues
- **Import Errors**: Ensure FastAPI dependencies are installed
- **Authentication Failures**: Verify JWT token generation and validation
- **Network Analysis**: Check NetworkX integration for complex graph operations
- **Database Dependencies**: Mock data store used when database unavailable

## Integration with CI/CD

The test suite supports automated execution with:
- Exit code 0 for successful tests, 1 for failures
- Detailed test reports in Markdown format
- Coverage analysis integration
- Performance benchmarking with duration tracking

## Attached Asset Compliance

These tests verify implementation against:
- **File 42**: Backend Test - Grant Timeline specifications
- **File 8**: Tenant Context Middleware requirements  
- **File 10**: Processing Agent path discovery algorithms
- **Multi-tenant architecture**: Complete data isolation validation
- **Seven-degree path discovery**: BFS algorithm implementation testing
- **Backwards planning**: 90/60/30-day milestone generation verification