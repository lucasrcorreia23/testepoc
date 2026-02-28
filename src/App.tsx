import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioQueuePlayer, MicrophoneStreamer } from './lib/audio';
import { ElevenLabsWsClient } from './lib/websocketClient';
import type { ElevenLabsInboundEvent } from './types/events';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

const DEFAULT_WS_URL =
  'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID_OR_TOKEN';
const DEFAULT_REF_TOKEN = 'REF_TOKEN_AQUI';

function App() {
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [agentText, setAgentText] = useState('');
  const [userText, setUserText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const wsClientRef = useRef<ElevenLabsWsClient | null>(null);
  const micRef = useRef<MicrophoneStreamer | null>(null);
  const playerRef = useRef<AudioQueuePlayer | null>(null);

  const isConnected = status === 'connected';
  const isStarting = status === 'connecting';

  const statusLabel = useMemo(() => {
    if (status === 'idle') return 'Idle';
    if (status === 'connecting') return 'Connecting';
    if (status === 'connected') return 'Connected';
    return 'Error';
  }, [status]);

  const pushLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 120));
  };

  const validateWsUrl = (value: string): string | null => {
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== 'wss:') {
        return 'A URL deve iniciar com wss://';
      }
      return null;
    } catch {
      return 'URL WebSocket inválida.';
    }
  };

  const buildDynamicVariables = (value: string): Record<string, string> => {
    const parsed = new URL(value.trim());
    const refTokenFromUrl = parsed.searchParams.get('ref_token')?.trim();

    return {
      ref_token: refTokenFromUrl || DEFAULT_REF_TOKEN,
    };
  };

  const stopConversation = async () => {
    await micRef.current?.stop();
    playerRef.current?.stop();
    wsClientRef.current?.close();
    micRef.current = null;
    playerRef.current = null;
    wsClientRef.current = null;
    setStatus('idle');
    pushLog('Sessão encerrada.');
  };

  const handleInboundEvent = async (
    event: ElevenLabsInboundEvent,
    client: ElevenLabsWsClient,
  ) => {
    if (event.type === 'ping') {
      client.sendPong(event.ping_event.event_id);
      pushLog(`Ping recebido (event_id=${event.ping_event.event_id}) -> Pong enviado.`);
      return;
    }

    if (event.type === 'user_transcript') {
      setUserText(event.user_transcription_event.user_transcript);
      return;
    }

    if (event.type === 'agent_response') {
      setAgentText(event.agent_response_event.agent_response);
      return;
    }

    if (event.type === 'agent_response_correction') {
      setAgentText(event.agent_response_correction_event.corrected_agent_response);
      return;
    }

    if (event.type === 'audio') {
      playerRef.current?.enqueue(event.audio_event.audio_base_64);
      return;
    }

    if (event.type === 'interruption') {
      pushLog(`Interrupção recebida: ${event.interruption_event.reason}`);
      return;
    }
  };

  const startConversation = async () => {
    setError(null);
    const validationError = validateWsUrl(wsUrl);
    if (validationError) {
      setStatus('error');
      setError(validationError);
      return;
    }

    setStatus('connecting');
    pushLog('Iniciando sessão...');

    const mic = new MicrophoneStreamer();
    const player = new AudioQueuePlayer();
    const client = new ElevenLabsWsClient();

    micRef.current = mic;
    playerRef.current = player;
    wsClientRef.current = client;

    try {
      await client.connect(wsUrl.trim(), {
        onOpen: async () => {
          setStatus('connected');
          pushLog('WebSocket conectado.');
          const dynamicVariables = buildDynamicVariables(wsUrl);
          const initPayload = client.sendConversationInit({
            dynamicVariables,
          });
          pushLog(`Evento de iniciação enviado: ${JSON.stringify(initPayload)}`);

          await mic.start((base64Chunk) => {
            client.sendAudioChunk(base64Chunk);
          });
          pushLog('Microfone ativo e enviando chunks.');
        },
        onEvent: (event) => {
          void handleInboundEvent(event, client);
        },
        onClose: () => {
          setStatus('idle');
          pushLog('WebSocket fechado.');
        },
        onError: (message) => {
          setStatus('error');
          setError(message);
          pushLog(`Erro: ${message}`);
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha ao iniciar sessão.';
      setStatus('error');
      setError(message);
      pushLog(`Falha ao iniciar: ${message}`);
      await stopConversation();
    }
  };

  useEffect(() => {
    return () => {
      void stopConversation();
    };
  }, []);

  return (
    <main className="app">
      <section className="card">
        <h1>POC Raw WebSocket (ElevenLabs)</h1>
        <p className="hint">
          Cole um link WebSocket completo e inicie a conversa.
        </p>

        <label htmlFor="ws-url">Link WebSocket</label>
        <input
          id="ws-url"
          type="text"
          value={wsUrl}
          onChange={(e) => setWsUrl(e.target.value)}
          placeholder="wss://api.elevenlabs.io/v1/convai/conversation?..."
          disabled={isConnected || isStarting}
        />

        <div className="statusRow">
          <strong>Status:</strong>
          <span className={`pill ${status}`}>{statusLabel}</span>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button
            type="button"
            onClick={() => void startConversation()}
            disabled={isConnected || isStarting}
          >
            {isStarting ? 'Conectando...' : 'Iniciar conversa'}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => void stopConversation()}
            disabled={!isConnected}
          >
            Encerrar conversa
          </button>
        </div>

        <div className="transcriptGrid">
          <div>
            <h2>Usuário</h2>
            <p>{userText || 'Sem transcrição ainda.'}</p>
          </div>
          <div>
            <h2>Agente</h2>
            <p>{agentText || 'Sem resposta ainda.'}</p>
          </div>
        </div>

        <div>
          <h2>Logs</h2>
          <div className="logs">
            {logs.length === 0 ? (
              <p className="hint">Sem eventos.</p>
            ) : (
              logs.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
