import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { FormRow, FormSchemaJson, FormSettings, FormStatus } from "@/lib/schema";

const FORMS_KEY = ["forms"];

export function useForms() {
  return useQuery({
    queryKey: FORMS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as FormRow[];
    },
  });
}

export function useForm(id: string | undefined) {
  return useQuery({
    queryKey: ["forms", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("forms").select("*").eq("id", id).single();
      if (error) throw error;
      return data as FormRow;
    },
  });
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "form";
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; schema: FormSchemaJson }) => {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (!ownerId) throw new Error("Not authenticated");
      let slug = slugify(input.title);
      // Ensure uniqueness by suffixing a short random string if needed.
      const { data: existing } = await supabase.from("forms").select("slug").eq("slug", slug).maybeSingle();
      if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("forms")
        .insert({
          owner_id: ownerId,
          title: input.title,
          slug,
          status: "draft",
          schema: input.schema,
          published_schema: null,
          version: 0,
          settings: {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as FormRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useUpdateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      slug?: string;
      description?: string;
      schema?: FormSchemaJson;
      settings?: FormSettings;
    }) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from("forms")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as FormRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: FORMS_KEY });
      qc.invalidateQueries({ queryKey: ["forms", data.id] });
    },
  });
}

export function usePublishForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormRow) => {
      const { data, error } = await supabase
        .from("forms")
        .update({
          status: "published" as FormStatus,
          published_schema: form.schema,
          version: form.version + 1,
          published_at: new Date().toISOString(),
        })
        .eq("id", form.id)
        .select()
        .single();
      if (error) throw error;
      return data as FormRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FormStatus }) => {
      const { error } = await supabase.from("forms").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useDuplicateForm() {
  const create = useCreateForm();
  return useMutation({
    mutationFn: async (form: FormRow) =>
      create.mutateAsync({ title: `${form.title} (copy)`, schema: form.schema }),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useResponseCounts(formIds: string[]) {
  return useQuery({
    queryKey: ["response-counts", formIds],
    enabled: formIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("form_id")
        .in("form_id", formIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data as { form_id: string }[]) counts[row.form_id] = (counts[row.form_id] ?? 0) + 1;
      return counts;
    },
  });
}
