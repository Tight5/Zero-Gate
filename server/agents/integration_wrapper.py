#!/usr/bin/env python3
"""
Integration Agent Wrapper for Zero Gate ESO Platform
Provides Node.js-Python communication bridge for Microsoft Graph integration
"""

import sys
import json
import asyncio
import logging
from typing import Dict, Any, Optional
from integration_new import get_integration_agent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zero-gate.integration-wrapper")

async def execute_integration_command(operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute integration command and return result"""
    try:
        agent = get_integration_agent()
        
        if operation == 'extract_organizational_relationships':
            tenant_id = data.get('tenant_id') or "default-tenant"
            user_limit = int(data.get('user_limit', 100))
            
            result = await agent.extract_organizational_relationships(
                tenant_id=tenant_id,
                user_limit=user_limit
            )
            return {'success': True, 'data': result}
            
        elif operation == 'analyze_email_communication_patterns':
            tenant_id = data.get('tenant_id') or "default-tenant"
            user_id = data.get('user_id') or "me"
            days = int(data.get('days', 30))
            
            result = await agent.analyze_email_communication_patterns(
                tenant_id=tenant_id,
                user_id=user_id,
                days=days
            )
            return {'success': True, 'data': result}
            
        elif operation == 'process_excel_file_for_dashboard':
            file_path = data.get('file_path') or None
            file_content = data.get('file_content')
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            # Convert base64 file content if provided
            if file_content and isinstance(file_content, str):
                import base64
                file_content = base64.b64decode(file_content)
            
            result = await agent.process_excel_file_for_dashboard(
                file_path=str(file_path) if file_path is not None else "",
                file_content=file_content or b'',
                tenant_id=tenant_id
            )
            return {'success': True, 'data': result}
            
        elif operation == 'get_connection_status':
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            result = await agent.get_connection_status(tenant_id=tenant_id)
            return {'success': True, 'data': result}
            
        elif operation == 'get_access_token':
            tenant_id = data.get('tenant_id')
            
            token = agent.get_access_token(tenant_id=tenant_id)
            return {
                'success': True, 
                'data': {
                    'has_token': token is not None,
                    'status': 'authenticated' if token else 'failed'
                }
            }
            
        else:
            return {
                'success': False, 
                'error': f'Unknown operation: {operation}'
            }
            
    except Exception as e:
        logger.error(f"Error executing integration command '{operation}': {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'operation': operation
        }

def main():
    """Main entry point for wrapper communication"""
    try:
        # Read input from Node.js
        if len(sys.argv) > 1:
            # Command line argument mode
            input_data = sys.argv[1]
        else:
            # stdin mode
            input_data = sys.stdin.read().strip()
        
        if not input_data:
            result = {'success': False, 'error': 'No input data provided'}
        else:
            # Parse JSON input
            try:
                command_data = json.loads(input_data)
                operation = command_data.get('operation')
                data = command_data.get('data', {})
                
                if not operation:
                    result = {'success': False, 'error': 'No operation specified'}
                else:
                    # Execute async command
                    result = asyncio.run(execute_integration_command(operation, data))
                    
            except json.JSONDecodeError as e:
                result = {'success': False, 'error': f'Invalid JSON input: {str(e)}'}
        
        # Output result as JSON
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f'Wrapper execution error: {str(e)}'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()