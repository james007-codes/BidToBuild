import { request } from "./apiClient.js";

/* =========================
   CONVERSATIONS
========================= */

export const getConversations = async () => {
    const data = await request("/conversations", { fallback: "Failed to load conversations" });
    return data.conversations;
};

export const createConversation = async () => {
    const data = await request("/conversations", {
        method: "POST",
        fallback: "Failed to create conversation",
    });
    return data.conversation;
};

export const getConversationMessages = async (conversationId) => {
    const data = await request(`/conversations/${conversationId}/messages`, {
        fallback: "Failed to load messages",
    });
    return data.messages;
};

/* =========================
   SEND MESSAGE
========================= */

export const sendAIMessage = async (message, conversationId) => {
    const data = await request("/ai/chat", {
        method: "POST",
        body: { message, conversationId },
        fallback: "AI request failed",
    });
    return data.response;
};
