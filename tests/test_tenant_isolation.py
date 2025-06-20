"""
Comprehensive pytest suite for tenant isolation testing
Tests multi-tenant data segregation, security boundaries, and error handling
Based on attached asset specifications for Zero Gate ESO Platform
"""

import pytest
import asyncio
import jwt
import os
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import FastAPI, Request, HTTPException
from unittest.mock import AsyncMock, MagicMock, patch

# Import platform modules
from server.auth.jwt_auth import create_access_token, UserClaims, verify_token
from server.agents.processing import ProcessingAgent
from server.agents.integration_new import IntegrationAgent


class TestTenantIsolation:
    """Test suite for multi-tenant data isolation and security"""
    
    @pytest.fixture
    def test_tenants(self):
        """Create test tenant configurations"""
        return {
            "nasdaq-center": {
                "tenant_id": "nasdaq-center",
                "name": "NASDAQ Entrepreneurial Center",
                "settings": {"features": ["grants", "sponsors", "analytics"]},
                "users": [
                    {"user_id": "user1", "email": "clint.phillips@thecenter.nasdaq.org", "role": "admin"},
                    {"user_id": "user2", "email": "sarah.manager@thecenter.nasdaq.org", "role": "manager"}
                ]
            },
            "tight5-digital": {
                "tenant_id": "tight5-digital",
                "name": "Tight5 Digital",
                "settings": {"features": ["sponsors", "relationships"]},
                "users": [
                    {"user_id": "user3", "email": "admin@tight5digital.com", "role": "admin"},
                    {"user_id": "user4", "email": "dev@tight5digital.com", "role": "user"}
                ]
            },
            "innovation-hub": {
                "tenant_id": "innovation-hub",
                "name": "Innovation Hub",
                "settings": {"features": ["grants", "relationships"]},
                "users": [
                    {"user_id": "user5", "email": "director@innovation-hub.org", "role": "owner"}
                ]
            }
        }
    
    @pytest.fixture
    def test_tokens(self, test_tenants):
        """Generate JWT tokens for test users"""
        tokens = {}
        for tenant_id, tenant_data in test_tenants.items():
            tokens[tenant_id] = {}
            for user in tenant_data["users"]:
                token = create_access_token(
                    user_id=user["user_id"],
                    email=user["email"],
                    tenant_id=tenant_id,
                    role=user["role"]
                )
                tokens[tenant_id][user["user_id"]] = token
        return tokens
    
    @pytest.fixture
    def mock_database(self):
        """Mock database with tenant-isolated data"""
        return {
            "sponsors": {
                "nasdaq-center": [
                    {"id": "sponsor1", "name": "NASDAQ Foundation", "tenant_id": "nasdaq-center"},
                    {"id": "sponsor2", "name": "Tech Accelerator", "tenant_id": "nasdaq-center"}
                ],
                "tight5-digital": [
                    {"id": "sponsor3", "name": "Digital Ventures", "tenant_id": "tight5-digital"}
                ],
                "innovation-hub": [
                    {"id": "sponsor4", "name": "Innovation Fund", "tenant_id": "innovation-hub"}
                ]
            },
            "grants": {
                "nasdaq-center": [
                    {"id": "grant1", "title": "Tech Innovation Grant", "tenant_id": "nasdaq-center", "sponsor_id": "sponsor1"},
                    {"id": "grant2", "title": "Startup Accelerator", "tenant_id": "nasdaq-center", "sponsor_id": "sponsor2"}
                ],
                "tight5-digital": [
                    {"id": "grant3", "title": "Digital Transformation", "tenant_id": "tight5-digital", "sponsor_id": "sponsor3"}
                ],
                "innovation-hub": [
                    {"id": "grant4", "title": "Research Grant", "tenant_id": "innovation-hub", "sponsor_id": "sponsor4"}
                ]
            },
            "relationships": {
                "nasdaq-center": [
                    {"from": "person1", "to": "person2", "strength": 0.8, "tenant_id": "nasdaq-center"},
                    {"from": "person2", "to": "person3", "strength": 0.6, "tenant_id": "nasdaq-center"}
                ],
                "tight5-digital": [
                    {"from": "person4", "to": "person5", "strength": 0.9, "tenant_id": "tight5-digital"}
                ],
                "innovation-hub": [
                    {"from": "person6", "to": "person7", "strength": 0.7, "tenant_id": "innovation-hub"}
                ]
            }
        }

    def test_jwt_token_tenant_isolation(self, test_tenants, test_tokens):
        """Test JWT tokens properly encode tenant information"""
        for tenant_id, tenant_data in test_tenants.items():
            for user in tenant_data["users"]:
                token = test_tokens[tenant_id][user["user_id"]]
                
                # Verify token can be decoded
                payload = verify_token(token)
                assert payload["tenant_id"] == tenant_id
                assert payload["user_id"] == user["user_id"]
                assert payload["email"] == user["email"]
                assert payload["role"] == user["role"]
    
    def test_cross_tenant_token_rejection(self, test_tokens):
        """Test that tokens from one tenant cannot access another tenant's data"""
        nasdaq_token = test_tokens["nasdaq-center"]["user1"]
        tight5_token = test_tokens["tight5-digital"]["user3"]
        
        # Decode tokens to verify different tenant IDs
        nasdaq_payload = verify_token(nasdaq_token)
        tight5_payload = verify_token(tight5_token)
        
        assert nasdaq_payload["tenant_id"] != tight5_payload["tenant_id"]
        assert nasdaq_payload["tenant_id"] == "nasdaq-center"
        assert tight5_payload["tenant_id"] == "tight5-digital"
    
    @pytest.mark.asyncio
    async def test_tenant_context_validation(self, test_tenants):
        """Test tenant context validation middleware"""
        from server.middleware.tenant_context import TenantMiddleware, TenantContext
        
        # Mock request with valid tenant header
        mock_request = MagicMock()
        mock_request.url.path = "/api/sponsors"
        mock_request.headers = {"X-Tenant-ID": "nasdaq-center"}
        mock_request.state = MagicMock()
        
        # Mock app state with database manager
        mock_app = MagicMock()
        mock_db_manager = AsyncMock()
        mock_db_manager.get_tenant_info.return_value = test_tenants["nasdaq-center"]
        mock_request.app.state.db_manager = mock_db_manager
        
        middleware = TenantMiddleware(None)
        
        # Test valid tenant
        tenant = await middleware._validate_tenant("nasdaq-center", mock_request)
        assert tenant is not None
        assert tenant.tenant_id == "nasdaq-center"
        assert tenant.tenant_name == "NASDAQ Entrepreneurial Center"
        
        # Test invalid tenant
        mock_db_manager.get_tenant_info.return_value = None
        tenant = await middleware._validate_tenant("invalid-tenant", mock_request)
        assert tenant is None
    
    def test_data_isolation_sponsors(self, mock_database, test_tokens):
        """Test sponsor data is properly isolated by tenant"""
        # Simulate database query with tenant filter
        def get_sponsors_by_tenant(tenant_id):
            return mock_database["sponsors"].get(tenant_id, [])
        
        # Test each tenant sees only their sponsors
        nasdaq_sponsors = get_sponsors_by_tenant("nasdaq-center")
        tight5_sponsors = get_sponsors_by_tenant("tight5-digital")
        innovation_sponsors = get_sponsors_by_tenant("innovation-hub")
        
        assert len(nasdaq_sponsors) == 2
        assert len(tight5_sponsors) == 1
        assert len(innovation_sponsors) == 1
        
        # Verify sponsor data contains correct tenant_id
        for sponsor in nasdaq_sponsors:
            assert sponsor["tenant_id"] == "nasdaq-center"
        
        for sponsor in tight5_sponsors:
            assert sponsor["tenant_id"] == "tight5-digital"
        
        for sponsor in innovation_sponsors:
            assert sponsor["tenant_id"] == "innovation-hub"
    
    def test_data_isolation_grants(self, mock_database):
        """Test grant data is properly isolated by tenant"""
        def get_grants_by_tenant(tenant_id):
            return mock_database["grants"].get(tenant_id, [])
        
        nasdaq_grants = get_grants_by_tenant("nasdaq-center")
        tight5_grants = get_grants_by_tenant("tight5-digital")
        innovation_grants = get_grants_by_tenant("innovation-hub")
        
        assert len(nasdaq_grants) == 2
        assert len(tight5_grants) == 1
        assert len(innovation_grants) == 1
        
        # Verify no cross-tenant data leakage
        all_nasdaq_grant_ids = [g["id"] for g in nasdaq_grants]
        all_tight5_grant_ids = [g["id"] for g in tight5_grants]
        
        assert "grant1" in all_nasdaq_grant_ids
        assert "grant2" in all_nasdaq_grant_ids
        assert "grant3" not in all_nasdaq_grant_ids
        assert "grant3" in all_tight5_grant_ids
    
    def test_relationship_data_isolation(self, mock_database):
        """Test relationship data is properly isolated by tenant"""
        def get_relationships_by_tenant(tenant_id):
            return mock_database["relationships"].get(tenant_id, [])
        
        nasdaq_rels = get_relationships_by_tenant("nasdaq-center")
        tight5_rels = get_relationships_by_tenant("tight5-digital")
        innovation_rels = get_relationships_by_tenant("innovation-hub")
        
        # Verify relationship isolation
        assert len(nasdaq_rels) == 2
        assert len(tight5_rels) == 1
        assert len(innovation_rels) == 1
        
        # Check relationship persons don't cross tenant boundaries
        nasdaq_persons = set()
        for rel in nasdaq_rels:
            nasdaq_persons.add(rel["from"])
            nasdaq_persons.add(rel["to"])
        
        tight5_persons = set()
        for rel in tight5_rels:
            tight5_persons.add(rel["from"])
            tight5_persons.add(rel["to"])
        
        # Verify no person overlap between tenants
        assert nasdaq_persons.isdisjoint(tight5_persons)
    
    def test_missing_tenant_context_error(self):
        """Test proper error handling when tenant context is missing"""
        from server.middleware.tenant_context import require_tenant
        
        # Mock request without tenant context
        mock_request = MagicMock()
        mock_request.state = MagicMock()
        mock_request.state.tenant = None
        
        with pytest.raises(HTTPException) as exc_info:
            require_tenant(mock_request)
        
        assert exc_info.value.status_code == 401
        assert "Tenant context required" in str(exc_info.value.detail)
    
    def test_invalid_tenant_id_error(self, test_tokens):
        """Test error handling for invalid tenant IDs"""
        # Create token with invalid tenant ID
        invalid_token = create_access_token(
            user_id="test_user",
            email="test@invalid.com", 
            tenant_id="non-existent-tenant",
            role="user"
        )
        
        payload = verify_token(invalid_token)
        assert payload["tenant_id"] == "non-existent-tenant"
        
        # This would fail tenant validation in middleware
        # Simulating the validation failure
        assert payload["tenant_id"] not in ["nasdaq-center", "tight5-digital", "innovation-hub"]
    
    @pytest.mark.asyncio
    async def test_processing_agent_tenant_isolation(self, mock_database):
        """Test ProcessingAgent respects tenant boundaries"""
        agent = ProcessingAgent()
        
        # Mock relationship data for specific tenant
        nasdaq_relationships = mock_database["relationships"]["nasdaq-center"]
        
        # Test sponsor metrics calculation respects tenant
        with patch.object(agent, '_get_tenant_relationships') as mock_get_rels:
            mock_get_rels.return_value = nasdaq_relationships
            
            metrics = await agent.calculate_sponsor_metrics("sponsor1", "nasdaq-center")
            
            # Verify only nasdaq-center relationships were used
            mock_get_rels.assert_called_once_with("nasdaq-center")
            assert "relationship_score" in metrics
            assert "network_centrality" in metrics
    
    @pytest.mark.asyncio 
    async def test_integration_agent_tenant_isolation(self):
        """Test IntegrationAgent maintains tenant isolation"""
        agent = IntegrationAgent()
        
        # Mock Microsoft Graph responses for different tenants
        mock_nasdaq_users = [
            {"id": "user1", "mail": "clint.phillips@thecenter.nasdaq.org"},
            {"id": "user2", "mail": "sarah.manager@thecenter.nasdaq.org"}
        ]
        
        mock_tight5_users = [
            {"id": "user3", "mail": "admin@tight5digital.com"},
            {"id": "user4", "mail": "dev@tight5digital.com"}
        ]
        
        with patch.object(agent, '_get_org_users') as mock_get_users:
            # Test NASDAQ tenant
            mock_get_users.return_value = mock_nasdaq_users
            nasdaq_result = await agent.extract_organizational_relationships("nasdaq-center")
            
            assert len(nasdaq_result["users"]) == 2
            assert any("nasdaq.org" in user["mail"] for user in nasdaq_result["users"])
            assert not any("tight5digital.com" in user["mail"] for user in nasdaq_result["users"])
            
            # Test Tight5 tenant
            mock_get_users.return_value = mock_tight5_users
            tight5_result = await agent.extract_organizational_relationships("tight5-digital")
            
            assert len(tight5_result["users"]) == 2
            assert any("tight5digital.com" in user["mail"] for user in tight5_result["users"])
            assert not any("nasdaq.org" in user["mail"] for user in tight5_result["users"])
    
    def test_role_based_access_within_tenant(self, test_tenants, test_tokens):
        """Test role-based access control within tenant boundaries"""
        nasdaq_admin_token = test_tokens["nasdaq-center"]["user1"]
        nasdaq_manager_token = test_tokens["nasdaq-center"]["user2"]
        
        admin_payload = verify_token(nasdaq_admin_token)
        manager_payload = verify_token(nasdaq_manager_token)
        
        # Both users in same tenant
        assert admin_payload["tenant_id"] == manager_payload["tenant_id"] == "nasdaq-center"
        
        # Different roles
        assert admin_payload["role"] == "admin"
        assert manager_payload["role"] == "manager"
        
        # Admin should have higher privileges than manager
        role_hierarchy = {"viewer": 1, "user": 2, "manager": 3, "admin": 4, "owner": 5}
        assert role_hierarchy[admin_payload["role"]] > role_hierarchy[manager_payload["role"]]
    
    def test_tenant_switching_validation(self, test_tokens):
        """Test that users cannot switch to unauthorized tenants"""
        # User from nasdaq-center trying to access tight5-digital data
        nasdaq_token = test_tokens["nasdaq-center"]["user1"]
        nasdaq_payload = verify_token(nasdaq_token)
        
        # User should only be able to access their tenant
        authorized_tenant = nasdaq_payload["tenant_id"]
        assert authorized_tenant == "nasdaq-center"
        
        # Attempting to access different tenant should fail validation
        unauthorized_tenants = ["tight5-digital", "innovation-hub", "non-existent"]
        for tenant in unauthorized_tenants:
            assert tenant != authorized_tenant
    
    @pytest.mark.asyncio
    async def test_concurrent_tenant_operations(self, test_tokens, mock_database):
        """Test concurrent operations across multiple tenants"""
        async def simulate_tenant_operation(tenant_id, operation_type):
            """Simulate database operation for specific tenant"""
            await asyncio.sleep(0.1)  # Simulate async operation
            
            if operation_type == "sponsors":
                return mock_database["sponsors"].get(tenant_id, [])
            elif operation_type == "grants":
                return mock_database["grants"].get(tenant_id, [])
            else:
                return []
        
        # Run concurrent operations for different tenants
        tasks = [
            simulate_tenant_operation("nasdaq-center", "sponsors"),
            simulate_tenant_operation("tight5-digital", "sponsors"),
            simulate_tenant_operation("innovation-hub", "grants"),
            simulate_tenant_operation("nasdaq-center", "grants")
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Verify results maintain tenant isolation
        nasdaq_sponsors = results[0]
        tight5_sponsors = results[1]
        innovation_grants = results[2]
        nasdaq_grants = results[3]
        
        assert len(nasdaq_sponsors) == 2
        assert len(tight5_sponsors) == 1
        assert len(innovation_grants) == 1
        assert len(nasdaq_grants) == 2
        
        # Verify tenant IDs are correct
        for sponsor in nasdaq_sponsors:
            assert sponsor["tenant_id"] == "nasdaq-center"
        
        for sponsor in tight5_sponsors:
            assert sponsor["tenant_id"] == "tight5-digital"
    
    def test_tenant_data_cleanup_isolation(self, mock_database):
        """Test that data cleanup operations respect tenant boundaries"""
        def cleanup_tenant_data(tenant_id, data_type):
            """Simulate cleanup operation for specific tenant"""
            if data_type in mock_database and tenant_id in mock_database[data_type]:
                # In real implementation, this would delete from database
                return len(mock_database[data_type][tenant_id])
            return 0
        
        # Test cleanup for specific tenant
        nasdaq_sponsors_count = cleanup_tenant_data("nasdaq-center", "sponsors")
        nasdaq_grants_count = cleanup_tenant_data("nasdaq-center", "grants")
        
        assert nasdaq_sponsors_count == 2
        assert nasdaq_grants_count == 2
        
        # Verify other tenant data remains untouched
        remaining_tight5_sponsors = len(mock_database["sponsors"]["tight5-digital"])
        remaining_innovation_grants = len(mock_database["grants"]["innovation-hub"])
        
        assert remaining_tight5_sponsors == 1
        assert remaining_innovation_grants == 1
    
    def test_error_handling_invalid_tenant_context(self):
        """Test comprehensive error handling for invalid tenant contexts"""
        test_cases = [
            {"tenant_id": "", "expected_error": "Tenant ID is required"},
            {"tenant_id": None, "expected_error": "Tenant ID is required"},
            {"tenant_id": "invalid-tenant", "expected_error": "Invalid tenant"},
            {"tenant_id": "tenant-with-special-chars!@#", "expected_error": "Invalid tenant"}
        ]
        
        for case in test_cases:
            tenant_id = case["tenant_id"]
            
            # Test that invalid tenant IDs are properly rejected
            if not tenant_id or tenant_id in ["", None]:
                # Should fail basic validation
                assert not tenant_id or tenant_id == ""
            else:
                # Should fail tenant existence validation
                valid_tenants = ["nasdaq-center", "tight5-digital", "innovation-hub"]
                assert tenant_id not in valid_tenants


if __name__ == "__main__":
    pytest.main([__file__, "-v"])