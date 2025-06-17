import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Users, Target, Network, TrendingUp, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Zero Gate ESO Platform</h1>
                <p className="text-sm text-gray-500">Executive Service Organization Management</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-primary hover:bg-primary/90">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your
              <span className="text-primary"> Executive Relationships</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              The most sophisticated platform for managing sponsor relationships, grant opportunities, 
              and strategic networking in the Executive Service Organization ecosystem.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              Get Started Today
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-6 mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Relationship Mapping */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Network className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Relationship Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Discover hidden connections within 7 degrees of separation. 
                  Leverage your network to build meaningful sponsor relationships.
                </p>
              </CardContent>
            </Card>

            {/* Grant Management */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-success" />
                </div>
                <CardTitle className="text-xl">Grant Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automated timeline generation with backwards planning from submission deadlines. 
                  Never miss a critical milestone again.
                </p>
              </CardContent>
            </Card>

            {/* Sponsor Management */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-warning" />
                </div>
                <CardTitle className="text-xl">Sponsor Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive sponsor profiles with relationship strength tracking, 
                  contact history, and strategic insights.
                </p>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Real-time dashboards and performance metrics to optimize your 
                  relationship building and grant success rates.
                </p>
              </CardContent>
            </Card>

            {/* Multi-tenant */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Multi-tenant architecture with complete data isolation. 
                  Enterprise-grade security for sensitive relationship data.
                </p>
              </CardContent>
            </Card>

            {/* Integration */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Microsoft 365 Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Seamless integration with Microsoft Graph API for organizational 
                  data discovery and relationship intelligence.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-6 mt-24 text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-primary to-blue-600 text-white">
            <CardContent className="p-12">
              <h3 className="text-3xl font-bold mb-4">Ready to Transform Your ESO Operations?</h3>
              <p className="text-xl mb-8 opacity-90">
                Join leading Executive Service Organizations who trust Zero Gate 
                to manage their most valuable relationships.
              </p>
              <Button 
                onClick={handleLogin}
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3"
              >
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-600">© 2024 Zero Gate ESO Platform</span>
            </div>
            <div className="text-sm text-gray-500">
              Enterprise-grade relationship management
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
