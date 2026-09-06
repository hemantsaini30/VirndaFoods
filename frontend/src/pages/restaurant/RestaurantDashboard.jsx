import { useEffect, useState, useCallback } from 'react';
import restaurantsApi from '../../api/endpoints/restaurantsApi';
import menuApi from '../../api/endpoints/menuApi';
import uploadsApi from '../../api/endpoints/uploadsApi';
import ConfirmModal from '../../components/common/ConfirmModal';

const TABS = ['profile', 'menu'];

export default function RestaurantDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [restaurant, setRestaurant] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  const loadRestaurant = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const res = await restaurantsApi.getMine();
      setRestaurant(res.data.restaurant);
      setLoadStatus('success');
    } catch {
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  if (loadStatus === 'loading') return <p className="text-gray-500">Loading your restaurant…</p>;
  if (loadStatus === 'error' || !restaurant) {
    return (
      <p className="text-red-600">
        Couldn't find your restaurant. Make sure your restaurant application has been approved.
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">{restaurant.name}</h1>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <ProfileTab restaurant={restaurant} onUpdated={setRestaurant} />
      )}
      {activeTab === 'menu' && <MenuTab restaurant={restaurant} />}
    </div>
  );
}

// ── Profile tab ──────────────────────────────────────────────────────────

function ProfileTab({ restaurant, onUpdated }) {
  const [form, setForm] = useState({
    name: restaurant.name,
    address: restaurant.address,
    city: restaurant.city,
    imageUrl: restaurant.imageUrl || '',
  });
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'success' | 'error'
  const [uploadStatus, setUploadStatus] = useState('idle');

  async function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus('uploading');
    try {
      const url = await uploadsApi.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      setUploadStatus('success');
    } catch {
      setUploadStatus('error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const res = await restaurantsApi.updateProfile(restaurant.id, form);
      onUpdated(res.data.restaurant);
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Image</label>
        {form.imageUrl && (
          <img src={form.imageUrl} alt="" className="my-2 h-24 w-24 rounded object-cover" />
        )}
        <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
        {uploadStatus === 'uploading' && <p className="text-sm text-gray-500">Uploading…</p>}
        {uploadStatus === 'error' && <p className="text-sm text-red-600">Upload failed.</p>}
      </div>

      <button
        type="submit"
        disabled={saveStatus === 'saving'}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saveStatus === 'saving' ? 'Saving…' : 'Save changes'}
      </button>
      {saveStatus === 'success' && <p className="text-sm text-green-600">Saved.</p>}
      {saveStatus === 'error' && <p className="text-sm text-red-600">Couldn't save. Try again.</p>}
    </form>
  );
}

// ── Menu tab ──────────────────────────────────────────────────────────────

function MenuTab({ restaurant }) {
  const [categories, setCategories] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'category'|'item', id, name }

  const loadMenu = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const res = await menuApi.getMenu(restaurant.id, { includeUnavailable: true });
      setCategories(res.data.categories);
      setLoadStatus('success');
    } catch {
      setLoadStatus('error');
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await menuApi.createCategory(restaurant.id, { name: newCategoryName.trim() });
      setNewCategoryName('');
      loadMenu();
    } catch {
      setConflictMessage("Couldn't add category. Please try again.");
    }
  }

  // Called by ConfirmModal's onConfirm, which always passes a `note`
  // string (possibly empty) — see ConfirmModal.jsx. We don't use notes for
  // menu deletions, so it's accepted and ignored here.
  async function confirmDelete() {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      if (target.type === 'category') {
        await menuApi.deleteCategory(target.id);
      } else {
        await menuApi.deleteItem(target.id);
      }
      loadMenu();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictMessage(
          target.type === 'category'
            ? 'This category still has items in it — remove them first.'
            : 'This item has been ordered before and cannot be deleted.'
        );
      } else {
        setConflictMessage("Couldn't delete. Please try again.");
      }
    }
  }

  if (loadStatus === 'loading') return <p className="text-gray-500">Loading menu…</p>;
  if (loadStatus === 'error') {
    return <p className="text-red-600">Couldn't load your menu. Please try again.</p>;
  }

  return (
    <div>
      {conflictMessage && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {conflictMessage}
          <button
            type="button"
            onClick={() => setConflictMessage('')}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleAddCategory} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Add category
        </button>
      </form>

      {categories.length === 0 && (
        <p className="text-gray-500">No categories yet — add one above to get started.</p>
      )}

      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          restaurant={restaurant}
          onChanged={loadMenu}
          onConflict={setConflictMessage}
          onRequestDelete={(type, id, name) => setDeleteTarget({ type, id, name })}
        />
      ))}

      {/* FIX: ConfirmModal has no isOpen prop — it renders unconditionally
          whenever it's mounted at all. Visibility must be controlled by
          whether we render it in the tree, not by a prop we pass it. This
          was the bug: the modal was always mounted (with a null
          deleteTarget) and rendering immediately on tab switch, showing
          "undefined" because deleteTarget?.name had nothing to read. */}
      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.type === 'category' ? 'category' : 'item'}?`}
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function CategorySection({ category, restaurant, onChanged, onConflict, onRequestDelete }) {
  const [showAddItem, setShowAddItem] = useState(false);

  return (
    <div className="mb-6 rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{category.name}</h3>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowAddItem((v) => !v)}
            className="text-blue-600 hover:underline"
          >
            {showAddItem ? 'Cancel' : 'Add item'}
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete('category', category.id, category.name)}
            className="text-red-600 hover:underline"
          >
            Delete category
          </button>
        </div>
      </div>

      {showAddItem && (
        <AddItemForm
          restaurantId={restaurant.id}
          categoryId={category.id}
          onAdded={() => {
            setShowAddItem(false);
            onChanged();
          }}
        />
      )}

      <ul className="mt-3 divide-y divide-gray-100">
        {category.foodItems.map((item) => (
          <FoodItemRow
            key={item.id}
            item={item}
            onChanged={onChanged}
            onConflict={onConflict}
            onRequestDelete={() => onRequestDelete('item', item.id, item.name)}
          />
        ))}
        {category.foodItems.length === 0 && (
          <li className="py-2 text-sm text-gray-500">No items in this category yet.</li>
        )}
      </ul>
    </div>
  );
}

function AddItemForm({ restaurantId, categoryId, onAdded }) {
  const [name, setName] = useState('');
  const [priceInRupees, setPriceInRupees] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('saving');
    try {
      await menuApi.createItem(restaurantId, {
        categoryId,
        name,
        description: description || undefined,
        priceInRupees: Number(priceInRupees),
      });
      setName('');
      setPriceInRupees('');
      setDescription('');
      onAdded();
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 flex flex-wrap items-end gap-2 border-b border-gray-100 pb-3">
      <div>
        <label className="block text-xs text-gray-500">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Price (₹)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={priceInRupees}
          onChange={(e) => setPriceInRupees(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        Add
      </button>
      {status === 'error' && <p className="text-sm text-red-600">Couldn't add item.</p>}
    </form>
  );
}

function FoodItemRow({ item, onChanged, onConflict, onRequestDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [priceInRupees, setPriceInRupees] = useState(item.priceInRupees);
  const [saveStatus, setSaveStatus] = useState('idle');

  async function handleSaveEdit() {
    setSaveStatus('saving');
    try {
      await menuApi.updateItem(item.id, {
        name,
        priceInRupees: Number(priceInRupees),
        version: item.version,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      if (err.response?.status === 409) {
        onConflict('This item was updated elsewhere — refresh and try again.');
        setEditing(false);
      } else {
        setSaveStatus('error');
      }
    }
  }

  async function handleToggleAvailability() {
    try {
      await menuApi.updateAvailability(item.id, {
        isAvailable: !item.isAvailable,
        version: item.version,
      });
      onChanged();
    } catch (err) {
      if (err.response?.status === 409) {
        onConflict('This item was updated elsewhere — refresh and try again.');
      } else {
        onConflict("Couldn't update availability. Please try again.");
      }
    }
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={priceInRupees}
          onChange={(e) => setPriceInRupees(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={handleSaveEdit}
          disabled={saveStatus === 'saving'}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          Cancel
        </button>
        {saveStatus === 'error' && <p className="text-sm text-red-600">Couldn't save.</p>}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div>
        <p className={`text-sm font-medium ${item.isAvailable ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
          {item.name}
        </p>
        <p className="text-sm text-gray-500">₹{item.priceInRupees.toFixed(2)}</p>
      </div>
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setEditing(true)} className="text-blue-600 hover:underline">
          Edit
        </button>
        <button type="button" onClick={handleToggleAvailability} className="text-gray-700 hover:underline">
          {item.isAvailable ? 'Mark unavailable' : 'Mark available'}
        </button>
        <button type="button" onClick={onRequestDelete} className="text-red-600 hover:underline">
          Delete
        </button>
      </div>
    </li>
  );
}