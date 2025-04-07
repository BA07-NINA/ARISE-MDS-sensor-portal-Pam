import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeploymentMap from './DeploymentMap';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  FeatureGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="feature-group">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('@adamscybot/react-leaflet-component-marker', () => ({
  Marker: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="marker" onClick={() => {}}>{children}</button>
  ),
}));

vi.mock('../MapUserLocationMarker', () => ({
  default: () => <div data-testid="user-location-marker" />
}));

vi.mock('../MapControlResetLocation', () => ({
  default: ({ handleChangeLatLong }: { handleChangeLatLong: () => void }) => (
    <button data-testid="reset-location-button" onClick={handleChangeLatLong}>
      Reset
    </button>
  )
}));

const mockDeployments = [
  {
    latitude: 59.91,
    longitude: 10.75,
    deployment_device_ID: 'device123',
    extra_data: {
      device_config: {
        device_ID: '123',
      },
    },
  },
];

// Create a testable route
const rootRoute = createRootRoute({
  component: () => <DeploymentMap deployments={mockDeployments as any} />,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <DeploymentMap deployments={mockDeployments as any} />,
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
    fireEvent.click(marker); // Simuler klikking

    await waitFor(() => {
      expect(screen.getByText(/View Device: 123/i)).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /View Device: 123/i });
    expect(link).toHaveAttribute('href', '/devices/123');
  });

  it('renders user location marker and reset button', async () => {
    render(<RouterProvider router={router} />);
    await screen.findByTestId('map-container');

    expect(screen.getByTestId('user-location-marker')).toBeInTheDocument();
    expect(screen.getByTestId('reset-location-button')).toBeInTheDocument();
  });
});
