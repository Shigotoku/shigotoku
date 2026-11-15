export type Recording = { blob: Blob; durationMs: number };

export class SlideRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.startedAt = Date.now();
    this.rec.start();
  }

  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      if (!this.rec) return reject(new Error("not recording"));
      const type = this.rec.mimeType;
      this.rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve({ blob: new Blob(this.chunks, { type }), durationMs: Date.now() - this.startedAt });
      };
      this.rec.stop();
    });
  }
}
