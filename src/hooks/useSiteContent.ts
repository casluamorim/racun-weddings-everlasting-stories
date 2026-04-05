import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteContentMap = Record<string, Record<string, any>>;

export function useSiteContent(section?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["site-content", section],
    queryFn: async () => {
      let q = supabase.from("site_content").select("*");
      if (section) q = q.eq("section", section);
      const { data, error } = await q;
      if (error) throw error;

      const map: SiteContentMap = {};
      for (const row of data ?? []) {
        if (!map[row.section]) map[row.section] = {};
        map[row.section][row.key] = row.value;
      }
      return map;
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ section, key, value }: { section: string; key: string; value: any }) => {
      const { error } = await supabase
        .from("site_content")
        .upsert({ section, key, value }, { onConflict: "section,key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
  });

  const getValue = (sec: string, key: string, fallback: any = null) => {
    return data?.[sec]?.[key] ?? fallback;
  };

  return { data, isLoading, upsert, getValue };
}

export function useTestimonials() {
  const queryClient = useQueryClient();

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const upsertTestimonial = useMutation({
    mutationFn: async (t: {
      id?: string;
      couple_name: string;
      text: string;
      location?: string;
      photo_url?: string;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      if (t.id) {
        const { error } = await supabase.from("testimonials").update(t).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(t);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  return { testimonials, isLoading, upsertTestimonial, deleteTestimonial };
}
