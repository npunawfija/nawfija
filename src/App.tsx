import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Finance from "./pages/Finance";
import Agriculture from "./pages/Agriculture";
import Vocational from "./pages/Vocational";
import NPU from "./pages/NPU";
import NPUWomen from "./pages/NPUWomen";
import NPUYouth from "./pages/NPUYouth";
import NPUCommittee from "./pages/NPUCommittee";
import NPUBranches from "./pages/NPUBranches";
import Networking from "./pages/Networking";
import Information from "./pages/Information";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="auth" element={<Auth />} />
              <Route path="finance" element={<Finance />} />
              <Route path="agriculture" element={<Agriculture />} />
              <Route path="vocational" element={<Vocational />} />
              <Route path="npu" element={<NPU />} />
              <Route path="npu/women" element={<NPUWomen />} />
              <Route path="npu/youth" element={<NPUYouth />} />
              <Route path="npu/committee" element={<NPUCommittee />} />
              <Route path="npu/branches" element={<NPUBranches />} />
              <Route path="networking" element={<Networking />} />
              <Route path="information" element={<Information />} />
              <Route path="contact" element={<Contact />} />
              <Route path="admin" element={<AdminDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
