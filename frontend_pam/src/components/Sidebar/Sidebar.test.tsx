// Import test utilities
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

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
  // Check that the "Overview" link is present
  it('renders sidebar with Overview link', () => {
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
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
