import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Save } from "lucide-react";

const AdminPricing = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ price: string; features: string }>({ price: "", features: "" });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_plans").select("*").order("category").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("pricing_plans").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
      toast.success("Plano atualizado!");
      setEditingId(null);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const startEdit = (plan: any) => {
    setEditingId(plan.id);
    setEditForm({ price: plan.price, features: (plan.features as string[]).join("\n") });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { price: editForm.price, features: editForm.features.split("\n").filter(Boolean) },
    });
  };

  const categories = [
    { key: "foto", label: "Fotografia" },
    { key: "video", label: "Vídeo" },
    { key: "combo", label: "Combos" },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground mb-6">Gestão de Valores</h1>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : (
        categories.map((cat) => {
          const catPlans = plans?.filter((p) => p.category === cat.key) ?? [];
          if (catPlans.length === 0) return null;
          return (
            <div key={cat.key} className="mb-8">
              <h2 className="font-heading text-lg text-foreground mb-3">{cat.label}</h2>
              <div className="space-y-3">
                {catPlans.map((plan) => (
                  <div key={plan.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-body text-sm font-medium text-foreground">{plan.name}</h3>
                        {plan.badge && (
                          <span className="bg-primary/10 text-primary text-[10px] font-body px-2 py-0.5 rounded-full">{plan.badge}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs text-muted-foreground">Ativo</span>
                          <Switch
                            checked={plan.is_active}
                            onCheckedChange={(checked) => updateMutation.mutate({ id: plan.id, updates: { is_active: checked } })}
                          />
                        </div>
                        {editingId === plan.id ? (
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(plan.id)}>
                            <Save size={14} className="mr-1" /> Salvar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(plan)}>
                            <Pencil size={14} className="mr-1" /> Editar
                          </Button>
                        )}
                      </div>
                    </div>
                    {editingId === plan.id ? (
                      <div className="space-y-3 mt-3">
                        <div>
                          <Label className="font-body text-xs">Preço</Label>
                          <Input value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                        </div>
                        <div>
                          <Label className="font-body text-xs">Features (uma por linha)</Label>
                          <textarea
                            className="w-full border border-input rounded-md p-2 text-sm font-body bg-background text-foreground min-h-[100px]"
                            value={editForm.features}
                            onChange={(e) => setEditForm({ ...editForm, features: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="font-heading text-xl text-primary">{plan.price}</p>
                        <p className="font-body text-xs text-muted-foreground">{(plan.features as string[]).length} features</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AdminPricing;
