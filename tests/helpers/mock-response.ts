export type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (name: string, value: string) => MockResponse;
  end: (payload?: unknown) => MockResponse;
};

export function createMockResponse(): MockResponse {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    end(payload?: unknown) {
      this.body = typeof payload === 'string' ? payload : '';
      return this;
    },
  };
}
