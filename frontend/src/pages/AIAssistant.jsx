import React, { useEffect, useState } from "react";
import {
  Send,
  Plus,
  MessageSquare,
  Loader2,
  Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import { COLORS } from "../styles/tokens.js";

import {
  getConversations,
  getConversationMessages,
  createConversation,
  sendAIMessage,
} from "../services/aiService.js";

const SUGGESTIONS = [
  "What's the status of my latest complaint?",
  "How do I report an issue?",
  "What happens after I report?",
];

export function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] =
    useState(null);
  const [messages, setMessages] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] =
    useState(false);

  // =========================
  // LOAD CONVERSATIONS
  // =========================

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();

      setConversations(data || []);

      if (data && data.length > 0) {
        await openConversation(data[0]);
      }
    } catch (error) {
      console.error(
        "Failed to load conversations:",
        error
      );
    }
  };

  // =========================
  // OPEN CONVERSATION
  // =========================

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);

    try {
      const data = await getConversationMessages(
        conversation.id
      );

      setMessages(data || []);
    } catch (error) {
      console.error(
        "Failed to load messages:",
        error
      );

      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // =========================
  // NEW CHAT
  // =========================

  const handleNewChat = async () => {
    if (loading) return;

    try {
      const conversation =
        await createConversation();

      setConversations((prev) => [
        conversation,
        ...prev,
      ]);

      setSelectedConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error(
        "Failed to create conversation:",
        error
      );
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================

  const handleSend = async (e, preset) => {
    e?.preventDefault();

    const trimmed = (preset ?? message).trim();

    if (
      !trimmed ||
      loading ||
      !selectedConversation
    ) {
      return;
    }

    // Optimistic user message
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [
      ...prev,
      tempMessage,
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await sendAIMessage(
        trimmed,
        selectedConversation.id
      );

      // Assistant response
      const assistantMessage = {
        _id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      // Refresh conversation list
      const updated =
        await getConversations();

      setConversations(updated || []);

      const updatedConversation =
        updated?.find(
          (conversation) =>
            conversation.id ===
            selectedConversation.id
        );

      if (updatedConversation) {
        setSelectedConversation(
          updatedConversation
        );
      }
    } catch (error) {
      console.error(
        "AI error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          _id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I couldn't connect to the AI service. Please try again.",
          createdAt:
            new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="p-4 sm:p-6">
      <section
        className="rounded-lg border overflow-hidden bg-surface"
        style={{
          borderColor: COLORS.line,
        }}
      >

        {/* =========================
            HEADER
        ========================= */}

        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: COLORS.line,
          }}
        >

          <div className="flex items-center gap-3">

            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{
                backgroundColor:
                  COLORS.primarySoft,
              }}
            >
              <Bot
                className="w-5 h-5"
                style={{
                  color: COLORS.primary,
                }}
              />
            </div>

            <div>
              <h2
                className="text-[15px] font-semibold tracking-tight"
                style={{
                  color: COLORS.ink,
                }}
              >
                CampusCare Assistant
              </h2>

              <p
                className="text-xs"
                style={{
                  color: COLORS.slate,
                }}
              >
                AI Assistant
              </p>
            </div>

          </div>

          <button
            onClick={handleNewChat}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor:
                COLORS.primary,
            }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

        </div>

        {/* =========================
            MAIN AREA
        ========================= */}

        <div className="grid lg:grid-cols-[240px_1fr] min-h-[600px]">

          {/* =========================
              CONVERSATIONS
          ========================= */}

          <aside
            className="border-b lg:border-b-0 lg:border-r"
            style={{
              borderColor: COLORS.line,
            }}
          >

            <div
              className="px-4 py-3 text-xs font-medium"
              style={{
                color: COLORS.slate,
              }}
            >
              Conversations
            </div>

            <div className="max-h-[500px] overflow-y-auto px-2 pb-3">

              {conversations.length === 0 && (
                <div
                  className="px-3 py-6 text-center text-xs"
                  style={{
                    color: COLORS.slate,
                  }}
                >
                  No conversations yet.
                  <br />
                  Click "New Chat" to start.
                </div>
              )}

              {conversations.map(
                (conversation) => {

                  const active =
                    selectedConversation?.id ===
                    conversation.id;

                  return (
                    <button
                      key={
                        conversation.id
                      }
                      onClick={() =>
                        openConversation(
                          conversation
                        )
                      }
                      disabled={
                        loadingMessages
                      }
                      className="w-full flex items-start gap-3 px-3 py-3 rounded-md text-left mb-1 transition hover:bg-hover"
                      style={{
                        backgroundColor:
                          active
                            ? COLORS.primarySoft
                            : "transparent",

                        color:
                          active
                            ? COLORS.primary
                            : COLORS.ink,
                      }}
                    >

                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />

                      <div className="min-w-0">

                        <div className="text-sm font-medium truncate">
                          {conversation.title ||
                            "New Conversation"}
                        </div>

                        <div
                          className="text-xs mt-1"
                          style={{
                            color:
                              COLORS.slate,
                          }}
                        >
                          {conversation.updatedAt
                            ? new Date(
                                conversation.updatedAt
                              ).toLocaleDateString()
                            : ""}
                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </aside>

          {/* =========================
              CHAT
          ========================= */}

          <div className="flex flex-col min-w-0">

            {/* NO CONVERSATION */}

            {!selectedConversation && (
              <div className="flex-1 min-h-[500px] flex items-center justify-center px-6">

                <div className="text-center">

                  <div
                    className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor:
                        COLORS.primarySoft,
                    }}
                  >
                    <Bot
                      className="w-7 h-7"
                      style={{
                        color:
                          COLORS.primary,
                      }}
                    />
                  </div>

                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color:
                        COLORS.ink,
                    }}
                  >
                    CampusCare Assistant
                  </h3>

                  <p
                    className="mt-2 text-sm"
                    style={{
                      color:
                        COLORS.slate,
                    }}
                  >
                    Start a conversation with
                    your AI assistant.
                  </p>

                  <button
                    onClick={
                      handleNewChat
                    }
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white"
                    style={{
                      backgroundColor:
                        COLORS.primary,
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Start New Chat
                  </button>

                </div>

              </div>
            )}

            {/* SELECTED CONVERSATION */}

            {selectedConversation && (
              <>
                {/* MESSAGES */}

                <div className="flex-1 min-h-[420px] max-h-[550px] overflow-y-auto px-5 py-6">

                  {loadingMessages && (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        style={{
                          color:
                            COLORS.primary,
                        }}
                      />
                    </div>
                  )}

                  {!loadingMessages &&
                    messages.length === 0 && (
                      <div className="h-full flex items-center justify-center">

                        <div className="text-center">

                          <Bot
                            className="w-9 h-9 mx-auto mb-3"
                            style={{
                              color:
                                COLORS.primary,
                            }}
                          />

                          <h3
                            className="font-semibold"
                            style={{
                              color:
                                COLORS.ink,
                            }}
                          >
                            How can I help?
                          </h3>

                          <p
                            className="text-sm mt-1"
                            style={{
                              color:
                                COLORS.slate,
                            }}
                          >
                            Ask how reporting works, what happens next, or anything about campus maintenance.
                          </p>

                          <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {SUGGESTIONS.map((s) => (
                              <button
                                key={s}
                                onClick={() => handleSend(null, s)}
                                disabled={loading}
                                className="h-7 px-2.5 rounded-md text-xs border transition-colors hover:bg-hover disabled:opacity-50"
                                style={{
                                  borderColor: COLORS.line,
                                  color: COLORS.ink,
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>

                        </div>

                      </div>
                    )}

                  <div className="space-y-5">

                    {messages.map((msg) => {

                      const isUser =
                        msg.role ===
                        "user";

                      return (
                        <div
                          key={msg._id}
                          className={`flex ${
                            isUser
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >

                          <div
                            className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-6"
                            style={{
                              backgroundColor:
                                isUser
                                  ? COLORS.primary
                                  : COLORS.bg,

                              color:
                                isUser
                                  ? "white"
                                  : COLORS.ink,

                              border:
                                isUser
                                  ? "none"
                                  : `1px solid ${COLORS.line}`,
                            }}
                          >

                            {isUser ? (
                              <div className="whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            ) : (
                              <ReactMarkdown
                                components={{
                                  p: ({
                                    children,
                                  }) => (
                                    <p className="mb-2 last:mb-0">
                                      {children}
                                    </p>
                                  ),

                                  strong: ({
                                    children,
                                  }) => (
                                    <strong className="font-semibold">
                                      {children}
                                    </strong>
                                  ),

                                  ul: ({
                                    children,
                                  }) => (
                                    <ul className="list-disc pl-5 mb-2 space-y-1">
                                      {children}
                                    </ul>
                                  ),

                                  ol: ({
                                    children,
                                  }) => (
                                    <ol className="list-decimal pl-5 mb-2 space-y-1">
                                      {children}
                                    </ol>
                                  ),

                                  li: ({
                                    children,
                                  }) => (
                                    <li>
                                      {children}
                                    </li>
                                  ),

                                  h1: ({
                                    children,
                                  }) => (
                                    <h1 className="text-lg font-semibold mb-2">
                                      {children}
                                    </h1>
                                  ),

                                  h2: ({
                                    children,
                                  }) => (
                                    <h2 className="text-[15px] font-semibold tracking-tight mb-2">
                                      {children}
                                    </h2>
                                  ),

                                  h3: ({
                                    children,
                                  }) => (
                                    <h3 className="font-semibold mb-1">
                                      {children}
                                    </h3>
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            )}

                          </div>

                        </div>
                      );
                    })}

                    {/* AI LOADING */}

                    {loading && (
                      <div className="flex justify-start">

                        <div
                          className="rounded-lg px-4 py-3 border"
                          style={{
                            borderColor:
                              COLORS.line,
                            backgroundColor:
                              COLORS.bg,
                          }}
                        >
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{
                              color:
                                COLORS.primary,
                            }}
                          />
                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* =========================
                    INPUT
                ========================= */}

                <div
                  className="border-t p-4"
                  style={{
                    borderColor:
                      COLORS.line,
                  }}
                >

                  <form
                    onSubmit={
                      handleSend
                    }
                    className="flex gap-3"
                  >

                    <input
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      disabled={loading}
                      placeholder="Ask CampusCare Assistant..."
                      className="flex-1 rounded-md border px-4 py-3 text-sm outline-none focus:ring-2"
                      style={{
                        borderColor:
                          COLORS.line,

                        "--tw-ring-color":
                          COLORS.primary,
                      }}
                    />

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !message.trim()
                      }
                      className="w-11 h-11 shrink-0 rounded-md flex items-center justify-center text-white disabled:opacity-50"
                      style={{
                        backgroundColor:
                          COLORS.primary,
                      }}
                    >

                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}

                    </button>

                  </form>

                </div>
              </>
            )}

          </div>

        </div>

      </section>
    </div>
  );
}

export default AIAssistant;
