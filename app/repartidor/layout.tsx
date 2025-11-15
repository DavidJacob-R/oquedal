import RepartidorNavbar from "@/components/shared/RepartidorNavbar";

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RepartidorNavbar />
      <div style={{ paddingTop: "56px" }}>
        {children}
      </div>
    </>
  );
}
