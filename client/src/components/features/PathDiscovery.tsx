
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PathNode {
  id: string;
  name: string;
  type: string;
}

interface Path {
  nodes: PathNode[];
  strength: number;
  length: number;
}

export function PathDiscovery() {
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [paths, setPaths] = useState<Path[]>([]);
  const [loading, setLoading] = useState(false);

  const findPaths = async () => {
    if (!sourceNode || !targetNode) return;

    setLoading(true);
    try {
      const response = await fetch('/api/relationships/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceNode, target: targetNode }),
      });
      const data = await response.json();
      setPaths(data.paths || []);
    } catch (error) {
      console.error('Failed to find paths:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Path Discovery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="source">Source Node</Label>
            <Input
              id="source"
              value={sourceNode}
              onChange={(e) => setSourceNode(e.target.value)}
              placeholder="Enter source node ID"
            />
          </div>
          <div>
            <Label htmlFor="target">Target Node</Label>
            <Input
              id="target"
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              placeholder="Enter target node ID"
            />
          </div>
        </div>

        <Button onClick={findPaths} disabled={loading || !sourceNode || !targetNode}>
          {loading ? 'Finding Paths...' : 'Find Paths'}
        </Button>

        {paths.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Discovered Paths:</h3>
            {paths.map((path, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {path.nodes.map((node, nodeIndex) => (
                      <span key={node.id}>
                        {node.name}
                        {nodeIndex < path.nodes.length - 1 && (
                          <span className="mx-2 text-muted-foreground">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Length: {path.length} | Strength: {path.strength.toFixed(2)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
