import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import restaurantsApi from '../../api/endpoints/restaurantsApi';

// Extended in Phase 5 with search (?q=) and sort — the city filter,
// loading/empty/error states, and pagination controls are unchanged from
// Phase 4.
export default function RestaurantsListPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [city, setCity] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState(''); // debounced value actually sent to the API
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  // Debounce the search box: firing a request on every keystroke would
  // spam the API while the user is still typing. 400ms is a common,
  // unintrusive delay — long enough to skip most keystrokes, short enough
  // that results still feel responsive once typing pauses.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    restaurantsApi
      .list({
        city: city || undefined,
        q: q || undefined,
        sort: sort === 'newest' ? undefined : sort, // 'newest' is the API's own default
        page,
        limit: 12,
      })
      .then((res) => {
        if (cancelled) return;
        setRestaurants(res.data.restaurants);
        setPagination(res.data.pagination);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [city, q, sort, page]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Restaurants</h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search restaurants…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      {status === 'loading' && <p className="text-gray-500">Loading restaurants…</p>}
      {status === 'error' && (
        <p className="text-red-600">Couldn't load restaurants. Please try again.</p>
      )}

      {status === 'success' && restaurants.length === 0 && (
        <p className="text-gray-500">No restaurants found.</p>
      )}

      {status === 'success' && restaurants.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id} className="rounded border border-gray-200 bg-white p-4">
                <Link to={`/restaurants/${restaurant.id}`} className="block">
                  {restaurant.imageUrl && (
                    <img
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      className="mb-3 h-32 w-full rounded object-cover"
                    />
                  )}
                  <h2 className="font-medium text-gray-900">{restaurant.name}</h2>
                  <p className="text-sm text-gray-500">{restaurant.city}</p>
                </Link>
              </li>
            ))}
          </ul>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}