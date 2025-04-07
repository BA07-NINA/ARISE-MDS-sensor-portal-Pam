import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import AuthContext from '@/auth/AuthContext';  


const rootRoute = createRootRoute({
  component: () => <div><Navbar /></div>,  
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

describe('Navbar component', () => {
  const mockUser = { username: 'john_doe' };
  const mockLogoutUser = vi.fn();

  it('shows logout button and handles logout correctly', () => {
    window.confirm = vi.fn(() => true); 

    render(
      <AuthContext.Provider value={{ user: mockUser, logoutUser: mockLogoutUser }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    );

    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    expect(logoutButton).toBeInTheDocument();

    fireEvent.click(logoutButton);

    expect(mockLogoutUser).toHaveBeenCalledTimes(1);
  });

  it('renders links correctly', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser, logoutUser: mockLogoutUser }}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    );

    expect(screen.getByText(/PAM/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });
});
