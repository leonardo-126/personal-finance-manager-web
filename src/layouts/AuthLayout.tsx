import AuthNavbar from "@/components/AuthNavbar";
import Sidebar from "@/components/Sidebar";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 md:ml-60">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
