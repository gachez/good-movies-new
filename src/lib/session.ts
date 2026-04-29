// In-memory conversation history.
// Works for development (persistent Node.js process).
// For multi-user production, replace with Redis or DB-backed sessions.

export interface Message {
  role: "user" | "assistant";
  content: string;
}

let history: Message[] = [];

export function getHistory(): Message[] {
  return [...history];
}

export function addToHistory(role: "user" | "assistant", content: string) {
  history.push({ role, content });
  // Keep last 10 exchanges to avoid unbounded growth
  if (history.length > 20) {
    history = history.slice(history.length - 20);
  }
}

export function resetHistory() {
  history = [];
}
