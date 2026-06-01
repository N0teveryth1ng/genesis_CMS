import { cookies } from "next/headers";

export const WORKSPACE_COOKIE = "genesis-ws";

export async function getActiveWorkspaceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceId(id: string | null): Promise<void> {
  const jar = await cookies();
  if (id) {
    jar.set(WORKSPACE_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  } else {
    jar.delete(WORKSPACE_COOKIE);
  }
}
