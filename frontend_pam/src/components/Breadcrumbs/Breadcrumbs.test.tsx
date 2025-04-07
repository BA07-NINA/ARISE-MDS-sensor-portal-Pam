
import { render, screen, waitFor, act } from '@testing-library/react';
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router';
import Breadcrumbs from '../Breadcrumbs';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

const rootRoute = createRootRoute({
  component: () => (
    <div>
      <Breadcrumbs />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Home</div>,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'devices',
  component: () => <div>Devices</div>,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, devicesRoute]),
  defaultPreload: false,
});

describe('Breadcrumbs component', () => {
  it('renders "Overview" as heading when at root "/"', async () => {
    render(<RouterProvider router={router} />);
    
    await act(async () => {
      await router.navigate({ to: '/' });
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Overview/i })).toBeInTheDocument();
    });
    
    const overviewLink = screen.getByRole('link', { name: /Overview/i });
    expect(overviewLink).toBeInTheDocument();
  });

  it('renders nested breadcrumbs correctly for "/devices"', async () => {
    render(<RouterProvider router={router} />);
    
    await act(async () => {
      await router.navigate({ to: '/devices' });
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Devices/i })).toBeInTheDocument();
    });
    
    const overviewLink = screen.getByRole('link', { name: /Overview/i });
    expect(overviewLink).toBeInTheDocument();
    
    const devicesLink = screen.getByRole('link', { name: /Devices/i });
    expect(devicesLink).toBeInTheDocument();
  });
});