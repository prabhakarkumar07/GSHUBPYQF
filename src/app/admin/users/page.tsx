"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";


type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  subscription_tier: string;
  created_at: string;
};

export default function UsersAdminPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [getToken]);

  const loadUsers = async () => {
    try {
      const token = await getToken({ template: "supabase" });
      const data = await fetchApi("/admin/users", {}, token);
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      const token = await getToken({ template: "supabase" });
      await fetchApi(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      }, token);
      loadUsers();
    } catch (e) {
      alert("Failed to update user");
    }
  };

  const updateTier = async (id: string, subscription_tier: string) => {
    try {
      const token = await getToken({ template: "supabase" });
      await fetchApi(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ subscription_tier })
      }, token);
      loadUsers();
    } catch (e) {
      alert("Failed to update user");
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="container-page py-8">
      <h1 className="h-display text-2xl mb-6">User Management</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-stone-500">
                  {u.id.substring(0,8)}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border p-1"
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border p-1"
                    value={u.subscription_tier}
                    onChange={(e) => updateTier(u.id, e.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
