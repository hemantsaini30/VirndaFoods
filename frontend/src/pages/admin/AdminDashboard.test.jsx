// src/pages/admin/AdminDashboard.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import axiosClient from '../../api/axiosClient';

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

const pendingRestaurantApp = {
  id: 'app-1',
  status: 'PENDING',
  name: 'Test Restaurant',
  city: 'Delhi',
};

function mockInitialLoad({ restaurantApps = [], driverApps = [] } = {}) {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/restaurant-applications') {
      return Promise.resolve({ data: { applications: restaurantApps } });
    }
    if (url === '/delivery-partner-applications') {
      return Promise.resolve({ data: { applications: driverApps } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the restaurant applications table on load', async () => {
    mockInitialLoad({ restaurantApps: [pendingRestaurantApp] });

    render(<AdminDashboard />);

    expect(await screen.findByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no active applications', async () => {
    mockInitialLoad();

    render(<AdminDashboard />);

    expect(
      await screen.findByText(/no pending or under-review applications/i)
    ).toBeInTheDocument();
  });

  it('calls PATCH with UNDER_REVIEW and refetches when "Move to review" is clicked', async () => {
    mockInitialLoad({ restaurantApps: [pendingRestaurantApp] });
    axiosClient.patch.mockResolvedValueOnce({
      data: { application: { ...pendingRestaurantApp, status: 'UNDER_REVIEW' } },
    });

    render(<AdminDashboard />);
    const user = userEvent.setup();

    const reviewButton = await screen.findByRole('button', { name: /move to review/i });
    await user.click(reviewButton);

    await waitFor(() => {
      expect(axiosClient.patch).toHaveBeenCalledWith('/restaurant-applications/app-1/status', {
        status: 'UNDER_REVIEW',
        reviewNote: undefined,
      });
    });

    // Two GET calls to the same endpoint (mount + post-action refetch)
    // confirms this is a real refetch, not just an optimistic local update.
    const restaurantGetCalls = axiosClient.get.mock.calls.filter(
      ([url]) => url === '/restaurant-applications'
    );
    expect(restaurantGetCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows a confirmation modal before rejecting, and calls PATCH with REJECTED on confirm', async () => {
    mockInitialLoad({ restaurantApps: [pendingRestaurantApp] });
    axiosClient.patch.mockResolvedValueOnce({
      data: { application: { ...pendingRestaurantApp, status: 'REJECTED' } },
    });

    render(<AdminDashboard />);
    const user = userEvent.setup();

    const rejectButton = await screen.findByRole('button', { name: /^reject$/i });
    await user.click(rejectButton);

    expect(await screen.findByText(/reject this application/i)).toBeInTheDocument();

    const confirmButton = screen.getAllByRole('button', { name: /^reject$/i })[1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(axiosClient.patch).toHaveBeenCalledWith('/restaurant-applications/app-1/status', {
        status: 'REJECTED',
        reviewNote: '',
      });
    });
  });

  it('switches to the delivery partner tab and renders its applications', async () => {
    mockInitialLoad({
      driverApps: [{ id: 'app-2', status: 'PENDING', vehicleType: 'Bike' }],
    });

    render(<AdminDashboard />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /delivery partner applications/i }));

    expect(await screen.findByText('Bike')).toBeInTheDocument();
  });
});