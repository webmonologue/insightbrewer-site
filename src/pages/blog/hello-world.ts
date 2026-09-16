// Keep shared legacy links working with a real HTTP redirect, not meta refresh.
export const prerender = false;
export function GET() {
  return new Response(null, {
    status: 301,
    headers: { Location: encodeURI('/blog/신호보다-맥락/') },
  });
}
export const HEAD = GET;
