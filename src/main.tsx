import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes.jsx";
import { HealthDataProvider } from "./context/HealthDataContext.jsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("App root element was not found.");

createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <HashRouter>
        <HealthDataProvider>
          <AppRoutes />
        </HealthDataProvider>
      </HashRouter>
    </ChakraProvider>
  </StrictMode>,
);
