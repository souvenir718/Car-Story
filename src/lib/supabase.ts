const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const getHeaders = (extraHeaders?: HeadersInit): HeadersInit => ({
  apikey: supabaseAnonKey as string,
  Authorization: `Bearer ${supabaseAnonKey}`,
  ...extraHeaders,
});

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!isSupabaseConfigured || !supabaseUrl) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: getHeaders(init?.headers),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase 요청 실패: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.text();

  if (!body) {
    return undefined as T;
  }

  return JSON.parse(body) as T;
};

export const listRows = async <T>(table: string, order: string) =>
  request<T[]>(`${table}?select=*&order=${order}`);

export const upsertRows = async <T>(table: string, rows: T | T[]) =>
  request<void>(table, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

export const deleteRow = async (table: string, id: string) =>
  request<void>(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
