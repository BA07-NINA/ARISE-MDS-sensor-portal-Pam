import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthContext from '@/auth/AuthContext';  

// Mock the Link component from tanstack router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string, children: React.ReactNode, className?: string }) => (
    <a href={to} className={className}>{children}</a>
  )
}));

// Import the Navbar component after mocking dependencies
import Navbar from './Navbar';

describe('Navbar component', () => {
  // Set up a complete mock for the Auth context
  const mockUser = { username: 'john_doe', email: 'john@example.com' };
  const mockLogoutUser = vi.fn();
  const mockLoginUser = vi.fn();
  const mockAuthContextValue = {
    user: mockUser,
    logoutUser: mockLogoutUser,
    loginUser: mockLoginUser,
    authTokens: { access: 'fake-token', refresh: 'fake-refresh-token' },
    useAuth: vi.fn(),
    refreshToken: vi.fn()
  };

  // Test that the logout button is visible and triggers logout when confirmed
  it('shows logout button and handles logout correctly', () => {
    // Stub confirm to always return true
    window.confirm = vi.fn(() => true); 

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Navbar />
      </AuthContext.Provider>
    );

    // Find the logout button
    const logoutButton = screen.getByText('Logout', { exact: false });
    expect(logoutButton).toBeInTheDocument();
    
    // Find the parent button element and click it
    const buttonElement = logoutButton.closest('button');
    if (buttonElement) {
      fireEvent.click(buttonElement);
      expect(mockLogoutUser).toHaveBeenCalledTimes(1);
    }
  });

  // Test that Navbar renders expected links/text
  it('renders links correctly', () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Navbar />
      </AuthContext.Provider>
    );

    // Check for PAM text
    expect(screen.getByText('PAM')).toBeInTheDocument();
    
    // Check for username
    expect(screen.getByText('john_doe')).toBeInTheDocument();
    
    // Check for logout button
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
