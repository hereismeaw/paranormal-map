export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
    public extra?: unknown,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', ...headers },
  });
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').origin;
  if (request.headers.get('origin') !== expected) throw new ApiError(403, 'ต้นทางคำขอไม่ถูกต้อง');
}
export async function body(request: Request, limit = 24000) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'ต้องส่งข้อมูล JSON');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'ไม่พบข้อมูล');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new ApiError(413, 'ข้อมูลมีขนาดใหญ่เกินไป');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ApiError(400, 'ข้อมูล JSON ไม่ถูกต้อง');
  }
}
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError)
      return json(
        { error: error.message, details: error.extra },
        error.status,
        error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {},
      );
    if (error instanceof Error && error.name === 'ZodError')
      return json(
        { error: 'กรุณาตรวจสอบข้อมูลในแบบฟอร์ม', details: JSON.parse(error.message) },
        400,
      );
    console.error('Request failed', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองอีกครั้ง' }, 503);
  }
}
