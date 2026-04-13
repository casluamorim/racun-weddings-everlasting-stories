import { useState, useEffect } from "react";
import { useSiteContent, useTestimonials } from "@/hooks/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

/* ─── helpers ─── */
function SectionField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/* ─── main component ─── */
const AdminSiteEditor = () => {
  const { data: content, isLoading, upsert } = useSiteContent();
  const { testimonials, upsertTestimonial, deleteTestimonial } = useTestimonials();

  /* local draft state per section */
  const [hero, setHero] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Record<string, any>>({});
  const [differentials, setDifferentials] = useState<Record<string, any>>({});
  const [process, setProcess] = useState<Record<string, any>>({});
  const [contact, setContact] = useState<Record<string, string>>({});
  const [cta, setCta] = useState<Record<string, string>>({});
  const [footer, setFooter] = useState<Record<string, string>>({});
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);

  /* testimonial editing */
  const [editingTestimonials, setEditingTestimonials] = useState<any[]>([]);

  // Load from DB into local state when data arrives
  useEffect(() => {
    if (!content) return;

    const h = content["hero"] ?? {};
    setHero({
      subtitle: h.subtitle ?? "Racun Weddings",
      title_line1: h.title_line1 ?? "Histórias reais.",
      title_line2: h.title_line2 ?? "Emoções eternas.",
      description: h.description ?? "Filmes e fotografias de casamento com narrativa cinematográfica, criados para casais que valorizam cada detalhe do seu grande dia.",
      quote: h.quote ?? "Para casais que não querem apenas registrar um casamento, mas reviver cada sentimento.",
      button1_text: h.button1_text ?? "Quero conversar sobre meu casamento",
      button2_text: h.button2_text ?? "Vamos contar sua história",
      background_url: h.background_url ?? "",
      video_url: h.video_url ?? "",
    });

    const sv = content["services"] ?? {};
    setServices({
      section_label: sv.section_label ?? "Nossos Serviços",
      title: sv.title ?? "Cada casamento é único",
      subtitle: sv.subtitle ?? "Projetos personalizados que capturam a essência do seu grande dia",
      items: sv.items ?? [
        { title: "Vídeo de Casamento", icon: "film", image_url: "" },
        { title: "Fotografia de Casamento", icon: "camera", image_url: "" },
      ],
    });

    const d = content["differentials"] ?? {};
    setDifferentials({
      section_label: d.section_label ?? "Por que nos escolher",
      section_title: d.section_title ?? "Muito além do registro",
      items: d.items ?? [
        { title: "Atendimento Personalizado", desc: "Cada casal é único. Entendemos sua história para criar algo verdadeiramente especial." },
        { title: "Número Limitado", desc: "Trabalhamos com poucos casamentos por ano para garantir atenção total a cada história." },
        { title: "Equipe Discreta", desc: "Profissionais experientes que capturam sem interferir nos momentos mais preciosos." },
        { title: "Direção Sensível", desc: "Um olhar cinematográfico que valoriza a emoção real, sem poses forçadas." },
        { title: "Edição Artesanal", desc: "Cada filme é único. Nada de modelos prontos ou fórmulas repetitivas." },
      ],
      closing_text: d.closing_text ?? "A Racun Weddings é para quem valoriza histórias reais, emoção verdadeira e um olhar cinematográfico.",
    });

    const p = content["process"] ?? {};
    setProcess({
      title: p.title ?? "Como trabalhamos",
      subtitle: p.subtitle ?? "Do primeiro contato à entrega, cuidamos de cada detalhe",
      steps: p.steps ?? [
        { title: "Primeiro Contato", desc: "Conversamos para entender vocês, a história e o que sonham para o grande dia." },
        { title: "Alinhamento", desc: "Definimos expectativas, estilo e todos os detalhes para a cobertura perfeita." },
        { title: "O Grande Dia", desc: "Estamos presentes de forma discreta, capturando cada momento com sensibilidade." },
        { title: "Pós-Produção", desc: "Cada filme é editado com cuidado artesanal, criando uma narrativa única." },
        { title: "Entrega Final", desc: "O momento de reviver tudo. Uma entrega pensada para emocionar." },
      ],
    });

    const c = content["contact"] ?? {};
    setContact({
      section_label: c.section_label ?? "Contato",
      title: c.title ?? "Vamos conversar sobre o seu dia",
      subtitle: c.subtitle ?? "Preencha o formulário e falaremos pelo WhatsApp.",
      success_message: c.success_message ?? "Orçamento enviado com sucesso!",
    });

    const ct = content["cta"] ?? {};
    setCta({
      title: ct.title ?? "Seu casamento acontece em um dia.",
      title_accent: ct.title_accent ?? "A memória fica para sempre.",
      button_text: ct.button_text ?? "Reservar minha data",
      button_link: ct.button_link ?? "#contato",
    });

    const f = content["footer"] ?? {};
    setFooter({
      brand: f.brand ?? "Racun Weddings",
      tagline: f.tagline ?? "Filmes e fotografias de casamento",
      instagram_url: f.instagram_url ?? "https://instagram.com/racunweddings",
      email: f.email ?? "racunagencia@gmail.com",
    });

    const fq = content["faq"] ?? {};
    setFaq(
      fq.items ?? [
        { question: "Quanto tempo antes do casamento devo contratar o fotógrafo?", answer: "Recomendamos fechar o contrato com pelo menos 6 a 12 meses de antecedência." },
      ]
    );
  }, [content]);

  useEffect(() => {
    if (testimonials) setEditingTestimonials(testimonials.map((t) => ({ ...t })));
  }, [testimonials]);

  const saveSection = async (section: string, fields: Record<string, any>) => {
    try {
      for (const [key, value] of Object.entries(fields)) {
        await upsert.mutateAsync({ section, key, value });
      }
      toast.success(`Seção "${section}" salva!`);
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUrl: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const ext = "webp";
      const path = `site/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, compressed);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);
      onUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch {
      toast.error("Erro no upload.");
    }
  };

  if (isLoading) return <p className="p-8 text-muted-foreground">Carregando...</p>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-heading font-semibold mb-6">Editor do Site</h1>

      <Tabs defaultValue="hero">
        <TabsList className="flex flex-wrap gap-1 mb-6 h-auto">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="differentials">Diferenciais</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
          <TabsTrigger value="process">Processo</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="cta">CTA Final</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
        </TabsList>

        {/* ─── HERO ─── */}
        <TabsContent value="hero">
          <Card>
            <CardHeader><CardTitle>Hero (Primeira Dobra)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Subtítulo" value={hero.subtitle ?? ""} onChange={(v) => setHero({ ...hero, subtitle: v })} />
              <SectionField label="Título (linha 1)" value={hero.title_line1 ?? ""} onChange={(v) => setHero({ ...hero, title_line1: v })} />
              <SectionField label="Título (linha 2 – destaque)" value={hero.title_line2 ?? ""} onChange={(v) => setHero({ ...hero, title_line2: v })} />
              <SectionField label="Descrição" value={hero.description ?? ""} onChange={(v) => setHero({ ...hero, description: v })} multiline />
              <SectionField label="Frase de efeito" value={hero.quote ?? ""} onChange={(v) => setHero({ ...hero, quote: v })} multiline />
              <SectionField label="Botão 1 – texto" value={hero.button1_text ?? ""} onChange={(v) => setHero({ ...hero, button1_text: v })} />
              <SectionField label="Botão 2 – texto" value={hero.button2_text ?? ""} onChange={(v) => setHero({ ...hero, button2_text: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imagem de fundo</Label>
                {hero.background_url && (
                  <img src={hero.background_url} alt="Preview" className="w-48 h-28 object-cover rounded mb-2" />
                )}
                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setHero({ ...hero, background_url: url }))} />
              </div>
              <Button onClick={() => saveSection("hero", hero)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Hero
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SERVICES ─── */}
        <TabsContent value="services">
          <Card>
            <CardHeader><CardTitle>Nossos Serviços</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Label da seção" value={services.section_label ?? ""} onChange={(v) => setServices({ ...services, section_label: v })} />
              <SectionField label="Título" value={services.title ?? ""} onChange={(v) => setServices({ ...services, title: v })} />
              <SectionField label="Subtítulo" value={services.subtitle ?? ""} onChange={(v) => setServices({ ...services, subtitle: v })} multiline />

              <div className="space-y-3 mt-4">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cards de Serviço</Label>
                {(services.items ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex gap-2 items-start border rounded p-3">
                    <div className="flex-1 space-y-2">
                      <Input value={item.title} placeholder="Título do serviço" onChange={(e) => {
                        const items = [...services.items];
                        items[i] = { ...items[i], title: e.target.value };
                        setServices({ ...services, items });
                      }} />
                      <div className="flex gap-2 items-center">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Ícone:</Label>
                        <select
                          className="border rounded px-2 py-1 text-sm bg-background"
                          value={item.icon}
                          onChange={(e) => {
                            const items = [...services.items];
                            items[i] = { ...items[i], icon: e.target.value };
                            setServices({ ...services, items });
                          }}
                        >
                          <option value="film">Vídeo</option>
                          <option value="camera">Fotografia</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Imagem</Label>
                        {item.image_url && (
                          <img src={item.image_url} alt="Preview" className="w-32 h-20 object-cover rounded mb-1" />
                        )}
                        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => {
                          const items = [...services.items];
                          items[i] = { ...items[i], image_url: url };
                          setServices({ ...services, items });
                        })} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const items = services.items.filter((_: any, j: number) => j !== i);
                      setServices({ ...services, items });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setServices({ ...services, items: [...(services.items ?? []), { title: "", icon: "camera", image_url: "" }] });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
                </Button>
              </div>

              <Button onClick={() => saveSection("services", services)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Serviços
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="differentials">
          <Card>
            <CardHeader><CardTitle>Diferenciais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Label da seção" value={differentials.section_label ?? ""} onChange={(v) => setDifferentials({ ...differentials, section_label: v })} />
              <SectionField label="Título da seção" value={differentials.section_title ?? ""} onChange={(v) => setDifferentials({ ...differentials, section_title: v })} />
              <SectionField label="Texto de fechamento" value={differentials.closing_text ?? ""} onChange={(v) => setDifferentials({ ...differentials, closing_text: v })} multiline />

              <div className="space-y-3 mt-4">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Itens</Label>
                {(differentials.items ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex gap-2 items-start border rounded p-3">
                    <GripVertical className="h-4 w-4 mt-2 text-muted-foreground" />
                    <div className="flex-1 space-y-2">
                      <Input value={item.title} placeholder="Título" onChange={(e) => {
                        const items = [...differentials.items];
                        items[i] = { ...items[i], title: e.target.value };
                        setDifferentials({ ...differentials, items });
                      }} />
                      <Textarea value={item.desc} placeholder="Descrição" rows={2} onChange={(e) => {
                        const items = [...differentials.items];
                        items[i] = { ...items[i], desc: e.target.value };
                        setDifferentials({ ...differentials, items });
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const items = differentials.items.filter((_: any, j: number) => j !== i);
                      setDifferentials({ ...differentials, items });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setDifferentials({ ...differentials, items: [...(differentials.items ?? []), { title: "", desc: "" }] });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>

              <Button onClick={() => saveSection("differentials", differentials)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Diferenciais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TESTIMONIALS ─── */}
        <TabsContent value="testimonials">
          <Card>
            <CardHeader><CardTitle>Depoimentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editingTestimonials.map((t, i) => (
                <div key={t.id ?? i} className="border rounded p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.couple_name || "Novo depoimento"}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Ativo</Label>
                        <Switch checked={t.is_active} onCheckedChange={(v) => {
                          const arr = [...editingTestimonials];
                          arr[i] = { ...arr[i], is_active: v };
                          setEditingTestimonials(arr);
                        }} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={async () => {
                        if (t.id) {
                          await deleteTestimonial.mutateAsync(t.id);
                          toast.success("Removido!");
                        } else {
                          setEditingTestimonials(editingTestimonials.filter((_, j) => j !== i));
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Input value={t.couple_name} placeholder="Nome do casal" onChange={(e) => {
                    const arr = [...editingTestimonials];
                    arr[i] = { ...arr[i], couple_name: e.target.value };
                    setEditingTestimonials(arr);
                  }} />
                  <Textarea value={t.text} placeholder="Depoimento" rows={3} onChange={(e) => {
                    const arr = [...editingTestimonials];
                    arr[i] = { ...arr[i], text: e.target.value };
                    setEditingTestimonials(arr);
                  }} />
                  <Input value={t.location ?? ""} placeholder="Localização" onChange={(e) => {
                    const arr = [...editingTestimonials];
                    arr[i] = { ...arr[i], location: e.target.value };
                    setEditingTestimonials(arr);
                  }} />
                  <div className="flex gap-2 items-center">
                    {t.photo_url && <img src={t.photo_url} className="w-12 h-12 rounded-full object-cover" />}
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => {
                      const arr = [...editingTestimonials];
                      arr[i] = { ...arr[i], photo_url: url };
                      setEditingTestimonials(arr);
                    })} />
                  </div>
                  <Button size="sm" onClick={async () => {
                    try {
                      await upsertTestimonial.mutateAsync({
                        ...t,
                        sort_order: i,
                      });
                      toast.success("Salvo!");
                    } catch { toast.error("Erro ao salvar."); }
                  }}>
                    <Save className="mr-1 h-3 w-3" /> Salvar
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => {
                setEditingTestimonials([...editingTestimonials, {
                  couple_name: "", text: "", location: "", photo_url: null, is_active: true, sort_order: editingTestimonials.length,
                }]);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Depoimento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PROCESS ─── */}
        <TabsContent value="process">
          <Card>
            <CardHeader><CardTitle>Processo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Título" value={process.title ?? ""} onChange={(v) => setProcess({ ...process, title: v })} />
              <SectionField label="Subtítulo" value={process.subtitle ?? ""} onChange={(v) => setProcess({ ...process, subtitle: v })} />

              <div className="space-y-3 mt-4">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Etapas</Label>
                {(process.steps ?? []).map((step: any, i: number) => (
                  <div key={i} className="flex gap-2 items-start border rounded p-3">
                    <span className="text-xs font-bold text-muted-foreground mt-2">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1 space-y-2">
                      <Input value={step.title} placeholder="Título" onChange={(e) => {
                        const steps = [...process.steps];
                        steps[i] = { ...steps[i], title: e.target.value };
                        setProcess({ ...process, steps });
                      }} />
                      <Textarea value={step.desc} placeholder="Descrição" rows={2} onChange={(e) => {
                        const steps = [...process.steps];
                        steps[i] = { ...steps[i], desc: e.target.value };
                        setProcess({ ...process, steps });
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setProcess({ ...process, steps: process.steps.filter((_: any, j: number) => j !== i) });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setProcess({ ...process, steps: [...(process.steps ?? []), { title: "", desc: "" }] });
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar etapa
                </Button>
              </div>

              <Button onClick={() => saveSection("process", process)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Processo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CONTACT ─── */}
        <TabsContent value="contact">
          <Card>
            <CardHeader><CardTitle>Formulário de Contato</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Label" value={contact.section_label ?? ""} onChange={(v) => setContact({ ...contact, section_label: v })} />
              <SectionField label="Título" value={contact.title ?? ""} onChange={(v) => setContact({ ...contact, title: v })} />
              <SectionField label="Subtítulo" value={contact.subtitle ?? ""} onChange={(v) => setContact({ ...contact, subtitle: v })} />
              <SectionField label="Mensagem de sucesso" value={contact.success_message ?? ""} onChange={(v) => setContact({ ...contact, success_message: v })} />
              <Button onClick={() => saveSection("contact", contact)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Contato
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FAQ ─── */}
        <TabsContent value="faq">
          <Card>
            <CardHeader><CardTitle>Perguntas Frequentes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {faq.map((item, i) => (
                <div key={i} className="flex gap-2 items-start border rounded p-3">
                  <div className="flex-1 space-y-2">
                    <Input value={item.question} placeholder="Pergunta" onChange={(e) => {
                      const arr = [...faq];
                      arr[i] = { ...arr[i], question: e.target.value };
                      setFaq(arr);
                    }} />
                    <Textarea value={item.answer} placeholder="Resposta" rows={3} onChange={(e) => {
                      const arr = [...faq];
                      arr[i] = { ...arr[i], answer: e.target.value };
                      setFaq(arr);
                    }} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFaq([...faq, { question: "", answer: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar pergunta
              </Button>
              <Button onClick={() => saveSection("faq", { items: faq })} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar FAQ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CTA ─── */}
        <TabsContent value="cta">
          <Card>
            <CardHeader><CardTitle>CTA Final</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Título principal" value={cta.title ?? ""} onChange={(v) => setCta({ ...cta, title: v })} />
              <SectionField label="Título destaque (em itálico)" value={cta.title_accent ?? ""} onChange={(v) => setCta({ ...cta, title_accent: v })} />
              <SectionField label="Texto do botão" value={cta.button_text ?? ""} onChange={(v) => setCta({ ...cta, button_text: v })} />
              <SectionField label="Link do botão" value={cta.button_link ?? ""} onChange={(v) => setCta({ ...cta, button_link: v })} />
              <Button onClick={() => saveSection("cta", cta)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar CTA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FOOTER ─── */}
        <TabsContent value="footer">
          <Card>
            <CardHeader><CardTitle>Rodapé</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionField label="Marca" value={footer.brand ?? ""} onChange={(v) => setFooter({ ...footer, brand: v })} />
              <SectionField label="Tagline" value={footer.tagline ?? ""} onChange={(v) => setFooter({ ...footer, tagline: v })} />
              <SectionField label="URL do Instagram" value={footer.instagram_url ?? ""} onChange={(v) => setFooter({ ...footer, instagram_url: v })} />
              <SectionField label="E-mail" value={footer.email ?? ""} onChange={(v) => setFooter({ ...footer, email: v })} />
              <Button onClick={() => saveSection("footer", footer)} className="mt-4">
                <Save className="mr-2 h-4 w-4" /> Salvar Rodapé
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSiteEditor;
