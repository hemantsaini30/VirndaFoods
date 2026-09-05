// src/pages/auth/Login.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The AuthProvider calls /auth/refresh on mount to try to recover a
    // session — make it fail cleanly so tests start in a logged-out state.
    axiosClient.post.mockRejectedValueOnce(new Error('no session'));
  });

  it('renders email and password fields', async () => {
    renderLogin();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows a validation error when submitting an empty form', async () => {
    renderLogin();
    const user = userEvent.setup();

    const submitButton = await screen.findByRole('button', { name: /log in/i });
    await user.click(submitButton);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('calls the login API with entered credentials on valid submit', async () => {
    renderLogin();
    const user = userEvent.setup();

    // Resolve the *next* call (the actual login submission).
    axiosClient.post.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'jane@example.com', role: 'CUSTOMER' }, accessToken: 'fake-token' },
    });

    await user.type(await screen.findByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(axiosClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@example.com',
        password: 'Password123',
      });
    });
  });
});