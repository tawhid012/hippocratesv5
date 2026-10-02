import { apiError, ok, parseJsonError } from "@/lib/api/response";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth/admin";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return parseJsonError();
  }

  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return apiError("Username and password are required.", 400);
  }

  try {
    const valid = await verifyAdminCredentials(username, password);
    if (!valid) return apiError("Invalid credentials.", 401);

    await createAdminSession(username);
    return ok({ authenticated: true });
  } catch {
    return apiError("Unable to authenticate admin.", 500);
  }
}
