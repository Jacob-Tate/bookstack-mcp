import { config } from '../config.js';

class BookStackClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(baseUrl: string, tokenId: string, tokenSecret: string) {
    this.baseUrl = `${baseUrl}/api`;
    this.authHeader = `Token ${tokenId}:${tokenSecret}`;
  }

  private url(path: string, params?: Record<string, string | number | undefined>): string {
    const fullUrl = `${this.baseUrl}/${path}`;
    if (!params) return fullUrl;
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const query = searchParams.toString();
    return query ? `${fullUrl}?${query}` : fullUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`BookStack API error ${res.status}: ${text}`);
    }
    return JSON.parse(text) as T;
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const res = await fetch(this.url(path, params), {
      method: 'GET',
      headers: { Authorization: this.authHeader },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`BookStack API error ${res.status}: ${text}`);
    return JSON.parse(text) as T;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(this.url(path), {
      method: 'DELETE',
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      throw new Error(`BookStack API error ${res.status}: ${text}`);
    }
  }

  async getText(path: string): Promise<string> {
    const res = await fetch(this.url(path), {
      method: 'GET',
      headers: { Authorization: this.authHeader },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`BookStack API error ${res.status}: ${text}`);
    return text;
  }
}

export const bookstack = new BookStackClient(
  config.BOOKSTACK_URL,
  config.BOOKSTACK_TOKEN_ID,
  config.BOOKSTACK_TOKEN_SECRET,
);
