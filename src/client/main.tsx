import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "bootstrap/dist/css/bootstrap.min.css";
import "antd/dist/reset.css";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "./auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { colorPrimary: "#246b50", borderRadius: 10, fontFamily: "Inter, Arial, sans-serif" } }}>
        <AuthProvider><App /></AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);