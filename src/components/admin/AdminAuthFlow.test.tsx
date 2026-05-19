import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      signUp: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: authMocks.maybeSingle }),
        }),
      }),
    }),
  },
}));

const sessionFor = (userId: string) => ({
  access_token: "token",
  refresh_token: "refresh",
  user: { id: userId, email: "admin@racun.com" },
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAdminFlow(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <LocationProbe />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>Painel liberado</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Admin auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("redireciona /admin para /admin/login quando não há sessão", async () => {
    renderAdminFlow("/admin");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/login"));
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("faz login admin e navega para /admin sem ficar preso no login", async () => {
    authMocks.signInWithPassword.mockResolvedValue({ data: { session: sessionFor("admin-user") }, error: null });
    authMocks.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

    renderAdminFlow("/admin/login");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@racun.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin"));
    expect(screen.getByText("Painel liberado")).toBeInTheDocument();
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it("bloqueia sessão autenticada sem papel admin e volta ao login", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: sessionFor("regular-user") } });
    authMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    renderAdminFlow("/admin");

    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/login"));
  });

  it("logout limpa a sessão e retorna ao login sem loop", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: sessionFor("admin-user") } });
    authMocks.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

    renderAdminFlow("/admin");

    await waitFor(() => expect(screen.getByText("Painel liberado")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Sair/i }));

    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/login"));
  });
});