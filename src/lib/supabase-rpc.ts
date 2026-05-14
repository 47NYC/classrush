import { supabase } from "@/integrations/supabase/client";

type RpcError = { message: string };
type RpcResponse<T> = { data: T | null; error: RpcError | null };
type RpcClient = {
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<RpcResponse<T>>;
};

export function callRpc<T>(fn: string, args?: Record<string, unknown>) {
  return (supabase as unknown as RpcClient).rpc<T>(fn, args);
}

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
};

export async function loadPublicProfiles(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 100);
  if (!unique.length) return new Map<string, PublicProfile>();
  const { data, error } = await callRpc<PublicProfile[]>("get_public_profiles", { _ids: unique });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}