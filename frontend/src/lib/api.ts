import xior from "xior";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = xior.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

// Types
export interface Dialect {
  name: string;
  region: string;
  personality?: string;
}

export interface Language {
  name: string;
  flag: string;
  dialects: Record<string, Dialect>;
}

export interface GreetingResponse {
  tutor_name: string;
  region: string;
  greeting_native: string;
  greeting_english: string;
  audio_base64: string;
  personality: string;
}

export interface ConversationMessage {
  user: string;
  tutor: string;
  tutor_name: string;
}

export interface ProgressEvent {
  step: string;
  message: string;
  progress: number;
}

export interface AnalysisEvent {
  reaction: string;
  correction: string;
  encouragement: string;
  cultural_note?: string;
}

export interface TranslationEvent {
  native: string;
  english: string;
}

export interface CompleteEvent {
  transcript: string;
  reaction: string;
  correction: string;
  encouragement: string;
  cultural_note: string;
  response_native: string;
  response_english: string;
  audio_base64: string;
  tutor_name: string;
  tutor_region: string;
  language: string;
  dialect: string;
}

// API Functions
export const fetchLanguages = async (): Promise<Record<string, Language>> => {
  const { data } = await api.get("/languages");
  return data;
};

export const fetchDialects = async (
  language: string,
): Promise<{
  language: string;
  flag: string;
  dialects: Record<string, Dialect>;
}> => {
  const { data } = await api.get(`/dialects/${language}`);
  return data;
};

export const fetchGreeting = async (
  language: string,
  dialect: string,
  includeAudio: boolean = false,
): Promise<GreetingResponse> => {
  const { data } = await api.get("/greeting", {
    params: { language, dialect, include_audio: includeAudio },
  });
  return data;
};

// SSE Handler for conversation
export type SSEEventHandler = {
  onProgress?: (data: ProgressEvent) => void;
  onTranscript?: (transcript: string) => void;
  onAnalysis?: (data: AnalysisEvent) => void;
  onTranslation?: (data: TranslationEvent) => void;
  onComplete?: (data: CompleteEvent) => void;
  onError?: (error: string) => void;
};

export const startConversation = (
  audioBlob: Blob,
  language: string,
  dialect: string,
  history: ConversationMessage[],
  handlers: SSEEventHandler,
): { abort: () => void } => {
  const controller = new AbortController();

  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const params = new URLSearchParams({
    language,
    dialect,
    history: JSON.stringify(history),
  });

  console.log("🎤 Starting conversation:", { language, dialect, audioSize: audioBlob.size });

  fetch(`${API_BASE_URL}/converse?${params}`, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  })
    .then(async (response) => {
      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.startsWith("event:")) {
            const eventType = line.slice(6).trim();
            // Look for the next data line
            if (i + 1 < lines.length && lines[i + 1].startsWith("data:")) {
              const dataStr = lines[i + 1].slice(5).trim();
              try {
                const data = JSON.parse(dataStr);
                console.log(`📨 Event [${eventType}]:`, data);

                switch (eventType) {
                  case "progress":
                    handlers.onProgress?.(data);
                    break;
                  case "transcript":
                    handlers.onTranscript?.(data.transcript);
                    break;
                  case "analysis":
                    handlers.onAnalysis?.(data);
                    break;
                  case "translation":
                    handlers.onTranslation?.(data);
                    break;
                  case "complete":
                    handlers.onComplete?.(data);
                    break;
                  case "error":
                    console.error("❌ Server error:", data.message);
                    handlers.onError?.(data.message);
                    break;
                }
              } catch (e) {
                console.warn("Failed to parse event data:", dataStr);
              }
              i++; // Skip the data line we just processed
            }
          } else if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              console.log("📨 Data:", data);

              if (data.step) handlers.onProgress?.(data);
              else if (data.transcript && !data.response_native)
                handlers.onTranscript?.(data.transcript);
              else if (data.response_native) handlers.onComplete?.(data);
              else if (data.message) {
                console.error("❌ Error message:", data.message);
                handlers.onError?.(data.message);
              }
            } catch (e) {
              console.warn("Failed to parse data:", dataStr);
            }
          }
        }
      }

      console.log("✅ Stream complete");
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error("❌ Fetch error:", err);
        handlers.onError?.(err.message || "Connection failed");
      }
    });

  return { abort: () => controller.abort() };
};

// Audio helpers
export const playAudioBase64 = (base64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);

      const blob = new Blob([arr], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Audio playback failed"));
      };

      audio.play();
    } catch (e) {
      reject(e);
    }
  });
};
