import type {
  ConversationInitOutboundEvent,
  ElevenLabsInboundEvent,
  PongOutboundEvent,
} from '../types/events';

type ConnectHandlers = {
  onOpen?: () => void | Promise<void>;
  onClose?: () => void;
  onEvent?: (event: ElevenLabsInboundEvent) => void;
  onError?: (message: string) => void;
};

type ConversationInitOptions = {
  dynamicVariables?: Record<string, string>;
};

const parseEvent = (raw: string): ElevenLabsInboundEvent | null => {
  try {
    return JSON.parse(raw) as ElevenLabsInboundEvent;
  } catch {
    return null;
  }
};

export class ElevenLabsWsClient {
  private ws: WebSocket | null = null;

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(url: string, handlers: ConnectHandlers): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = async () => {
        try {
          await handlers.onOpen?.();
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      socket.onclose = () => {
        handlers.onClose?.();
      };

      socket.onerror = () => {
        handlers.onError?.('Falha no canal WebSocket.');
      };

      socket.onmessage = (message) => {
        if (typeof message.data !== 'string') {
          return;
        }
        const event = parseEvent(message.data);
        if (!event) {
          handlers.onError?.('Falha ao interpretar evento recebido.');
          return;
        }
        handlers.onEvent?.(event);
      };
    });
  }

  close() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  sendJson(payload: object) {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify(payload));
  }

  sendConversationInit(options?: ConversationInitOptions): ConversationInitOutboundEvent {
    const hasDynamicVariables = Boolean(
      options?.dynamicVariables && Object.keys(options.dynamicVariables).length > 0,
    );

    const payload: ConversationInitOutboundEvent = {
      type: 'conversation_initiation_client_data',
      ...(hasDynamicVariables
        ? { dynamic_variables: options?.dynamicVariables }
        : {}),
    };
    this.sendJson(payload);
    return payload;
  }

  sendPong(eventId: number) {
    const payload: PongOutboundEvent = {
      type: 'pong',
      event_id: eventId,
    };
    this.sendJson(payload);
  }

  sendAudioChunk(base64AudioChunk: string) {
    this.sendJson({ user_audio_chunk: base64AudioChunk });
  }
}
