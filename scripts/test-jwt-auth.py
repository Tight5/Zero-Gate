#!/usr/bin/env python3
"""
JWT Authentication Testing Script for Zero Gate ESO Platform
Comprehensive testing of login, logout, token refresh, and role-based permissions
"""

import asyncio
import asyncpg
import bcrypt
import requests
import json
import os
from datetime import datetime
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/database")

class JWTAuthTester:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.current_user = None
        
    async def setup_test_user(self):
        """Create test user with password for JWT authentication"""
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            # Hash test password
            password = "TestPassword123!"
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            
            # Create test user
            user_id = "jwt-test-user-001"
            email = "jwt.test@zerogateeso.com"
            
            # Insert user with password
            await conn.execute("""
                INSERT INTO users (id, email, first_name, last_name, password_hash, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                password_hash = $5, is_active = $6
            """, user_id, email, "JWT", "Tester", password_hash, True)
            
            # Create default tenant if needed
            tenant_result = await conn.fetchval(
                "SELECT create_default_tenant_for_user($1, $2)", 
                user_id, email
            )
            
            print(f"✓ Test user created: {email}")
            print(f"✓ Password: {password}")
            print(f"✓ Tenant ID: {tenant_result}")
            
            return {"email": email, "password": password, "user_id": user_id}
            
        finally:
            await conn.close()
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, auth: bool = False) -> Dict[str, Any]:
        """Make HTTP request to FastAPI server"""
        url = f"{API_BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except requests.exceptions.ConnectionError:
            return {
                "status_code": 0,
                "data": {"error": "FastAPI server not running on port 8000"},
                "success": False
            }
        except Exception as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
    
    def test_login(self, email: str, password: str) -> bool:
        """Test user login and token generation"""
        print("\n🔐 Testing JWT Login...")
        
        response = self.make_request("POST", "/auth/login", {
            "email": email,
            "password": password
        })
        
        if response["success"]:
            data = response["data"]
            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")
            self.current_user = data.get("user")
            
            print(f"✓ Login successful")
            print(f"✓ Access token: {self.access_token[:20]}...")
            print(f"✓ Refresh token: {self.refresh_token[:20]}...")
            print(f"✓ User: {self.current_user['email']} ({self.current_user['role']})")
            return True
        else:
            print(f"✗ Login failed: {response['data']}")
            return False
    
    def test_me_endpoint(self) -> bool:
        """Test getting current user information"""
        print("\n👤 Testing /auth/me endpoint...")
        
        response = self.make_request("GET", "/auth/me", auth=True)
        
        if response["success"]:
            user_info = response["data"]
            print(f"✓ User info retrieved: {user_info['email']}")
            print(f"✓ Role: {user_info['role']}")
            print(f"✓ Tenant: {user_info['tenant']['name']}")
            return True
        else:
            print(f"✗ Failed to get user info: {response['data']}")
            return False
    
    def test_refresh_token(self) -> bool:
        """Test token refresh functionality"""
        print("\n🔄 Testing token refresh...")
        
        response = self.make_request("POST", "/auth/refresh", {
            "refresh_token": self.refresh_token
        })
        
        if response["success"]:
            data = response["data"]
            old_token = self.access_token[:20]
            self.access_token = data.get("access_token")
            new_token = self.access_token[:20]
            
            print(f"✓ Token refreshed successfully")
            print(f"✓ Old token: {old_token}...")
            print(f"✓ New token: {new_token}...")
            return True
        else:
            print(f"✗ Token refresh failed: {response['data']}")
            return False
    
    def test_role_based_endpoints(self) -> Dict[str, bool]:
        """Test role-based permission endpoints"""
        print("\n🛡️  Testing role-based permissions...")
        
        endpoints = [
            ("/auth/test/viewer", "viewer"),
            ("/auth/test/user", "user"),
            ("/auth/test/manager", "manager"),
            ("/auth/test/admin", "admin")
        ]
        
        results = {}
        
        for endpoint, role in endpoints:
            response = self.make_request("GET", endpoint, auth=True)
            success = response["success"]
            results[role] = success
            
            if success:
                print(f"✓ {role.capitalize()} access granted")
            else:
                status = response["status_code"]
                if status == 403:
                    print(f"✗ {role.capitalize()} access denied (403) - expected for insufficient role")
                else:
                    print(f"✗ {role.capitalize()} access failed ({status})")
        
        return results
    
    def test_protected_api_endpoints(self) -> Dict[str, bool]:
        """Test protected API v2 endpoints"""
        print("\n🔒 Testing protected API endpoints...")
        
        endpoints = [
            ("/api/v2/dashboard", "dashboard"),
            ("/api/v2/viewer/readonly", "viewer_readonly"),
            ("/api/v2/manager/reports", "manager_reports"),
            ("/api/v2/admin/users", "admin_users")
        ]
        
        results = {}
        
        for endpoint, name in endpoints:
            response = self.make_request("GET", endpoint, auth=True)
            success = response["success"]
            results[name] = success
            
            if success:
                print(f"✓ {name} endpoint accessible")
                if "message" in response["data"]:
                    print(f"  Message: {response['data']['message']}")
            else:
                status = response["status_code"]
                print(f"✗ {name} endpoint failed ({status})")
        
        return results
    
    def test_logout(self) -> bool:
        """Test user logout"""
        print("\n🚪 Testing logout...")
        
        response = self.make_request("POST", "/auth/logout", auth=True)
        
        if response["success"]:
            print(f"✓ Logout successful: {response['data']['message']}")
            return True
        else:
            print(f"✗ Logout failed: {response['data']}")
            return False
    
    def test_unauthorized_access(self) -> bool:
        """Test access without token"""
        print("\n🚫 Testing unauthorized access...")
        
        # Clear tokens
        old_token = self.access_token
        self.access_token = None
        
        response = self.make_request("GET", "/auth/me", auth=True)
        
        # Restore token
        self.access_token = old_token
        
        if not response["success"] and response["status_code"] == 401:
            print("✓ Unauthorized access correctly blocked")
            return True
        else:
            print(f"✗ Unauthorized access test failed: {response}")
            return False
    
    async def run_comprehensive_test(self):
        """Run all JWT authentication tests"""
        print("🚀 Starting JWT Authentication Comprehensive Test")
        print("=" * 60)
        
        # Check if FastAPI server is running
        health_response = self.make_request("GET", "/health")
        if not health_response["success"]:
            print("❌ FastAPI server not running on port 8000")
            print("Please start the server with: python server/fastapi_app.py")
            return
        
        print("✓ FastAPI server is running")
        
        # Setup test user
        test_user = await self.setup_test_user()
        
        # Test authentication flow
        test_results = {}
        
        # 1. Test login
        test_results["login"] = self.test_login(test_user["email"], test_user["password"])
        
        if test_results["login"]:
            # 2. Test user info endpoint
            test_results["user_info"] = self.test_me_endpoint()
            
            # 3. Test role-based permissions
            test_results["roles"] = self.test_role_based_endpoints()
            
            # 4. Test protected API endpoints
            test_results["api_endpoints"] = self.test_protected_api_endpoints()
            
            # 5. Test token refresh
            test_results["token_refresh"] = self.test_refresh_token()
            
            # 6. Test unauthorized access
            test_results["unauthorized"] = self.test_unauthorized_access()
            
            # 7. Test logout
            test_results["logout"] = self.test_logout()
        
        # Print summary
        print("\n📊 Test Summary")
        print("=" * 60)
        
        for test_name, result in test_results.items():
            if isinstance(result, dict):
                print(f"{test_name.upper()}:")
                for sub_test, sub_result in result.items():
                    status = "✓" if sub_result else "✗"
                    print(f"  {status} {sub_test}")
            else:
                status = "✓" if result else "✗"
                print(f"{status} {test_name}")
        
        print("\n🎯 JWT Authentication testing complete!")

async def main():
    """Main testing function"""
    tester = JWTAuthTester()
    await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())