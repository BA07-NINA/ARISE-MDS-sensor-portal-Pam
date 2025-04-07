import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import LoginPage from './Login';
import AuthContext from '../../auth/AuthContext';

const dummyLoginUser = vi.fn((e) => e.preventDefault());

const dummyAuthContextNotLogged = { loginUser: dummyLoginUser, user: null };

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('LoginPage component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

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