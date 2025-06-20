# Zero Gate ESO Platform - Comprehensive Test Suite

This directory contains comprehensive pytest suites for validating the Zero Gate ESO Platform's multi-tenant architecture, grant timeline generation, and path discovery capabilities.

## Test Suites Overview

### 1. Tenant Isolation Tests (`test_tenant_isolation.py`)
**Purpose**: Validates multi-tenant data segregation and security boundaries

**Key Test Areas**:
- JWT token tenant isolation and validation
- Cross-tenant data access prevention
- Database Row-Level Security (RLS) compliance
- Role-based access control within tenants
- Processing Agent tenant boundary respect
- Integration Agent tenant isolation
- Concurrent tenant operations
- Error handling for invalid tenant contexts

**Tenant Configurations**:
- `nasdaq-center`: NASDAQ Entrepreneurial Center
- `tight5-digital`: Tight5 Digital
- `innovation-hub`: Innovation Hub

### 2. Grant Timeline Tests (`test_grant_timeline.py`)
**Purpose**: Validates backwards planning and milestone generation

**Key Test Areas**:
- Automatic 90/60/30-day milestone generation
- Backwards planning from submission deadlines
- Phase-specific task generation (strategy/development/execution)
- Urgent grant timeline compression
- Milestone progress tracking and status updates
- Content calendar integration
- Risk assessment integration
- Critical path analysis
- Dependency management
- Multi-grant coordination

**Timeline Phases**:
- **90-day**: Content strategy, research, planning
- **60-day**: Development, review, preparation
- **30-day**: Execution, submission, finalization

### 3. Path Discovery Tests (`test_path_discovery.py`)
**Purpose**: Validates seven-degree path discovery and relationship analysis

**Key Test Areas**:
- Direct connection (1-degree) discovery
- Multi-degree path discovery (2-7 degrees)
- Seven-degree separation limit enforcement
- Path quality assessment (excellent/good/fair/weak)
- Algorithm comparison (BFS/DFS/Dijkstra)
- Landmark optimization for performance
- Introduction template generation
- Network statistics calculation
- Confidence scoring and risk assessment
- Concurrent path discovery operations

**Network Analysis Features**:
- Relationship strength calculation
- Centrality scoring
- Network density analysis
- Confidence factors assessment

## Running Tests

### Individual Test Suites
```bash
# Tenant isolation tests
python -m pytest tests/test_tenant_isolation.py -v

# Grant timeline tests
python -m pytest tests/test_grant_timeline.py -v

# Path discovery tests
python -m pytest tests/test_path_discovery.py -v
```

### Comprehensive Test Execution
```bash
# Run all tests with comprehensive reporting
python scripts/run-comprehensive-tests.py
```

### Test Configuration
```bash
# Environment variables for testing
export ENVIRONMENT=test
export JWT_SECRET=test-secret-key-for-testing
export DATABASE_URL=postgresql://test:test@localhost/test
```

## Test Data Structure

### Mock Tenant Data
```python
{
    "nasdaq-center": {
        "tenant_id": "nasdaq-center",
        "name": "NASDAQ Entrepreneurial Center",
        "settings": {"features": ["grants", "sponsors", "analytics"]},
        "users": [
            {"user_id": "user1", "email": "clint.phillips@thecenter.nasdaq.org", "role": "admin"}
        ]
    }
}
```

### Mock Network Data
```python
{
    "nodes": [
        {"id": "person1", "name": "John Smith", "role": "CEO", "organization": "TechCorp"}
    ],
    "relationships": [
        {"from": "person1", "to": "person2", "strength": 0.8, "type": "colleague"}
    ]
}
```

### Mock Grant Data
```python
{
    "grant_id": "grant1",
    "title": "Tech Innovation Grant",
    "submission_deadline": "2024-12-31",
    "status": "planning",
    "tenant_id": "nasdaq-center"
}
```

## Test Coverage Areas

### Security Testing
- JWT token validation and tenant encoding
- Cross-tenant access prevention
- Role-based permission validation
- Authentication boundary testing

### Business Logic Testing
- Backwards planning algorithm validation
- Milestone generation accuracy
- Path discovery algorithm correctness
- Quality scoring mechanisms

### Performance Testing
- Concurrent operation handling
- Algorithm efficiency comparison
- Resource usage optimization
- Scalability validation

### Error Handling Testing
- Invalid tenant context handling
- Missing data scenario management
- Network disconnection scenarios
- Edge case validation

## Expected Test Results

### Success Criteria
- All tenant isolation tests pass (100% data segregation)
- Grant timeline generation creates appropriate milestones
- Path discovery finds optimal connection paths
- Quality assessments provide accurate scoring

### Performance Benchmarks
- Path discovery: <500ms for 7-degree searches
- Timeline generation: <200ms for 120-day planning
- Tenant validation: <50ms per request
- Concurrent operations: No data corruption

## Troubleshooting

### Common Issues
1. **Import Errors**: Ensure all platform modules are in Python path
2. **Database Connection**: Verify DATABASE_URL environment variable
3. **JWT Validation**: Check JWT_SECRET configuration
4. **Async Test Issues**: Ensure proper async/await usage

### Mock Dependencies
Tests use comprehensive mocking for:
- Database operations
- External API calls
- Authentication services
- NetworkX graph operations

### Test Environment Setup
1. Install pytest and dependencies
2. Configure environment variables
3. Setup test database (optional)
4. Run comprehensive test suite

## Integration with CI/CD

The test suite generates JUnit XML reports for CI/CD integration:
```bash
pytest --junitxml=test-results.xml tests/
```

Reports include:
- Test execution summary
- Individual test results
- Performance metrics
- Coverage analysis
- Failure diagnostics

## Compliance Validation

Tests validate compliance with:
- Multi-tenant security requirements
- ESO platform specifications
- Network analysis standards
- Grant management workflows
- Role-based access controls

This comprehensive test suite ensures the Zero Gate ESO Platform meets all functional, security, and performance requirements specified in the attached asset documentation.