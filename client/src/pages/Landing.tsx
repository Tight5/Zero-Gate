import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Landing: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Zero Gate ESO</CardTitle>
          <CardDescription>
            Enterprise Service Organization Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Manage relationships, grants, and organizational collaboration with advanced analytics and real-time insights.
          </p>
          <Button 
            onClick={handleLogin} 
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Landing;