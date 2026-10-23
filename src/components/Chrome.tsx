import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  MoreHorizontal,
  Check,
  Signal,
  Wifi,
  BatteryFull,
  TriangleAlert,
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
          <ChevronLeft size={23} />
        </button>
        <div className="title-wrap">
          <button
            className="glass title-capsule"
            onClick={onWho}
            aria-label="Who's working on tonight"
          >
            <HandoffPal header={h} thinking={Boolean(s.thinking)} />
            <span>
              <strong>Main Pal</strong>
              <small>Dinner tonight</small>
            </span>
          </button>
          <AnimatePresence>
            {h.branch !== "off" && (
              <motion.div
                layout
                className={`sub-pill ${h.branch}`}
                role="button"
                tabIndex={0}
                aria-label="View working Pals"
                onClick={onWho}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onWho();
                  }
                }}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 28, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              >
                <motion.span layout className="pill-inner">
                  <span className="status-icon">
                    {h.branch === "working" ? (
                      <span className="working-slots">
                        {(h.both
                          ? (["dining", "mobility"] as const)
                          : [h.role]
                        ).map((role) => (
                          <span className="working-slot" key={role}>
                            <img
                              className="working-ring"
                              src={`${import.meta.env.BASE_URL}chrome/ring.svg`}
                              alt=""
                            />
                            <Pal role={role} state="mini" size={14} />
                          </span>
                        ))}
                      </span>
                    ) : h.branch === "done" ? (
                      <Check size={12} />
                    ) : (
                      <TriangleAlert size={12} />
                    )}
                  </span>
                  <motion.span
                    key={h.activity}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {h.activity.replace(/^(Dining|Mobility) ·/, "$1 Pal ·")}
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
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (s.inputFocusVersion) {
      if (s.inputPrefill) setText(s.inputPrefill);
      setTyping(true);
      input.current?.focus();
    }
  }, [s.inputFocusVersion]);
  const recognizer = useRef<any>(null);
  const transcript = useRef("");
  const recordingRef = useRef(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => () => recognizer.current?.abort(), []);
  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    setTyping(false);
    setHint("");
    input.current?.blur();
  };
  const finish = (submit: boolean) => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setTyping(false);
    const r = recognizer.current;
    const complete = () => {
      const captured = transcript.current.trim();
      if (captured && submit) {
        onSend(captured);
        setText("");
        setHint("");
      } else if (!submit) {
        setText("");
        setTyping(false);
        setHint("");
      } else setHint("No speech captured. You can type your message.");
      transcript.current = "";
    };
    if (r) {
      r.onend = complete;
      r.stop();
    } else complete();
  };
  const start = () => {
    const Speech =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Speech) {
      setHint(
        "Voice recognition is unavailable in this browser. Please type your message.",
      );
      return;
    }
    setHint("");
    setSeconds(0);
    setRecording(true);
    recordingRef.current = true;
    transcript.current = "";
    const r = new Speech();
    recognizer.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e: any) => {
      transcript.current = Array.from(e.results)
        .map((x: any) => x[0].transcript)
        .join(" ");
    };
    r.onerror = () => {
      recordingRef.current = false;
      setRecording(false);
      setTyping(false);
      setHint("Microphone unavailable. Please type your message.");
    };
    r.onend = () => {
      if (recordingRef.current) {
        recordingRef.current = false;
        setRecording(false);
        setText(transcript.current);
        setTyping(!!transcript.current);
      }
    };
    try {
      r.start();
    } catch {
      r.onerror();
    }
  };
  const icon = (name: string, className = "") => (
    <img
      className={`chrome-icon ${className}`}
      src={`${import.meta.env.BASE_URL}chrome/${name}.svg`}
      alt=""
    />
  );
  return (
    <footer className="input-zone">
      {s.thinking && (
        <div className="thinking" role="status" aria-label={s.thinking}>
          <Pal size={24} state="working" />
          <span>
            {s.thinking.replace(/[.…]+$/, "")}
            <span className="thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
      )}
      {hint && (
        <p className="input-hint" role="status">
          {hint}
        </p>
      )}
      <div className="input-row">
        {recording ? (
          <>
            <button
              className="record-stop"
              aria-label="Stop recording"
              onClick={() => finish(false)}
            >
              {icon("stop")}
            </button>
            <div className="record-meter">
              <b>
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </b>
              <motion.span
                animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
              >
                {icon("bars", "wave-bars")}
              </motion.span>
            </div>
            <button
              className="record-send"
              aria-label="Send recording"
              onClick={() => finish(true)}
            >
              {icon("up")}
            </button>
          </>
        ) : (
          <>
            <button
              className="glass icon-button add"
              aria-label="Conversation actions"
              onClick={onAdd}
            >
              {icon("plus")}
            </button>
            <div
              className={`glass input-field ${typing ? "keyboard-field" : ""}`}
            >
              <textarea
                ref={input}
                value={text}
                rows={
                  typing
                    ? Math.min(4, Math.max(1, Math.ceil(text.length / 29)))
                    : 1
                }
                aria-label="Message Main Pal"
                placeholder={
                  s.clarifying
                    ? "Tell Main Pal what you meant…"
                    : "Message Main Pal"
                }
                onFocus={() => {
                  setTyping(true);
                  if (s.step === "welcome" && !text) setText(initialRequest);
                }}
                onBlur={() => {
                  if (!text) setTyping(false);
                }}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              {typing || text ? (
                <button
                  className="send"
                  aria-label="Send message"
                  disabled={!text.trim()}
                  onClick={send}
                >
                  {icon("up")}
                </button>
              ) : (
                <>
                  <button
                    className="input-mic"
                    aria-label="Record message"
                    onClick={start}
                  >
                    {icon("mic")}
                  </button>
                  <button
                    className="send voice-mode"
                    aria-label="Use voice"
                    onClick={start}
                  >
                    {icon("wave")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="home-indicator" />
    </footer>
  );
}
