import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div>
      <h1>Main Layout</h1>
      <ThemeSwitcher />
      <Outlet />
    </div>
  );
}
