import React from 'react';
import HybridRelationshipMap from '@/components/relationships/HybridRelationshipMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Users, TrendingUp, MapPin } from 'lucide-react';

const Relationships: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Network className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Relationship Mapping</h1>
        </div>
        <p className="text-gray-600">
          Visualize and analyze stakeholder relationships using geographic and network analysis tools.
          Discover connection paths and identify key influencers in your network.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Total People</div>
                <div className="text-xl font-semibold">247</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">Connections</div>
                <div className="text-xl font-semibold">1,423</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-600">Avg Strength</div>
                <div className="text-xl font-semibold">73%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-sm text-gray-600">Geographic Nodes</div>
                <div className="text-xl font-semibold">189</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Available Analysis Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center py-2">
                Geographic Visualization
              </Badge>
              <p className="text-sm text-gray-600">
                Interactive map showing stakeholder locations with connection overlays
              </p>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center py-2">
                Network Analysis
              </Badge>
              <p className="text-sm text-gray-600">
                Force-directed graph with node clustering and influence scoring
              </p>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center py-2">
                Path Discovery
              </Badge>
              <p className="text-sm text-gray-600">
                Seven-degree connection analysis with introduction templates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization Component - File 26 Implementation */}
      <div className="h-[800px]">
        <HybridRelationshipMap 
          viewMode="hybrid"
          onNodeClick={(node: any) => console.log('Node selected:', node.label)}
          onLinkClick={(link: any) => console.log('Relationship selected:', link.type)}
        />
      </div>
    </div>
  );
};

export default Relationships;