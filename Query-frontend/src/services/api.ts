// src/services/api.ts
import axios from 'axios';

// Create an axios instance with the base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ---- TYPE DEFINITIONS ----
// These should match your FastAPI Pydantic models

// Matches the DBConfig model in Python
export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string; // Optional as it has a default in Python
  database: string;
}

// Represents a single message in the chat history
export interface ChatMessage {
  role: 'ai' | 'user'; // 'ai' for AIMessage, 'user' for HumanMessage
  content: string;
}

// Matches the ChatRequest model in Python
export interface ChatRequestPayload {
  question: string;
  chat_history: ChatMessage[];
}

// Auth types
export interface SignupData {
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  password: string;
  otp: string;
  username: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface OtpRequest {
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    contactNumber: string;
    gender: string;
  };
}

export interface OtpResponse {
  success: boolean;
  message: string;
}

// ---- API FUNCTIONS ----

/**
 * Connects to the database.
 * @param config - The database connection details.
 * @returns A promise that resolves with the server's response.
 */
export const connectToDB = async (config: DBConfig) => {
  try {
    const { data } = await api.post('/api/connect', config);
    return data; // Expected: { success: true } or { success: false, error: "..." }
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    throw error;
  }
};

/**
 * Sends a message to the chat endpoint.
 * @param payload - The question and chat history.
 * @returns A promise that resolves with the AI's response.
 */
export const sendChatMessage = async (payload: ChatRequestPayload) => {
  try {
    const { data } = await api.post('/api/chat', payload);
    return data; // Expected: { success: true, response: "..." } or { success: false, error: "..." }
  } catch (error) {
    console.error("Failed to send chat message:", error);
    throw error;
  }
};

/**
 * Fetches all chat sessions for the authenticated user.
 * @param userId - The ID of the user.
 * @returns A promise that resolves with an array of chat sessions.
 */
export const getChatSessions = async (userId: number) => {
  try {
    const { data } = await api.get(`/api/chat-sessions?user_id=${userId}`);
    return data; // Expected: array of chat sessions
  } catch (error) {
    console.error("Failed to fetch chat sessions:", error);
    throw error;
  }
};

/**
 * Creates a new chat session.
 * @param session - The chat session data including title, messages, and user_id.
 * @returns A promise that resolves with the created chat session.
 */
export const createChatSession = async (session: { title: string; messages: ChatMessage[]; user_id: number }) => {
  try {
    const { data } = await api.post('/api/chat-sessions', session);
    return data; // Expected: created chat session object
  } catch (error) {
    console.error("Failed to create chat session:", error);
    throw error;
  }
};

/**
 * Deletes a chat session by ID.
 * @param sessionId - The ID of the chat session to delete.
 * @param userId - The ID of the user.
 * @returns A promise that resolves when deletion is complete.
 */
export const deleteChatSession = async (sessionId: number, userId: number) => {
  try {
    const { data } = await api.delete(`/api/chat-sessions/${sessionId}?user_id=${userId}`);
    return data; // Expected: success confirmation
  } catch (error) {
    console.error("Failed to delete chat session:", error);
    throw error;
  }
};

/**
 * Updates a chat session by ID.
 * @param sessionId - The ID of the chat session to update.
 * @param updatedSession - The updated session data including messages and user_id.
 * @returns A promise that resolves with the updated chat session.
 */
export const updateChatSession = async (
  sessionId: number,
  updatedSession: { 
    title?: string; 
    messages?: any[]; 
    user_id: number 
  }
) => {
  try {
    const { data } = await api.put(`/api/chat-sessions/${sessionId}`, updatedSession);
    return data; // Expected: updated chat session object
  } catch (error) {
    console.error("Failed to update chat session:", error);
    throw error;
  }
};

/**
 * Sends OTP to the user's email for signup verification.
 * @param request - The email to send OTP to.
 * @returns A promise that resolves with the server's response.
 */
export const sendOtp = async (request: OtpRequest): Promise<OtpResponse> => {
  try {
    const { data } = await api.post('/api/send-otp', request);
    return data;
  } catch (error) {
    console.error("Failed to send OTP:", error);
    throw error;
  }
};

/**
 * Signs up a new user.
 * @param userData - The user signup data including OTP.
 * @returns A promise that resolves with the auth response.
 */
export const signup = async (userData: SignupData): Promise<AuthResponse> => {
  try {
    const { data } = await api.post('/api/signup', userData);
    return data;
  } catch (error) {
    console.error("Failed to signup:", error);
    throw error;
  }
};

/**
 * Logs in a user.
 * @param credentials - The login credentials (identifier and password).
 * @returns A promise that resolves with the auth response.
 */
export const login = async (credentials: LoginData): Promise<AuthResponse> => {
  try {
    const { data } = await api.post('/api/login', credentials);
    return data;
  } catch (error) {
    console.error("Failed to login:", error);
    throw error;
  }
};
