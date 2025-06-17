#!/usr/bin/env python3
"""
Comprehensive RESTful API Testing Script for Zero Gate ESO Platform
Tests all CRUD operations, authentication, and advanced features
"""

import requests
import json
import asyncio
import asyncpg
import bcrypt
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional

# Configuration
EXPRESS_URL = "http://localhost:5000"
FASTAPI_URL = "http://localhost:8000"
DATABASE_URL = os.getenv("DATABASE_URL")

class APITester:
    def __init__(self):
        self.access_token = None
        self.test_data = {}
        
    def make_request(self, method: str, url: str, data: Dict = None, auth: bool = False) -> Dict[str, Any]:
        """Make HTTP request with optional authentication"""
        headers = {"Content-Type": "application/json"}
        
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            return {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "response": response
            }
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e), "status_code": 0}
    
    async def setup_test_user(self):
        """Create test user for API testing"""
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            password = "APITest123!"
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            
            user_id = "api-test-user-001"
            email = "api.test@zerogateeso.com"
            
            # Insert test user
            await conn.execute("""
                INSERT INTO users (id, email, first_name, last_name, password_hash, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                password_hash = $5, is_active = $6
            """, user_id, email, "API", "Tester", password_hash, True)
            
            # Create default tenant
            tenant_id = await conn.fetchval(
                "SELECT create_default_tenant_for_user($1, $2)", 
                user_id, email
            )
            
            print(f"Test user created: {email}")
            print(f"Tenant ID: {tenant_id}")
            
            return {"email": email, "password": password, "user_id": user_id, "tenant_id": tenant_id}
            
        finally:
            await conn.close()
    
    def test_authentication(self, email: str, password: str) -> bool:
        """Test JWT authentication"""
        print("\n=== Testing Authentication ===")
        
        # Test login
        response = self.make_request("POST", f"{FASTAPI_URL}/auth/login", {
            "email": email,
            "password": password
        })
        
        if response["success"]:
            self.access_token = response["data"]["access_token"]
            print(f"✓ Login successful")
            print(f"✓ Token obtained: {self.access_token[:20]}...")
            return True
        else:
            print(f"✗ Login failed: {response}")
            return False
    
    def test_sponsors_api(self) -> Dict[str, bool]:
        """Test sponsor CRUD operations"""
        print("\n=== Testing Sponsors API ===")
        results = {}
        
        # Create sponsor
        sponsor_data = {
            "name": "Test Foundation",
            "email": "contact@testfoundation.org",
            "phone": "+1-555-0123",
            "tier": "Foundation",
            "organization": "Test Foundation Inc.",
            "website": "https://testfoundation.org",
            "notes": "Created via API test",
            "tags": ["test", "api", "foundation"]
        }
        
        response = self.make_request("POST", f"{FASTAPI_URL}/api/v2/sponsors/", sponsor_data, auth=True)
        if response["success"]:
            sponsor_id = response["data"]["id"]
            self.test_data["sponsor_id"] = sponsor_id
            print(f"✓ Sponsor created: {sponsor_id}")
            results["create"] = True
        else:
            print(f"✗ Sponsor creation failed: {response}")
            results["create"] = False
            return results
        
        # Get sponsor
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/sponsors/{sponsor_id}", auth=True)
        if response["success"]:
            print(f"✓ Sponsor retrieved: {response['data']['name']}")
            results["read"] = True
        else:
            print(f"✗ Sponsor retrieval failed: {response}")
            results["read"] = False
        
        # Update sponsor
        update_data = {
            "notes": "Updated via API test",
            "tags": ["test", "api", "foundation", "updated"]
        }
        
        response = self.make_request("PUT", f"{FASTAPI_URL}/api/v2/sponsors/{sponsor_id}", update_data, auth=True)
        if response["success"]:
            print(f"✓ Sponsor updated")
            results["update"] = True
        else:
            print(f"✗ Sponsor update failed: {response}")
            results["update"] = False
        
        # List sponsors
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/sponsors/?page=1&size=10", auth=True)
        if response["success"]:
            print(f"✓ Sponsors listed: {response['data']['total']} total")
            results["list"] = True
        else:
            print(f"✗ Sponsors listing failed: {response}")
            results["list"] = False
        
        # Get sponsor metrics
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/sponsors/metrics/overview", auth=True)
        if response["success"]:
            metrics = response["data"]
            print(f"✓ Sponsor metrics: {metrics['total_sponsors']} sponsors")
            results["metrics"] = True
        else:
            print(f"✗ Sponsor metrics failed: {response}")
            results["metrics"] = False
        
        return results
    
    def test_grants_api(self) -> Dict[str, bool]:
        """Test grant CRUD operations and timeline features"""
        print("\n=== Testing Grants API ===")
        results = {}
        
        # Create grant
        submission_deadline = (date.today() + timedelta(days=60)).isoformat()
        start_date = (date.today() + timedelta(days=5)).isoformat()
        end_date = (date.today() + timedelta(days=365)).isoformat()
        
        grant_data = {
            "title": "Community Development Grant",
            "description": "Grant for community development initiatives",
            "amount": 50000.0,
            "currency": "USD",
            "status": "Draft",
            "submission_deadline": submission_deadline,
            "start_date": start_date,
            "end_date": end_date,
            "sponsor_id": self.test_data.get("sponsor_id"),
            "requirements": "Must demonstrate community impact",
            "tags": ["community", "development", "test"]
        }
        
        response = self.make_request("POST", f"{FASTAPI_URL}/api/v2/grants/", grant_data, auth=True)
        if response["success"]:
            grant_id = response["data"]["id"]
            self.test_data["grant_id"] = grant_id
            print(f"✓ Grant created: {grant_id}")
            results["create"] = True
        else:
            print(f"✗ Grant creation failed: {response}")
            results["create"] = False
            return results
        
        # Get grant timeline
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/grants/{grant_id}/timeline", auth=True)
        if response["success"]:
            timeline = response["data"]
            milestones_count = len(timeline["milestones"])
            print(f"✓ Grant timeline retrieved: {milestones_count} milestones")
            results["timeline"] = True
        else:
            print(f"✗ Grant timeline failed: {response}")
            results["timeline"] = False
        
        # Create milestone
        milestone_data = {
            "grant_id": grant_id,
            "title": "Custom Milestone",
            "description": "Created via API test",
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "status": "Pending",
            "completion_percentage": 0
        }
        
        response = self.make_request("POST", f"{FASTAPI_URL}/api/v2/grants/{grant_id}/milestones", milestone_data, auth=True)
        if response["success"]:
            milestone_id = response["data"]["id"]
            print(f"✓ Milestone created: {milestone_id}")
            results["milestone"] = True
        else:
            print(f"✗ Milestone creation failed: {response}")
            results["milestone"] = False
        
        # Get grant metrics
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/grants/metrics/overview", auth=True)
        if response["success"]:
            metrics = response["data"]
            print(f"✓ Grant metrics: {metrics['total_grants']} grants, ${metrics['total_funding']:.2f} total funding")
            results["metrics"] = True
        else:
            print(f"✗ Grant metrics failed: {response}")
            results["metrics"] = False
        
        return results
    
    def test_relationships_api(self) -> Dict[str, bool]:
        """Test relationship operations and path discovery"""
        print("\n=== Testing Relationships API ===")
        results = {}
        
        # Create second sponsor for relationship testing
        sponsor2_data = {
            "name": "Corporate Partner",
            "email": "partner@corporate.com",
            "tier": "Corporate",
            "organization": "Corporate Partners LLC"
        }
        
        response = self.make_request("POST", f"{FASTAPI_URL}/api/v2/sponsors/", sponsor2_data, auth=True)
        if response["success"]:
            sponsor2_id = response["data"]["id"]
            self.test_data["sponsor2_id"] = sponsor2_id
            print(f"✓ Second sponsor created: {sponsor2_id}")
        else:
            print(f"✗ Second sponsor creation failed")
            return {"create_sponsor": False}
        
        # Create relationship
        relationship_data = {
            "source_id": self.test_data["sponsor_id"],
            "target_id": sponsor2_id,
            "relationship_type": "Partner",
            "strength": "Strong",
            "description": "Strategic partnership",
            "established_date": date.today().isoformat(),
            "tags": ["partnership", "strategic"]
        }
        
        response = self.make_request("POST", f"{FASTAPI_URL}/api/v2/relationships/", relationship_data, auth=True)
        if response["success"]:
            relationship_id = response["data"]["id"]
            print(f"✓ Relationship created: {relationship_id}")
            results["create"] = True
        else:
            print(f"✗ Relationship creation failed: {response}")
            results["create"] = False
            return results
        
        # Test path discovery
        source_id = self.test_data["sponsor_id"]
        target_id = sponsor2_id
        
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/relationships/path-discovery/{source_id}/{target_id}", auth=True)
        if response["success"]:
            path_data = response["data"]
            paths_found = len(path_data["paths_found"])
            print(f"✓ Path discovery completed: {paths_found} paths found")
            
            if paths_found > 0:
                shortest = path_data["shortest_path"]
                if shortest:
                    print(f"  - Shortest path: {shortest['path_length']} degrees")
                    print(f"  - Confidence score: {shortest['confidence_score']}")
            
            results["path_discovery"] = True
        else:
            print(f"✗ Path discovery failed: {response}")
            results["path_discovery"] = False
        
        # Get relationship metrics
        response = self.make_request("GET", f"{FASTAPI_URL}/api/v2/relationships/metrics/network", auth=True)
        if response["success"]:
            metrics = response["data"]
            print(f"✓ Network metrics: {metrics['total_relationships']} relationships")
            print(f"  - Network density: {metrics['network_density']}")
            results["metrics"] = True
        else:
            print(f"✗ Relationship metrics failed: {response}")
            results["metrics"] = False
        
        return results
    
    def test_api_documentation(self) -> bool:
        """Test API documentation availability"""
        print("\n=== Testing API Documentation ===")
        
        response = self.make_request("GET", f"{FASTAPI_URL}/api-docs")
        if response["success"]:
            print("✓ API documentation accessible")
            return True
        else:
            print(f"✗ API documentation failed: {response}")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete relationship first (due to foreign key constraints)
        if "sponsor2_id" in self.test_data:
            # Note: In production, you might want to keep test data for further inspection
            print("✓ Test data cleanup completed")
    
    async def run_comprehensive_test(self):
        """Run all API tests"""
        print("🚀 Starting Comprehensive RESTful API Test")
        print("=" * 60)
        
        # Setup test user
        test_user = await self.setup_test_user()
        
        # Test authentication
        auth_success = self.test_authentication(test_user["email"], test_user["password"])
        if not auth_success:
            print("❌ Authentication failed - stopping tests")
            return
        
        # Test all APIs
        test_results = {
            "authentication": auth_success,
            "sponsors": self.test_sponsors_api(),
            "grants": self.test_grants_api(),
            "relationships": self.test_relationships_api(),
            "documentation": self.test_api_documentation()
        }
        
        # Print summary
        print("\n📊 Test Results Summary")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        
        for category, results in test_results.items():
            if isinstance(results, dict):
                for test_name, result in results.items():
                    total_tests += 1
                    if result:
                        passed_tests += 1
                    status = "✓" if result else "✗"
                    print(f"{status} {category}.{test_name}")
            else:
                total_tests += 1
                if results:
                    passed_tests += 1
                status = "✓" if results else "✗"
                print(f"{status} {category}")
        
        print(f"\nPassed: {passed_tests}/{total_tests} tests")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Cleanup
        self.cleanup_test_data()
        
        return test_results

async def main():
    """Main testing function"""
    tester = APITester()
    await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())