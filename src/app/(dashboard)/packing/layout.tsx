export default function PackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parent layout (dashboard) already handles SideNav and TopNavDynamic
  // Just render children here
  return <>{children}</>;
}
