// src/pages/customer/RestaurantApplicationPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RestaurantApplicationPage from './RestaurantApplicationPage';
import axiosClient from '../../api/axiosClient';

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

describe('RestaurantApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the application form when the user has no application yet', async () => {
    axiosClient.get.mockResolvedValueOnce({ data: { application: null } });

    render(<RestaurantApplicationPage />);

    expect(
      await screen.findByRole('button', { name: /submit application/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/restaurant name/i)).toBeInTheDocument();
  });

  it('shows a PENDING status view instead of the form when an application exists', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        application: {
          id: 'app-1',
          status: 'PENDING',
          name: 'My Restaurant',
          address: '1 Main St',
          city: 'Delhi',
        },
      },
    });

    render(<RestaurantApplicationPage />);

    expect(await screen.findByText(/your restaurant application/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit application/i })
    ).not.toBeInTheDocument();
  });

  it('shows an APPROVED message with congratulations copy', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        application: {
          id: 'app-1',
          status: 'APPROVED',
          name: 'My Restaurant',
          address: '1 Main St',
          city: 'Delhi',
        },
      },
    });

    render(<RestaurantApplicationPage />);

    expect(await screen.findByText(/now live on the platform/i)).toBeInTheDocument();
  });

  it('shows a REJECTED message with the review note when present', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        application: {
          id: 'app-1',
          status: 'REJECTED',
          name: 'My Restaurant',
          address: '1 Main St',
          city: 'Delhi',
          reviewNote: 'Missing documents.',
        },
      },
    });

    render(<RestaurantApplicationPage />);

    expect(await screen.findByText(/was not approved/i)).toBeInTheDocument();
    expect(screen.getByText(/missing documents/i)).toBeInTheDocument();
  });
});