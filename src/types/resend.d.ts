// Type declaration override for resend package
// This bypasses the problematic type definitions in node_modules/resend/dist/index.d.mts
// that cause "';' expected" errors with void 0; syntax
declare module 'resend' {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(params: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
        react?: any;
        attachments?: Array<{
          filename: string;
          content: string | Buffer;
          path?: string;
        }>;
        headers?: Record<string, string>;
        tags?: Array<{ name: string; value: string }>;
      }): Promise<{
        data: { id: string } | null;
        error: { message: string; name: string; statusCode: number } | null;
      }>;
    };
    broadcasts?: {
      create?(params: {
        name: string;
        audience_id: string;
        from: string;
        subject: string;
        html?: string;
        text?: string;
        react?: any;
      }): Promise<{
        data: { id: string } | null;
        error: { message: string; name: string; statusCode: number } | null;
      }>;
    };
  }
  
  export default Resend;
}
