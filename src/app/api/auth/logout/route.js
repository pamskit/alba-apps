import { clearSessionCookie } from "@/utils/session";
import { jsonSuccess } from "@/utils/api";

export async function POST() {
  return jsonSuccess({}, 200, {
    "Set-Cookie": clearSessionCookie(),
  });
}
