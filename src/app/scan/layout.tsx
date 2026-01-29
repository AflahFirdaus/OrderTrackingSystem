import { TopNav } from "@/components/nav";
import { SideNav } from "@/components/nav";

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh]">
      <SideNav />
      <div className="flex-grow overflow-auto">
        <TopNav title="Scan Barcode" />
        <main>{children}</main>
      </div>
    </div>
  );
}
