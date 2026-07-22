/** Minimal Cloudflare Workers / Pages Function types for local TS checking. */
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

interface EventContext<Env = unknown, P extends string = string, Data = unknown> {
  request: Request
  env: Env
  params: Record<P, string | string[]>
  data: Data
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
  waitUntil: (promise: Promise<unknown>) => void
}

type PagesFunction<
  Env = unknown,
  P extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: EventContext<Env, P, Data>) => Response | Promise<Response>
