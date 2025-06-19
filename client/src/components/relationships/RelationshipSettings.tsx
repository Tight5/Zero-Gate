
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Settings, Save, RotateCcw } from 'lucide-react';

const RelationshipSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    maxDegrees: 7,
    layoutAlgorithm: 'force-directed',
    showStrengthLabels: true,
    enablePathOptimization: true,
    cacheRelationships: true,
    refreshInterval: 30
  });

  const handleSave = () => {
    console.log('Saving relationship settings:', settings);
    // Implementation for saving settings
  };

  const handleReset = () => {
    setSettings({
      maxDegrees: 7,
      layoutAlgorithm: 'force-directed',
      showStrengthLabels: true,
      enablePathOptimization: true,
      cacheRelationships: true,
      refreshInterval: 30
    });
  };

  return (
    <div className="relationship-settings">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Relationship Mapping Settings
          </CardTitle>
          <CardDescription>
            Configure how relationships are visualized and analyzed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDegrees">Maximum Degrees of Separation</Label>
              <Input
                id="maxDegrees"
                type="number"
                min="1"
                max="10"
                value={settings.maxDegrees}
                onChange={(e) => setSettings({...settings, maxDegrees: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="layoutAlgorithm">Layout Algorithm</Label>
              <Select 
                value={settings.layoutAlgorithm} 
                onValueChange={(value) => setSettings({...settings, layoutAlgorithm: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force-directed">Force Directed</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show Strength Labels</Label>
                <p className="text-sm text-muted-foreground">
                  Display relationship strength values on connections
                </p>
              </div>
              <Switch
                checked={settings.showStrengthLabels}
                onCheckedChange={(checked) => setSettings({...settings, showStrengthLabels: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Path Optimization</Label>
                <p className="text-sm text-muted-foreground">
                  Use advanced algorithms for path discovery
                </p>
              </div>
              <Switch
                checked={settings.enablePathOptimization}
                onCheckedChange={(checked) => setSettings({...settings, enablePathOptimization: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Cache Relationships</Label>
                <p className="text-sm text-muted-foreground">
                  Store relationship data locally for faster loading
                </p>
              </div>
              <Switch
                checked={settings.cacheRelationships}
                onCheckedChange={(checked) => setSettings({...settings, cacheRelationships: checked})}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="refreshInterval">Data Refresh Interval (seconds)</Label>
            <Input
              id="refreshInterval"
              type="number"
              min="10"
              max="300"
              value={settings.refreshInterval}
              onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave}>
              <Save size={16} />
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelationshipSettings;
