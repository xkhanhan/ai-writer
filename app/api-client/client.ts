export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface RequestConfig<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: TBody;
  params?: Record<string, string>;
}

type ErrorPayload = {
  error?: string;
  message?: string;
};

class ApiClient {
  constructor(
    private baseUrl = "",
    private defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    }
  ) {}

  async request<TResponse, TBody = unknown>(
    url: string,
    config: RequestConfig<TBody> = {}
  ): Promise<Result<TResponse>> {
    const { method = "GET", headers = {}, body, params } = config;

    let fullUrl = `${this.baseUrl}${url}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ErrorPayload;
        return {
          ok: false,
          error: errorData.message || `请求失败: ${response.status}`
        };
      }

      return { ok: true, data: (await response.json()) as TResponse };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "网络请求失败"
      };
    }
  }

  get<TResponse>(url: string, params?: Record<string, string>) {
    return this.request<TResponse>(url, { method: "GET", params });
  }

  post<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return this.request<TResponse, TBody>(url, { method: "POST", body });
  }

  patch<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return this.request<TResponse, TBody>(url, { method: "PATCH", body });
  }

  put<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return this.request<TResponse, TBody>(url, { method: "PUT", body });
  }

  delete<TResponse>(url: string) {
    return this.request<TResponse>(url, { method: "DELETE" });
  }
}

export const client = new ApiClient();
