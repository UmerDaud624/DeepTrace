import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/widgets/layout";
import { AuthProvider } from "@/contexts/AuthContext";
import routes from "@/routes";


function App() {
  const { pathname } = useLocation();
  const navRoutes = routes.filter(({ path }) => !path.startsWith("/report") && path !== "/sign-in" && path !== "/sign-up" && path !== "/" && path !== "/landing");

  return (
    <AuthProvider>
      {!(pathname == '/' || pathname == '/landing' || pathname == '/sign-in' || pathname == '/sign-up') && (
        <div className="container absolute left-2/4 z-10 mx-auto -translate-x-2/4 p-4">
          <Navbar routes={navRoutes} />
        </div>
      )
      }
      <Routes>
        {routes.map(
          ({ path, element }, key) =>
            element && <Route key={key} exact path={path} element={element} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
