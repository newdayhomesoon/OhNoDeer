declare module 'buffer' {
  export const Buffer: {
    from(data: string, encoding?: string): Buffer;
    toString(encoding?: string): string;
  };
}
