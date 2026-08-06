import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const { signIn, signOut, isAdmin, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isAdmin, navigate, user]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => setLockSeconds((s) => (s > 1 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [lockSeconds > 0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSeconds > 0) return;
    setLoading(true);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Agora peça ao administrador para conceder acesso.");
        setIsSignup(false);
      }
      setLoading(false);
      return;
    }

    // Bloqueio temporário após tentativas falhas repetidas
    const { data: locked } = await supabase.rpc("login_throttle_status", { _email: email });
    if (typeof locked === "number" && locked > 0) {
      setLockSeconds(locked);
      toast.error("Muitas tentativas falhas. Aguarde antes de tentar novamente.");
      setLoading(false);
      return;
    }

    const { error, isAdmin: hasAdminAccess } = await signIn(email, password);
    if (error) {
      const { data: wait } = await supabase.rpc("login_throttle_fail", { _email: email });
      if (typeof wait === "number" && wait > 0) setLockSeconds(wait);
      toast.error("Credenciais inválidas");
    } else if (!hasAdminAccess) {
      const { data: wait } = await supabase.rpc("login_throttle_fail", { _email: email });
      if (typeof wait === "number" && wait > 0) setLockSeconds(wait);
      toast.error("Esta conta não possui acesso ao painel administrativo");
      await signOut();
    } else {
      await supabase.rpc("login_throttle_reset", { _email: email });
      navigate("/admin", { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-primary" />
          </div>
          <h1 className="font-heading text-2xl text-foreground">Painel Administrativo</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">Racun Weddings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="font-body text-sm">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password" className="font-body text-sm">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {lockSeconds > 0 && (
            <p className="font-body text-sm text-destructive">
              Muitas tentativas falhas. Tente novamente em {Math.floor(lockSeconds / 60)}:
              {String(lockSeconds % 60).padStart(2, "0")}.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading || lockSeconds > 0}>
            {loading ? "Aguarde..." : lockSeconds > 0 ? "Bloqueado temporariamente" : isSignup ? "Criar Conta" : "Entrar"}
          </Button>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full text-center mt-4 font-body text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {isSignup ? "Já tem conta? Fazer login" : "Criar primeira conta"}
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
