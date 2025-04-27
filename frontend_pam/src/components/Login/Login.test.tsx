import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import LoginPage from './Login';
import AuthContext from '../../auth/AuthContext';

// Dummy login function to stub login behavior
const dummyLoginUser = vi.fn((e) => e.preventDefault());

// Context value for not-logged-in user
const dummyAuthContextNotLogged = { loginUser: dummyLoginUser, user: null };

// Stub navigation hook
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Tests for the LoginPage component
// This test suite checks the rendering and functionality of the LoginPage component
describe('LoginPage component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test that the login form renders all expected elements
  it('renders the login form correctly', () => {
    render(
      <AuthContext.Provider value={dummyAuthContextNotLogged}>
        <LoginPage />
      </AuthContext.Provider>
    );

    expect(screen.getByText(/sign in to your account/i)).toBeDefined();

    expect(screen.getByPlaceholderText(/username/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/password/i)).toBeDefined();


    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  // Test that submitting the form calls the loginUser function
  it('calls loginUser when the form is submitted', () => {
    const { container } = render(
      <AuthContext.Provider value={dummyAuthContextNotLogged}>
        <LoginPage />
      </AuthContext.Provider>
    );

    const form = container.querySelector('form');
    fireEvent.submit(form!);

    expect(dummyLoginUser).toHaveBeenCalled();
  });
});