// Import test utilities
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from './Sidebar';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { FaHome } from 'react-icons/fa';

// Set up a basic router with Sidebar as part of the root route
const rootRoute = createRootRoute({
  component: () => <div><Sidebar /></div>,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Home</div>,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  defaultPreload: false,
  defaultPendingComponent: () => <div>Loading...</div>,
  defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
  context: {},
});

// Tests for Sidebar
describe('Sidebar component', () => {
  // Check that the navigation is present by looking for links
  it('renders sidebar with navigation links', async () => {
    render(<RouterProvider router={router} />);
    
    // Wait for any async rendering to complete
    await waitFor(() => {
      // Check for at least one link in the sidebar
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  // Verify that clicking the toggle button collapses the sidebar
  it('toggles collapse state when the toggle button is clicked', () => {
    render(<RouterProvider router={router} />);

    const sidebarContainer = screen.getByTestId('sidebar-container');

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    expect(sidebarContainer.className).toContain('w-16');
  });
});
