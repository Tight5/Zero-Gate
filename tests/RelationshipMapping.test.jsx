import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RelationshipMapping from '../client/src/pages/RelationshipMapping';
import { TenantContext } from '../client/src/contexts/TenantContext';
import { ResourceContext } from '../client/src/contexts/ResourceContext';
import { ThemeProvider } from '../client/src/contexts/ThemeContext';

// Mock React Leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }) => (
    <div data-testid="map-container" {...props}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, children }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>{children}</div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Polyline: ({ positions }) => (
    <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
  ),
}));

// Mock Force Graph 2D component
jest.mock('react-force-graph-2d', () => {
  return function MockForceGraph2D({ graphData, ...props }) {
    return (
      <div 
        data-testid="force-graph" 
        data-nodes={graphData?.nodes?.length || 0}
        data-links={graphData?.links?.length || 0}
        {...props}
      />
    );
  };
});

// Mock Leaflet
jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({ options: {} })),
  divIcon: jest.fn(() => ({ options: {} })),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn(() => ({ isValid: () => true })),
}));

describe('RelationshipMapping Component', () => {
  let queryClient;
  let mockTenantContext;
  let mockResourceContext;
  let user;

  const mockRelationshipData = {
    nodes: [
      {
        id: '1',
        name: 'John Smith',
        type: 'person',
        organization: 'Foundation A',
        position: { lat: 40.7128, lng: -74.0060 },
        strength: 0.8,
        tier: 'primary',
      },
      {
        id: '2',
        name: 'Foundation A',
        type: 'organization',
        position: { lat: 40.7589, lng: -73.9851 },
        strength: 0.9,
        tier: 'foundation',
      },
      {
        id: '3',
        name: 'Sarah Johnson',
        type: 'person',
        organization: 'Corporation B',
        position: { lat: 40.7282, lng: -73.7949 },
        strength: 0.7,
        tier: 'secondary',
      },
    ],
    links: [
      {
        source: '1',
        target: '2',
        strength: 0.8,
        type: 'employment',
        confidence: 0.95,
      },
      {
        source: '1',
        target: '3',
        strength: 0.6,
        type: 'professional',
        confidence: 0.8,
      },
    ],
  };

  const mockPathData = {
    path: ['1', '2', '3'],
    confidence: 0.85,
    steps: [
      {
        from: 'John Smith',
        to: 'Foundation A',
        relationship: 'Program Director',
        strength: 0.8,
      },
      {
        from: 'Foundation A',
        to: 'Sarah Johnson',
        relationship: 'Grant Recipient',
        strength: 0.7,
      },
    ],
    totalDistance: 2,
    estimatedTime: '2-3 weeks',
    keyInfluencers: ['Foundation A'],
  };

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockTenantContext = {
      currentTenant: {
        id: 'test-tenant',
        name: 'Test Organization',
      },
      tenants: [
        { id: 'test-tenant', name: 'Test Organization' },
      ],
    };

    mockResourceContext = {
      isFeatureEnabled: jest.fn(() => true),
      features: {
        relationship_mapping: true,
        advanced_analytics: true,
        path_discovery: true,
      },
      resourceUsage: {
        memory: 75,
        cpu: 60,
      },
    };

    // Mock API responses
    global.fetch = jest.fn((url) => {
      if (url.includes('/relationships/graph')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRelationshipData),
        });
      }
      if (url.includes('/relationships/path')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPathData),
        });
      }
      if (url.includes('/relationships/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            networkDensity: 0.45,
            averagePathLength: 2.3,
            centralityScores: {
              betweenness: { '2': 0.8 },
              closeness: { '1': 0.7 },
            },
            clusters: 3,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TenantContext.Provider value={mockTenantContext}>
            <ResourceContext.Provider value={mockResourceContext}>
              {component}
            </ResourceContext.Provider>
          </TenantContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    test('renders relationship mapping page header', async () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByText(/relationship mapping/i)).toBeInTheDocument();
      expect(screen.getByText(/hybrid visualization/i)).toBeInTheDocument();
    });

    test('renders tab navigation', async () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByRole('tab', { name: /hybrid map/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /path discovery/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /network analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
    });

    test('displays hybrid map by default', async () => {
      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
        expect(screen.getByTestId('force-graph')).toBeInTheDocument();
      });
    });

    test('shows loading state while fetching data', () => {
      global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByText(/loading relationship data/i)).toBeInTheDocument();
    });
  });

  describe('Hybrid Map View', () => {
    test('renders both geographic and network visualizations', async () => {
      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
        expect(screen.getByTestId('force-graph')).toBeInTheDocument();
      });
    });

    test('displays relationship nodes on map', async () => {
      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        const markers = screen.getAllByTestId('marker');
        expect(markers).toHaveLength(3);
      });
    });

    test('shows connection lines between related entities', async () => {
      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        const polylines = screen.getAllByTestId('polyline');
        expect(polylines).toHaveLength(2);
      });
    });

    test('renders filter controls', async () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByLabelText(/node type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/strength threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/geographic bounds/i)).toBeInTheDocument();
    });

    test('applies filters to visualization', async () => {
      renderWithProviders(<RelationshipMapping />);

      const nodeTypeFilter = screen.getByLabelText(/node type/i);
      await user.selectOptions(nodeTypeFilter, 'person');

      await waitFor(() => {
        // Verify API called with filter parameters
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('nodeType=person'),
          expect.any(Object)
        );
      });
    });

    test('toggles between map and network views', async () => {
      renderWithProviders(<RelationshipMapping />);

      const viewToggle = screen.getByRole('button', { name: /network view/i });
      await user.click(viewToggle);

      await waitFor(() => {
        expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
        expect(screen.getByTestId('force-graph')).toBeInTheDocument();
      });
    });
  });

  describe('Path Discovery Tab', () => {
    test('renders path discovery interface', async () => {
      renderWithProviders(<RelationshipMapping />);

      const pathTab = screen.getByRole('tab', { name: /path discovery/i });
      await user.click(pathTab);

      await waitFor(() => {
        expect(screen.getByText(/find connection path/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/start node/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end node/i)).toBeInTheDocument();
      });
    });

    test('performs path discovery search', async () => {
      renderWithProviders(<RelationshipMapping />);

      const pathTab = screen.getByRole('tab', { name: /path discovery/i });
      await user.click(pathTab);

      await waitFor(() => {
        const startNode = screen.getByLabelText(/start node/i);
        const endNode = screen.getByLabelText(/end node/i);
        const searchButton = screen.getByRole('button', { name: /find path/i });

        user.selectOptions(startNode, '1');
        user.selectOptions(endNode, '3');
        user.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/path found/i)).toBeInTheDocument();
        expect(screen.getByText(/confidence: 85%/i)).toBeInTheDocument();
      });
    });

    test('displays path steps and analysis', async () => {
      renderWithProviders(<RelationshipMapping />);

      const pathTab = screen.getByRole('tab', { name: /path discovery/i });
      await user.click(pathTab);

      // Trigger path search
      await waitFor(() => {
        const searchButton = screen.getByRole('button', { name: /find path/i });
        user.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
        expect(screen.getByText(/foundation a/i)).toBeInTheDocument();
        expect(screen.getByText(/sarah johnson/i)).toBeInTheDocument();
        expect(screen.getByText(/2-3 weeks/i)).toBeInTheDocument();
      });
    });

    test('handles algorithm selection', async () => {
      renderWithProviders(<RelationshipMapping />);

      const pathTab = screen.getByRole('tab', { name: /path discovery/i });
      await user.click(pathTab);

      await waitFor(() => {
        const algorithmSelect = screen.getByLabelText(/algorithm/i);
        user.selectOptions(algorithmSelect, 'dijkstra');
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('dijkstra')).toBeInTheDocument();
      });
    });
  });

  describe('Network Analytics Tab', () => {
    test('renders analytics dashboard', async () => {
      renderWithProviders(<RelationshipMapping />);

      const analyticsTab = screen.getByRole('tab', { name: /network analytics/i });
      await user.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByText(/network statistics/i)).toBeInTheDocument();
        expect(screen.getByText(/centrality analysis/i)).toBeInTheDocument();
      });
    });

    test('displays network metrics', async () => {
      renderWithProviders(<RelationshipMapping />);

      const analyticsTab = screen.getByRole('tab', { name: /network analytics/i });
      await user.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByText(/density: 45%/i)).toBeInTheDocument();
        expect(screen.getByText(/average path: 2.3/i)).toBeInTheDocument();
        expect(screen.getByText(/clusters: 3/i)).toBeInTheDocument();
      });
    });

    test('renders centrality charts', async () => {
      renderWithProviders(<RelationshipMapping />);

      const analyticsTab = screen.getByRole('tab', { name: /network analytics/i });
      await user.click(analyticsTab);

      await waitFor(() => {
        expect(screen.getByText(/betweenness centrality/i)).toBeInTheDocument();
        expect(screen.getByText(/closeness centrality/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API fails', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByText(/error loading relationship data/i)).toBeInTheDocument();
      });
    });

    test('shows retry button on error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    test('handles network connectivity issues', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Feature Availability', () => {
    test('disables advanced features when resource-limited', async () => {
      mockResourceContext.isFeatureEnabled = jest.fn((feature) => 
        feature !== 'path_discovery'
      );

      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByRole('tab', { name: /path discovery/i })).toBeDisabled();
      expect(screen.getByText(/feature temporarily disabled/i)).toBeInTheDocument();
    });

    test('shows resource usage warning', async () => {
      mockResourceContext.resourceUsage = {
        memory: 85,
        cpu: 80,
      };

      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByText(/high resource usage/i)).toBeInTheDocument();
    });

    test('enables all features when resources available', async () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByRole('tab', { name: /hybrid map/i })).not.toBeDisabled();
      expect(screen.getByRole('tab', { name: /path discovery/i })).not.toBeDisabled();
      expect(screen.getByRole('tab', { name: /network analytics/i })).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('implements proper ARIA labels', () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Relationship mapping views');
      expect(screen.getByLabelText(/node type filter/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<RelationshipMapping />);

      const firstTab = screen.getByRole('tab', { name: /hybrid map/i });
      const secondTab = screen.getByRole('tab', { name: /path discovery/i });

      firstTab.focus();
      expect(firstTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(secondTab).toHaveFocus();
    });

    test('provides screen reader descriptions', () => {
      renderWithProviders(<RelationshipMapping />);

      expect(screen.getByLabelText(/geographic map showing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/network graph displaying/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('handles large datasets efficiently', async () => {
      const largeDataset = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          name: `Entity ${i}`,
          type: i % 2 === 0 ? 'person' : 'organization',
          position: { lat: 40 + Math.random(), lng: -74 + Math.random() },
        })),
        links: Array.from({ length: 500 }, (_, i) => ({
          source: `node-${i}`,
          target: `node-${i + 1}`,
          strength: Math.random(),
        })),
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(largeDataset),
        })
      );

      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        const forceGraph = screen.getByTestId('force-graph');
        expect(forceGraph).toHaveAttribute('data-nodes', '1000');
        expect(forceGraph).toHaveAttribute('data-links', '500');
      });
    });

    test('implements data virtualization for large lists', async () => {
      renderWithProviders(<RelationshipMapping />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    test('provides export options', async () => {
      renderWithProviders(<RelationshipMapping />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(screen.getByText(/export as png/i)).toBeInTheDocument();
      expect(screen.getByText(/export as svg/i)).toBeInTheDocument();
      expect(screen.getByText(/export data as csv/i)).toBeInTheDocument();
    });

    test('exports visualization as image', async () => {
      const mockCanvas = {
        toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
      };
      
      global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        canvas: mockCanvas,
      }));

      renderWithProviders(<RelationshipMapping />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const pngOption = screen.getByText(/export as png/i);
      await user.click(pngOption);

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    });
  });
});