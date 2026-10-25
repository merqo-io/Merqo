// Rendered per request so the nonce CSP from proxy.ts reaches its scripts.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
