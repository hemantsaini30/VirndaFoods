import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RestaurantDashboard from './RestaurantDashboard';
import restaurantsApi from '../../api/endpoints/restaurantsApi';
import menuApi from '../../api/endpoints/menuApi';

vi.mock('../../api/endpoints/restaurantsApi');
vi.mock('../../api/endpoints/menuApi');
vi.mock('../../api/endpoints/uploadsApi');

const mockRestaurant = {
  id: 'rest-1',
  name: 'Test Restaurant',
  address: '123 Main St',
  city: 'Delhi',
  imageUrl: null,
  status: 'ACTIVE',
};

const mockMenu = [
  {
    id: 'cat-1',
    name: 'Starters',
    foodItems: [
      {
        id: 'item-1',
        name: 'Spring Rolls',
        priceInRupees: 149,
        isAvailable: true,
        version: 0,
      },
    ],
  },
];

describe('RestaurantDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restaurantsApi.getMine.mockResolvedValue({ data: { restaurant: mockRestaurant } });
    menuApi.getMenu.mockResolvedValue({ data: { categories: mockMenu } });
  });

  it('loads and renders the restaurant profile on mount', async () => {
    render(<RestaurantDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });
    expect(restaurantsApi.getMine).toHaveBeenCalledTimes(1);
  });

  it('shows an error state when the restaurant cannot be loaded', async () => {
    restaurantsApi.getMine.mockRejectedValue(new Error('not found'));
    render(<RestaurantDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't find your restaurant/i)).toBeInTheDocument();
    });
  });

  it('switches to the menu tab and calls getMenu with includeUnavailable', async () => {
    const user = userEvent.setup();
    render(<RestaurantDashboard />);

    await waitFor(() => screen.getByText('Test Restaurant'));
    await user.click(screen.getByRole('button', { name: /menu/i }));

    await waitFor(() => {
      expect(menuApi.getMenu).toHaveBeenCalledWith('rest-1', { includeUnavailable: true });
    });
    expect(screen.getByText('Spring Rolls')).toBeInTheDocument();
  });

  it('shows a graceful message on a 409 optimistic-lock conflict, not a raw error', async () => {
    const user = userEvent.setup();
    const conflictError = { response: { status: 409 } };
    menuApi.updateAvailability.mockRejectedValue(conflictError);

    render(<RestaurantDashboard />);
    await waitFor(() => screen.getByText('Test Restaurant'));
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() => screen.getByText('Spring Rolls'));

    await user.click(screen.getByRole('button', { name: /mark unavailable/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/updated elsewhere.*refresh and try again/i)
      ).toBeInTheDocument();
    });
    // Confirming this is the graceful message, not a dumped error object.
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it('calls createCategory with the entered name and refetches the menu', async () => {
    const user = userEvent.setup();
    menuApi.createCategory.mockResolvedValue({ data: { category: { id: 'cat-2', name: 'Mains' } } });

    render(<RestaurantDashboard />);
    await waitFor(() => screen.getByText('Test Restaurant'));
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() => screen.getByText('Spring Rolls'));

    await user.type(screen.getByPlaceholderText(/new category name/i), 'Mains');
    await user.click(screen.getByRole('button', { name: /add category/i }));

    await waitFor(() => {
      expect(menuApi.createCategory).toHaveBeenCalledWith('rest-1', { name: 'Mains' });
    });
    // getMenu called once on tab switch + once again after the add = refetch confirmed.
    await waitFor(() => {
      expect(menuApi.getMenu).toHaveBeenCalledTimes(2);
    });
  });

  // ── Delete confirmation modal — added after a real bug was found where
  // ConfirmModal rendered unconditionally (no isOpen prop exists on the
  // real component) the moment MenuTab mounted, before any delete button
  // was clicked. These tests exist specifically to catch a regression of
  // that: the modal must be ABSENT until a delete is actually requested,
  // and must show real data (not "undefined") once it appears.
  it('does NOT show the delete confirmation modal on initial menu-tab render', async () => {
    const user = userEvent.setup();
    render(<RestaurantDashboard />);

    await waitFor(() => screen.getByText('Test Restaurant'));
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() => screen.getByText('Spring Rolls'));

    expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
  });

  it('shows the delete confirmation modal with the real item name when Delete is clicked, and deletes on confirm', async () => {
    const user = userEvent.setup();
    menuApi.deleteItem.mockResolvedValue({});

    render(<RestaurantDashboard />);
    await waitFor(() => screen.getByText('Test Restaurant'));
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() => screen.getByText('Spring Rolls'));

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    // Modal should now show the REAL item name, never "undefined".
    expect(
      screen.getByText(/are you sure you want to delete "spring rolls"/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(menuApi.deleteItem).toHaveBeenCalledWith('item-1');
    });
    // Modal should be gone again after confirming.
    expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
  });
});