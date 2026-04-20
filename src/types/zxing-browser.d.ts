// Minimal ambient declaration so tsc passes before `npm install @zxing/browser`.
// The real types ship with the package and override this file once installed.
declare module "@zxing/browser" {
  export class BrowserMultiFormatReader {
    constructor();
    decodeFromVideoElement(
      video: HTMLVideoElement,
      callback: (result: { getText(): string } | undefined, error?: unknown) => void
    ): Promise<{ stop(): void }>;
  }
}
