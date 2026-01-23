import { TopNav } from "@/components/nav";
import { SideNav } from "@/components/nav";

export default function ScanTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh]">
      <SideNav />
      <div className="flex-grow overflow-auto">
        <TopNav title="Detail Order" />
        <main>{children}</main>
      </div>
    </div>
  );
}
