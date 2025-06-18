import React from 'react';
import { ArrowRight, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PathData {
  path: string[];
  path_length: number;
  path_quality: 'excellent' | 'good' | 'fair' | 'weak';
  relationship_analysis: {
    average_strength: number;
    minimum_strength: number;
    relationship_types: string[];
  };
}

interface PathVisualizationProps {
  pathData: PathData;
}

const PathVisualization: React.FC<PathVisualizationProps> = ({ pathData }) => {
  const getStrengthColor = (index: number): string => {
    // Simulate different relationship strengths for visualization
    const baseStrength = pathData.relationship_analysis.average_strength;
    const variation = (Math.sin(index) * 0.2) + baseStrength;
    
    if (variation >= 0.8) return 'bg-green-500';
    if (variation >= 0.6) return 'bg-blue-500';
    if (variation >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRelationshipType = (index: number): string => {
    const types = pathData.relationship_analysis.relationship_types;
    return types[index % types.length] || 'connection';
  };

  return (
    <div className="path-visualization">
      <div className="flex items-center justify-center overflow-x-auto pb-4">
        <div className="flex items-center space-x-2 min-w-max">
          {pathData.path.map((person, index) => (
            <React.Fragment key={`${person}-${index}`}>
              {/* Person Node */}
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <User className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-20 truncate">
                    {person}
                  </p>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Source
                    </Badge>
                  )}
                  {index === pathData.path.length - 1 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Target
                    </Badge>
                  )}
                </div>
              </div>

              {/* Connection Arrow */}
              {index < pathData.path.length - 1 && (
                <div className="flex flex-col items-center space-y-1">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`w-12 h-1 rounded-full ${getStrengthColor(index)}`} />
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {getRelationshipType(index)}
                    </Badge>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Path Summary */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Path: {pathData.path[0]} → {pathData.path[pathData.path.length - 1]}
          </span>
          <span className="font-medium">
            {pathData.path_length} degree{pathData.path_length !== 1 ? 's' : ''} of separation
          </span>
        </div>
      </div>
    </div>
  );
};

export default PathVisualization;