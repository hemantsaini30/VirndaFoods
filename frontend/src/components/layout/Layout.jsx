import Navbar from './Navbar';

// Wraps every route so the nav bar renders once, consistently, rather
// than being duplicated (or forgotten) on individual pages.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}