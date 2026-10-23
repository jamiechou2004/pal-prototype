import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  MoreHorizontal,
  Check,
  Keyboard,
  AudioLines,
  ArrowUp,
  Plus,
  Mic,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HandoffPal, Pal } from "./Pal";
import { initialRequest, type State } from "../engine/script";
export function StatusBar() {
  return (
    <div className="statusbar" aria-hidden="true">
      <b>9:41</b>
      <div className="island" />
      <span>
        <Signal size={18} />
        <Wifi size={17} />
        <BatteryFull size={25} />
      </span>
    </div>
  );
}
export function NavBar({
  s,
  onWho,
  onMore,
  onBack,
}: {
  s: State;
  onWho: () => void;
  onMore: () => void;
  onBack: () => void;
}) {
  const h = s.header;
  return (
    <header className="nav">
      <div className="nav-row">
        <button
          className="glass icon-button"
          aria-label="Back to start"
          onClick={onBack}
        >
          <ArrowLeft size={23} />
        </button>
        <div className="title-wrap">
          <button
            className="glass title-capsule"
            onClick={onWho}
            aria-label="Who's working on tonight"
          >
            <HandoffPal header={h} />
            <span>
              <strong>Main Pal</strong>
              <small>Dinner tonight</small>
            </span>
          </button>
          <AnimatePresence>
            {h.branch !== "off" && (
              <motion.div
                className={`sub-pill ${h.branch}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 28, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              >
                <motion.span layout className="pill-inner">
                  <span className="status-icon">
                    {h.branch === "working" ? (
                      <>
                        <i className="ring" />
                        {h.both && <i className="ring second" />}
                      </>
                    ) : h.branch === "done" ? (
                      <Check size={12} />
                    ) : (
                      "!"
                    )}
                  </span>
                  <motion.span
                    key={h.activity}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {h.activity}
                  </motion.span>
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          className="glass icon-button"
          aria-label="More"
          onClick={onMore}
        >
          <MoreHorizontal size={22} />
        </button>
      </div>
      <div className="top-fade" />
    </header>
  );
}
export function InputBar({
  s,
  onSend,
  onAdd,
}: {
  s: State;
  onSend: (text: string) => void;
  onAdd: () => void;
}) {
  const [mode, setMode] = useState<"voice" | "keyboard">("voice"),
    [text, setText] = useState(""),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [hint, setHint] = useState("");
  const input = useRef<HTMLTextAreaElement>(null),
    recognizer = useRef<any>(null),
    transcript = useRef(""),
    recordingRef = useRef(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => () => recognizer.current?.abort(), []);
  const keyboard = () => {
    setMode("keyboard");
    if (s.step === "welcome" && !text) setText(initialRequest);
    setTimeout(() => input.current?.focus(), 0);
  };
  const send = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
      input.current?.blur();
    }
  };
  const start = () => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    setSeconds(0);
    transcript.current = "";
    setHint("");
    const Speech =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (Speech) {
      const r = new Speech();
      r.lang = "en-US";
      r.interimResults = true;
      r.onresult = (e: any) => {
        transcript.current = Array.from(e.results)
          .map((x: any) => x[0].transcript)
          .join(" ");
      };
      r.onerror = () =>
        setHint("Microphone unavailable. Use the keyboard or sample request.");
      recognizer.current = r;
      try {
        r.start();
      } catch {
        setHint("Use the keyboard or sample request.");
      }
    } else
      setHint(
        "Voice recognition is unavailable here. Use the keyboard or sample request.",
      );
  };
  const end = () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    recognizer.current?.stop();
    setTimeout(() => {
      if (transcript.current.trim()) {
        onSend(transcript.current.trim());
        transcript.current = "";
      } else {
        setMode("keyboard");
        setText(s.step === "welcome" ? initialRequest : "");
        setHint("No speech captured. Review or type your message.");
      }
    }, 250);
  };
  return (
    <footer className="input-zone">
      {s.thinking && (
        <div className="thinking">
          <Pal size={24} state="working" />
          {s.thinking}
          <span className="thinking-dots">…</span>
        </div>
      )}
      {hint && (
        <p className="input-hint" role="status">
          {hint}
        </p>
      )}
      <div className="input-row">
        <button
          className="glass icon-button add"
          aria-label="Conversation actions"
          onClick={onAdd}
        >
          <Plus />
        </button>
        <div
          className={`glass input-field ${mode === "keyboard" ? "keyboard-field" : ""}`}
        >
          {mode === "voice" ? (
            <>
              <button
                className="hold"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  start();
                }}
                onPointerUp={end}
                onPointerCancel={end}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    start();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") end();
                }}
                aria-label="Hold to ask"
              >
                {recording ? (
                  <>
                    <motion.span
                      animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 0.7 }}
                    >
                      <AudioLines size={20} />
                    </motion.span>{" "}
                    {`0:${String(seconds).padStart(2, "0")}`} · Release to send
                  </>
                ) : (
                  "Hold to ask"
                )}
              </button>
              <button
                className="keyboard-toggle"
                aria-label="Use keyboard"
                onClick={keyboard}
              >
                <Keyboard size={20} />
              </button>
            </>
          ) : (
            <>
              <textarea
                ref={input}
                value={text}
                rows={1}
                aria-label="Message Main Pal"
                placeholder="Message Main Pal"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              {text.trim() ? (
                <button
                  className="send"
                  aria-label="Send message"
                  onClick={send}
                >
                  <ArrowUp size={21} />
                </button>
              ) : (
                <>
                  <Mic size={18} />
                  <button
                    className="send"
                    aria-label="Use voice"
                    onClick={() => setMode("voice")}
                  >
                    <AudioLines size={21} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="home-indicator" />
    </footer>
  );
}
