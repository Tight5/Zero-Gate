import React, { useState } from 'react';
import HybridRelationshipMap from '@/components/relationships/HybridRelationshipMap';
import PathDiscoveryInterface from '@/components/relationships/PathDiscoveryInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Users, TrendingUp, MapPin, Route, Map } from 'lucide-react';

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

      {/* Analysis Tools - File 26 & 27 Implementation */}
      <Tabs defaultValue="visualization" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Hybrid Visualization
          </TabsTrigger>
          <TabsTrigger value="pathfinding" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Path Discovery
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="visualization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hybrid Relationship Mapping</CardTitle>
              <p className="text-sm text-gray-600">
                Geographic and network visualization with interactive filtering and analysis tools.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[800px]">
                <HybridRelationshipMap 
                  viewMode="hybrid"
                  onNodeClick={(node: any) => console.log('Node selected:', node.label)}
                  onLinkClick={(link: any) => console.log('Relationship selected:', link.type)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pathfinding" className="mt-6">
          <PathDiscoveryInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relationships;