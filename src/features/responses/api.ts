import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ResponseRow } from "@/lib/schema";

export function useResponses(formId: string | undefined) {
  const qc = useQueryClient();
  const [justArrivedIds, setJustArrivedIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["responses", formId],
    enabled: !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as ResponseRow[];
    },
  });

  useEffect(() => {
    if (!formId) return;
    const channel = supabase
      .channel(`responses-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `form_id=eq.${formId}` },
        (payload) => {
          const row = payload.new as ResponseRow;
          qc.setQueryData<ResponseRow[]>(["responses", formId], (old) => [row, ...(old ?? [])]);
          setJustArrivedIds((s) => new Set(s).add(row.id));
          setTimeout(() => {
            setJustArrivedIds((s) => {
              const next = new Set(s);
              next.delete(row.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId, qc]);

  return { ...query, justArrivedIds };
}

export function useDeleteResponses(formId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("responses").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responses", formId] }),
  });
}

export function useFlagSpam(formId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isSpam }: { id: string; isSpam: boolean }) => {
      const { error } = await supabase.from("responses").update({ is_spam: isSpam }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responses", formId] }),
  });
}
