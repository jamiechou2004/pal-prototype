import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, ArrowLeftRight, X } from "lucide-react";
import type { Action, Restaurant } from "../engine/script";
import "./TranslateSheet.css";
function Speaker({
  size = 18,
  waves = true,
}: {
  size?: number;
  waves?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8h4l5-4v16l-5-4H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
      {waves && (
        <path
          d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
function Mic({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor" />
      <path
        d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
const replyZh = "好的，大堂门口见，大概四分钟到。";
const replyEn = "OK, see you at the lobby entrance. About 4 minutes.";
/** Figma 199:9863 / 199:9897. Browser speech output; scripted demo driver input. */
export function TranslateSheet({
  restaurant: r,
  close,
  dispatch,
}: {
  restaurant: Restaurant;
  close: () => void;
  dispatch: React.Dispatch<Action>;
}) {
  const [reverse, setReverse] = useState(false),
    [full, setFull] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [listening, setListening] = useState(false),
    [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    saved = useRef(false),
    alive = useRef(true);
  const english = `Hello, please take me to ${r.name}. I'm waiting in the hotel lobby. I don't speak Chinese — thank you!`;
  const chinese = `您好，请送我到${r.cn}。我在酒店大堂等您。我不会说中文，谢谢！`;
  const source = reverse ? replyZh : english,
    target = reverse ? replyEn : chinese;
  const [addressEn, addressZh] = r.address.split(" · ");
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      window.speechSynthesis?.cancel();
      previous?.focus();
    };
  }, []);
  const stop = () => {
    clearTimeout(timer.current);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setListening(false);
    setNotice("");
  };
  const swap = () => {
    stop();
    setFull(false);
    setReverse((v) => !v);
  };
  const dismiss = () => {
    stop();
    if (full) setFull(false);
    else close();
  };
  const speak = (text: string, lang: string) => {
    stop();
    if (!window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) {
      setNotice(
        "Audio is unavailable in this browser. Show the large translation to your driver.",
      );
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) =>
        v.lang.toLowerCase().startsWith(lang === "zh-CN" ? "zh" : "en"),
      );
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (alive.current) setSpeaking(false);
    };
    utterance.onerror = (e) => {
      if (alive.current) {
        setSpeaking(false);
        if (!["canceled", "interrupted"].includes(e.error))
          setNotice(
            "Audio could not play. You can still show the translation on screen.",
          );
      }
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  const driverReply = () => {
    stop();
    setListening(true);
    setNotice("Playing the sample driver reply.");
    timer.current = setTimeout(() => {
      if (!alive.current) return;
      setListening(false);
      setNotice("Sample reply saved in your chat.");
      if (!saved.current) {
        dispatch({
          type: "TRANSLATION_REPLY",
          value: { source: replyZh, translation: replyEn },
        });
        saved.current = true;
      }
    }, 1200);
  };
  return (
    <motion.div
      className="overlay translate-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="scrim"
        tabIndex={-1}
        aria-label="Dismiss translation"
        onClick={close}
      />
      <motion.div
        ref={root}
        className={`translate-sheet ${reverse ? "reverse" : ""} ${full ? "fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="translation-title"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        drag={full ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.25 }}
        onDragEnd={(_, i) => {
          if (i.offset.y > 90) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            dismiss();
          }
          if (e.key === "Tab") {
            const list = Array.from(
              root.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ) || [],
            ).filter((el) => el.getClientRects().length);
            if (e.shiftKey && document.activeElement === list[0]) {
              e.preventDefault();
              list.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
              e.preventDefault();
              list[0]?.focus();
            }
          }
        }}
      >
        <div className="translate-grabber">
          <span />
        </div>
        <div className="translate-header">
          <button
            className="translate-close"
            aria-label={full ? "Exit full screen" : "Close translation"}
            onClick={dismiss}
          >
            <X size={17} />
          </button>
          <h3 id="translation-title">
            {reverse ? "Driver is speaking" : "Show to driver"}
          </h3>
          <button
            className="language-switch"
            aria-label="Switch translation direction"
            onClick={swap}
          >
            <b>{reverse ? "中文" : "EN"}</b>
            <ArrowLeftRight size={14} />
            <b>{reverse ? "EN" : "中文"}</b>
          </button>
        </div>
        <div className="translate-body">
          <section className="translation-source">
            <div className="translation-label">
              <b>{reverse ? "中文" : "English"}</b>
              <button
                aria-label={`Play source in ${reverse ? "Chinese" : "English"}`}
                onClick={() => speak(source, reverse ? "zh-CN" : "en-US")}
              >
                <Speaker size={15} waves={false} />
              </button>
            </div>
            <p lang={reverse ? "zh-CN" : "en"}>{source}</p>
          </section>
          <div className="translation-swap">
            <button aria-label="Swap languages" onClick={swap}>
              <ArrowDownUp size={19} />
            </button>
          </div>
          <section className="translation-target" aria-label="Translation">
            <div className="translation-label">
              <b>{reverse ? "English" : "中文"}</b>
            </div>
            <p
              key={target}
              className="translated-text"
              lang={reverse ? "en" : "zh-CN"}
            >
              {target}
            </p>
            {!reverse && (
              <div className="translation-destination">
                <strong lang="zh-CN">
                  {r.cn} · {addressZh || r.address}
                </strong>
                <small>
                  {r.name} · {addressEn}
                </small>
              </div>
            )}
          </section>
          <div className="translation-actions">
            {reverse ? (
              <button
                className={`button secondary ${listening ? "audio-active" : ""}`}
                disabled={listening}
                onClick={driverReply}
              >
                <Mic size={18} />
                {listening ? "Listening…" : "Let driver speak"}
              </button>
            ) : (
              <button
                className={`button primary ${speaking ? "audio-active" : ""}`}
                onClick={() => (speaking ? stop() : speak(target, "zh-CN"))}
              >
                <Speaker size={18} />
                {speaking ? "Stop playback" : "Play in Chinese"}
              </button>
            )}
            {!reverse && (
              <button
                className="button secondary"
                onClick={() => setFull((v) => !v)}
              >
                {full ? "Exit full screen" : "Full screen"}
              </button>
            )}
          </div>
          <p className="translation-footer">
            {reverse
              ? "Main Pal keeps the reply in your chat."
              : "Translated by Main Pal. Turn the phone toward your driver."}
          </p>
          {notice && (
            <p className="translation-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
