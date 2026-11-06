import { requireDesk } from "./auth";
import { redirectTo } from "./http";

export function deskGuard(request: Request) {
  const denied = requireDesk(request);
  if (!denied) return null;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) return redirectTo("/desk/login");
  return denied;
}
