"""
Enhanced Microsoft 365 Integration Agent
Production-ready organizational data extraction with stable pipeline
"""
import os
import json
import logging
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from utils.resource_monitor import ResourceMonitor

logger = logging.getLogger("zero-gate.microsoft365")

class Microsoft365IntegrationAgent:
    def __init__(self, resource_monitor: ResourceMonitor):
        self.resource_monitor = resource_monitor
        self.client_id = os.getenv('MICROSOFT_CLIENT_ID')
        self.client_secret = os.getenv('MICROSOFT_CLIENT_SECRET')
        self.tenant_id = os.getenv('MICROSOFT_TENANT_ID')
        self.access_token = None
        self.token_expires_at = None
        self.graph_base_url = 'https://graph.microsoft.com/v1.0'
        self.graph_beta_url = 'https://graph.microsoft.com/beta'
        logger.info("Microsoft 365 Integration Agent initialized")

    async def authenticate(self) -> bool:
        """Authenticate with Microsoft Graph using client credentials flow"""
        try:
            if not all([self.client_id, self.client_secret, self.tenant_id]):
                logger.error("Missing Microsoft 365 credentials")
                return False

            token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
            
            data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'https://graph.microsoft.com/.default',
                'grant_type': 'client_credentials'
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(token_url, data=data) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        self.access_token = token_data['access_token']
                        self.token_expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'] - 300)
                        logger.info("Microsoft 365 authentication successful")
                        return True
                    else:
                        error_data = await response.json()
                        logger.error(f"Authentication failed: {error_data}")
                        return False

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return False

    async def _ensure_authenticated(self) -> bool:
        """Ensure we have a valid access token"""
        if not self.access_token or not self.token_expires_at or datetime.now() >= self.token_expires_at:
            return await self.authenticate()
        return True

    async def _make_graph_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make authenticated request to Microsoft Graph API"""
        if not await self._ensure_authenticated():
            return {"success": False, "error": "Authentication failed"}

        try:
            url = f"{self.graph_base_url}{endpoint}"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    data = await response.json()
                    
                    if response.status == 200:
                        return {"success": True, "data": data}
                    else:
                        logger.warning(f"Graph API request failed: {response.status} - {data}")
                        return {"success": False, "error": data, "status": response.status}

        except Exception as e:
            logger.error(f"Graph API request error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def extract_organizational_data(self, tenant_id: str) -> Dict[str, Any]:
        """Extract comprehensive organizational relationships and structure"""
        try:
            logger.info(f"Extracting organizational data for tenant: {tenant_id}")
            
            # Parallel requests for organizational data
            tasks = [
                self._make_graph_request('/users', {
                    '$select': 'id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,manager',
                    '$expand': 'manager($select=displayName,mail,jobTitle)',
                    '$top': '100'
                }),
                self._make_graph_request('/groups', {
                    '$select': 'id,displayName,description,groupTypes,mail,members',
                    '$expand': 'members($select=displayName,mail)',
                    '$top': '50'
                }),
                self._make_graph_request('/organization', {
                    '$select': 'id,displayName,verifiedDomains,businessPhones,city,country'
                })
            ]

            users_result, groups_result, org_result = await asyncio.gather(*tasks)

            # Process organizational structure
            organizational_data = {
                "users": [],
                "groups": [],
                "organization": {},
                "relationships": [],
                "departments": {},
                "locations": {},
                "hierarchy_mapping": {},
                "extraction_timestamp": datetime.now().isoformat()
            }

            # Process users data
            if users_result["success"] and "value" in users_result["data"]:
                users = users_result["data"]["value"]
                organizational_data["users"] = users
                
                # Analyze departments and locations
                for user in users:
                    if user.get("department"):
                        dept = user["department"]
                        organizational_data["departments"][dept] = organizational_data["departments"].get(dept, 0) + 1
                    
                    if user.get("officeLocation"):
                        location = user["officeLocation"]
                        organizational_data["locations"][location] = organizational_data["locations"].get(location, 0) + 1
                    
                    # Map hierarchical relationships
                    if user.get("manager"):
                        organizational_data["hierarchy_mapping"][user["id"]] = {
                            "employee": user["displayName"],
                            "employee_email": user.get("mail"),
                            "manager": user["manager"]["displayName"],
                            "manager_email": user["manager"].get("mail"),
                            "department": user.get("department"),
                            "job_title": user.get("jobTitle")
                        }

            # Process groups data
            if groups_result["success"] and "value" in groups_result["data"]:
                organizational_data["groups"] = groups_result["data"]["value"]

            # Process organization data
            if org_result["success"] and "value" in org_result["data"]:
                organizational_data["organization"] = org_result["data"]["value"][0] if org_result["data"]["value"] else {}

            # Generate relationship insights
            organizational_data["insights"] = {
                "total_users": len(organizational_data["users"]),
                "total_groups": len(organizational_data["groups"]),
                "department_count": len(organizational_data["departments"]),
                "location_count": len(organizational_data["locations"]),
                "hierarchy_relationships": len(organizational_data["hierarchy_mapping"]),
                "largest_department": max(organizational_data["departments"].items(), key=lambda x: x[1])[0] if organizational_data["departments"] else None,
                "management_layers": self._calculate_management_layers(organizational_data["hierarchy_mapping"])
            }

            logger.info(f"Organizational data extraction completed: {organizational_data['insights']['total_users']} users, {organizational_data['insights']['total_groups']} groups")
            return organizational_data

        except Exception as e:
            logger.error(f"Organizational data extraction error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "extraction_timestamp": datetime.now().isoformat()
            }

    def _calculate_management_layers(self, hierarchy_mapping: Dict) -> int:
        """Calculate the number of management layers in the organization"""
        # Simple calculation based on manager-employee relationships
        managers = set()
        employees = set()
        
        for relationship in hierarchy_mapping.values():
            managers.add(relationship.get("manager"))
            employees.add(relationship.get("employee"))
        
        # Rough estimate of management layers
        return len(managers.intersection(employees)) + 1

    async def analyze_communication_patterns(self, user_id: str, tenant_id: str) -> Dict[str, Any]:
        """Analyze email and communication patterns for relationship strength"""
        try:
            logger.info(f"Analyzing communication patterns for user: {user_id}")
            
            # Get user's mail and calendar data
            tasks = [
                self._make_graph_request(f'/users/{user_id}/messages', {
                    '$select': 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,importance',
                    '$top': '100',
                    '$orderby': 'receivedDateTime desc'
                }),
                self._make_graph_request(f'/users/{user_id}/events', {
                    '$select': 'id,subject,organizer,attendees,start,end,importance',
                    '$top': '50',
                    '$orderby': 'start/dateTime desc'
                }),
                self._make_graph_request(f'/users/{user_id}/people', {
                    '$top': '50'
                })
            ]

            messages_result, events_result, people_result = await asyncio.gather(*tasks)

            communication_analysis = {
                "user_id": user_id,
                "tenant_id": tenant_id,
                "email_patterns": {},
                "meeting_patterns": {},
                "top_collaborators": [],
                "communication_frequency": {},
                "relationship_strength_scores": {},
                "analysis_timestamp": datetime.now().isoformat()
            }

            # Analyze email patterns
            if messages_result["success"] and "value" in messages_result["data"]:
                messages = messages_result["data"]["value"]
                email_contacts = {}
                
                for message in messages:
                    # Count interactions with each contact
                    if message.get("from") and message["from"].get("emailAddress"):
                        sender = message["from"]["emailAddress"]["address"]
                        email_contacts[sender] = email_contacts.get(sender, 0) + 1
                    
                    # Count recipients
                    for recipient in message.get("toRecipients", []):
                        if recipient.get("emailAddress"):
                            addr = recipient["emailAddress"]["address"]
                            email_contacts[addr] = email_contacts.get(addr, 0) + 1

                communication_analysis["email_patterns"] = {
                    "total_messages": len(messages),
                    "unique_contacts": len(email_contacts),
                    "top_contacts": sorted(email_contacts.items(), key=lambda x: x[1], reverse=True)[:10]
                }

            # Analyze meeting patterns
            if events_result["success"] and "value" in events_result["data"]:
                events = events_result["data"]["value"]
                meeting_contacts = {}
                
                for event in events:
                    for attendee in event.get("attendees", []):
                        if attendee.get("emailAddress"):
                            addr = attendee["emailAddress"]["address"]
                            meeting_contacts[addr] = meeting_contacts.get(addr, 0) + 1

                communication_analysis["meeting_patterns"] = {
                    "total_meetings": len(events),
                    "unique_attendees": len(meeting_contacts),
                    "top_meeting_contacts": sorted(meeting_contacts.items(), key=lambda x: x[1], reverse=True)[:10]
                }

            # Generate relationship strength scores
            all_contacts = {}
            if communication_analysis["email_patterns"]:
                for contact, count in communication_analysis["email_patterns"]["top_contacts"]:
                    all_contacts[contact] = all_contacts.get(contact, 0) + count

            if communication_analysis["meeting_patterns"]:
                for contact, count in communication_analysis["meeting_patterns"]["top_meeting_contacts"]:
                    all_contacts[contact] = all_contacts.get(contact, 0) + count * 2  # Weight meetings higher

            # Calculate relationship strength scores (0-100)
            max_interactions = max(all_contacts.values()) if all_contacts else 1
            for contact, interactions in all_contacts.items():
                score = min(100, (interactions / max_interactions) * 100)
                communication_analysis["relationship_strength_scores"][contact] = round(score, 2)

            communication_analysis["top_collaborators"] = sorted(
                communication_analysis["relationship_strength_scores"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:15]

            logger.info(f"Communication analysis completed for user {user_id}: {len(all_contacts)} contacts analyzed")
            return communication_analysis

        except Exception as e:
            logger.error(f"Communication analysis error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "user_id": user_id,
                "tenant_id": tenant_id,
                "analysis_timestamp": datetime.now().isoformat()
            }

    async def process_excel_dashboard_data(self, file_path: str, tenant_id: str) -> Dict[str, Any]:
        """Process Excel files from OneDrive/SharePoint for dashboard insights"""
        try:
            logger.info(f"Processing Excel dashboard data from: {file_path}")
            
            # Get files from user's OneDrive
            files_result = await self._make_graph_request('/me/drive/root/children', {
                '$filter': "endswith(name,'.xlsx') or endswith(name,'.xls')",
                '$select': 'id,name,size,lastModifiedDateTime,webUrl'
            })

            dashboard_data = {
                "file_path": file_path,
                "tenant_id": tenant_id,
                "excel_files": [],
                "kpi_data": {},
                "sponsor_records": [],
                "grant_records": [],
                "processing_status": "completed",
                "processing_timestamp": datetime.now().isoformat()
            }

            if files_result["success"] and "value" in files_result["data"]:
                excel_files = files_result["data"]["value"]
                dashboard_data["excel_files"] = excel_files
                
                # Process first few Excel files for analysis
                for file_info in excel_files[:5]:  # Limit to first 5 files
                    try:
                        # Get workbook information
                        workbook_result = await self._make_graph_request(f'/me/drive/items/{file_info["id"]}/workbook/worksheets')
                        
                        if workbook_result["success"] and "value" in workbook_result["data"]:
                            worksheets = workbook_result["data"]["value"]
                            
                            for worksheet in worksheets:
                                worksheet_name = worksheet["name"].lower()
                                
                                # Identify potential KPI sheets
                                if any(keyword in worksheet_name for keyword in ["kpi", "dashboard", "metrics", "summary"]):
                                    dashboard_data["kpi_data"][file_info["name"]] = {
                                        "worksheet": worksheet["name"],
                                        "file_id": file_info["id"],
                                        "last_modified": file_info["lastModifiedDateTime"]
                                    }
                                
                                # Identify sponsor data sheets
                                elif any(keyword in worksheet_name for keyword in ["sponsor", "donor", "partner"]):
                                    dashboard_data["sponsor_records"].append({
                                        "file_name": file_info["name"],
                                        "worksheet": worksheet["name"],
                                        "file_id": file_info["id"],
                                        "source": "excel_analysis"
                                    })
                                
                                # Identify grant data sheets
                                elif any(keyword in worksheet_name for keyword in ["grant", "funding", "award"]):
                                    dashboard_data["grant_records"].append({
                                        "file_name": file_info["name"],
                                        "worksheet": worksheet["name"],
                                        "file_id": file_info["id"],
                                        "source": "excel_analysis"
                                    })
                    
                    except Exception as e:
                        logger.warning(f"Error processing Excel file {file_info['name']}: {str(e)}")
                        continue

            dashboard_data["insights"] = {
                "total_excel_files": len(dashboard_data["excel_files"]),
                "kpi_sources": len(dashboard_data["kpi_data"]),
                "sponsor_data_sources": len(dashboard_data["sponsor_records"]),
                "grant_data_sources": len(dashboard_data["grant_records"])
            }

            logger.info(f"Excel dashboard processing completed: {dashboard_data['insights']['total_excel_files']} files analyzed")
            return dashboard_data

        except Exception as e:
            logger.error(f"Excel processing error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_path": file_path,
                "tenant_id": tenant_id,
                "processing_status": "failed",
                "processing_timestamp": datetime.now().isoformat()
            }

    async def get_integration_health(self) -> Dict[str, Any]:
        """Get comprehensive health status of Microsoft 365 integration"""
        try:
            health_status = {
                "authentication": {"status": "unknown", "details": {}},
                "api_connectivity": {"status": "unknown", "details": {}},
                "permissions": {"status": "unknown", "details": {}},
                "data_pipeline": {"status": "unknown", "details": {}},
                "timestamp": datetime.now().isoformat()
            }

            # Test authentication
            auth_success = await self.authenticate()
            health_status["authentication"] = {
                "status": "healthy" if auth_success else "unhealthy",
                "details": {
                    "credentials_configured": bool(self.client_id and self.client_secret and self.tenant_id),
                    "token_obtained": bool(self.access_token),
                    "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None
                }
            }

            if auth_success:
                # Test API connectivity
                org_result = await self._make_graph_request('/organization')
                health_status["api_connectivity"] = {
                    "status": "healthy" if org_result["success"] else "unhealthy",
                    "details": {
                        "graph_api_reachable": org_result["success"],
                        "response_time_ms": 200  # Placeholder - could implement actual timing
                    }
                }

                # Test key permissions
                permission_tests = [
                    ("users", "/users?$top=1"),
                    ("groups", "/groups?$top=1"),
                    ("organization", "/organization"),
                    ("applications", "/applications?$top=1")
                ]

                permission_results = {}
                for perm_name, endpoint in permission_tests:
                    result = await self._make_graph_request(endpoint)
                    permission_results[perm_name] = result["success"]

                health_status["permissions"] = {
                    "status": "healthy" if all(permission_results.values()) else "degraded",
                    "details": permission_results
                }

                # Test data pipeline
                try:
                    test_org_data = await self.extract_organizational_data("health-check")
                    pipeline_healthy = "users" in test_org_data and len(test_org_data.get("users", [])) > 0
                    
                    health_status["data_pipeline"] = {
                        "status": "healthy" if pipeline_healthy else "degraded",
                        "details": {
                            "can_extract_users": pipeline_healthy,
                            "last_extraction_success": pipeline_healthy
                        }
                    }
                except Exception as e:
                    health_status["data_pipeline"] = {
                        "status": "unhealthy",
                        "details": {"error": str(e)}
                    }

            # Overall health assessment
            statuses = [health_status[component]["status"] for component in ["authentication", "api_connectivity", "permissions", "data_pipeline"]]
            if all(status == "healthy" for status in statuses):
                overall_status = "healthy"
            elif any(status == "unhealthy" for status in statuses):
                overall_status = "unhealthy"
            else:
                overall_status = "degraded"

            health_status["overall_status"] = overall_status
            
            return health_status

        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            return {
                "overall_status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }