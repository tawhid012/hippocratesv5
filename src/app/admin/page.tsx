import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { isAdminAuthenticated } from "@/lib/auth/admin";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  return <AdminPanel />;
}
