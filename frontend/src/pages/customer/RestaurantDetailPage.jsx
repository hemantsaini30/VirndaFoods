import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import restaurantsApi from '../../api/endpoints/restaurantsApi';
import menuApi from '../../api/endpoints/menuApi';

// Minimal public restaurant + menu view. Browsing only — no "add to cart"
// logic yet (Cart module doesn't exist until a later phase). A disabled
// placeholder button communicates that ordering is coming without
// pretending it works.
export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([restaurantsApi.getById(id), menuApi.getMenu(id)])
      .then(([restaurantRes, menuRes]) => {
        if (cancelled) return;
        setRestaurant(restaurantRes.data.restaurant);
        setCategories(menuRes.data.categories);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') return <p className="text-gray-500">Loading…</p>;
  if (status === 'error') {
    return <p className="text-red-600">Couldn't load this restaurant. Please try again.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        {restaurant.imageUrl && (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="mb-3 h-48 w-full rounded object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold text-gray-900">{restaurant.name}</h1>
        <p className="text-sm text-gray-500">
          {restaurant.address}, {restaurant.city}
        </p>
      </div>

      {categories.length === 0 && (
        <p className="text-gray-500">This restaurant hasn't added any menu items yet.</p>
      )}

      {categories.map((category) => (
        <div key={category.id} className="mb-6">
          <h2 className="mb-2 text-lg font-medium text-gray-900">{category.name}</h2>
          <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {category.foodItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-3">
                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-14 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                    <p className="text-sm text-gray-700">₹{item.priceInRupees.toFixed(2)}</p>
                  </div>
                </div>
                {/* Cart module doesn't exist yet (later phase) — this is a
                    disabled placeholder so it's clear ordering is coming,
                    not silently missing. */}
                <button
                  type="button"
                  disabled
                  className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-400"
                  title="Ordering isn't available yet"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}