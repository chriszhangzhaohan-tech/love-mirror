"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Heart, Mic, Send, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useMemo, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  suggestedQuestions?: string[];
};

type GameStatus = "selecting" | "playing";

type GameConfig = {
  level: string;
  persona: string;
};

const HEART_REGEX = /【心动值】\s*(\d{1,3})/;
const DELTA_REGEX = /【变化】\s*([+-]?\d{1,3})/;

const levelOptions = [
  { label: "LV1 初识", value: "LV1_初识 (让他对你产生好奇)" },
  { label: "LV2 邀约", value: "LV2_推拉 (引导他主动邀约)" },
  { label: "LV3 陷阱", value: "V3_废物测试 (应对他的无理要求)" },
];

const personaOptions = [
  { label: "霸总", description: "强势、高冷", icon: Crown },
  { label: "直男", description: "逻辑怪、木讷", icon: Shield },
  { label: "奶狗", description: "粘人、情绪化", icon: Heart },
  { label: "高情商", description: "共情强、会说话", icon: Heart },
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "ai",
    content: "欢迎来到恋爱模拟器～准备好开始攻略了吗？\n\n【心动值】35",
    suggestedQuestions: ["我该怎么开场？", "他喜欢什么样的人？"],
  },
];

const chatMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const rainEmojis = ["😭", "💔", "🥀"];

type RainItem = {
  id: string;
  emoji: string;
  left: number;
  duration: number;
  delay: number;
};

export default function Home() {
  const [gameStatus, setGameStatus] = useState<GameStatus>("selecting");
  const [config, setConfig] = useState<GameConfig>({
    level: levelOptions[0].value,
    persona: personaOptions[0].label,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [heartValue, setHeartValue] = useState(35);
  const [shakeKey, setShakeKey] = useState(0);
  const [diffPopup, setDiffPopup] = useState<string | null>(null);
  const [emojiRain, setEmojiRain] = useState(false);
  const [rainItems, setRainItems] = useState<RainItem[]>([]);

  const levelLabel =
    levelOptions.find((option) => option.value === config.level)?.label ??
    config.level;
  const personaIcon =
    personaOptions.find((option) => option.label === config.persona)?.icon ??
    Heart;
  const PersonaIcon = personaIcon;

  const progressColor = useMemo(() => {
    if (heartValue < 40) return "#60A5FA";
    if (heartValue < 70) return "#F472B6";
    return "#FF69B4";
  }, [heartValue]);

  const handleReset = () => {
    setMessages(initialMessages);
    setConversationId(null);
    setHeartValue(35);
    setInput("");
    setIsLoading(false);
    setGameStatus("selecting");
  };

  const triggerPositiveFeedback = (diff: number) => {
    const shared = {
      spread: 360,
      scalar: 1.2,
      shapes: ["star"],
      colors: ["#FACC15", "#F472B6", "#FDBA74"],
    };
    const burst = (originX: number, originY: number, count: number) =>
      confetti({
        particleCount: count,
        origin: { x: originX, y: originY },
        ...shared,
      });

    const rounds = [0, 180, 360];
    rounds.forEach((delay) => {
      window.setTimeout(() => {
        burst(0.5, 0.5, 220);
        burst(0.2, 0.2, 160);
        burst(0.8, 0.2, 160);
        burst(0.2, 0.8, 160);
        burst(0.8, 0.8, 160);
        burst(0.5, 0.2, 120);
        burst(0.5, 0.8, 120);
      }, delay);
    });
    setDiffPopup(`+${diff}`);
    window.setTimeout(() => setDiffPopup(null), 1200);
  };

  const triggerNegativeFeedback = () => {
    setShakeKey((prev) => prev + 1);
    const items: RainItem[] = Array.from({ length: 24 }).map((_, index) => ({
      id: `${Date.now()}-${index}`,
      emoji: rainEmojis[Math.floor(Math.random() * rainEmojis.length)],
      left: Math.random() * 100,
      duration: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.4,
    }));
    setRainItems(items);
    setEmojiRain(true);
    window.setTimeout(() => {
      setEmojiRain(false);
      setRainItems([]);
    }, 2600);
  };

  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          conversation_id: conversationId,
          user: "user-123",
          persona: config.persona,
          level: config.level,
        }),
      });

      if (!res.ok) {
        throw new Error("请求失败，请稍后再试。");
      }

      const data = await res.json();
      const answer = typeof data.answer === "string" ? data.answer : "……";
      const nextConversationId =
        typeof data.conversation_id === "string" ? data.conversation_id : null;

      if (nextConversationId) {
        setConversationId(nextConversationId);
      }

      const heartMatch = answer.match(HEART_REGEX);
      if (heartMatch) {
        const value = Math.max(0, Math.min(100, Number(heartMatch[1])));
        if (!Number.isNaN(value)) setHeartValue(value);
      }

      const deltaMatch = answer.match(DELTA_REGEX);
      if (deltaMatch) {
        const diff = Number(deltaMatch[1]);
        if (!Number.isNaN(diff)) {
          if (diff > 0) {
            triggerPositiveFeedback(diff);
          } else if (diff < 0) {
            triggerNegativeFeedback();
          }
        }
      }

      const suggested =
        (Array.isArray(data.suggested_questions) && data.suggested_questions) ||
        (Array.isArray(data?.metadata?.suggested_questions) &&
          data.metadata.suggested_questions) ||
        undefined;

      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        role: "ai",
        content: answer,
        suggestedQuestions: suggested,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: "ai",
        content: "抱歉，暂时连接不上 Dify。请稍后重试～",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 font-sans">
      <AnimatePresence mode="wait">
        {gameStatus === "selecting" ? (
          <motion.div
            key="selecting"
            className="flex min-h-screen items-center justify-center px-6 py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="w-full max-w-3xl rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-2xl backdrop-blur">
              <h1 className="text-center text-2xl font-semibold text-zinc-800">
                恋爱魔镜：请选择你的挑战
              </h1>
              <p className="mt-2 text-center text-sm text-zinc-500">
                选择关卡与对象，进入恋爱模拟对战。
              </p>

              <div className="mt-8">
                <h2 className="text-sm font-semibold text-zinc-600">
                  关卡选择
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  {levelOptions.map((level) => {
                    const isSelected = config.level === level.value;
                    return (
                      <motion.button
                        key={level.value}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            level: level.value,
                          }))
                        }
                        className={`rounded-2xl border px-4 py-5 text-left transition ${
                          isSelected
                            ? "border-[#FF69B4] bg-[#FFF0F6] text-[#FF69B4] shadow-md"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-[#FF69B4]/50"
                        }`}
                      >
                        <div className="text-lg font-semibold">
                          {level.label}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          点击选择该关卡
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-sm font-semibold text-zinc-600">
                  对象选择
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-4">
                  {personaOptions.map((persona) => {
                    const isSelected = config.persona === persona.label;
                    const Icon = persona.icon;
                    return (
                      <motion.button
                        key={persona.label}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            persona: persona.label,
                          }))
                        }
                        className={`flex flex-col gap-2 rounded-2xl border px-4 py-5 text-left transition ${
                          isSelected
                            ? "border-[#FF69B4] bg-[#FFF0F6] text-[#FF69B4] shadow-md"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-[#FF69B4]/50"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isSelected ? "text-[#FF69B4]" : "text-zinc-400"
                          }`}
                        />
                        <div className="text-base font-semibold">
                          {persona.label}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {persona.description}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="mt-10 w-full rounded-2xl bg-[#FF69B4] py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#ff4aa2]"
                onClick={() => {
                  setMessages(initialMessages);
                  setConversationId(null);
                  setHeartValue(35);
                  setGameStatus("playing");
                }}
              >
                开始模拟
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`playing-${shakeKey}`}
            className="flex min-h-screen items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="relative flex h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-xl"
              animate={
                shakeKey
                  ? { x: [0, -6, 6, -4, 4, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
            >
              <AnimatePresence>
                {diffPopup && (
                  <motion.div
                    key="diff-popup"
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1.1, y: -10 }}
                    exit={{ opacity: 0, scale: 0.7, y: -30 }}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-6xl font-extrabold text-[#FF69B4] drop-shadow-lg"
                  >
                    {diffPopup}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {emojiRain && (
                  <motion.div
                    key="emoji-rain"
                    className="pointer-events-none fixed inset-0 z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {rainItems.map((item) => (
                      <motion.span
                        key={item.id}
                        className="absolute text-3xl"
                        style={{ left: `${item.left}%` }}
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: "110vh", opacity: [0, 1, 1, 0] }}
                        transition={{
                          duration: item.duration,
                          delay: item.delay,
                          ease: "linear",
                        }}
                      >
                        {item.emoji}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <header className="flex flex-col gap-3 border-b border-zinc-200 bg-[#FFF0F6] px-5 py-4">
                <div className="flex items-center justify-between text-sm font-semibold text-zinc-700">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <PersonaIcon className="h-4 w-4 text-[#FF69B4]" />
                    </span>
                    <span>
                      {config.persona}
                      <span className="ml-2 text-xs text-zinc-500">
                        {levelLabel}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-[#FF69B4]/50 px-3 py-1 text-xs text-[#FF69B4] transition hover:bg-[#FF69B4]/10"
                    onClick={handleReset}
                  >
                    退出/重来
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <Heart size={18} color={progressColor} fill={progressColor} />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>心动值</span>
                      <motion.span
                        key={heartValue}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="font-semibold"
                        style={{ color: progressColor }}
                      >
                        {heartValue}%
                      </motion.span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                      <motion.div
                        className="h-full rounded-full"
                        animate={{
                          width: `${heartValue}%`,
                          backgroundColor: progressColor,
                        }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1 space-y-4 overflow-y-auto bg-zinc-100 px-4 py-5">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      {...(message.role === "ai" ? chatMotion : {})}
                    >
                      <div
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            message.role === "user"
                              ? "rounded-br-md bg-emerald-400 text-white"
                              : "rounded-bl-md bg-white text-zinc-700"
                          }`}
                        >
                          {message.role === "ai" ? (
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                      {message.role === "ai" &&
                        message.suggestedQuestions &&
                        message.suggestedQuestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestedQuestions.map((question, index) => (
                              <button
                                key={`${message.id}-q-${index}`}
                                className="rounded-full border border-[#FF69B4] bg-white px-3 py-1 text-xs font-medium text-[#FF69B4] transition hover:bg-[#FF69B4]/10"
                                onClick={() => handleSend(question)}
                                type="button"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-xs text-zinc-400 shadow-sm">
                      {config.persona}正在输入...
                    </div>
                  </div>
                )}
              </main>

              <footer className="border-t border-zinc-200 bg-white px-4 py-3">
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend(input);
                  }}
                >
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                    aria-label="语音"
                  >
                    <Mic size={18} />
                  </button>
                  <input
                    className="h-10 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-[#FF69B4]"
                    placeholder="输入想说的话..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                  />
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF69B4] text-white transition hover:bg-[#ff4aa2] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    aria-label="发送"
                    disabled={!input.trim() || isLoading}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
