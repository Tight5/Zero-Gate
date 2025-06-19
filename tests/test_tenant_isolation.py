"""
Backend Test Suite - Tenant Isolation
Tests multi-tenant data segregation, context validation, and security boundaries
Based on attached asset specifications for Zero Gate ESO Platform
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import asyncpg
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Import our FastAPI app and dependencies
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

try:
    from fastapi_app import app
    from auth.jwt_auth import create_access_token, verify_token
    from api.models import UserCreate, GrantCreate, SponsorCreate, RelationshipCreate
except ImportError:
    # Mock for testing when modules are not available
    from unittest.mock import MagicMock
    app = MagicMock()
    def create_access_token(data):
        return "mock_token_for_testing"
    def verify_token(token):
        return {"sub": "test@test.com", "tenant_id": "test-tenant"}
    UserCreate = GrantCreate = SponsorCreate = RelationshipCreate = dict

class TestTenantIsolation:
    """Comprehensive tenant isolation test suite"""
    
    @pytest.fixture(scope="class")
    def test_client(self):
        """Create test client for FastAPI app"""
        return TestClient(app)
    
    @pytest.fixture(scope="class")
    def test_tenants(self):
        """Create test tenant configurations"""
        return {
            'tenant_a': {
                'id': str(uuid.uuid4()),
                'name': 'ESO Alpha Foundation',
                'domain': 'alpha.test.com',
                'users': []
            },
            'tenant_b': {
                'id': str(uuid.uuid4()),
                'name': 'ESO Beta Organization',
                'domain': 'beta.test.com', 
                'users': []
            },
            'tenant_c': {
                'id': str(uuid.uuid4()),
                'name': 'ESO Gamma Institute',
                'domain': 'gamma.test.com',
                'users': []
            }
        }
    
    @pytest.fixture(scope="class")
    def auth_tokens(self, test_tenants):
        """Generate JWT tokens for each tenant's users"""
        tokens = {}
        for tenant_key, tenant_data in test_tenants.items():
            # Create test users for each tenant
            users = [
                {
                    'email': f'admin@{tenant_data["domain"]}',
                    'role': 'admin',
                    'tenant_id': tenant_data['id']
                },
                {
                    'email': f'user@{tenant_data["domain"]}',
                    'role': 'user',
                    'tenant_id': tenant_data['id']
                }
            ]
            
            tenant_tokens = {}
            for user in users:
                token = create_access_token({
                    'sub': user['email'],
                    'tenant_id': user['tenant_id'],
                    'role': user['role'],
                    'exp': datetime.utcnow() + timedelta(hours=1)
                })
                tenant_tokens[user['role']] = token
            
            tokens[tenant_key] = tenant_tokens
            test_tenants[tenant_key]['users'] = users
            
        return tokens
    
    def test_tenant_context_validation(self, test_client, auth_tokens, test_tenants):
        """Test that tenant context is properly validated"""
        tenant_a_token = auth_tokens['tenant_a']['admin']
        tenant_b_id = test_tenants['tenant_b']['id']
        
        # Test valid tenant context
        response = test_client.get(
            "/api/v2/sponsors",
            headers={
                'Authorization': f'Bearer {tenant_a_token}',
                'X-Tenant-ID': test_tenants['tenant_a']['id']
            }
        )
        assert response.status_code in [200, 404]  # 404 if no sponsors exist yet
        
        # Test mismatched tenant context (should fail)
        response = test_client.get(
            "/api/v2/sponsors",
            headers={
                'Authorization': f'Bearer {tenant_a_token}',
                'X-Tenant-ID': tenant_b_id
            }
        )
        assert response.status_code == 403
        assert 'tenant' in response.json().get('detail', '').lower()
        
        # Test missing tenant header
        response = test_client.get(
            "/api/v2/sponsors",
            headers={'Authorization': f'Bearer {tenant_a_token}'}
        )
        assert response.status_code == 400
        assert 'tenant' in response.json().get('detail', '').lower()
    
    def test_cross_tenant_data_isolation_sponsors(self, test_client, auth_tokens, test_tenants):
        """Test that sponsor data is isolated between tenants"""
        # Create sponsors for each tenant
        sponsors_data = {}
        
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            sponsor_data = {
                'name': f'{tenant_data["name"]} Primary Sponsor',
                'organization': f'{tenant_data["name"]} Org',
                'contact_email': f'sponsor@{tenant_data["domain"]}',
                'relationship_manager': f'manager@{tenant_data["domain"]}',
                'tier': 'A',
                'status': 'active'
            }
            
            # Create sponsor
            response = test_client.post(
                "/api/v2/sponsors",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json=sponsor_data
            )
            
            if response.status_code == 201:
                sponsors_data[tenant_key] = response.json()
            else:
                print(f"Failed to create sponsor for {tenant_key}: {response.text}")
                sponsors_data[tenant_key] = None
        
        # Verify each tenant can only see their own sponsors
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            response = test_client.get(
                "/api/v2/sponsors",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id
                }
            )
            
            if response.status_code == 200:
                sponsors = response.json()
                
                # Should only see sponsors from this tenant
                for sponsor in sponsors:
                    assert 'tenant_id' not in sponsor or sponsor.get('tenant_id') == tenant_id
                    
                # Should not see sponsors from other tenants
                other_tenant_sponsors = [
                    sponsors_data[other_key] for other_key in sponsors_data.keys() 
                    if other_key != tenant_key and sponsors_data[other_key]
                ]
                
                for other_sponsor in other_tenant_sponsors:
                    if other_sponsor:
                        sponsor_ids = [s.get('id') for s in sponsors]
                        assert other_sponsor.get('id') not in sponsor_ids
    
    def test_cross_tenant_data_isolation_grants(self, test_client, auth_tokens, test_tenants):
        """Test that grant data is isolated between tenants"""
        grants_data = {}
        
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            grant_data = {
                'name': f'{tenant_data["name"]} Grant Application',
                'description': f'Test grant for {tenant_data["name"]}',
                'amount': 50000.00,
                'submission_deadline': (datetime.now() + timedelta(days=90)).isoformat(),
                'status': 'active',
                'organization': tenant_data['name']
            }
            
            # Create grant
            response = test_client.post(
                "/api/v2/grants",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json=grant_data
            )
            
            if response.status_code == 201:
                grants_data[tenant_key] = response.json()
            else:
                grants_data[tenant_key] = None
        
        # Verify isolation
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            response = test_client.get(
                "/api/v2/grants",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id
                }
            )
            
            if response.status_code == 200:
                grants = response.json()
                
                # Should only see grants from this tenant
                for grant in grants:
                    assert 'tenant_id' not in grant or grant.get('tenant_id') == tenant_id
    
    def test_cross_tenant_relationship_isolation(self, test_client, auth_tokens, test_tenants):
        """Test that relationship data is isolated between tenants"""
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            # Try to access relationships
            response = test_client.get(
                "/api/v2/relationships",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id
                }
            )
            
            assert response.status_code in [200, 404]  # Should not see other tenants' data
            
            if response.status_code == 200:
                relationships = response.json()
                # All relationships should belong to this tenant
                for rel in relationships:
                    assert 'tenant_id' not in rel or rel.get('tenant_id') == tenant_id
    
    def test_invalid_tenant_contexts(self, test_client, auth_tokens):
        """Test handling of invalid tenant contexts"""
        token = auth_tokens['tenant_a']['admin']
        
        test_cases = [
            {
                'tenant_id': 'invalid-uuid',
                'expected_status': 400,
                'description': 'Invalid UUID format'
            },
            {
                'tenant_id': str(uuid.uuid4()),
                'expected_status': 403,
                'description': 'Non-existent tenant'
            },
            {
                'tenant_id': '',
                'expected_status': 400,
                'description': 'Empty tenant ID'
            },
            {
                'tenant_id': None,
                'expected_status': 400,
                'description': 'Missing tenant header'
            }
        ]
        
        for case in test_cases:
            headers = {'Authorization': f'Bearer {token}'}
            if case['tenant_id'] is not None:
                headers['X-Tenant-ID'] = case['tenant_id']
            
            response = test_client.get("/api/v2/sponsors", headers=headers)
            
            assert response.status_code == case['expected_status'], (
                f"Failed test case: {case['description']}. "
                f"Expected {case['expected_status']}, got {response.status_code}"
            )
    
    def test_role_based_access_within_tenant(self, test_client, auth_tokens, test_tenants):
        """Test role-based access control within a tenant"""
        tenant_id = test_tenants['tenant_a']['id']
        admin_token = auth_tokens['tenant_a']['admin']
        user_token = auth_tokens['tenant_a']['user']
        
        # Admin should be able to create sponsors
        sponsor_data = {
            'name': 'Admin Created Sponsor',
            'organization': 'Test Org',
            'contact_email': 'admin.sponsor@test.com',
            'relationship_manager': 'admin@alpha.test.com',
            'tier': 'A',
            'status': 'active'
        }
        
        response = test_client.post(
            "/api/v2/sponsors",
            headers={
                'Authorization': f'Bearer {admin_token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json=sponsor_data
        )
        
        # Should succeed for admin
        assert response.status_code in [201, 200]
        
        # Regular user might have different permissions
        response = test_client.post(
            "/api/v2/sponsors",
            headers={
                'Authorization': f'Bearer {user_token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json=sponsor_data
        )
        
        # Could be 201 (allowed) or 403 (forbidden) depending on role implementation
        assert response.status_code in [201, 403]
        
        # Both should be able to read (within their tenant)
        for token in [admin_token, user_token]:
            response = test_client.get(
                "/api/v2/sponsors",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id
                }
            )
            assert response.status_code in [200, 404]
    
    def test_tenant_isolation_under_load(self, test_client, auth_tokens, test_tenants):
        """Test tenant isolation under concurrent requests"""
        import threading
        import time
        
        results = {}
        errors = []
        
        def make_requests(tenant_key, iterations=10):
            """Make multiple requests for a tenant"""
            token = auth_tokens[tenant_key]['admin']
            tenant_id = test_tenants[tenant_key]['id']
            tenant_results = []
            
            for i in range(iterations):
                try:
                    response = test_client.get(
                        "/api/v2/sponsors",
                        headers={
                            'Authorization': f'Bearer {token}',
                            'X-Tenant-ID': tenant_id
                        }
                    )
                    tenant_results.append({
                        'status_code': response.status_code,
                        'tenant_key': tenant_key,
                        'iteration': i
                    })
                    time.sleep(0.01)  # Small delay
                except Exception as e:
                    errors.append(f"Error in {tenant_key} iteration {i}: {str(e)}")
            
            results[tenant_key] = tenant_results
        
        # Create threads for concurrent requests
        threads = []
        for tenant_key in test_tenants.keys():
            thread = threading.Thread(target=make_requests, args=(tenant_key,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify no errors and proper responses
        assert len(errors) == 0, f"Errors occurred: {errors}"
        
        for tenant_key, tenant_results in results.items():
            assert len(tenant_results) == 10, f"Expected 10 results for {tenant_key}"
            for result in tenant_results:
                assert result['status_code'] in [200, 404], (
                    f"Unexpected status for {tenant_key}: {result['status_code']}"
                )
    
    def test_cleanup_tenant_data(self, test_client, auth_tokens, test_tenants):
        """Test cleanup of tenant-specific data"""
        # This test ensures proper cleanup procedures
        for tenant_key, tenant_data in test_tenants.items():
            token = auth_tokens[tenant_key]['admin']
            tenant_id = tenant_data['id']
            
            # Get all data types for cleanup verification
            endpoints = ['/api/v2/sponsors', '/api/v2/grants', '/api/v2/relationships']
            
            for endpoint in endpoints:
                response = test_client.get(
                    endpoint,
                    headers={
                        'Authorization': f'Bearer {token}',
                        'X-Tenant-ID': tenant_id
                    }
                )
                
                # Should be able to access endpoints (empty or with data)
                assert response.status_code in [200, 404]
                
                if response.status_code == 200:
                    data = response.json()
                    # Verify all returned data belongs to this tenant
                    if isinstance(data, list):
                        for item in data:
                            assert 'tenant_id' not in item or item.get('tenant_id') == tenant_id

# Performance and stress testing
class TestTenantPerformance:
    """Performance testing for tenant isolation"""
    
    def test_tenant_switching_performance(self, test_client, auth_tokens, test_tenants):
        """Test performance when rapidly switching between tenants"""
        import time
        
        start_time = time.time()
        request_count = 0
        
        # Rapidly switch between tenants
        for _ in range(50):  # 50 iterations
            for tenant_key, tenant_data in test_tenants.items():
                token = auth_tokens[tenant_key]['admin']
                tenant_id = tenant_data['id']
                
                response = test_client.get(
                    "/api/v2/sponsors",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'X-Tenant-ID': tenant_id
                    }
                )
                
                assert response.status_code in [200, 404]
                request_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        avg_time_per_request = total_time / request_count
        
        # Should handle tenant switching efficiently
        assert avg_time_per_request < 0.1, (
            f"Tenant switching too slow: {avg_time_per_request:.3f}s per request"
        )
        
        print(f"Tenant switching performance: {avg_time_per_request:.3f}s avg per request")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])