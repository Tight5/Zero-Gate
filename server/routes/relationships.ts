import { Router, Request, Response } from 'express';

const router = Router();

// Mock relationship data for development
const mockRelationships = [
  {
    id: 'rel-1',
    source_id: 'person-1',
    target_id: 'person-2',
    type: 'professional',
    strength: 0.8,
    metadata: { context: 'Grant collaboration' }
  },
  {
    id: 'rel-2',
    source_id: 'person-2',
    target_id: 'person-3',
    type: 'mentorship',
    strength: 0.9,
    metadata: { context: 'Advisory relationship' }
  },
  {
    id: 'rel-3',
    source_id: 'person-1',
    target_id: 'person-4',
    type: 'industry',
    strength: 0.6,
    metadata: { context: 'Conference networking' }
  }
];

const mockNodes = [
  { id: 'person-1', label: 'John Smith', type: 'person', lat: 40.7128, lng: -74.0060, connections: 2, strength: 0.8, tier: 'tier-1' },
  { id: 'person-2', label: 'Alice Johnson', type: 'person', lat: 34.0522, lng: -118.2437, connections: 3, strength: 0.9, tier: 'tier-1' },
  { id: 'person-3', label: 'Robert Wilson', type: 'sponsor', lat: 41.8781, lng: -87.6298, connections: 4, strength: 0.7, tier: 'tier-2' },
  { id: 'person-4', label: 'Sarah Chen', type: 'organization', lat: 37.7749, lng: -122.4194, connections: 2, strength: 0.6, tier: 'tier-3' }
];

const mockLinks = [
  { source: 'person-1', target: 'person-2', type: 'professional', strength: 0.8 },
  { source: 'person-2', target: 'person-3', type: 'mentorship', strength: 0.9 },
  { source: 'person-1', target: 'person-4', type: 'industry', strength: 0.6 }
];

// GET /api/relationships - List relationships
router.get('/', (req: Request, res: Response) => {
  try {
    const { relationship_type, limit = '100', offset = '0' } = req.query;
    
    let filteredRelationships = [...mockRelationships];
    
    if (relationship_type) {
      filteredRelationships = filteredRelationships.filter(rel => rel.type === relationship_type);
    }
    
    const startIndex = parseInt(offset as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedRelationships = filteredRelationships.slice(startIndex, endIndex);
    
    res.json({
      relationships: paginatedRelationships,
      total: filteredRelationships.length,
      tenant_id: 'dev-tenant'
    });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// POST /api/relationships/discover-path - Path discovery
router.post('/discover-path', (req: Request, res: Response) => {
  try {
    const { source_id, target_id, max_depth = 7 } = req.body;
    
    // Mock path discovery response
    const mockPath = {
      path: [source_id, 'intermediary-person', target_id],
      path_length: 2,
      confidence_score: 0.85,
      path_quality: 'good',
      relationship_analysis: {
        path_strength: 0.75,
        weakest_link: 0.7,
        total_strength: 1.5
      },
      algorithm_used: 'bfs',
      computation_time_ms: 15.2,
      introduction_strategy: {
        recommended_approach: 'warm_introduction',
        key_talking_points: ['Grant collaboration experience', 'Shared industry interests'],
        estimated_success_probability: 0.78
      }
    };
    
    res.json(mockPath);
  } catch (error) {
    console.error('Error discovering path:', error);
    res.status(500).json({ error: 'Failed to discover relationship path' });
  }
});

// GET /api/relationships/network-stats - Network statistics
router.get('/network-stats', (req: Request, res: Response) => {
  try {
    const networkStats = {
      node_count: mockNodes.length,
      edge_count: mockLinks.length,
      density: 0.5,
      avg_clustering: 0.65,
      central_nodes: mockNodes.slice(0, 3).map(node => ({
        id: node.id,
        label: node.label,
        centrality_score: Math.random() * 0.5 + 0.5
      })),
      tenant_id: 'dev-tenant'
    };
    
    res.json(networkStats);
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({ error: 'Failed to fetch network statistics' });
  }
});

// GET /api/relationships/graph-data - Graph visualization data
router.get('/graph-data', (req: Request, res: Response) => {
  try {
    const { include_weak = 'false' } = req.query;
    const includeWeak = include_weak === 'true';
    
    let filteredLinks = [...mockLinks];
    if (!includeWeak) {
      filteredLinks = filteredLinks.filter(link => link.strength >= 0.5);
    }
    
    const graphData = {
      nodes: mockNodes.map(node => ({
        ...node,
        color: getNodeColor(node.type),
        size: getNodeSize(node.connections || 1)
      })),
      links: filteredLinks.map(link => ({
        ...link,
        color: getLinkColor(link.strength),
        width: getLinkWidth(link.strength)
      })),
      stats: {
        node_count: mockNodes.length,
        edge_count: filteredLinks.length,
        density: filteredLinks.length / (mockNodes.length * (mockNodes.length - 1) / 2),
        avg_clustering: 0.65
      }
    };
    
    res.json(graphData);
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

// GET /api/relationships/search - Search relationships
router.get('/search', (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const searchTerm = (q as string)?.toLowerCase() || '';
    
    const searchResults = mockNodes
      .filter(node => node.label.toLowerCase().includes(searchTerm))
      .map(node => ({
        ...node,
        relevance_score: Math.random() * 0.5 + 0.5,
        relationship_count: node.connections || 0
      }));
    
    res.json({
      results: searchResults,
      total: searchResults.length,
      query: searchTerm
    });
  } catch (error) {
    console.error('Error searching relationships:', error);
    res.status(500).json({ error: 'Failed to search relationships' });
  }
});

// POST /api/relationships - Create relationship
router.post('/', (req: Request, res: Response) => {
  try {
    const { source_id, target_id, type, strength, metadata } = req.body;
    
    const newRelationship = {
      id: `rel-${Date.now()}`,
      source_id,
      target_id,
      type,
      strength: strength || 0.5,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };
    
    mockRelationships.push(newRelationship);
    
    res.status(201).json({
      success: true,
      relationship: newRelationship
    });
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// PUT /api/relationships/:id - Update relationship
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const relationshipIndex = mockRelationships.findIndex(rel => rel.id === id);
    if (relationshipIndex === -1) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    mockRelationships[relationshipIndex] = {
      ...mockRelationships[relationshipIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      relationship: mockRelationships[relationshipIndex]
    });
  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// DELETE /api/relationships/:id - Delete relationship
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const relationshipIndex = mockRelationships.findIndex(rel => rel.id === id);
    if (relationshipIndex === -1) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    mockRelationships.splice(relationshipIndex, 1);
    
    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

// Helper functions for styling
function getNodeColor(type: string): string {
  const colors = {
    person: '#3b82f6',
    organization: '#10b981',
    sponsor: '#f59e0b',
    grantmaker: '#8b5cf6'
  };
  return colors[type as keyof typeof colors] || '#6b7280';
}

function getNodeSize(connections: number): number {
  return Math.max(8, Math.min(20, 8 + connections * 2));
}

function getLinkColor(strength: number): string {
  if (strength >= 0.8) return '#10b981';
  if (strength >= 0.6) return '#f59e0b';
  if (strength >= 0.4) return '#f97316';
  return '#ef4444';
}

function getLinkWidth(strength: number): number {
  return Math.max(1, strength * 4);
}

export default router;