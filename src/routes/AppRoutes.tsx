import AuthLayout from "@/layouts/AuthLayout";
import PublicLayout from "@/layouts/PublicLayout";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Caixas from "@/pages/pages/Caixas";
import CategoriasGastos from "@/pages/pages/CategoriasGastos";
import Dashboard from "@/pages/pages/Dashboard";
import FontesRenda from "@/pages/pages/FontesRenda";
import Gastos from "@/pages/pages/Gastos";
import GastosItens from "@/pages/pages/GastosItens";
import Movimentacoes from "@/pages/pages/Movimentacoes";
import Profile from "@/pages/pages/Profile";
import Rendas from "@/pages/pages/Rendas";
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
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="fontes-renda" element={<FontesRenda />} />
          <Route path="rendas" element={<Rendas />} />
          <Route path="caixas" element={<Caixas />} />
          <Route path="movimentacoes" element={<Movimentacoes />} />
          <Route path="categorias-gastos" element={<CategoriasGastos />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="gastos-itens" element={<GastosItens />} />
        </Route>
      </Route>

      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
