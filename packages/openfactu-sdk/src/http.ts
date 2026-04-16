import type { ConnectionConfig, ApiError } from './types';

export class HttpClient {
  private baseUrl: string;
  private token: string;
  private tenantId: string;
  private timeout: number;

  constructor(config: ConnectionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
    this.tenantId = config.tenantId;
    this.timeout = config.timeout ?? 30000;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'x-tenant-id': this.tenantId,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as ApiError).error || `HTTP ${res.status}`);
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as ApiError).error || `HTTP ${res.status}`);
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async patch<T>(path: string, body: any): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as ApiError).error || `HTTP ${res.status}`);
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async delete<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: this.headers(),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as ApiError).error || `HTTP ${res.status}`);
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
