"""
Backend Test Suite - Path Discovery
Tests seven-degree path discovery, relationship algorithms, and network analysis
Based on attached asset specifications for Zero Gate ESO Platform
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Set, Tuple
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import networkx as nx

# Import our FastAPI app and dependencies
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

try:
    from fastapi_app import app
    from auth.jwt_auth import create_access_token
    from api.models import RelationshipCreate, SponsorCreate
except ImportError:
    # Mock for testing when modules are not available
    from unittest.mock import MagicMock
    app = MagicMock()
    def create_access_token(data):
        return "mock_token_for_testing"
    RelationshipCreate = SponsorCreate = dict

class TestPathDiscovery:
    """Comprehensive path discovery and relationship analysis test suite"""
    
    @pytest.fixture(scope="class")
    def test_client(self):
        """Create test client for FastAPI app"""
        return TestClient(app)
    
    @pytest.fixture(scope="class")
    def test_tenant_setup(self):
        """Setup test tenant and authentication"""
        tenant_id = str(uuid.uuid4())
        user_email = "path.tester@test.com"
        
        # Create JWT token
        token = create_access_token({
            'sub': user_email,
            'tenant_id': tenant_id,
            'role': 'admin',
            'exp': datetime.utcnow() + timedelta(hours=1)
        })
        
        return {
            'tenant_id': tenant_id,
            'token': token,
            'user_email': user_email
        }
    
    @pytest.fixture
    def relationship_network_data(self):
        """Create comprehensive relationship network for testing"""
        return {
            'nodes': [
                # Core ESO entities
                {'id': 'eso_central', 'name': 'Central ESO Hub', 'type': 'organization', 'tier': 'A'},
                {'id': 'sponsor_a', 'name': 'Foundation Alpha', 'type': 'sponsor', 'tier': 'A'},
                {'id': 'sponsor_b', 'name': 'Foundation Beta', 'type': 'sponsor', 'tier': 'B'},
                {'id': 'sponsor_c', 'name': 'Foundation Gamma', 'type': 'sponsor', 'tier': 'C'},
                
                # Intermediary organizations
                {'id': 'org_1', 'name': 'Community Partners Inc', 'type': 'organization', 'tier': 'B'},
                {'id': 'org_2', 'name': 'Regional Development Council', 'type': 'organization', 'tier': 'B'},
                {'id': 'org_3', 'name': 'Innovation Hub Network', 'type': 'organization', 'tier': 'C'},
                
                # Individual contacts
                {'id': 'contact_1', 'name': 'Alice Johnson', 'type': 'individual', 'tier': 'A'},
                {'id': 'contact_2', 'name': 'Bob Smith', 'type': 'individual', 'tier': 'B'},
                {'id': 'contact_3', 'name': 'Carol Davis', 'type': 'individual', 'tier': 'B'},
                {'id': 'contact_4', 'name': 'David Wilson', 'type': 'individual', 'tier': 'C'},
                {'id': 'contact_5', 'name': 'Eva Brown', 'type': 'individual', 'tier': 'C'},
                
                # Target entities
                {'id': 'target_sponsor', 'name': 'Target Foundation', 'type': 'sponsor', 'tier': 'A'},
                {'id': 'target_individual', 'name': 'Dr. Sarah Miller', 'type': 'individual', 'tier': 'A'},
            ],
            'relationships': [
                # Direct connections from ESO
                {'source': 'eso_central', 'target': 'sponsor_a', 'type': 'partnership', 'strength': 0.9, 'weight': 1},
                {'source': 'eso_central', 'target': 'contact_1', 'type': 'collaboration', 'strength': 0.8, 'weight': 1},
                {'source': 'eso_central', 'target': 'org_1', 'type': 'partnership', 'strength': 0.7, 'weight': 1},
                
                # Sponsor connections
                {'source': 'sponsor_a', 'target': 'contact_1', 'type': 'advisory', 'strength': 0.9, 'weight': 1},
                {'source': 'sponsor_a', 'target': 'org_2', 'type': 'funding', 'strength': 0.8, 'weight': 1},
                {'source': 'sponsor_b', 'target': 'contact_2', 'type': 'advisory', 'strength': 0.7, 'weight': 1},
                {'source': 'sponsor_c', 'target': 'org_3', 'type': 'partnership', 'strength': 0.6, 'weight': 1},
                
                # Organization intermediary connections
                {'source': 'org_1', 'target': 'contact_2', 'type': 'collaboration', 'strength': 0.8, 'weight': 1},
                {'source': 'org_1', 'target': 'contact_3', 'type': 'referral', 'strength': 0.6, 'weight': 1},
                {'source': 'org_2', 'target': 'target_sponsor', 'type': 'partnership', 'strength': 0.7, 'weight': 1},
                {'source': 'org_2', 'target': 'contact_3', 'type': 'collaboration', 'strength': 0.5, 'weight': 1},
                {'source': 'org_3', 'target': 'contact_4', 'type': 'referral', 'strength': 0.4, 'weight': 1},
                
                # Individual connections
                {'source': 'contact_1', 'target': 'target_individual', 'type': 'advisory', 'strength': 0.9, 'weight': 1},
                {'source': 'contact_1', 'target': 'contact_2', 'type': 'referral', 'strength': 0.7, 'weight': 1},
                {'source': 'contact_2', 'target': 'contact_3', 'type': 'collaboration', 'strength': 0.6, 'weight': 1},
                {'source': 'contact_3', 'target': 'target_sponsor', 'type': 'advisory', 'strength': 0.8, 'weight': 1},
                {'source': 'contact_3', 'target': 'contact_4', 'type': 'referral', 'strength': 0.5, 'weight': 1},
                {'source': 'contact_4', 'target': 'contact_5', 'type': 'collaboration', 'strength': 0.4, 'weight': 1},
                {'source': 'contact_5', 'target': 'target_individual', 'type': 'referral', 'strength': 0.3, 'weight': 1},
                
                # Additional complex paths
                {'source': 'sponsor_b', 'target': 'org_1', 'type': 'funding', 'strength': 0.6, 'weight': 1},
                {'source': 'contact_2', 'target': 'target_sponsor', 'type': 'referral', 'strength': 0.5, 'weight': 1},
            ]
        }
    
    @pytest.fixture
    def setup_network(self, test_client, test_tenant_setup, relationship_network_data):
        """Setup the relationship network in the database"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        created_entities = {'sponsors': [], 'relationships': []}
        
        # Create sponsor entities first
        sponsors = [node for node in relationship_network_data['nodes'] if node['type'] == 'sponsor']
        for sponsor in sponsors:
            sponsor_data = {
                'name': sponsor['name'],
                'organization': sponsor['name'],
                'contact_email': f"{sponsor['id'].replace('_', '.')}@test.com",
                'relationship_manager': 'test.manager@test.com',
                'tier': sponsor['tier'],
                'status': 'active'
            }
            
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
                created_entities['sponsors'].append(response.json())
        
        # Create relationships
        for rel in relationship_network_data['relationships']:
            relationship_data = {
                'source_entity': rel['source'],
                'target_entity': rel['target'],
                'relationship_type': rel['type'],
                'strength': rel['strength'],
                'status': 'active',
                'notes': f"Test relationship between {rel['source']} and {rel['target']}"
            }
            
            response = test_client.post(
                "/api/v2/relationships",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json=relationship_data
            )
            
            if response.status_code == 201:
                created_entities['relationships'].append(response.json())
        
        return created_entities
    
    def test_direct_path_discovery(self, test_client, test_tenant_setup, setup_network):
        """Test discovery of direct paths (1-degree connections)"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Test direct path from ESO to Sponsor A
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'sponsor_a',
                'max_degrees': 7,
                'algorithm': 'bfs'
            }
        )
        
        assert response.status_code == 200
        path_result = response.json()
        
        # Verify direct path structure
        assert 'paths' in path_result
        assert len(path_result['paths']) > 0
        
        # Check for direct path
        direct_path = next((p for p in path_result['paths'] if len(p['path']) == 2), None)
        assert direct_path is not None, "Should find direct path"
        assert direct_path['path'] == ['eso_central', 'sponsor_a']
        assert direct_path['distance'] == 1
        assert direct_path['path_type'] == 'direct'
        assert direct_path['confidence'] > 0.8  # High confidence for direct connection
    
    def test_multi_degree_path_discovery(self, test_client, test_tenant_setup, setup_network):
        """Test discovery of multi-degree paths (2-7 degrees)"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Test path from ESO to target sponsor (should be 3-4 degrees)
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'target_sponsor',
                'max_degrees': 7,
                'algorithm': 'bfs'
            }
        )
        
        assert response.status_code == 200
        path_result = response.json()
        
        # Should find multiple paths
        assert len(path_result['paths']) > 0
        
        # Check path through org_2
        expected_path_1 = ['eso_central', 'sponsor_a', 'org_2', 'target_sponsor']
        path_1 = next((p for p in path_result['paths'] if p['path'] == expected_path_1), None)
        
        if path_1:
            assert path_1['distance'] == 3
            assert path_1['path_type'] == 'multi-hop'
            assert len(path_1['intermediaries']) == 2  # sponsor_a and org_2
        
        # Check alternative path through contact_3
        potential_path_2 = next((p for p in path_result['paths'] if 'contact_3' in p['path']), None)
        if potential_path_2:
            assert potential_path_2['distance'] <= 7
            assert len(potential_path_2['intermediaries']) >= 1
    
    def test_seven_degree_limit_enforcement(self, test_client, test_tenant_setup, setup_network):
        """Test that path discovery respects 7-degree limit"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Test with max_degrees set to different values
        for max_degrees in [1, 3, 5, 7]:
            response = test_client.post(
                "/api/v2/relationships/path-discovery",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json={
                    'source': 'eso_central',
                    'target': 'target_individual',
                    'max_degrees': max_degrees,
                    'algorithm': 'bfs'
                }
            )
            
            assert response.status_code == 200
            path_result = response.json()
            
            # All returned paths should respect the degree limit
            for path in path_result['paths']:
                assert path['distance'] <= max_degrees, (
                    f"Path distance {path['distance']} exceeds limit {max_degrees}"
                )
    
    def test_path_confidence_scoring(self, test_client, test_tenant_setup, setup_network):
        """Test path confidence scoring based on relationship strength"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'target_individual',
                'max_degrees': 7,
                'algorithm': 'bfs',
                'include_confidence': True
            }
        )
        
        assert response.status_code == 200
        path_result = response.json()
        
        # Should have paths with confidence scores
        assert len(path_result['paths']) > 0
        
        for path in path_result['paths']:
            # Confidence should be between 0 and 1
            assert 0 <= path['confidence'] <= 1
            
            # Shorter, stronger paths should have higher confidence
            # Direct paths should have highest confidence
            if path['distance'] == 1:
                assert path['confidence'] > 0.7
            
            # Paths with high-tier intermediaries should have higher confidence
            if any(tier in str(path.get('intermediaries', [])) for tier in ['A', 'sponsor']):
                assert path['confidence'] > 0.3
    
    def test_algorithm_comparison(self, test_client, test_tenant_setup, setup_network):
        """Test different pathfinding algorithms (BFS, DFS, Dijkstra)"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        algorithms = ['bfs', 'dfs', 'dijkstra']
        results = {}
        
        for algorithm in algorithms:
            response = test_client.post(
                "/api/v2/relationships/path-discovery",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json={
                    'source': 'eso_central',
                    'target': 'target_sponsor',
                    'max_degrees': 7,
                    'algorithm': algorithm
                }
            )
            
            assert response.status_code == 200
            results[algorithm] = response.json()
        
        # All algorithms should find at least one path
        for algorithm, result in results.items():
            assert len(result['paths']) > 0, f"{algorithm} should find paths"
        
        # BFS should find shortest path
        bfs_shortest = min(results['bfs']['paths'], key=lambda p: p['distance'])
        
        # Dijkstra should find optimal weighted path
        dijkstra_optimal = min(results['dijkstra']['paths'], key=lambda p: p.get('weight', float('inf')))
        
        # Both should be reasonable
        assert bfs_shortest['distance'] <= 7
        assert dijkstra_optimal['distance'] <= 7
    
    def test_path_filtering_by_relationship_type(self, test_client, test_tenant_setup, setup_network):
        """Test filtering paths by relationship types"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Test filtering for only 'partnership' relationships
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'target_sponsor',
                'max_degrees': 7,
                'algorithm': 'bfs',
                'allowed_relationship_types': ['partnership', 'funding']
            }
        )
        
        assert response.status_code == 200
        path_result = response.json()
        
        # Verify path metadata includes relationship types used
        for path in path_result['paths']:
            if 'relationship_types' in path:
                for rel_type in path['relationship_types']:
                    assert rel_type in ['partnership', 'funding']
    
    def test_network_centrality_analysis(self, test_client, test_tenant_setup, setup_network):
        """Test network centrality and key connector identification"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Get network analysis
        response = test_client.get(
            "/api/v2/relationships/network-analysis",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id
            }
        )
        
        assert response.status_code == 200
        analysis = response.json()
        
        # Should include centrality metrics
        assert 'centrality' in analysis
        assert 'key_connectors' in analysis
        assert 'network_density' in analysis
        
        # Key connectors should be identified
        key_connectors = analysis['key_connectors']
        assert len(key_connectors) > 0
        
        # ESO central should likely be a key connector
        connector_names = [conn['entity'] for conn in key_connectors]
        # Allow flexibility in how entities are identified
        assert any('eso' in name.lower() or 'central' in name.lower() for name in connector_names)
    
    def test_path_discovery_performance(self, test_client, test_tenant_setup, setup_network):
        """Test path discovery performance with timing"""
        import time
        
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Test multiple path discoveries for performance
        start_time = time.time()
        
        test_pairs = [
            ('eso_central', 'target_sponsor'),
            ('eso_central', 'target_individual'),
            ('sponsor_a', 'target_sponsor'),
            ('contact_1', 'target_individual'),
            ('org_1', 'target_sponsor')
        ]
        
        successful_requests = 0
        
        for source, target in test_pairs:
            response = test_client.post(
                "/api/v2/relationships/path-discovery",
                headers={
                    'Authorization': f'Bearer {token}',
                    'X-Tenant-ID': tenant_id,
                    'Content-Type': 'application/json'
                },
                json={
                    'source': source,
                    'target': target,
                    'max_degrees': 7,
                    'algorithm': 'bfs'
                }
            )
            
            if response.status_code == 200:
                successful_requests += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        avg_time = total_time / len(test_pairs)
        
        # Performance should be reasonable
        assert avg_time < 1.0, f"Path discovery too slow: {avg_time:.3f}s average"
        assert successful_requests > 0, "Should have successful path discoveries"
        
        print(f"Path discovery performance: {avg_time:.3f}s average per request")
    
    def test_no_path_exists_handling(self, test_client, test_tenant_setup, setup_network):
        """Test handling when no path exists between entities"""
        tenant_id = test_tenant_setup['tenant_id']
        token = test_tenant_setup['token']
        
        # Try to find path to non-existent entity
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token}',
                'X-Tenant-ID': tenant_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'non_existent_entity',
                'max_degrees': 7,
                'algorithm': 'bfs'
            }
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            path_result = response.json()
            assert len(path_result['paths']) == 0
            assert 'message' in path_result
            assert 'no path' in path_result['message'].lower()
    
    def test_path_discovery_with_tenant_isolation(self, test_client, test_tenant_setup, setup_network):
        """Test that path discovery respects tenant boundaries"""
        # Create second tenant
        tenant_2_id = str(uuid.uuid4())
        token_2 = create_access_token({
            'sub': 'path.tester2@test.com',
            'tenant_id': tenant_2_id,
            'role': 'admin',
            'exp': datetime.utcnow() + timedelta(hours=1)
        })
        
        # Try path discovery with tenant 2 token (should not see tenant 1 data)
        response = test_client.post(
            "/api/v2/relationships/path-discovery",
            headers={
                'Authorization': f'Bearer {token_2}',
                'X-Tenant-ID': tenant_2_id,
                'Content-Type': 'application/json'
            },
            json={
                'source': 'eso_central',
                'target': 'target_sponsor',
                'max_degrees': 7,
                'algorithm': 'bfs'
            }
        )
        
        # Should either return empty results or 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            path_result = response.json()
            assert len(path_result['paths']) == 0  # No paths in empty tenant

if __name__ == "__main__":
    pytest.main([__file__, "-v"])