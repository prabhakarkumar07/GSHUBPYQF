function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return "http://localhost:8000/api";
}

export async function fetchApi(endpoint: string, options: RequestInit = {}, clerkToken?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (clerkToken) {
    headers["Authorization"] = `Bearer ${clerkToken}`;
  }

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    cache: "no-store", ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
