import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentMap from './DeploymentMap';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  FeatureGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="feature-group">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
}));

vi.mock('@adamscybot/react-leaflet-component-marker', () => ({
  Marker: ({ children, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="marker" onClick={props.onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../MapUserLocationMarker', () => ({
  default: () => <div data-testid="user-location-marker">User Location Marker</div>
}));

vi.mock('../MapControlResetLocation', () => ({
  default: ({ handleChangeLatLong }: { handleChangeLatLong: () => void }) => (
    <button data-testid="reset-location-button" onClick={handleChangeLatLong}>
      Reset
    </button>
  )
}));

// Updated mockDeployments with missing properties added
const mockDeployments = [
  {
    deploymentId: "1",
    startDate: "2024-12-01T10:00:00Z",
    endDate: "2025-12-01T10:00:00Z",
    lastUpload: "2025-01-01T10:00:00Z",
    batteryLevel: 95,
    siteName: "Test Site",
    folderSize: 1024,
    coordinateUncertainty: "5",
    gpsDevice: "Garmin",
    micHeight: 1.5,
    micDirection: "",
    latitude: 59.910000,
    longitude: 10.750000,
    habitat: "Forest",
    protocolChecklist: "",
    score: 100,
    comment: "",
    action: "active",
    userEmail: "test@example.com",
    country: "Norway",
  },
];

// Create testable routes using @tanstack/react-router.
const rootRoute = createRootRoute({
  component: () => <DeploymentMap deployments={mockDeployments} />,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <DeploymentMap deployments={mockDeployments} />,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  defaultPreload: false,
  context: {},
});

describe('DeploymentMap component', () => {
  it('renders markers for each deployment', async () => {
    render(<RouterProvider router={router} />);
    await screen.findByTestId('map-container');

    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBe(mockDeployments.length);
  });

  it('shows popup with link when marker is clicked', async () => {
    render(<RouterProvider router={router} />);
    await screen.findByTestId('map-container');

    const marker = screen.getByTestId('marker');
    fireEvent.click(marker);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });

    // The link should display "View Site: Test Site"
    expect(screen.getByText(/View Site: Test Site/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /View Site: Test Site/i });
    expect(link).toBeInTheDocument();
  });

  it('renders user location marker and reset button', async () => {
    render(<RouterProvider router={router} />);
    await screen.findByTestId('map-container');

    expect(screen.getByTestId('user-location-marker')).toBeInTheDocument();
    expect(screen.getByTestId('reset-location-button')).toBeInTheDocument();
  });
});