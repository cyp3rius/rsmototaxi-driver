import { proxyToOm } from '@/lib/server/omProxy'

type Ctx = { params: Promise<{ path: string[] }> }

async function handle(req: Request, ctx: Ctx) {
  const { path } = await ctx.params
  const joined = path.join('/')
  const url = new URL(req.url)
  const contentType = req.headers.get('content-type')
  const method = req.method.toUpperCase()

  let body: BodyInit | null = null
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType?.includes('multipart/form-data')) {
      body = await req.arrayBuffer()
    } else if (contentType?.includes('application/json') || contentType?.includes('text/')) {
      body = await req.text()
    } else {
      body = await req.arrayBuffer()
    }
  }

  return proxyToOm({
    method,
    path: joined,
    search: url.search,
    body,
    contentType: contentType?.includes('multipart/form-data') ? contentType : contentType,
    auth: true,
  })
}

export async function GET(req: Request, ctx: Ctx) {
  return handle(req, ctx)
}
export async function POST(req: Request, ctx: Ctx) {
  return handle(req, ctx)
}
export async function PUT(req: Request, ctx: Ctx) {
  return handle(req, ctx)
}
export async function PATCH(req: Request, ctx: Ctx) {
  return handle(req, ctx)
}
export async function DELETE(req: Request, ctx: Ctx) {
  return handle(req, ctx)
}
