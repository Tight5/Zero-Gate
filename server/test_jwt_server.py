#!/usr/bin/env python3
"""
Test JWT Authentication Server for Zero Gate ESO Platform
Starts FastAPI server with JWT authentication on port 8000
"""

import uvicorn
import sys
import os

# Add the server directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Starting Zero Gate ESO Platform - JWT Authentication Server")
    print("📡 Server will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔒 Authentication endpoints: http://localhost:8000/auth/*")
    print("\n🧪 Test Credentials (password: password123):")
    print("   • admin@nasdaq-center.org (admin role)")
    print("   • manager@nasdaq-center.org (manager role)")
    print("   • user@nasdaq-center.org (user role)")
    print("   • viewer@nasdaq-center.org (viewer role)")
    print("\n🔑 Example Login Request:")
    print('   POST /auth/login')
    print('   {"email": "admin@nasdaq-center.org", "password": "password123"}')
    print("\n" + "="*60)
    
    # Start the FastAPI server
    uvicorn.run(
        "fastapi_app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )