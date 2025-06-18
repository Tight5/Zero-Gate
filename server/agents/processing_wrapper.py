#!/usr/bin/env python3
"""
ProcessingAgent Wrapper for Express.js Integration
Handles JSON input/output communication between Node.js and Python NetworkX processing
"""

import sys
import json
import asyncio
import logging
from datetime import datetime
from processing import ProcessingAgent, Sponsor, Grant, Relationship

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global agent instances per tenant
agent_instances = {}

def get_agent_instance(tenant_id: str) -> ProcessingAgent:
    """Get or create ProcessingAgent instance for tenant"""
    if tenant_id not in agent_instances:
        agent_instances[tenant_id] = ProcessingAgent(tenant_id)
    return agent_instances[tenant_id]

async def handle_add_sponsor(data: dict) -> dict:
    """Add sponsor to relationship graph"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        
        # Convert data to Sponsor object
        sponsor = Sponsor(
            id=data['id'],
            name=data['name'],
            tier=data.get('tier', 'bronze'),
            contact_strength=float(data.get('contact_strength', 0.5)),
            funding_capacity=int(data.get('funding_capacity', 0)),
            response_rate=float(data.get('response_rate', 0.5)),
            last_contact=datetime.fromisoformat(data.get('last_contact', datetime.now().isoformat())),
            industries=data.get('industries', []),
            location=data.get('location', ''),
            tenant_id=tenant_id
        )
        
        await agent.add_sponsor(sponsor)
        
        return {
            'success': True,
            'message': f'Sponsor {sponsor.name} added successfully',
            'sponsor_id': sponsor.id
        }
        
    except Exception as e:
        logger.error(f"Error adding sponsor: {e}")
        return {'success': False, 'error': str(e)}

async def handle_add_relationship(data: dict) -> dict:
    """Add relationship edge to graph"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        
        # Convert data to Relationship object
        relationship = Relationship(
            source_id=data['source_id'],
            target_id=data['target_id'],
            strength=float(data.get('strength', 0.5)),
            relationship_type=data.get('relationship_type', 'professional'),
            context=data.get('context', ''),
            last_interaction=datetime.fromisoformat(data.get('last_interaction', datetime.now().isoformat())),
            tenant_id=tenant_id
        )
        
        await agent.add_relationship(relationship)
        
        return {
            'success': True,
            'message': f'Relationship {relationship.source_id} -> {relationship.target_id} added successfully'
        }
        
    except Exception as e:
        logger.error(f"Error adding relationship: {e}")
        return {'success': False, 'error': str(e)}

async def handle_find_shortest_path(data: dict) -> dict:
    """Find shortest path between nodes"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        source = data['source']
        target = data['target']
        max_length = data.get('max_length', 7)
        
        result = await agent.find_shortest_path(source, target, max_length)
        
        if result:
            return {
                'success': True,
                'path_found': True,
                'source': result.source,
                'target': result.target,
                'path': result.path,
                'path_length': result.path_length,
                'total_strength': result.total_strength,
                'estimated_time_hours': result.estimated_time_hours,
                'confidence_score': result.confidence_score
            }
        else:
            return {
                'success': True,
                'path_found': False,
                'message': f'No path found between {source} and {target} within {max_length} degrees'
            }
        
    except Exception as e:
        logger.error(f"Error finding path: {e}")
        return {'success': False, 'error': str(e)}

async def handle_find_multiple_paths(data: dict) -> dict:
    """Find multiple paths between nodes"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        source = data['source']
        target = data['target']
        k = data.get('k', 3)
        
        results = await agent.find_multiple_paths(source, target, k)
        
        paths = []
        for result in results:
            paths.append({
                'path': result.path,
                'path_length': result.path_length,
                'total_strength': result.total_strength,
                'estimated_time_hours': result.estimated_time_hours,
                'confidence_score': result.confidence_score
            })
        
        return {
            'success': True,
            'paths_found': len(paths),
            'paths': paths
        }
        
    except Exception as e:
        logger.error(f"Error finding multiple paths: {e}")
        return {'success': False, 'error': str(e)}

async def handle_calculate_sponsor_metrics(data: dict) -> dict:
    """Calculate sponsor metrics"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        sponsor_id = data['sponsor_id']
        
        metrics = await agent.calculate_sponsor_metrics(sponsor_id)
        
        return {
            'success': True,
            'sponsor_id': metrics.sponsor_id,
            'network_centrality': metrics.network_centrality,
            'influence_score': metrics.influence_score,
            'funding_probability': metrics.funding_probability,
            'response_likelihood': metrics.response_likelihood,
            'optimal_contact_window': metrics.optimal_contact_window,
            'key_connections': metrics.key_connections,
            'grant_success_rate': metrics.grant_success_rate
        }
        
    except Exception as e:
        logger.error(f"Error calculating sponsor metrics: {e}")
        return {'success': False, 'error': str(e)}

async def handle_generate_grant_timeline(data: dict) -> dict:
    """Generate grant timeline with backwards planning"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        
        # Convert data to Grant object
        grant = Grant(
            id=data['id'],
            title=data['title'],
            sponsor_id=data['sponsor_id'],
            amount=int(data['amount']),
            submission_deadline=datetime.fromisoformat(data['submission_deadline']),
            status=data.get('status', 'active'),
            requirements=data.get('requirements', []),
            tenant_id=tenant_id
        )
        
        timeline = await agent.generate_grant_timeline(grant)
        
        return {
            'success': True,
            'grant_id': timeline.grant_id,
            'submission_deadline': timeline.submission_deadline.isoformat(),
            'milestones': timeline.milestones,
            'critical_path': timeline.critical_path,
            'buffer_days': timeline.buffer_days,
            'risk_assessment': timeline.risk_assessment
        }
        
    except Exception as e:
        logger.error(f"Error generating grant timeline: {e}")
        return {'success': False, 'error': str(e)}

async def handle_estimate_distance(data: dict) -> dict:
    """Estimate distance between nodes using landmarks"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        source = data['source']
        target = data['target']
        
        distance = await agent.estimate_distance(source, target)
        
        return {
            'success': True,
            'source': source,
            'target': target,
            'estimated_distance': distance,
            'distance_found': distance != -1
        }
        
    except Exception as e:
        logger.error(f"Error estimating distance: {e}")
        return {'success': False, 'error': str(e)}

async def handle_get_network_statistics(data: dict) -> dict:
    """Get network statistics"""
    try:
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            raise ValueError("tenant_id is required")
        
        agent = get_agent_instance(tenant_id)
        stats = await agent.get_network_statistics()
        
        return {
            'success': True,
            **stats
        }
        
    except Exception as e:
        logger.error(f"Error getting network statistics: {e}")
        return {'success': False, 'error': str(e)}

async def process_request(request_data: dict) -> dict:
    """Process incoming request and route to appropriate handler"""
    try:
        action = request_data.get('action')
        data = request_data.get('data', {})
        
        if action == 'add_sponsor':
            return await handle_add_sponsor(data)
        elif action == 'add_relationship':
            return await handle_add_relationship(data)
        elif action == 'find_shortest_path':
            return await handle_find_shortest_path(data)
        elif action == 'find_multiple_paths':
            return await handle_find_multiple_paths(data)
        elif action == 'calculate_sponsor_metrics':
            return await handle_calculate_sponsor_metrics(data)
        elif action == 'generate_grant_timeline':
            return await handle_generate_grant_timeline(data)
        elif action == 'estimate_distance':
            return await handle_estimate_distance(data)
        elif action == 'get_network_statistics':
            return await handle_get_network_statistics(data)
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