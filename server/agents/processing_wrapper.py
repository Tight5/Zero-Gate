#!/usr/bin/env python3
"""
Python wrapper for ProcessingAgent
Enables Node.js to communicate with the NetworkX-based ProcessingAgent
"""

import sys
import json
import traceback
from datetime import datetime
from processing import ProcessingAgent, get_processing_agent

def handle_operation(operation: str, data: dict):
    """Handle ProcessingAgent operations from Node.js"""
    try:
        agent = get_processing_agent()
        
        if operation == 'add_relationship':
            source = data.get('source')
            target = data.get('target')
            relationship_type = data.get('relationship_type')
            strength = data.get('strength', 0.5)
            tenant_id = data.get('tenant_id')
            metadata = data.get('metadata', {})
            
            # Type validation for critical parameters
            if not all([source, target, relationship_type, tenant_id]):
                return {'success': False, 'error': 'Missing required parameters'}
            
            agent.add_relationship(
                source=str(source),
                target=str(target),
                relationship_type=str(relationship_type),
                strength=float(strength),
                tenant_id=str(tenant_id),
                metadata=metadata
            )
            
            return {
                'success': True,
                'message': f'Relationship added between {source} and {target}',
                'nodes_count': agent.relationship_graph.number_of_nodes(),
                'edges_count': agent.relationship_graph.number_of_edges()
            }
            
        elif operation == 'find_relationship_path':
            source = str(data.get('source', ''))
            target = str(data.get('target', ''))
            tenant_id = str(data.get('tenant_id', ''))
            max_depth = int(data.get('max_depth', 7))
            
            if not all([source, target, tenant_id]):
                return {'success': False, 'error': 'Missing required parameters'}
            
            path = agent.find_relationship_path(
                source=source,
                target=target,
                tenant_id=tenant_id,
                max_depth=max_depth
            )
            
            return {
                'success': True,
                'path': path,
                'found': path is not None,
                'degrees': len(path) - 1 if path else None
            }
            
        elif operation == 'find_all_paths_within_degrees':
            source = str(data.get('source', ''))
            target = str(data.get('target', ''))
            tenant_id = str(data.get('tenant_id', ''))
            max_depth = int(data.get('max_depth', 7))
            
            if not all([source, target, tenant_id]):
                return {'success': False, 'error': 'Missing required parameters'}
            
            paths = agent.find_all_paths_within_degrees(
                source=source,
                target=target,
                tenant_id=tenant_id,
                max_depth=max_depth
            )
            
            return {
                'success': True,
                'paths': paths,
                'total_paths': len(paths)
            }
            
        elif operation == 'analyze_relationship_strength':
            path = data.get('path', [])
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            analysis = agent.analyze_relationship_strength(
                path=path,
                tenant_id=tenant_id
            )
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        elif operation == 'calculate_sponsor_metrics':
            sponsor_data = data.get('sponsor_data', {})
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            metrics = agent.calculate_sponsor_metrics(
                sponsor_data=sponsor_data,
                tenant_id=tenant_id
            )
            
            return {
                'success': True,
                'metrics': metrics
            }
            
        elif operation == 'generate_grant_timeline':
            grant_deadline_str = data.get('grant_deadline')
            grant_type = data.get('grant_type') or "general"
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            # Parse ISO datetime string
            try:
                if grant_deadline_str:
                    grant_deadline = datetime.fromisoformat(grant_deadline_str.replace('Z', '+00:00'))
                    # Remove timezone info for processing
                    grant_deadline = grant_deadline.replace(tzinfo=None)
                else:
                    grant_deadline = datetime.now()
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Invalid grant_deadline format: {str(e)}'
                }
            
            timeline = agent.generate_grant_timeline(
                grant_deadline=grant_deadline,
                grant_type=grant_type,
                tenant_id=tenant_id
            )
            
            return {
                'success': True,
                'timeline': timeline
            }
            
        elif operation == 'get_network_statistics':
            tenant_id = data.get('tenant_id') or "default-tenant"
            
            stats = agent.get_network_statistics(tenant_id=tenant_id)
            
            return {
                'success': True,
                'statistics': stats
            }
            
        elif operation == 'update_landmarks':
            tenant_id = data.get('tenant_id')
            
            # Force landmark update
            agent._update_landmarks()
            
            return {
                'success': True,
                'landmarks_count': len(agent.landmarks),
                'message': 'Landmarks updated successfully'
            }
            
        elif operation == 'health_check':
            return {
                'success': True,
                'status': 'healthy',
                'nodes_count': agent.relationship_graph.number_of_nodes() if hasattr(agent.relationship_graph, 'number_of_nodes') else 0,
                'edges_count': agent.relationship_graph.number_of_edges() if hasattr(agent.relationship_graph, 'number_of_edges') else 0,
                'landmarks_count': len(agent.landmarks),
                'timestamp': datetime.now().isoformat()
            }
            
        else:
            return {
                'success': False,
                'error': f'Unknown operation: {operation}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

def main():
    """Main entry point for the wrapper"""
    try:
        # Read operation from command line argument
        if len(sys.argv) < 2:
            print(json.dumps({
                'success': False,
                'error': 'Missing operation argument'
            }))
            sys.exit(1)
        
        operation = sys.argv[1]
        
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            data = {}
        else:
            try:
                data = json.loads(input_data)
            except json.JSONDecodeError as e:
                print(json.dumps({
                    'success': False,
                    'error': f'Invalid JSON input: {str(e)}'
                }))
                sys.exit(1)
        
        # Handle the operation
        result = handle_operation(operation, data)
        
        # Output result as JSON
        print(json.dumps(result, default=str))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()