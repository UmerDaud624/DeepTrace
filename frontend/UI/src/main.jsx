
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@material-tailwind/react";
import { ThemeProvider as CustomThemeProvider } from "./contexts/ThemeContext";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CustomThemeProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </CustomThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
