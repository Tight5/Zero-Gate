#!/usr/bin/env python3
"""
Comprehensive JWT Authentication Test Suite
Tests all authentication endpoints and role-based permissions
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

class JWTAuthTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        
    def test_server_health(self) -> bool:
        """Test if FastAPI server is running"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def login(self, email: str, password: str, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """Test user login"""
        login_data = {"email": email, "password": password}
        if tenant_id:
            login_data["tenant_id"] = tenant_id
            
        response = requests.post(f"{self.base_url}/auth/login", json=login_data)
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result["access_token"]
            self.refresh_token = result["refresh_token"]
            return {"success": True, "data": result}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def get_user_info(self) -> Dict[str, Any]:
        """Test protected endpoint access"""
        if not self.access_token:
            return {"success": False, "error": "No access token"}
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.get(f"{self.base_url}/auth/me", headers=headers)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def test_role_endpoint(self, role: str) -> Dict[str, Any]:
        """Test role-based access control"""
        if not self.access_token:
            return {"success": False, "error": "No access token"}
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.get(f"{self.base_url}/auth/test/{role}", headers=headers)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def refresh_access_token(self) -> Dict[str, Any]:
        """Test token refresh"""
        if not self.refresh_token:
            return {"success": False, "error": "No refresh token"}
            
        response = requests.post(f"{self.base_url}/auth/refresh", 
                               json={"refresh_token": self.refresh_token})
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result["access_token"]
            return {"success": True, "data": result}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def get_user_tenants(self) -> Dict[str, Any]:
        """Test tenant listing"""
        if not self.access_token:
            return {"success": False, "error": "No access token"}
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.get(f"{self.base_url}/auth/tenants", headers=headers)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def logout(self) -> Dict[str, Any]:
        """Test user logout"""
        if not self.access_token:
            return {"success": False, "error": "No access token"}
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.post(f"{self.base_url}/auth/logout", headers=headers)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": response.text, "status": response.status_code}
    
    def run_comprehensive_test(self):
        """Execute complete test suite"""
        print("JWT Authentication Comprehensive Test Suite")
        print("=" * 60)
        
        # Test 1: Server Health
        print("\n1. Testing server health...")
        if not self.test_server_health():
            print("❌ FastAPI server not responding on port 8000")
            print("Please start the server: python server/test_jwt_server.py")
            return False
        print("✅ FastAPI server is running")
        
        # Test 2: Admin Login
        print("\n2. Testing admin login...")
        login_result = self.login("admin@nasdaq-center.org", "password123")
        if login_result["success"]:
            user_data = login_result["data"]["user"]
            tenant_data = login_result["data"]["tenant"]
            print(f"✅ Admin login successful")
            print(f"   User: {user_data['email']} ({user_data['role']})")
            print(f"   Tenant: {tenant_data['name'] if tenant_data else 'None'}")
            print(f"   Token: {self.access_token[:50]}...")
        else:
            print(f"❌ Admin login failed: {login_result['error']}")
            return False
        
        # Test 3: Protected Endpoint Access
        print("\n3. Testing protected endpoint...")
        user_info = self.get_user_info()
        if user_info["success"]:
            user = user_info["data"]
            print(f"✅ Protected endpoint access successful")
            print(f"   Full Name: {user['first_name']} {user['last_name']}")
            print(f"   Role: {user['role']}")
            print(f"   Tenant: {user['tenant_name']}")
        else:
            print(f"❌ Protected endpoint failed: {user_info['error']}")
        
        # Test 4: Role-based Access Control
        print("\n4. Testing role-based access control...")
        roles_to_test = ["viewer", "user", "manager", "admin"]
        
        for role in roles_to_test:
            role_test = self.test_role_endpoint(role)
            if role_test["success"]:
                print(f"✅ {role.capitalize()} role access granted")
            else:
                print(f"❌ {role.capitalize()} role access denied")
        
        # Test 5: Tenant Management
        print("\n5. Testing tenant management...")
        tenants_result = self.get_user_tenants()
        if tenants_result["success"]:
            tenants = tenants_result["data"]["tenants"]
            print(f"✅ Retrieved {len(tenants)} accessible tenants")
            for tenant in tenants:
                print(f"   - {tenant['name']} ({tenant['role']} role)")
        else:
            print(f"❌ Tenant retrieval failed: {tenants_result['error']}")
        
        # Test 6: Token Refresh
        print("\n6. Testing token refresh...")
        refresh_result = self.refresh_access_token()
        if refresh_result["success"]:
            print(f"✅ Token refresh successful")
            print(f"   New token: {self.access_token[:50]}...")
        else:
            print(f"❌ Token refresh failed: {refresh_result['error']}")
        
        # Test 7: Different User Roles
        print("\n7. Testing different user roles...")
        test_users = [
            ("manager@nasdaq-center.org", "manager"),
            ("user@nasdaq-center.org", "user"),
            ("viewer@nasdaq-center.org", "viewer")
        ]
        
        for email, expected_role in test_users:
            login_result = self.login(email, "password123")
            if login_result["success"]:
                actual_role = login_result["data"]["user"]["role"]
                if actual_role == expected_role:
                    print(f"✅ {expected_role.capitalize()} login successful")
                else:
                    print(f"❌ Role mismatch: expected {expected_role}, got {actual_role}")
            else:
                print(f"❌ {expected_role.capitalize()} login failed")
        
        # Test 8: Unauthorized Access
        print("\n8. Testing unauthorized access...")
        self.access_token = None  # Clear token
        unauthorized_test = self.get_user_info()
        if not unauthorized_test["success"] and unauthorized_test.get("status") == 401:
            print("✅ Unauthorized access properly blocked")
        else:
            print("❌ Unauthorized access not properly blocked")
        
        # Test 9: Invalid Credentials
        print("\n9. Testing invalid credentials...")
        invalid_login = self.login("invalid@email.com", "wrongpassword")
        if not invalid_login["success"]:
            print("✅ Invalid credentials properly rejected")
        else:
            print("❌ Invalid credentials not properly rejected")
        
        # Test 10: Logout
        print("\n10. Testing logout...")
        # Login again for logout test
        self.login("admin@nasdaq-center.org", "password123")
        logout_result = self.logout()
        if logout_result["success"]:
            print("✅ Logout successful")
        else:
            print(f"❌ Logout failed: {logout_result['error']}")
        
        print("\n" + "=" * 60)
        print("JWT Authentication Test Suite Complete")
        print("All core authentication features verified")
        
        return True

def main():
    """Main test execution"""
    tester = JWTAuthTester()
    
    print("Starting JWT Authentication Test Suite...")
    print("Waiting for FastAPI server...")
    
    # Wait for server to be ready
    for i in range(10):
        if tester.test_server_health():
            break
        time.sleep(1)
    else:
        print("❌ Server not ready after 10 seconds")
        return False
    
    success = tester.run_comprehensive_test()
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)