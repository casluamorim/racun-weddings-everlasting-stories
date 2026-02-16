import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Stories from "./pages/Stories";
import Blog from "./pages/Blog";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWeddings from "./pages/admin/AdminWeddings";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminStories from "./pages/admin/AdminStories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/historias" element={<Stories />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="weddings" element={<AdminWeddings />} />
              <Route path="videos" element={<AdminVideos />} />
              <Route path="pricing" element={<AdminPricing />} />
              <Route path="quotes" element={<AdminQuotes />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="stories" element={<AdminStories />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
