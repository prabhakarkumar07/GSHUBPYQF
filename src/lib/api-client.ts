const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}, clerkToken?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (clerkToken) {
    headers["Authorization"] = `Bearer ${clerkToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    cache: "no-store", ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
