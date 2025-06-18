"""
IntegrationAgent: Microsoft Graph integration with MSAL authentication
Handles organizational data extraction, email pattern analysis, and Excel processing
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
import requests
from collections import defaultdict, Counter
import re
import msal
import pandas as pd
import openpyxl
from io import BytesIO
import base64
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MSGraphConfig:
    client_id: str
    client_secret: str
    tenant_id: str
    authority: str
    scopes: List[str]

@dataclass
class OrganizationUser:
    id: str
    display_name: str
    email: str
    job_title: str
    department: str
    manager_id: Optional[str]
    direct_reports: List[str]
    office_location: str
    tenant_context: str

@dataclass
class EmailCommunication:
    sender: str
    recipient: str
    subject: str
    timestamp: datetime
    message_id: str
    conversation_id: str
    importance: str
    categories: List[str]
    tenant_context: str

@dataclass
class CommunicationPattern:
    user_pair: Tuple[str, str]
    email_count: int
    frequency_score: float
    last_communication: datetime
    communication_strength: float
    topics: List[str]
    relationship_type: str
    tenant_context: str

@dataclass
class ExcelDataInsight:
    source_file: str
    sheet_name: str
    total_rows: int
    data_summary: Dict[str, Any]
    key_metrics: Dict[str, float]
    processed_at: datetime
    tenant_context: str

@dataclass
class OrganizationalRelationship:
    source_user_id: str
    target_user_id: str
    relationship_type: str  # 'manager', 'direct_report', 'peer', 'frequent_collaborator'
    strength: float
    context: str
    discovered_through: str  # 'org_chart', 'email_patterns', 'shared_projects'
    tenant_context: str

class IntegrationAgent:
    """
    Microsoft Graph integration agent for organizational data extraction
    and communication pattern analysis with MSAL authentication
    """
    
    def __init__(self, config: MSGraphConfig, tenant_id: str):
        self.config = config
        self.tenant_id = tenant_id
        self.access_token = None
        self.token_expires_at = None
        self.app = None
        
        # Cache for organizational data
        self.user_cache = {}
        self.relationship_cache = {}
        self.communication_cache = {}
        
        # Performance settings
        self.batch_size = 50
        self.max_retries = 3
        self.rate_limit_delay = 1.0
        
        # Initialize MSAL application
        self._initialize_msal()
        
        logger.info(f"IntegrationAgent initialized for tenant {tenant_id}")
    
    def _initialize_msal(self) -> None:
        """Initialize MSAL application for authentication"""
        try:
            self.app = msal.ConfidentialClientApplication(
                client_id=self.config.client_id,
                client_credential=self.config.client_secret,
                authority=self.config.authority
            )
            logger.info("MSAL application initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MSAL application: {e}")
            raise
    
    async def authenticate(self) -> bool:
        """Authenticate with Microsoft Graph using client credentials flow"""
        try:
            # Use client credentials flow for app-only access
            result = self.app.acquire_token_for_client(scopes=self.config.scopes)
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                # Calculate expiration time (typically 3600 seconds)
                expires_in = result.get("expires_in", 3600)
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 300)  # 5min buffer
                
                logger.info("Successfully authenticated with Microsoft Graph")
                return True
            else:
                error = result.get("error_description", "Unknown authentication error")
                logger.error(f"Authentication failed: {error}")
                return False
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False
    
    async def _ensure_valid_token(self) -> bool:
        """Ensure we have a valid access token"""
        if not self.access_token or (self.token_expires_at and datetime.now() >= self.token_expires_at):
            return await self.authenticate()
        return True
    
    async def _make_graph_request(self, endpoint: str, method: str = "GET", data: Dict = None) -> Optional[Dict]:
        """Make authenticated request to Microsoft Graph API"""
        if not await self._ensure_valid_token():
            return None
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        for attempt in range(self.max_retries):
            try:
                if method == "GET":
                    response = requests.get(url, headers=headers)
                elif method == "POST":
                    response = requests.post(url, headers=headers, json=data)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:  # Rate limited
                    retry_after = int(response.headers.get("Retry-After", self.rate_limit_delay))
                    logger.warning(f"Rate limited, waiting {retry_after} seconds")
                    await asyncio.sleep(retry_after)
                    continue
                elif response.status_code == 401:  # Token expired
                    if await self.authenticate():
                        headers["Authorization"] = f"Bearer {self.access_token}"
                        continue
                    else:
                        logger.error("Failed to refresh authentication token")
                        return None
                else:
                    logger.error(f"Graph API request failed: {response.status_code} - {response.text}")
                    return None
                    
            except Exception as e:
                logger.error(f"Request error (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.rate_limit_delay * (attempt + 1))
                
        return None
    
    async def extract_organizational_users(self) -> List[OrganizationUser]:
        """Extract all users from the organization"""
        try:
            users = []
            next_link = "/users?$select=id,displayName,mail,jobTitle,department,manager,directReports,officeLocation&$top=999"
            
            while next_link:
                response = await self._make_graph_request(next_link)
                if not response:
                    break
                
                for user_data in response.get("value", []):
                    # Get manager information
                    manager_id = None
                    if user_data.get("manager"):
                        manager_response = await self._make_graph_request(f"/users/{user_data['id']}/manager")
                        if manager_response:
                            manager_id = manager_response.get("id")
                    
                    # Get direct reports
                    direct_reports = []
                    reports_response = await self._make_graph_request(f"/users/{user_data['id']}/directReports")
                    if reports_response:
                        direct_reports = [report.get("id") for report in reports_response.get("value", [])]
                    
                    user = OrganizationUser(
                        id=user_data.get("id", ""),
                        display_name=user_data.get("displayName", ""),
                        email=user_data.get("mail", ""),
                        job_title=user_data.get("jobTitle", ""),
                        department=user_data.get("department", ""),
                        manager_id=manager_id,
                        direct_reports=direct_reports,
                        office_location=user_data.get("officeLocation", ""),
                        tenant_context=self.tenant_id
                    )
                    
                    users.append(user)
                    self.user_cache[user.id] = user
                
                # Check for pagination
                next_link = response.get("@odata.nextLink")
                if next_link:
                    # Extract the endpoint from the full URL
                    next_link = next_link.replace("https://graph.microsoft.com/v1.0", "")
                
                # Rate limiting
                await asyncio.sleep(0.1)
            
            logger.info(f"Extracted {len(users)} organizational users")
            return users
            
        except Exception as e:
            logger.error(f"Error extracting organizational users: {e}")
            return []
    
    async def analyze_email_communication_patterns(self, days_back: int = 30) -> List[CommunicationPattern]:
        """Analyze email communication patterns for relationship strength"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            communication_data = defaultdict(list)
            patterns = []
            
            # Get messages for analysis (limited scope due to permissions)
            users = list(self.user_cache.values())[:10]  # Limit for testing
            
            for user in users:
                if not user.email:
                    continue
                
                # Get user's sent emails
                filter_query = f"sentDateTime ge {start_date.isoformat()}"
                endpoint = f"/users/{user.id}/mailFolders/sentitems/messages?$filter={filter_query}&$select=id,subject,sentDateTime,toRecipients,importance,categories,conversationId&$top=100"
                
                response = await self._make_graph_request(endpoint)
                if not response:
                    continue
                
                for message in response.get("value", []):
                    recipients = message.get("toRecipients", [])
                    for recipient in recipients:
                        recipient_email = recipient.get("emailAddress", {}).get("address", "")
                        if recipient_email and recipient_email != user.email:
                            
                            communication = EmailCommunication(
                                sender=user.email,
                                recipient=recipient_email,
                                subject=message.get("subject", ""),
                                timestamp=datetime.fromisoformat(message.get("sentDateTime", "").replace("Z", "+00:00")),
                                message_id=message.get("id", ""),
                                conversation_id=message.get("conversationId", ""),
                                importance=message.get("importance", "normal"),
                                categories=message.get("categories", []),
                                tenant_context=self.tenant_id
                            )
                            
                            user_pair = tuple(sorted([user.email, recipient_email]))
                            communication_data[user_pair].append(communication)
                
                # Rate limiting
                await asyncio.sleep(0.2)
            
            # Analyze communication patterns
            for user_pair, communications in communication_data.items():
                if len(communications) < 2:  # Skip single communications
                    continue
                
                # Calculate metrics
                email_count = len(communications)
                
                # Calculate frequency score (emails per day)
                time_span = (end_date - start_date).days
                frequency_score = email_count / max(time_span, 1)
                
                # Get last communication
                last_communication = max(comm.timestamp for comm in communications)
                
                # Calculate communication strength based on frequency and recency
                recency_factor = max(0.1, 1.0 - (end_date - last_communication).days / days_back)
                communication_strength = min(1.0, frequency_score * recency_factor * 0.1)
                
                # Extract topics from subjects
                topics = self._extract_topics([comm.subject for comm in communications])
                
                # Determine relationship type
                relationship_type = self._determine_relationship_type(communications, frequency_score)
                
                pattern = CommunicationPattern(
                    user_pair=user_pair,
                    email_count=email_count,
                    frequency_score=frequency_score,
                    last_communication=last_communication,
                    communication_strength=communication_strength,
                    topics=topics,
                    relationship_type=relationship_type,
                    tenant_context=self.tenant_id
                )
                
                patterns.append(pattern)
                self.communication_cache[user_pair] = pattern
            
            logger.info(f"Analyzed {len(patterns)} communication patterns")
            return patterns
            
        except Exception as e:
            logger.error(f"Error analyzing email communication patterns: {e}")
            return []
    
    def _extract_topics(self, subjects: List[str]) -> List[str]:
        """Extract common topics from email subjects"""
        # Remove common email prefixes and clean subjects
        cleaned_subjects = []
        for subject in subjects:
            cleaned = re.sub(r'^(RE:|FW:|FWD:)\s*', '', subject, flags=re.IGNORECASE)
            cleaned = cleaned.strip()
            if cleaned:
                cleaned_subjects.append(cleaned.lower())
        
        # Extract common words (simple topic extraction)
        word_counts = Counter()
        for subject in cleaned_subjects:
            words = re.findall(r'\b\w{3,}\b', subject)  # Words with 3+ characters
            word_counts.update(words)
        
        # Return top topics, excluding common words
        common_words = {'meeting', 'call', 'update', 'follow', 'team', 'project', 'please', 'thanks'}
        topics = [word for word, count in word_counts.most_common(5) if word not in common_words and count > 1]
        
        return topics[:3]  # Return top 3 topics
    
    def _determine_relationship_type(self, communications: List[EmailCommunication], frequency_score: float) -> str:
        """Determine relationship type based on communication patterns"""
        if frequency_score > 1.0:  # More than 1 email per day on average
            return "frequent_collaborator"
        elif frequency_score > 0.3:  # More than 2 emails per week
            return "regular_collaborator"
        elif frequency_score > 0.1:  # More than 3 emails per month
            return "occasional_collaborator"
        else:
            return "infrequent_contact"
    
    async def extract_organizational_relationships(self) -> List[OrganizationalRelationship]:
        """Extract organizational relationships from org chart and communication patterns"""
        try:
            relationships = []
            
            # Extract hierarchical relationships from org chart
            for user in self.user_cache.values():
                # Manager relationship
                if user.manager_id:
                    relationship = OrganizationalRelationship(
                        source_user_id=user.id,
                        target_user_id=user.manager_id,
                        relationship_type="manager",
                        strength=0.8,  # Strong hierarchical relationship
                        context=f"{user.display_name} reports to manager",
                        discovered_through="org_chart",
                        tenant_context=self.tenant_id
                    )
                    relationships.append(relationship)
                
                # Direct report relationships
                for report_id in user.direct_reports:
                    relationship = OrganizationalRelationship(
                        source_user_id=user.id,
                        target_user_id=report_id,
                        relationship_type="direct_report",
                        strength=0.7,  # Strong management relationship
                        context=f"{user.display_name} manages direct report",
                        discovered_through="org_chart",
                        tenant_context=self.tenant_id
                    )
                    relationships.append(relationship)
            
            # Add peer relationships based on department
            department_users = defaultdict(list)
            for user in self.user_cache.values():
                if user.department:
                    department_users[user.department].append(user)
            
            for department, users in department_users.items():
                if len(users) > 1:
                    for i, user1 in enumerate(users):
                        for user2 in users[i+1:]:
                            # Skip if already related through hierarchy
                            if user1.manager_id == user2.id or user2.manager_id == user1.id:
                                continue
                            
                            relationship = OrganizationalRelationship(
                                source_user_id=user1.id,
                                target_user_id=user2.id,
                                relationship_type="peer",
                                strength=0.3,  # Moderate peer relationship
                                context=f"Department colleagues in {department}",
                                discovered_through="org_chart",
                                tenant_context=self.tenant_id
                            )
                            relationships.append(relationship)
            
            # Enhance with communication-based relationships
            communication_patterns = list(self.communication_cache.values())
            for pattern in communication_patterns:
                # Find user IDs from emails
                user1_id = self._get_user_id_by_email(pattern.user_pair[0])
                user2_id = self._get_user_id_by_email(pattern.user_pair[1])
                
                if user1_id and user2_id:
                    relationship = OrganizationalRelationship(
                        source_user_id=user1_id,
                        target_user_id=user2_id,
                        relationship_type=pattern.relationship_type,
                        strength=pattern.communication_strength,
                        context=f"Communication pattern: {', '.join(pattern.topics)}",
                        discovered_through="email_patterns",
                        tenant_context=self.tenant_id
                    )
                    relationships.append(relationship)
            
            logger.info(f"Extracted {len(relationships)} organizational relationships")
            return relationships
            
        except Exception as e:
            logger.error(f"Error extracting organizational relationships: {e}")
            return []
    
    def _get_user_id_by_email(self, email: str) -> Optional[str]:
        """Get user ID by email address"""
        for user in self.user_cache.values():
            if user.email == email:
                return user.id
        return None
    
    async def process_excel_file(self, file_content: bytes, filename: str) -> ExcelDataInsight:
        """Process Excel file and extract insights for dashboard data"""
        try:
            # Load Excel file
            excel_file = BytesIO(file_content)
            
            # Try to read with pandas first
            try:
                # Read all sheets
                excel_data = pd.read_excel(excel_file, sheet_name=None, engine='openpyxl')
            except Exception:
                # Fallback to openpyxl
                workbook = openpyxl.load_workbook(excel_file)
                excel_data = {}
                for sheet_name in workbook.sheetnames:
                    sheet = workbook[sheet_name]
                    data = []
                    for row in sheet.iter_rows(values_only=True):
                        data.append(row)
                    if data:
                        excel_data[sheet_name] = pd.DataFrame(data[1:], columns=data[0])
            
            # Process each sheet and combine insights
            all_insights = []
            
            for sheet_name, df in excel_data.items():
                if df.empty:
                    continue
                
                # Basic data summary
                data_summary = {
                    "columns": list(df.columns),
                    "data_types": df.dtypes.to_dict() if hasattr(df, 'dtypes') else {},
                    "null_counts": df.isnull().sum().to_dict() if hasattr(df, 'isnull') else {},
                    "shape": df.shape if hasattr(df, 'shape') else (0, 0)
                }
                
                # Extract key metrics
                key_metrics = self._extract_excel_metrics(df, sheet_name)
                
                insight = ExcelDataInsight(
                    source_file=filename,
                    sheet_name=sheet_name,
                    total_rows=len(df) if hasattr(df, '__len__') else 0,
                    data_summary=data_summary,
                    key_metrics=key_metrics,
                    processed_at=datetime.now(),
                    tenant_context=self.tenant_id
                )
                
                all_insights.append(insight)
            
            # Return the most significant sheet or first sheet
            primary_insight = max(all_insights, key=lambda x: x.total_rows) if all_insights else ExcelDataInsight(
                source_file=filename,
                sheet_name="Empty",
                total_rows=0,
                data_summary={},
                key_metrics={},
                processed_at=datetime.now(),
                tenant_context=self.tenant_id
            )
            
            logger.info(f"Processed Excel file {filename} with {len(all_insights)} sheets")
            return primary_insight
            
        except Exception as e:
            logger.error(f"Error processing Excel file {filename}: {e}")
            return ExcelDataInsight(
                source_file=filename,
                sheet_name="Error",
                total_rows=0,
                data_summary={"error": str(e)},
                key_metrics={},
                processed_at=datetime.now(),
                tenant_context=self.tenant_id
            )
    
    def _extract_excel_metrics(self, df: pd.DataFrame, sheet_name: str) -> Dict[str, float]:
        """Extract key metrics from Excel data"""
        metrics = {}
        
        try:
            # Identify numeric columns
            numeric_columns = df.select_dtypes(include=['number']).columns if hasattr(df, 'select_dtypes') else []
            
            # Calculate basic statistics for numeric columns
            for col in numeric_columns:
                if col in df.columns:
                    series = df[col].dropna()
                    if len(series) > 0:
                        metrics[f"{col}_mean"] = float(series.mean()) if hasattr(series, 'mean') else 0.0
                        metrics[f"{col}_sum"] = float(series.sum()) if hasattr(series, 'sum') else 0.0
                        metrics[f"{col}_max"] = float(series.max()) if hasattr(series, 'max') else 0.0
                        metrics[f"{col}_min"] = float(series.min()) if hasattr(series, 'min') else 0.0
            
            # Identify potential key business metrics based on column names
            key_patterns = {
                'revenue': r'revenue|sales|income',
                'cost': r'cost|expense|spend',
                'quantity': r'quantity|count|number|amount',
                'date': r'date|time|created|updated'
            }
            
            for metric_type, pattern in key_patterns.items():
                matching_cols = [col for col in df.columns if re.search(pattern, str(col).lower())]
                for col in matching_cols:
                    if col in numeric_columns:
                        series = df[col].dropna()
                        if len(series) > 0:
                            metrics[f"total_{metric_type}"] = float(series.sum())
                            metrics[f"avg_{metric_type}"] = float(series.mean())
            
            # Calculate completion rate (non-null percentage)
            for col in df.columns:
                non_null_count = len(df[col].dropna()) if hasattr(df[col], 'dropna') else 0
                total_count = len(df) if hasattr(df, '__len__') else 0
                if total_count > 0:
                    metrics[f"{col}_completion_rate"] = non_null_count / total_count
            
        except Exception as e:
            logger.warning(f"Error extracting metrics from Excel sheet {sheet_name}: {e}")
            metrics["extraction_error"] = 1.0
        
        return metrics
    
    async def get_integration_summary(self) -> Dict[str, Any]:
        """Get comprehensive integration summary"""
        try:
            summary = {
                "tenant_id": self.tenant_id,
                "last_updated": datetime.now().isoformat(),
                "authentication_status": "authenticated" if self.access_token else "not_authenticated",
                "users_cached": len(self.user_cache),
                "relationships_cached": len(self.relationship_cache),
                "communication_patterns": len(self.communication_cache),
                "capabilities": {
                    "user_extraction": True,
                    "email_analysis": True,
                    "relationship_mapping": True,
                    "excel_processing": True
                }
            }
            
            # Add user distribution by department
            if self.user_cache:
                department_counts = defaultdict(int)
                for user in self.user_cache.values():
                    dept = user.department or "Unknown"
                    department_counts[dept] += 1
                summary["department_distribution"] = dict(department_counts)
            
            # Add communication statistics
            if self.communication_cache:
                patterns = list(self.communication_cache.values())
                summary["communication_stats"] = {
                    "total_patterns": len(patterns),
                    "avg_frequency": sum(p.frequency_score for p in patterns) / len(patterns),
                    "avg_strength": sum(p.communication_strength for p in patterns) / len(patterns),
                    "relationship_types": Counter(p.relationship_type for p in patterns)
                }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating integration summary: {e}")
            return {"error": str(e)}
    
    async def cleanup(self) -> None:
        """Clean up resources and cache"""
        try:
            self.user_cache.clear()
            self.relationship_cache.clear()
            self.communication_cache.clear()
            self.access_token = None
            self.token_expires_at = None
            logger.info("IntegrationAgent cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Export main class and data structures
__all__ = [
    'IntegrationAgent',
    'MSGraphConfig',
    'OrganizationUser',
    'EmailCommunication',
    'CommunicationPattern',
    'ExcelDataInsight',
    'OrganizationalRelationship'
]