import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { AppRouter } from "bot/src/api";

class TRPCServerClient {
  private _headers: Record<string, string> = {};
  trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://127.0.0.1:3069",
        headers: async () => {
          return this.getHeaders();
        },
      }),
    ],
  });
  constructor() {}

  setHeaders(headers: Record<string, string>) {
    this._headers = headers;
    return this;
  }

  async getHeaders() {
    return this._headers;
  }

  setToken(token: string) {
    const headers = {
      ...this._headers,
      Authorization: `Bearer ${token}`,
    };
    this.setHeaders(headers);
    return this;
  }
}

const trpcServerClient = new TRPCServerClient();

export default trpcServerClient;
