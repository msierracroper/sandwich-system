import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { PrivateRoute } from "./components/PrivateRoute";
import Login from "./pages/Login";
import AdminHome from "./pages/admin/AdminHome";
import TomadorHome from "./pages/tomador/TomadorHome";
import PreparadorHome from "./pages/preparador/PreparadorHome";
import NuevoPedido from "./pages/tomador/NuevoPedido";
import PedidoActivo from "./pages/tomador/PedidoActivo";
import Productos from "./pages/admin/Productos";
import Mesas from "./pages/admin/Mesas";
import Usuarios from "./pages/admin/Usuarios";
import Reportes from "./pages/admin/Reportes";
import Gastos from "./pages/admin/Gastos";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Publica */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}

          <Route
            path="/admin"
            element={
              <PrivateRoute roles={["admin"]}>
                <AdminHome />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/productos"
            element={
              <PrivateRoute roles={["admin"]}>
                <Productos />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/mesas"
            element={
              <PrivateRoute roles={["admin"]}>
                <Mesas />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <PrivateRoute roles={["admin"]}>
                <Usuarios />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/reportes"
            element={
              <PrivateRoute roles={["admin"]}>
                <Reportes />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/gastos"
            element={
              <PrivateRoute roles={["admin"]}>
                <Gastos />
              </PrivateRoute>
            }
          />

          {/* Tomador */}
          <Route
            path="/tomador"
            element={
              <PrivateRoute roles={["tomador"]}>
                <TomadorHome />
              </PrivateRoute>
            }
          />

          <Route
            path="/tomador/nuevo"
            element={
              <PrivateRoute roles={["tomador"]}>
                <NuevoPedido />
              </PrivateRoute>
            }
          />

          <Route
            path="/tomador/pedido/:id"
            element={
              <PrivateRoute roles={["tomador"]}>
                <PedidoActivo />
              </PrivateRoute>
            }
          />

          {/* Preparador */}
          <Route
            path="/preparador"
            element={
              <PrivateRoute roles={["preparador"]}>
                <PreparadorHome />
              </PrivateRoute>
            }
          />

          {/* Redirige raiz a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
