import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import AdminLogin from "@/pages/AdminLogin";
import GalleryView from "@/pages/GalleryView";
import AdminSecurity from "@/pages/admin/AdminSecurity";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/lib/galleryStorage", () => ({
  signedUrls: vi.fn().mockResolvedValue({}),
  protectedSignedUrls: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
    }),
  },
}));

const withProviders = (ui: React.ReactNode, path: string, routes: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>{routes}</Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("Lockout do login do painel", () => {
  const renderLogin = () =>
    withProviders(null, "/admin/login", <Route path="/admin/login" element={<AdminLogin />} />);

  const fillAndSubmit = () => {
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@racun.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  };

  it("bloqueia o formulário quando o throttle informa lockout ativo", async () => {
    mocks.rpc.mockImplementation((fn: string) =>
      Promise.resolve({ data: fn === "login_throttle_status" ? 300 : 0, error: null }),
    );

    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText(/Muitas tentativas falhas/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Bloqueado temporariamente/i })).toBeDisabled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("registra a falha e ativa o lockout retornado pelo backend", async () => {
    mocks.rpc.mockImplementation((fn: string) =>
      Promise.resolve({ data: fn === "login_throttle_status" ? 0 : 900, error: null }),
    );
    mocks.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "invalid" } });

    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("login_throttle_fail", { _email: "admin@racun.com" }));
    await waitFor(() => expect(screen.getByText(/15:00/)).toBeInTheDocument());
  });

  it("libera o formulário quando não há lockout e as credenciais são válidas", async () => {
    mocks.rpc.mockResolvedValue({ data: 0, error: null });
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "t", user: { id: "admin", email: "admin@racun.com" } } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("login_throttle_reset", { _email: "admin@racun.com" }));
    expect(screen.queryByText(/Muitas tentativas falhas/i)).not.toBeInTheDocument();
  });
});

describe("Lockout da senha de galeria", () => {
  const renderGallery = () =>
    withProviders(null, "/galeria/ana-e-joao", <Route path="/galeria/:slug" element={<GalleryView />} />);

  it("mostra contador e bloqueia o envio quando o backend retorna locked_out", async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === "get_gallery_by_token") return Promise.resolve({ data: [], error: null });
      if (fn === "gallery_requires_password") return Promise.resolve({ data: true, error: null });
      if (fn === "verify_gallery_password")
        return Promise.resolve({ data: null, error: { message: "locked_out:600" } });
      return Promise.resolve({ data: null, error: null });
    });

    renderGallery();

    await waitFor(() => expect(screen.getByText("Galeria protegida")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText(/Muitas tentativas incorretas/i)).toBeInTheDocument());
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bloqueado temporariamente/i })).toBeDisabled();
    expect(screen.getByPlaceholderText("Senha")).toBeDisabled();
  });

  it("mantém o formulário utilizável quando a senha está apenas incorreta", async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === "get_gallery_by_token") return Promise.resolve({ data: [], error: null });
      if (fn === "gallery_requires_password") return Promise.resolve({ data: true, error: null });
      if (fn === "verify_gallery_password") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    renderGallery();

    await waitFor(() => expect(screen.getByText("Galeria protegida")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("verify_gallery_password", expect.anything()));
    expect(screen.queryByText(/Muitas tentativas incorretas/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Senha")).not.toBeDisabled();
  });
});

describe("Painel de segurança", () => {
  it("lista tentativas e desbloqueia manualmente", async () => {
    mocks.rpc.mockImplementation((fn: string) => {
      if (fn === "admin_list_auth_attempts")
        return Promise.resolve({
          data: [
            {
              scope: "gallery_password",
              identifier: "ana-e-joao",
              attempts: 6,
              recent_attempts: 6,
              last_attempt: new Date().toISOString(),
              locked_seconds: 540,
            },
          ],
          error: null,
        });
      if (fn === "admin_list_unlock_log") return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    withProviders(null, "/admin/security", <Route path="/admin/security" element={<AdminSecurity />} />);

    await waitFor(() => expect(screen.getByText("ana-e-joao")).toBeInTheDocument());
    expect(screen.getByText(/Bloqueado \(9:00\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Desbloquear ana-e-joao" }));

    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("admin_clear_lockout", {
        _scope: "gallery_password",
        _identifier: "ana-e-joao",
      }),
    );
  });
});
