export function jsonSuccess(data = {}, status = 200, headers = {}) {
  return Response.json({ success: true, ...data }, { status, headers });
}

export function jsonError(error, status = 500, headers = {}) {
  return Response.json({ success: false, error }, { status, headers });
}
