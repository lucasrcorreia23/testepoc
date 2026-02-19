# POC ElevenLabs Raw WebSocket

POC isolada para validar o fluxo:

- usuário informa manualmente um link `wss://...` em formulário
- aplicação abre conexão WebSocket direta com ElevenLabs
- conversa de voz inicia e pode ser encerrada

## Stack

- React + TypeScript + Vite
- WebSocket nativo do navegador (sem `@elevenlabs/react`)
- `MediaRecorder` para captura de áudio do microfone

## Como executar

```bash
npm install
npm run dev
```

Abra o endereço local exibido no terminal (geralmente `http://localhost:5173`).

## Como usar

1. Cole um link WebSocket completo da ElevenLabs no campo:
   - exemplo: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...`
   - para agentes privados, use a URL assinada com token
2. Clique em **Iniciar conversa**
3. Permita acesso ao microfone
4. Fale com o agente
5. Clique em **Encerrar conversa** para finalizar

## O que foi implementado

- Campo para entrada manual de URL WebSocket
- Validação de formato (`wss://`)
- Estados de conexão (`idle`, `connecting`, `connected`, `error`)
- Fluxo de start/stop sem recarregar a página
- Tratamento de eventos de entrada:
  - `ping` (com resposta automática `pong`)
  - `user_transcript`
  - `agent_response`
  - `agent_response_correction`
  - `audio`
  - `interruption`
- Logs no UI para facilitar debug da conexão

## Arquivos principais

- `src/App.tsx`: UI + orquestração de sessão
- `src/lib/websocketClient.ts`: cliente WebSocket raw
- `src/lib/audio.ts`: captura de microfone e fila de reprodução de áudio
- `src/types/events.ts`: tipos dos eventos WS

## Limitações conhecidas (esperadas da POC)

- Não gera signed URL no backend (a URL deve ser informada manualmente)
- Reprodução de áudio usa `data:audio/mpeg;base64,...`; dependendo do payload upstream, pode exigir ajuste de codec/formato
- Não há estratégia avançada de reconexão (apenas fluxo básico)

## Verificação rápida

Build validado localmente:

```bash
npm run build
```
