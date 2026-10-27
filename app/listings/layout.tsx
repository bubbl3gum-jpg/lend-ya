// Establish the discovery route boundary without introducing a streaming fallback.
// Server eligibility/authentication remains in each existing page/API.
export default function ListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
