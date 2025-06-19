"""
PyTest Configuration and Shared Fixtures
Provides common setup for Zero Gate ESO Platform backend tests
"""

import pytest
import asyncio
import os
import sys
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta

# Add server directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

# Import test dependencies
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Import our application
try:
    from fastapi_app import app
    from auth.jwt_auth import create_access_token
except ImportError:
    # Mock for testing when FastAPI app is not available
    app = MagicMock()
    def create_access_token(data):
        return "mock_token_for_testing"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_app():
    """Create test FastAPI application"""
    return app

@pytest.fixture(scope="session")
def test_client():
    """Create test client for FastAPI app"""
    return TestClient(app)

@pytest.fixture
def test_tenant():
    """Create a test tenant configuration"""
    return {
        'id': str(uuid.uuid4()),
        'name': 'Test Tenant Organization',
        'domain': 'test.tenant.com',
        'status': 'active'
    }

@pytest.fixture
def test_user():
    """Create a test user configuration"""
    return {
        'email': 'test.user@test.com',
        'role': 'admin',
        'first_name': 'Test',
        'last_name': 'User'
    }

@pytest.fixture
def auth_token(test_tenant, test_user):
    """Create authentication token for testing"""
    token_data = {
        'sub': test_user['email'],
        'tenant_id': test_tenant['id'],
        'role': test_user['role'],
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return create_access_token(token_data)

@pytest.fixture
def auth_headers(auth_token, test_tenant):
    """Create authentication headers for API requests"""
    return {
        'Authorization': f'Bearer {auth_token}',
        'X-Tenant-ID': test_tenant['id'],
        'Content-Type': 'application/json'
    }

@pytest.fixture
def mock_database():
    """Mock database connection for testing"""
    with patch('server.db.pool') as mock_pool:
        mock_connection = MagicMock()
        mock_pool.acquire.return_value = mock_connection
        yield mock_connection

@pytest.fixture
def sample_sponsor_data():
    """Sample sponsor data for testing"""
    return {
        'name': 'Test Foundation',
        'organization': 'Test Foundation Inc.',
        'contact_email': 'contact@testfoundation.org',
        'relationship_manager': 'manager@test.com',
        'tier': 'A',
        'status': 'active',
        'notes': 'Sample sponsor for testing'
    }

@pytest.fixture
def sample_grant_data():
    """Sample grant data for testing"""
    return {
        'name': 'Test Grant Application',
        'description': 'A test grant for development purposes',
        'amount': 50000.00,
        'submission_deadline': (datetime.now() + timedelta(days=90)).isoformat(),
        'organization': 'Test Organization',
        'status': 'active',
        'requirements': ['Budget', 'Timeline', 'Evaluation plan']
    }

@pytest.fixture
def sample_relationship_data():
    """Sample relationship data for testing"""
    return {
        'source_entity': 'test_source',
        'target_entity': 'test_target',
        'relationship_type': 'partnership',
        'strength': 0.8,
        'status': 'active',
        'notes': 'Test relationship for development'
    }

@pytest.fixture(autouse=True)
def cleanup_after_tests():
    """Cleanup after each test"""
    yield
    # Cleanup code here if needed
    pass

@pytest.fixture
def multiple_tenants():
    """Create multiple tenant configurations for isolation testing"""
    return {
        'tenant_a': {
            'id': str(uuid.uuid4()),
            'name': 'Tenant A Organization',
            'domain': 'tenant-a.test.com'
        },
        'tenant_b': {
            'id': str(uuid.uuid4()),
            'name': 'Tenant B Organization', 
            'domain': 'tenant-b.test.com'
        },
        'tenant_c': {
            'id': str(uuid.uuid4()),
            'name': 'Tenant C Organization',
            'domain': 'tenant-c.test.com'
        }
    }

@pytest.fixture
def multiple_auth_tokens(multiple_tenants):
    """Create authentication tokens for multiple tenants"""
    tokens = {}
    for tenant_key, tenant_data in multiple_tenants.items():
        token = create_access_token({
            'sub': f'user@{tenant_data["domain"]}',
            'tenant_id': tenant_data['id'],
            'role': 'admin',
            'exp': datetime.utcnow() + timedelta(hours=1)
        })
        tokens[tenant_key] = token
    return tokens

# Performance testing fixtures
@pytest.fixture
def performance_config():
    """Configuration for performance tests"""
    return {
        'max_response_time': 1.0,  # seconds
        'concurrent_requests': 10,
        'load_test_duration': 30,  # seconds
        'memory_threshold': 100,   # MB
    }

# Test data cleanup
@pytest.fixture(autouse=True)
def test_environment_setup():
    """Setup test environment"""
    # Set test environment variables
    os.environ['TESTING'] = 'true'
    os.environ['DATABASE_URL'] = os.environ.get('TEST_DATABASE_URL', os.environ.get('DATABASE_URL', ''))
    
    yield
    
    # Cleanup
    if 'TESTING' in os.environ:
        del os.environ['TESTING']

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )
    config.addinivalue_line(
        "markers", "tenant_isolation: mark test as tenant isolation test"
    )
    config.addinivalue_line(
        "markers", "path_discovery: mark test as path discovery test"
    )
    config.addinivalue_line(
        "markers", "grant_timeline: mark test as grant timeline test"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Add markers based on test file names
        if "tenant_isolation" in str(item.fspath):
            item.add_marker(pytest.mark.tenant_isolation)
        elif "grant_timeline" in str(item.fspath):
            item.add_marker(pytest.mark.grant_timeline)
        elif "path_discovery" in str(item.fspath):
            item.add_marker(pytest.mark.path_discovery)
        
        # Add integration marker for API tests
        if any(keyword in str(item.fspath) for keyword in ["test_", "api_", "integration_"]):
            item.add_marker(pytest.mark.integration)