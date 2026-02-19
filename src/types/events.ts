export type ElevenLabsInboundEvent =
  | UserTranscriptEvent
  | AgentResponseEvent
  | AgentResponseCorrectionEvent
  | AudioResponseEvent
  | InterruptionEvent
  | PingEvent;

type BaseInboundEvent = {
  type: string;
};

export type UserTranscriptEvent = BaseInboundEvent & {
  type: 'user_transcript';
  user_transcription_event: {
    user_transcript: string;
  };
};

export type AgentResponseEvent = BaseInboundEvent & {
  type: 'agent_response';
  agent_response_event: {
    agent_response: string;
  };
};

export type AgentResponseCorrectionEvent = BaseInboundEvent & {
  type: 'agent_response_correction';
  agent_response_correction_event: {
    original_agent_response: string;
    corrected_agent_response: string;
  };
};

export type AudioResponseEvent = BaseInboundEvent & {
  type: 'audio';
  audio_event: {
    audio_base_64: string;
    event_id: number;
  };
};

export type InterruptionEvent = BaseInboundEvent & {
  type: 'interruption';
  interruption_event: {
    reason: string;
  };
};

export type PingEvent = BaseInboundEvent & {
  type: 'ping';
  ping_event: {
    event_id: number;
    ping_ms?: number;
  };
};

export type ConversationInitOutboundEvent = {
  type: 'conversation_initiation_client_data';
};

export type PongOutboundEvent = {
  type: 'pong';
  event_id: number;
};
