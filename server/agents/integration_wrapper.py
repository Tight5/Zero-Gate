#!/usr/bin/env python3
"""
IntegrationAgent Wrapper for Express.js Integration
Handles JSON input/output communication between Node.js and Python Microsoft Graph processing
"""

import sys
import json
import asyncio
import logging
import base64
from datetime import datetime
from integration_new import (
    IntegrationAgent, 
    MSGraphConfig, 
    OrganizationUser, 
    EmailCommunication, 
    CommunicationPattern,
    ExcelDataInsight,
    OrganizationalRelationship
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global agent instances per tenant
agent_instances = {}

def get_agent_instance(tenant_id: str, config: dict = None) -> IntegrationAgent:
    """Get or create IntegrationAgent instance for tenant"""
    if tenant_id not in agent_instances and config:
        ms_config = MSGraphConfig(
            client_id=config.get('client_id', ''),
            client_secret=config.get('client_secret', ''),
            tenant_id=config.get('tenant_id', ''),
            authority=config.get('authority', ''),
            scopes=config.get('scopes', ['https://graph.microsoft.com/.default'])
        )
        agent_instances[tenant_id] = IntegrationAgent(ms_config, tenant_id)
    
    return agent_instances.get(tenant_id)

async def handle_initialize_auth(data: dict, tenant_id: str, config: dict) -> dict:
    """Initialize Microsoft Graph authentication"""
    try:
        agent = get_agent_instance(tenant_id, config)
        if not agent:
            return {'success': False, 'error': 'Failed to create integration agent'}
        
        authenticated = await agent.authenticate()
        
        return {
            'success': True,
            'authenticated': authenticated,
            'message': 'Microsoft Graph authentication initialized'
        }
        
    except Exception as e:
        logger.error(f"Error initializing authentication: {e}")
        return {'success': False, 'error': str(e)}

async def handle_extract_users(data: dict, tenant_id: str) -> dict:
    """Extract organizational users from Microsoft Graph"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        users = await agent.extract_organizational_users()
        
        # Convert users to serializable format
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'display_name': user.display_name,
                'email': user.email,
                'job_title': user.job_title,
                'department': user.department,
                'manager_id': user.manager_id,
                'direct_reports': user.direct_reports,
                'office_location': user.office_location,
                'tenant_context': user.tenant_context
            })
        
        return {
            'success': True,
            'users': users_data,
            'user_count': len(users_data)
        }
        
    except Exception as e:
        logger.error(f"Error extracting users: {e}")
        return {'success': False, 'error': str(e)}

async def handle_analyze_email_patterns(data: dict, tenant_id: str) -> dict:
    """Analyze email communication patterns"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        days_back = data.get('days_back', 30)
        patterns = await agent.analyze_email_communication_patterns(days_back)
        
        # Convert patterns to serializable format
        patterns_data = []
        for pattern in patterns:
            patterns_data.append({
                'user_pair': list(pattern.user_pair),
                'email_count': pattern.email_count,
                'frequency_score': pattern.frequency_score,
                'last_communication': pattern.last_communication.isoformat(),
                'communication_strength': pattern.communication_strength,
                'topics': pattern.topics,
                'relationship_type': pattern.relationship_type,
                'tenant_context': pattern.tenant_context
            })
        
        # Generate analysis summary
        analysis_summary = {
            'total_patterns': len(patterns_data),
            'avg_frequency': sum(p['frequency_score'] for p in patterns_data) / len(patterns_data) if patterns_data else 0,
            'avg_strength': sum(p['communication_strength'] for p in patterns_data) / len(patterns_data) if patterns_data else 0,
            'relationship_types': {}
        }
        
        # Count relationship types
        for pattern in patterns_data:
            rel_type = pattern['relationship_type']
            analysis_summary['relationship_types'][rel_type] = analysis_summary['relationship_types'].get(rel_type, 0) + 1
        
        return {
            'success': True,
            'patterns': patterns_data,
            'pattern_count': len(patterns_data),
            'analysis_summary': analysis_summary
        }
        
    except Exception as e:
        logger.error(f"Error analyzing email patterns: {e}")
        return {'success': False, 'error': str(e)}

async def handle_extract_relationships(data: dict, tenant_id: str) -> dict:
    """Extract organizational relationships"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        relationships = await agent.extract_organizational_relationships()
        
        # Convert relationships to serializable format
        relationships_data = []
        relationship_types = {}
        
        for relationship in relationships:
            rel_data = {
                'source_user_id': relationship.source_user_id,
                'target_user_id': relationship.target_user_id,
                'relationship_type': relationship.relationship_type,
                'strength': relationship.strength,
                'context': relationship.context,
                'discovered_through': relationship.discovered_through,
                'tenant_context': relationship.tenant_context
            }
            relationships_data.append(rel_data)
            
            # Count relationship types
            rel_type = relationship.relationship_type
            relationship_types[rel_type] = relationship_types.get(rel_type, 0) + 1
        
        return {
            'success': True,
            'relationships': relationships_data,
            'relationship_count': len(relationships_data),
            'relationship_types': relationship_types
        }
        
    except Exception as e:
        logger.error(f"Error extracting relationships: {e}")
        return {'success': False, 'error': str(e)}

async def handle_process_excel(data: dict, tenant_id: str) -> dict:
    """Process Excel file for dashboard insights"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        # Decode base64 file content
        file_content = base64.b64decode(data['file_content'])
        filename = data['filename']
        
        insights = await agent.process_excel_file(file_content, filename)
        
        # Convert insights to serializable format
        insights_data = {
            'source_file': insights.source_file,
            'sheet_name': insights.sheet_name,
            'total_rows': insights.total_rows,
            'data_summary': insights.data_summary,
            'key_metrics': insights.key_metrics,
            'processed_at': insights.processed_at.isoformat(),
            'tenant_context': insights.tenant_context
        }
        
        return {
            'success': True,
            'insights': insights_data
        }
        
    except Exception as e:
        logger.error(f"Error processing Excel file: {e}")
        return {'success': False, 'error': str(e)}

async def handle_get_summary(data: dict, tenant_id: str) -> dict:
    """Get integration summary"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        summary = await agent.get_integration_summary()
        
        return {
            'success': True,
            **summary
        }
        
    except Exception as e:
        logger.error(f"Error getting summary: {e}")
        return {'success': False, 'error': str(e)}

async def handle_test_connectivity(data: dict, tenant_id: str) -> dict:
    """Test Microsoft Graph connectivity"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        # Test authentication
        auth_success = await agent.authenticate()
        
        connectivity_results = {
            'authentication': auth_success,
            'graph_api_access': False,
            'user_read_permission': False,
            'mail_read_permission': False
        }
        
        if auth_success:
            # Test basic Graph API access
            test_response = await agent._make_graph_request('/me')
            connectivity_results['graph_api_access'] = test_response is not None
            
            # Test user read permission
            users_response = await agent._make_graph_request('/users?$top=1')
            connectivity_results['user_read_permission'] = users_response is not None
            
            # Test mail read permission (may fail due to permissions)
            mail_response = await agent._make_graph_request('/me/messages?$top=1')
            connectivity_results['mail_read_permission'] = mail_response is not None
        
        available_endpoints = [
            '/users',
            '/me',
            '/organization'
        ]
        
        if connectivity_results['mail_read_permission']:
            available_endpoints.extend(['/me/messages', '/me/mailFolders'])
        
        return {
            'success': True,
            'connectivity': connectivity_results,
            'auth_status': 'authenticated' if auth_success else 'failed',
            'available_endpoints': available_endpoints
        }
        
    except Exception as e:
        logger.error(f"Error testing connectivity: {e}")
        return {'success': False, 'error': str(e)}

async def handle_sync_organization(data: dict, tenant_id: str) -> dict:
    """Sync organizational data to platform"""
    try:
        agent = get_agent_instance(tenant_id)
        if not agent:
            return {'success': False, 'error': 'Integration agent not initialized'}
        
        sync_results = {
            'users_synced': 0,
            'relationships_synced': 0,
            'communications_analyzed': 0
        }
        
        # Sync users if requested
        if data.get('sync_users', True):
            users = await agent.extract_organizational_users()
            sync_results['users_synced'] = len(users)
        
        # Sync relationships if requested
        if data.get('sync_relationships', True):
            relationships = await agent.extract_organizational_relationships()
            sync_results['relationships_synced'] = len(relationships)
        
        # Analyze communications if requested
        if data.get('analyze_communications', False):
            patterns = await agent.analyze_email_communication_patterns()
            sync_results['communications_analyzed'] = len(patterns)
        
        return {
            'success': True,
            'sync_results': sync_results,
            'users_synced': sync_results['users_synced'],
            'relationships_synced': sync_results['relationships_synced']
        }
        
    except Exception as e:
        logger.error(f"Error syncing organization: {e}")
        return {'success': False, 'error': str(e)}

async def process_request(request_data: dict) -> dict:
    """Process incoming request and route to appropriate handler"""
    try:
        action = request_data.get('action')
        data = request_data.get('data', {})
        tenant_id = request_data.get('tenant_id')
        config = request_data.get('config')
        
        if action == 'initialize_auth':
            return await handle_initialize_auth(data, tenant_id, config)
        elif action == 'extract_users':
            return await handle_extract_users(data, tenant_id)
        elif action == 'analyze_email_patterns':
            return await handle_analyze_email_patterns(data, tenant_id)
        elif action == 'extract_relationships':
            return await handle_extract_relationships(data, tenant_id)
        elif action == 'process_excel':
            return await handle_process_excel(data, tenant_id)
        elif action == 'get_summary':
            return await handle_get_summary(data, tenant_id)
        elif action == 'test_connectivity':
            return await handle_test_connectivity(data, tenant_id)
        elif action == 'sync_organization':
            return await handle_sync_organization(data, tenant_id)
        else:
            return {'success': False, 'error': f'Unknown action: {action}'}
            
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return {'success': False, 'error': str(e)}

async def main():
    """Main entry point for processing requests"""
    try:
        # Read JSON request from stdin
        input_line = sys.stdin.readline().strip()
        if not input_line:
            print(json.dumps({'success': False, 'error': 'No input provided'}))
            return
        
        request_data = json.loads(input_line)
        
        # Process request
        result = await process_request(request_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'success': False, 'error': f'Invalid JSON input: {e}'}))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(json.dumps({'success': False, 'error': f'Unexpected error: {e}'}))

if __name__ == '__main__':
    asyncio.run(main())