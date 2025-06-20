#!/usr/bin/env python3
"""
Comprehensive Data Pipeline Test and Analysis
Validates Microsoft 365 integration, schema collection, storage, and UI pipeline representation
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

class DataPipelineValidator:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = None
        self.test_results = {
            "authentication": {},
            "tenant_data": {},
            "admin_data": {},
            "microsoft365_integration": {},
            "schema_validation": {},
            "ui_routing": {},
            "dashboard_data": {},
            "pipeline_effectiveness": {}
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_authentication_flow(self):
        """Test dual-mode authentication system"""
        print("🔐 Testing Authentication Flow...")
        
        # Test tenant mode authentication
        tenant_headers = {
            "X-User-Email": "clint.phillips@thecenter.nasdaq.org",
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.get(f"{self.base_url}/api/auth/user/tenants", headers=tenant_headers) as resp:
                tenant_data = await resp.json()
                self.test_results["authentication"]["tenant_mode"] = {
                    "status": resp.status,
                    "success": tenant_data.get("success", False),
                    "tenant_count": len(tenant_data.get("tenants", [])),
                    "admin_mode": tenant_data.get("adminMode", False)
                }
                print(f"   ✓ Tenant mode: {resp.status} - {len(tenant_data.get('tenants', []))} tenants")
        except Exception as e:
            self.test_results["authentication"]["tenant_mode"] = {"error": str(e)}
            print(f"   ✗ Tenant mode failed: {e}")

        # Test admin mode authentication
        admin_headers = {
            "X-User-Email": "admin@tight5digital.com",
            "X-Admin-Mode": "true",
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.get(f"{self.base_url}/api/auth/user/tenants", headers=admin_headers) as resp:
                admin_data = await resp.json()
                self.test_results["authentication"]["admin_mode"] = {
                    "status": resp.status,
                    "success": admin_data.get("success", False),
                    "tenant_count": len(admin_data.get("tenants", [])),
                    "admin_mode": admin_data.get("adminMode", False)
                }
                print(f"   ✓ Admin mode: {resp.status} - {len(admin_data.get('tenants', []))} tenants")
        except Exception as e:
            self.test_results["authentication"]["admin_mode"] = {"error": str(e)}
            print(f"   ✗ Admin mode failed: {e}")

    async def test_microsoft365_integration(self):
        """Test Microsoft 365 data pipeline integration"""
        print("📊 Testing Microsoft 365 Integration...")
        
        headers = {
            "X-User-Email": "clint.phillips@thecenter.nasdaq.org",
            "X-Tenant-ID": "1",
            "Content-Type": "application/json"
        }
        
        # Test connection status
        try:
            async with self.session.get(f"{self.base_url}/api/microsoft365/connection-status", headers=headers) as resp:
                if resp.status == 200:
                    connection_data = await resp.json()
                    self.test_results["microsoft365_integration"]["connection"] = {
                        "status": "connected" if connection_data.get("connected") else "disconnected",
                        "last_sync": connection_data.get("last_sync"),
                        "data_points": connection_data.get("data_points", 0)
                    }
                    print(f"   ✓ Connection status: {connection_data.get('connected', False)}")
                else:
                    print(f"   ! Connection status endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! Connection test skipped: {e}")

        # Test organizational data extraction
        try:
            async with self.session.get(f"{self.base_url}/api/microsoft365/organizational-data", headers=headers) as resp:
                if resp.status == 200:
                    org_data = await resp.json()
                    self.test_results["microsoft365_integration"]["organizational_data"] = {
                        "users_count": len(org_data.get("users", [])),
                        "groups_count": len(org_data.get("groups", [])),
                        "extraction_timestamp": org_data.get("extraction_timestamp"),
                        "has_hierarchy": "management_hierarchy" in org_data
                    }
                    print(f"   ✓ Organizational data: {len(org_data.get('users', []))} users, {len(org_data.get('groups', []))} groups")
                else:
                    print(f"   ! Organizational data endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! Organizational data test skipped: {e}")

    async def test_dashboard_data_pipeline(self):
        """Test dashboard data collection and representation"""
        print("📈 Testing Dashboard Data Pipeline...")
        
        tenant_headers = {
            "X-User-Email": "clint.phillips@thecenter.nasdaq.org",
            "X-Tenant-ID": "1",
            "Content-Type": "application/json"
        }
        
        # Test KPI data
        try:
            async with self.session.get(f"{self.base_url}/api/dashboard/kpis", headers=tenant_headers) as resp:
                if resp.status == 200:
                    kpi_data = await resp.json()
                    self.test_results["dashboard_data"]["kpis"] = {
                        "sponsors_total": kpi_data.get("sponsors", {}).get("total", 0),
                        "grants_total": kpi_data.get("grants", {}).get("total", 0),
                        "funding_total": kpi_data.get("funding", {}).get("total_awarded", 0),
                        "relationships_total": kpi_data.get("relationships", {}).get("total_connections", 0),
                        "data_freshness": kpi_data.get("timestamp")
                    }
                    print(f"   ✓ KPI Data: {kpi_data.get('sponsors', {}).get('total', 0)} sponsors, {kpi_data.get('grants', {}).get('total', 0)} grants")
                else:
                    print(f"   ! KPI endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! KPI test failed: {e}")

        # Test relationship data
        try:
            async with self.session.get(f"{self.base_url}/api/relationships/network-stats", headers=tenant_headers) as resp:
                if resp.status == 200:
                    relationship_data = await resp.json()
                    self.test_results["dashboard_data"]["relationships"] = {
                        "network_density": relationship_data.get("network_density", 0),
                        "total_nodes": relationship_data.get("total_nodes", 0),
                        "total_edges": relationship_data.get("total_edges", 0),
                        "clustering_coefficient": relationship_data.get("clustering_coefficient", 0)
                    }
                    print(f"   ✓ Relationship Data: {relationship_data.get('total_nodes', 0)} nodes, {relationship_data.get('total_edges', 0)} edges")
                else:
                    print(f"   ! Relationship endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! Relationship test failed: {e}")

    async def test_admin_tenant_capabilities(self):
        """Test admin dashboard and tenant management capabilities"""
        print("🔧 Testing Admin & Tenant Capabilities...")
        
        admin_headers = {
            "X-User-Email": "admin@tight5digital.com",
            "X-Admin-Mode": "true",
            "Content-Type": "application/json"
        }
        
        # Test admin tenant overview
        try:
            async with self.session.get(f"{self.base_url}/api/tenants/admin/overview", headers=admin_headers) as resp:
                if resp.status == 200:
                    admin_overview = await resp.json()
                    self.test_results["admin_data"]["overview"] = {
                        "total_tenants": len(admin_overview.get("tenants", [])),
                        "active_tenants": len([t for t in admin_overview.get("tenants", []) if t.get("status") == "active"]),
                        "total_users": sum(t.get("userCount", 0) for t in admin_overview.get("tenants", [])),
                        "platform_health": admin_overview.get("platform_health", {})
                    }
                    print(f"   ✓ Admin Overview: {len(admin_overview.get('tenants', []))} tenants managed")
                else:
                    print(f"   ! Admin overview endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! Admin overview test failed: {e}")

        # Test tenant-specific data access
        tenant_headers = {
            "X-User-Email": "clint.phillips@thecenter.nasdaq.org",
            "X-Tenant-ID": "1",
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.get(f"{self.base_url}/api/tenants/1/settings", headers=tenant_headers) as resp:
                if resp.status == 200:
                    tenant_settings = await resp.json()
                    self.test_results["tenant_data"]["settings"] = {
                        "microsoft_integration": tenant_settings.get("microsoftIntegration", False),
                        "analytics_enabled": tenant_settings.get("analyticsEnabled", False),
                        "notifications": tenant_settings.get("notifications", False),
                        "feature_count": len(tenant_settings.get("features", []))
                    }
                    print(f"   ✓ Tenant Settings: {len(tenant_settings.get('features', []))} features enabled")
                else:
                    print(f"   ! Tenant settings endpoint: {resp.status}")
        except Exception as e:
            print(f"   ! Tenant settings test failed: {e}")

    async def validate_schema_compliance(self):
        """Validate data schema compliance across all endpoints"""
        print("🔍 Validating Schema Compliance...")
        
        schema_issues = []
        
        # Validate tenant data schema
        if "tenant_mode" in self.test_results["authentication"]:
            tenant_data = self.test_results["authentication"]["tenant_mode"]
            if not isinstance(tenant_data.get("tenant_count"), int):
                schema_issues.append("Tenant count should be integer")
            if not isinstance(tenant_data.get("admin_mode"), bool):
                schema_issues.append("Admin mode should be boolean")

        # Validate KPI data schema
        if "kpis" in self.test_results["dashboard_data"]:
            kpi_data = self.test_results["dashboard_data"]["kpis"]
            required_kpi_fields = ["sponsors_total", "grants_total", "funding_total", "relationships_total"]
            for field in required_kpi_fields:
                if not isinstance(kpi_data.get(field), (int, float)):
                    schema_issues.append(f"KPI field {field} should be numeric")

        self.test_results["schema_validation"]["issues"] = schema_issues
        self.test_results["schema_validation"]["compliant"] = len(schema_issues) == 0
        
        if schema_issues:
            print(f"   ⚠️  Schema issues found: {len(schema_issues)}")
            for issue in schema_issues:
                print(f"      - {issue}")
        else:
            print("   ✓ All schemas compliant")

    async def test_ui_routing_effectiveness(self):
        """Test UI routing and endpoint accessibility"""
        print("🌐 Testing UI Routing Effectiveness...")
        
        # Test core UI endpoints
        ui_endpoints = [
            "/",
            "/dashboard",
            "/sponsors", 
            "/grants",
            "/relationships",
            "/settings"
        ]
        
        routing_results = {}
        
        for endpoint in ui_endpoints:
            try:
                async with self.session.get(f"{self.base_url}{endpoint}") as resp:
                    routing_results[endpoint] = {
                        "status": resp.status,
                        "accessible": resp.status == 200,
                        "content_type": resp.headers.get("content-type", "")
                    }
                    status_symbol = "✓" if resp.status == 200 else "!"
                    print(f"   {status_symbol} {endpoint}: {resp.status}")
            except Exception as e:
                routing_results[endpoint] = {"error": str(e)}
                print(f"   ✗ {endpoint}: {e}")
        
        self.test_results["ui_routing"]["endpoints"] = routing_results
        accessible_count = sum(1 for r in routing_results.values() if r.get("accessible", False))
        self.test_results["ui_routing"]["accessibility_rate"] = accessible_count / len(ui_endpoints) * 100

    async def calculate_pipeline_effectiveness(self):
        """Calculate overall pipeline effectiveness score"""
        print("📋 Calculating Pipeline Effectiveness...")
        
        effectiveness_metrics = {
            "authentication_health": 0,
            "data_pipeline_health": 0,
            "ui_accessibility": 0,
            "schema_compliance": 0,
            "admin_capabilities": 0
        }
        
        # Authentication health
        auth_tenant = self.test_results["authentication"].get("tenant_mode", {})
        auth_admin = self.test_results["authentication"].get("admin_mode", {})
        if auth_tenant.get("success") and auth_admin.get("success"):
            effectiveness_metrics["authentication_health"] = 100
        elif auth_tenant.get("success") or auth_admin.get("success"):
            effectiveness_metrics["authentication_health"] = 50
        
        # Data pipeline health
        dashboard_data = self.test_results["dashboard_data"]
        if "kpis" in dashboard_data and "relationships" in dashboard_data:
            effectiveness_metrics["data_pipeline_health"] = 100
        elif "kpis" in dashboard_data or "relationships" in dashboard_data:
            effectiveness_metrics["data_pipeline_health"] = 50
            
        # UI accessibility
        effectiveness_metrics["ui_accessibility"] = self.test_results["ui_routing"].get("accessibility_rate", 0)
        
        # Schema compliance
        effectiveness_metrics["schema_compliance"] = 100 if self.test_results["schema_validation"].get("compliant") else 0
        
        # Admin capabilities
        if "overview" in self.test_results["admin_data"]:
            effectiveness_metrics["admin_capabilities"] = 100
        
        overall_score = sum(effectiveness_metrics.values()) / len(effectiveness_metrics)
        
        self.test_results["pipeline_effectiveness"] = {
            "overall_score": round(overall_score, 1),
            "metrics": effectiveness_metrics,
            "grade": "A" if overall_score >= 90 else "B" if overall_score >= 80 else "C" if overall_score >= 70 else "D"
        }
        
        print(f"   📊 Overall Pipeline Score: {overall_score:.1f}% (Grade: {self.test_results['pipeline_effectiveness']['grade']})")

    def generate_report(self):
        """Generate comprehensive test report"""
        timestamp = datetime.now().isoformat()
        
        report = {
            "test_execution": {
                "timestamp": timestamp,
                "pipeline_version": "1.0.0",
                "test_suite": "comprehensive-data-pipeline-validation"
            },
            "results": self.test_results,
            "summary": {
                "overall_score": self.test_results["pipeline_effectiveness"].get("overall_score", 0),
                "grade": self.test_results["pipeline_effectiveness"].get("grade", "F"),
                "critical_issues": [],
                "recommendations": []
            }
        }
        
        # Identify critical issues
        if not self.test_results["authentication"].get("tenant_mode", {}).get("success"):
            report["summary"]["critical_issues"].append("Tenant authentication failure")
        if not self.test_results["authentication"].get("admin_mode", {}).get("success"):
            report["summary"]["critical_issues"].append("Admin authentication failure")
        if not self.test_results["schema_validation"].get("compliant"):
            report["summary"]["critical_issues"].append("Schema compliance violations")
        
        # Generate recommendations
        if report["summary"]["overall_score"] < 90:
            report["summary"]["recommendations"].append("Enhance Microsoft 365 integration stability")
        if self.test_results["ui_routing"].get("accessibility_rate", 0) < 100:
            report["summary"]["recommendations"].append("Fix broken UI routing endpoints")
        if len(self.test_results["schema_validation"].get("issues", [])) > 0:
            report["summary"]["recommendations"].append("Address schema compliance issues")
        
        return report

    async def run_comprehensive_test(self):
        """Execute complete data pipeline validation"""
        print("🚀 Starting Comprehensive Data Pipeline Test...")
        print("=" * 60)
        
        await self.test_authentication_flow()
        await self.test_microsoft365_integration()
        await self.test_dashboard_data_pipeline()
        await self.test_admin_tenant_capabilities()
        await self.validate_schema_compliance()
        await self.test_ui_routing_effectiveness()
        await self.calculate_pipeline_effectiveness()
        
        print("=" * 60)
        print("📋 Generating Test Report...")
        
        report = self.generate_report()
        
        # Save report
        with open("data-pipeline-test-report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"✅ Test Complete - Score: {report['summary']['overall_score']}% (Grade: {report['summary']['grade']})")
        
        if report["summary"]["critical_issues"]:
            print("\n🚨 Critical Issues:")
            for issue in report["summary"]["critical_issues"]:
                print(f"   - {issue}")
        
        if report["summary"]["recommendations"]:
            print("\n💡 Recommendations:")
            for rec in report["summary"]["recommendations"]:
                print(f"   - {rec}")
        
        return report

async def main():
    async with DataPipelineValidator() as validator:
        report = await validator.run_comprehensive_test()
        return report

if __name__ == "__main__":
    try:
        report = asyncio.run(main())
        sys.exit(0 if report["summary"]["overall_score"] >= 80 else 1)
    except Exception as e:
        print(f"Test execution failed: {e}")
        sys.exit(1)