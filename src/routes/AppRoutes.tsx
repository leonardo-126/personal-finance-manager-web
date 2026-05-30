import AuthLayout from "@/layouts/AuthLayout";
import PublicLayout from "@/layouts/PublicLayout";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { Route, Routes } from "react-router-dom";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rotas públicas — Navbar simples */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        {/* <Route path="pricing" element={<Pricing />} /> */}
      </Route>

      {/* Rotas autenticadas — Navbar + Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AuthLayout />}>
          {/* <Route index element={<Dashboard />} /> */}
        </Route>
      </Route>

      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
