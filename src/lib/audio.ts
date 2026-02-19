const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const pickMimeType = (): string | undefined => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  return candidates.find((value) => MediaRecorder.isTypeSupported(value));
};

export class MicrophoneStreamer {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;

  async start(onChunk: (base64Chunk: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    this.recorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      const chunk = await blobToBase64(event.data);
      onChunk(chunk);
    };

    this.recorder.start(250);
  }

  async stop() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.recorder = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

export class AudioQueuePlayer {
  private queue: string[] = [];
  private playing = false;
  private currentAudio: HTMLAudioElement | null = null;

  enqueue(base64Audio: string) {
    this.queue.push(base64Audio);
    void this.playNext();
  }

  stop() {
    this.queue = [];
    this.playing = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
  }

  private async playNext() {
    if (this.playing || this.queue.length === 0) return;

    this.playing = true;
    const chunk = this.queue.shift();
    if (!chunk) {
      this.playing = false;
      return;
    }

    const audio = new Audio(`data:audio/mpeg;base64,${chunk}`);
    this.currentAudio = audio;

    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });

    this.currentAudio = null;
    this.playing = false;
    void this.playNext();
  }
}
