import { SideNav } from "@/components/nav";
import TopNavDynamic from "@/components/nav/top-nav-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh]">
      <SideNav />
      <div className="flex-grow overflow-auto min-w-0">
        <TopNavDynamic />
        <main className="pl-12 tablet:pl-0">{children}</main>
      </div>
    </div>
  );
}
