'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import Link from 'next/link';

const menuItems = [
  { label: 'دسته‌بندی‌ها', href: '/admin/categories' },
  { label: 'کتاب‌ها', href: '/admin/books' },
  { label: 'کاربران', href: '/admin/users' },
  { label: 'پلن‌های اشتراک', href: '/admin/plans' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.replace('/');
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen font-vazir">
        در حال بررسی دسترسی...
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex h-screen font-vazir" dir="rtl">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-lg font-bold mb-6">پنل مدیریت</h2>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded hover:bg-gray-700 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
