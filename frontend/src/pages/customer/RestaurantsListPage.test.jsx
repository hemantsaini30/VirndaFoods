import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RestaurantsListPage from './RestaurantsListPage';
import restaurantsApi from '../../api/endpoints/restaurantsApi';

vi.mock('../../api/endpoints/restaurantsApi');

const mockRestaurants = [
  { id: 'r1', name: 'Pizza Place', city: 'Delhi', imageUrl: null },
  { id: 'r2', name: 'Sushi Spot', city: 'Delhi', imageUrl: null },
];

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('RestaurantsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the list of restaurants on load', async () => {
    restaurantsApi.list.mockResolvedValue({
      data: {
        restaurants: mockRestaurants,
        pagination: { page: 1, limit: 12, total: 2, totalPages: 1 },
      },
    });

    renderWithRouter(<RestaurantsListPage />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Place')).toBeInTheDocument();
      expect(screen.getByText('Sushi Spot')).toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no restaurants', async () => {
    restaurantsApi.list.mockResolvedValue({
      data: { restaurants: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } },
    });

    renderWithRouter(<RestaurantsListPage />);

    await waitFor(() => {
      expect(screen.getByText(/no restaurants found/i)).toBeInTheDocument();
    });
  });

  it('shows an error state when the request fails', async () => {
    restaurantsApi.list.mockRejectedValue(new Error('network error'));

    renderWithRouter(<RestaurantsListPage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load restaurants/i)).toBeInTheDocument();
    });
  });
});