import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { PrivyAuthProvider } from "@/components/auth/PrivyAuthProvider";
import { usePrivyAuthForConvex } from "@/hooks/auth/usePrivyAuthForConvex";
import { App } from "./App";
import "./globals.css";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuthForConvex}>
        <App />
      </ConvexProviderWithAuth>
    </PrivyAuthProvider>
  </StrictMode>,
);
