import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when user returns to window
      retry: 1, // Only retry failed requests once
    },
  },
});

// Migrate old visitor_id to viva_visitor_id
const migrateVisitorId = () => {
  const oldVisitorId = localStorage.getItem('visitor_id');
  const newVisitorId = localStorage.getItem('viva_visitor_id');
  
  if (oldVisitorId && !newVisitorId) {
    localStorage.setItem('viva_visitor_id', oldVisitorId);
    localStorage.removeItem('visitor_id');
    console.log('Migrated visitor_id to viva_visitor_id');
  }
};

// Run migration before rendering app
migrateVisitorId();

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
