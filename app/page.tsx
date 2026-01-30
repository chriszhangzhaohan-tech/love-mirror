"use client";

import confetti, { type Shape } from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Crown,
  Heart,
  Mic,
  MoreHorizontal,
  Send,
  Shield,
  Star,
} from "lucide-react";
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
  { label: "初次相遇", value: "LV1_初识 (让他对你产生好奇)" },
  { label: "甜蜜约会", value: "LV2_推拉 (引导他主动邀约)" },
  { label: "危机化解", value: "V3_废物测试 (应对他的无理要求)" },
];

const personaOptions = [
  {
    label: "霸道总裁",
    persona: "霸总",
    description: "强势、高冷",
    subtitle: "Dominant CEO",
    quote: "在这个世界上，只有我能给你想要的一切。",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDOhZfV58_Q04KIwrGgwVa2K3f6ruhR5fRmeB4ceTMeh1X3xoSqwDcIRNk30h9MYB6JTCEY94E7HYgfBZmOKW9P7lmh5skNrNkNdT1Fx5PxyzgSYQ8qW9CvQ2ZTrsrmj_pGFiM16J8ie3NPrVkGiS85DtWZPeMnw5pVNw8GGz7U14Sw472xP0KNmt_3gyN7Pg6pSNiM79DvrUGfcSKeWR6uYCBCuHA-RE5-uVoUG0EAfmuHIY3uPKPQjSIjXeMK3cWVqgfqbHTqns0",
  },
  {
    label: "温柔年下",
    persona: "奶狗",
    description: "粘人、情绪化",
    subtitle: "Gentle Puppy",
    quote: "无论你何时回头，我都会一直在这里等你。",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuANQbWAhgkTM2PTW3I2O8_CuWK4tKzxkBTH0PL0lC7pgj6ohd4s9_lZQXFk6ZLeXtLD1WNsv5ALY3cAehqnZoYjPv-zEBuVxmANmMicNNgeozjrBfmmGO00SS8Em0r3Nk9DEcR-8_Lm3D0XpQLhhLZj8mFEtrJtj53Awe7RxyzCfmGpaCAtxU2i5S2PX92KQFb0hIheb8oTr-iFjFFG3r0elzGHrz55GvwpEvOnaLgfs30hIWYtME3VLSG9h_r243NsAE8LpzMHO6k",
  },
  {
    label: "孤傲画家",
    persona: "高情商",
    description: "共情强、会说话",
    subtitle: "Mysterious Artist",
    quote: "你是我画布上，唯一无法捕捉的色彩。",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCUDu0vyZTOD2Y1V4teYE-dw2eELLq9ZzMlWkNp1dHAXW2ZPv1cd2zu5XHJpjRwMj2nKQgP1pPJfr-TOS55ersgy8UkX37xzu7N7XIB1RMYCUH1Wvqb7_zrrk1Qxo0Asdv7SZmTB_qd_pHPZiHaQt_nQ_x76d-JBuCW7b0U3w9GO1qQ5Psc3TlsEuQXRlrcHVnNJ9CUK7eETTKo0EKxBGxwZULblqngPYM6qrOPdb1Tf5tKAK_xHlcDiqCeCNE6WNofUmcH7NqoODA",
  },
];

const chatBackgroundImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCVsCJYVA-A_eaEn2ZAr3Aa7ovgy-AfzulCj4d313Mer68WXCEPV8NklB60vFZ5h0A2lRxpfoOneEErdwEKNZEa3KfiAo5aqrUyPQweP5NTyfc7jjMnSLL144MbyshKi7quc4AxGx1pPWcfyXo7o1CLFVxuhuTmjDHRXGWdqpkMyfPKRD6hbcpIRbA6ksi7lGlgZmvpuNyyA40ePhSnFwDsFxblib6bCcaYTgsQqg4sUchV1p9TOpsRhzX_TfUygg90RWimcxSfZug";
const userAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDpwSgxwCMgjeP41eEyp6Vx-9kiM_kP9DR_w-ejmZXk3FE7apDWJsDVg95h80ZxfqMYjD6FRF3q-5Gtaj3j22slIQkbFxJhO13JHxTZlZkeGFTOvfGuQxj5vBPz06f1F_Cu62plY9qWmlli5bCymzQzeX59xDDH_A6msei2uI22jToai-SIZ-okmWBtZniuKAYCo9k4rSowywXmDbJwpNV-YP8iBILoQBeInenGKg-GjTv5n74mYBaHRul_xjeASdx2lOaCP4Tifso";

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
    config.persona === "霸总" ? Crown : config.persona === "直男" ? Shield : Heart;
  const PersonaIcon = personaIcon;

  const selectedPersonaIndex = personaOptions.findIndex(
    (option) => option.persona === config.persona
  );
  const selectedPersona =
    personaOptions.find((option) => option.persona === config.persona) ??
    personaOptions[0];
  const lastSuggestedQuestions =
    [...messages]
      .reverse()
      .find((message) => message.role === "ai" && message.suggestedQuestions)
      ?.suggestedQuestions ?? [];

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
    const shared: Omit<confetti.Options, "origin" | "particleCount"> & {
      shapes: Shape[];
    } = {
      spread: 360,
      scalar: 1.2,
      shapes: ["star"] as Shape[],
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
            className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f8f5f7] px-4 pb-10 text-[#181014]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[#f8f5f7]/80 p-4 backdrop-blur-md">
              <div className="flex h-12 w-12 items-center justify-center text-[#ff9ecd]">
                <Heart className="h-7 w-7 fill-current" />
              </div>
              <h2 className="flex-1 pr-12 text-center text-xl font-bold tracking-tight">
                今日心动邂逅
              </h2>
            </header>

            <nav className="mt-2 px-2">
              <div className="flex gap-6 overflow-x-auto border-b border-[#ff9ecd]/20 pb-1">
                {levelOptions.map((level) => {
                  const isSelected = config.level === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, level: level.value }))
                      }
                      className={`flex flex-col items-center whitespace-nowrap pb-3 pt-2 text-sm font-bold tracking-wide transition ${
                        isSelected
                          ? "border-b-[3px] border-[#ff9ecd] text-[#ff9ecd]"
                          : "border-b-[3px] border-transparent text-[#8d5e75]"
                      }`}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <main className="flex flex-1 flex-col justify-center py-6">
              <div className="flex snap-x snap-mandatory overflow-x-auto pb-2 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max items-stretch gap-6 px-6">
                  {personaOptions.map((persona) => {
                    const isSelected = config.persona === persona.persona;
                    return (
                      <motion.button
                        key={persona.persona}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            persona: persona.persona,
                          }))
                        }
                        className={`relative flex h-[500px] w-[300px] snap-center flex-col overflow-hidden rounded-xl text-left transition ${
                          isSelected
                            ? "border-2 border-[#ff9ecd] shadow-[0_10px_30px_-5px_rgba(255,158,205,0.5)]"
                            : "border border-white/60 shadow-[0_10px_30px_-5px_rgba(255,158,205,0.3)]"
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                          style={{ backgroundImage: `url("${persona.image}")` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/30 bg-white/70 p-5 backdrop-blur-xl">
                          <div className="mb-1 flex items-start justify-between">
                            <h3 className="text-xl font-bold text-[#181014]">
                              {persona.label}
                            </h3>
                            <span className="text-sm text-[#D4AF37]">★</span>
                          </div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8d5e75]">
                            {persona.subtitle}
                          </p>
                          <p className="text-sm italic leading-relaxed text-[#181014]/90">
                            “{persona.quote}”
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex w-full items-center justify-center gap-2 py-8">
                {personaOptions.map((_, index) => (
                  <div
                    key={`indicator-${index}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === selectedPersonaIndex
                        ? "w-6 bg-[#ff9ecd]"
                        : "w-1.5 bg-[#e7dae0]"
                    }`}
                  />
                ))}
              </div>
            </main>

            <footer className="bg-gradient-to-t from-[#f8f5f7] to-transparent pb-10">
              <div className="flex px-4">
                <button
                  type="button"
                  className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#ff9ecd] px-8 text-lg font-bold tracking-wider text-[#181014] shadow-[0_4px_20px_rgba(255,158,205,0.5)] transition active:scale-95"
                  onClick={() => {
                    setMessages(initialMessages);
                    setConversationId(null);
                    setHeartValue(35);
                    setGameStatus("playing");
                  }}
                >
                  开启恋爱之旅
                  <span className="ml-2 text-xl">✨</span>
                </button>
              </div>
            </footer>

            <div className="pointer-events-none fixed -right-20 top-20 h-64 w-64 rounded-full bg-[#ff9ecd]/10 blur-[100px]" />
            <div className="pointer-events-none fixed -left-20 bottom-40 h-80 w-80 rounded-full bg-[#ff9ecd]/5 blur-[100px]" />
          </motion.div>
        ) : (
          <motion.div
            key={`playing-${shakeKey}`}
            className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f8f5f7] px-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(253,252,251,0.95) 0%, rgba(226,209,195,0.95) 100%), url("${chatBackgroundImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <motion.div
              className="relative flex h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/60 shadow-xl backdrop-blur"
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
              <div className="pointer-events-none absolute inset-0 z-10">
                <Star className="absolute left-[10%] top-[20%] h-7 w-7 text-yellow-400/60" />
                <Star className="absolute right-[20%] top-[25%] h-4 w-4 text-yellow-400/40" />
                <Star className="absolute right-[12%] top-[45%] h-6 w-6 text-yellow-400/50" />
              </div>

              <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/20 bg-white/70 px-4 pb-4 pt-10 backdrop-blur">
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-[#181014]"
                    type="button"
                    onClick={handleReset}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-[#ff9ecd]/50"
                      style={{
                        backgroundImage: `url("${selectedPersona.image}")`,
                      }}
                    />
                    <div>
                      <h2 className="text-base font-bold text-[#181014]">
                        {selectedPersona.label}
                      </h2>
                      <p className="text-xs font-medium text-[#8d5e75]">
                        {isLoading ? "Typing..." : levelLabel}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#181014]"
                  type="button"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </header>

              <div className="px-4 pt-2">
                <div className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="mb-2 flex items-end justify-between">
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-[#ff9ecd]" fill="#ff9ecd" />
                      <p className="text-sm font-semibold tracking-wide text-[#181014]">
                        Affection Level
                      </p>
                    </div>
                    <div className="rounded-full bg-[#ff9ecd] px-2 py-0.5 shadow-sm">
                      <motion.span
                        key={heartValue}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-bold text-white"
                      >
                        {heartValue}%
                      </motion.span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e7dae0]">
                    <motion.div
                      className="h-full rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                      animate={{ width: `${heartValue}%` }}
                      transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      style={{
                        background:
                          "linear-gradient(90deg, #d4af37, #f9e27d, #d4af37)",
                        backgroundSize: "200% auto",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] font-medium italic text-[#8d5e75]">
                    {selectedPersona.label} is starting to open up his heart to
                    you...
                  </p>
                </div>
              </div>

              <main className="flex-1 space-y-4 overflow-y-auto px-4 py-2 pb-48">
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-white/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#8d5e75]">
                    Today
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      {...(message.role === "ai" ? chatMotion : {})}
                    >
                      {message.role === "ai" ? (
                        <div className="flex items-end gap-2">
                          <div
                            className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center shadow-sm"
                            style={{
                              backgroundImage: `url("${selectedPersona.image}")`,
                            }}
                          />
                          <div className="flex flex-col items-start gap-1">
                            <p className="ml-1 text-[11px] font-semibold text-[#8d5e75]">
                              {selectedPersona.label}
                            </p>
                            <div className="max-w-[280px] rounded-2xl rounded-bl-none border border-white/50 bg-white/70 px-4 py-3 text-sm font-medium leading-relaxed text-[#181014] shadow-sm backdrop-blur">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end justify-end gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <p className="mr-1 text-[11px] font-semibold text-[#8d5e75]">
                              You
                            </p>
                            <div className="max-w-[280px] rounded-2xl rounded-br-none bg-gradient-to-br from-[#ff9ecd] to-[#ff7eb3] px-4 py-3 text-sm font-medium leading-relaxed text-white shadow-md">
                              {message.content}
                            </div>
                          </div>
                          <div
                            className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center shadow-sm"
                            style={{ backgroundImage: `url("${userAvatar}")` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex items-end gap-2">
                    <div
                      className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center shadow-sm"
                      style={{
                        backgroundImage: `url("${selectedPersona.image}")`,
                      }}
                    />
                    <div className="flex flex-col items-start gap-1">
                      <p className="ml-1 text-[11px] font-semibold text-[#8d5e75]">
                        {selectedPersona.label}
                      </p>
                      <div className="max-w-[280px] rounded-2xl rounded-bl-none border border-white/50 bg-white/70 px-4 py-3 text-xs font-medium leading-relaxed text-[#181014] shadow-sm backdrop-blur">
                        Typing...
                      </div>
                    </div>
                  </div>
                )}
              </main>

              <footer className="fixed bottom-0 left-0 right-0 z-50 space-y-5 bg-white/80 p-4 pb-8 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
                {lastSuggestedQuestions.length > 0 && (
                  <div className="no-scrollbar mb-2 flex justify-center gap-2 overflow-x-auto pb-1">
                    {lastSuggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSend(question)}
                        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 text-xs font-bold text-[#181014] shadow-sm transition active:scale-95"
                      >
                        <Heart className="h-4 w-4 text-[#ff9ecd]" />
                        {question}
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend(input);
                  }}
                >
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/70 shadow-sm"
                    aria-label="语音"
                  >
                    <Mic className="h-5 w-5 text-[#8d5e75]" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      className="h-12 w-full rounded-full border-0 bg-white/70 px-5 pr-14 text-sm font-medium text-[#181014] placeholder:text-[#8d5e75]/60 shadow-sm focus:ring-2 focus:ring-[#ff9ecd]/50"
                      placeholder="Type a message..."
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                    />
                    <button
                      className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9ecd] to-[#ff7eb3] text-white shadow-md"
                      type="submit"
                      aria-label="发送"
                      disabled={!input.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
