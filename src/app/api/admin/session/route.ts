import { ok } from "@/lib/api/response";
import { isAdminAuthenticated } from "@/lib/auth/admin";

export async function GET() {
  return ok({ authenticated: await isAdminAuthenticated() });
}
