import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import { Play, Pause, RotateCcw, ArrowRight, UserRound } from "lucide-react";
import { useChat } from "./engine/useChat";
import { intent, parsePlan } from "./engine/intents";
import { demoIds, type Demo, type Role } from "./engine/script";
import { Pal } from "./components/Pal";
import { NavBar, StatusBar, InputBar } from "./components/Chrome";
import { Card, type Sheet } from "./components/Cards";
import { CancelFlow } from "./components/CancelFlow";
import { Sheets } from "./components/Sheets";
import { Profile } from "./screens/Profile";
export default function App() {
  const debug = new URLSearchParams(location.search).get("debug") === "1";
  const [deviceScale, setDeviceScale] = useState(
    Math.min(1, (window.innerHeight - 48) / 874),
  );
  useEffect(() => {
    const resize = () =>
      setDeviceScale(Math.min(1, (window.innerHeight - 48) / 874));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const [introLanguage, setIntroLanguage] = useState<"en" | "zh">(() => {
    try {
      return localStorage.getItem("pal-intro-language") === "zh" ? "zh" : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pal-intro-language", introLanguage);
    } catch {}
  }, [introLanguage]);
  const intro =
    introLanguage === "zh"
      ? {
          eyebrow: "一点帮助，让今晚更美好。",
          title: ["你的安排，", "放心交给 Pal。"],
          copy: [
            "一句话，让合适的 Pal 来帮忙。",
            "从晚餐到出行，为你妥善安排。",
          ],
          prototype: "交互原型",
          normal: "正常流程",
          exception: "异常流程 · 晚上 7 点满座",
          restart: "重新开始",
          pause: "暂停",
          resume: "继续",
          skip: "跳过等待 →",
          note: ["设计原型，不会产生真实预订或费用。", "为腾讯设计挑战制作。"],
        }
      : {
          eyebrow: "A LITTLE HELP. A BETTER EVENING.",
          title: ["Your plans.", "In good hands."],
          copy: [
            "One conversation, the right Pals.",
            "Dinner and a ride, thoughtfully coordinated.",
          ],
          prototype: "INTERACTIVE PROTOTYPE",
          normal: "Normal flow",
          exception: "Exception · 7:00 PM full",
          restart: "Restart",
          pause: "Pause",
          resume: "Resume",
          skip: "Skip waiting →",
          note: [
            "Design prototype · no real bookings or charges.",
            "Built for the Tencent design challenge.",
          ],
        };
  const queryDemo =
    new URLSearchParams(location.search).get("flow") || "normal";
  const initialDemo: Demo = demoIds.includes(queryDemo as Demo)
    ? (queryDemo as Demo)
    : "normal";
  const [demoRun, setDemoRun] = useState(0);
  const { state: s, dispatch } = useChat(initialDemo),
    [started, setStarted] = useState(
      new URLSearchParams(location.search).has("flow"),
    ),
    [sheet, setSheet] = useState<Sheet>(null),
    [profile, setProfile] = useState(false),
    [menu, setMenu] = useState(false);
  const reduced = useReducedMotion(),
    chat = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    lastLength = useRef(0);
  useEffect(() => {
    if (chat.current && s.messages.length !== lastLength.current) {
      chat.current.scrollTo({
        top: chat.current.scrollHeight,
        behavior: reduced ? "instant" : "smooth",
      });
      lastLength.current = s.messages.length;
    }
  }, [s.messages.length, reduced]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function begin(flow: Demo) {
    dispatch({ type: "DEMO", value: flow });
    setDemoRun((n) => n + 1);
    setStarted(true);
    setProfile(false);
    setSheet(null);
    const u = new URL(location.href);
    u.searchParams.set("flow", flow);
    history.replaceState(null, "", u);
    lastLength.current = 0;
  }
  function send(text: string) {
    const i = intent(text);
    if (i === "cancelAll" || i === "cancelRide" || i === "cancelTable") {
      dispatch({
        type: "CANCEL_PROMPT",
        value: {
          target:
            i === "cancelAll" ? "all" : i === "cancelTable" ? "table" : "ride",
          text,
        },
      });
      return;
    }
    if (s.step === "welcome") {
      dispatch({
        type: "SEND_REQUEST",
        value: { text, plan: parsePlan(text) },
      });
      return;
    }
    if (s.decision && /^(yes|no)[.!]?$/i.test(text.trim())) {
      const no = /^no/i.test(text.trim());
      const draft = s.decision.draft;
      dispatch({
        type: no ? "DECISION_NO" : "DECISION_YES",
        value: s.decision.id,
      });
      if (no && draft) setSheet({ type: "edit", value: { prefill: draft } });
      return;
    }
    if (
      s.askAboutRide &&
      /^(yes|no(?:,? keep the ride)?)[.!]?$/i.test(text.trim())
    ) {
      dispatch({
        type: /^yes/i.test(text) ? "CANCEL_PROMPT" : "KEEP_RIDE",
        value: "ride",
      });
      return;
    }
    if (i === "customize" && !/cheaper|closer/i.test(text) && !s.booked) {
      setSheet({
        type: "edit",
        value: { prefill: { ...s.editDraft, ...parsePlan(text) } },
      });
      return;
    }
    if (s.step === "denied") {
      setSheet({ type: "address" });
      return;
    }
    dispatch({ type: "INTERPRET", value: text });
  }
  const activeReaction = [
    "checkingCancel",
    "cancelling",
    "readingChoice",
    "reading",
    "lining",
    "bookingWork",
    "updating",
    "findingCars",
    "calling",
  ].includes(s.step);
  return (
    <MotionConfig reducedMotion="user">
      <main className="workspace">
        <aside
          className="desktop-intro"
          lang={introLanguage === "zh" ? "zh-CN" : "en"}
        >
          <div className="intro-heading">
            <a
              className="wordmark"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setStarted(false);
              }}
            >
              pal<span>●</span>
            </a>
            <div
              className="intro-language"
              role="group"
              aria-label="Introduction language / 介绍语言"
            >
              <button
                lang="en"
                aria-pressed={introLanguage === "en"}
                onClick={() => setIntroLanguage("en")}
              >
                EN
              </button>
              <button
                lang="zh-CN"
                aria-pressed={introLanguage === "zh"}
                onClick={() => setIntroLanguage("zh")}
              >
                中文
              </button>
            </div>
          </div>
          <p className="eyebrow">{intro.eyebrow}</p>
          <h1>
            {intro.title[0]}
            <br />
            {intro.title[1]}
          </h1>
          <p className="intro-copy">
            {intro.copy[0]}
            <br />
            {intro.copy[1]}
          </p>
          <div className="intro-pals">
            <Pal size={64} />
            <Pal role="dining" size={48} />
            <Pal role="mobility" size={48} />
          </div>
          <div className="demo-controls">
            <span className="eyebrow">{intro.prototype}</span>
            {demoIds.map((demo, i) => (
              <button
                key={demo}
                className={s.demo === demo && started ? "chosen" : ""}
                onClick={() => begin(demo)}
              >
                <span>
                  {["①", "②", "③", "④", "⑤", "⑥", "⑦"][i]}{" "}
                  {introLanguage === "zh"
                    ? [
                        "正常流程",
                        "异常 · 晚上 7 点满座",
                        "输入取消出行",
                        "按钮取消全部",
                        "用自己的话决定",
                        "模糊回复 → 是／否",
                        "Pal 工作中取消",
                      ][i]
                    : [
                        "Normal flow",
                        "Exception · 7:00 PM full",
                        "Cancel the ride (typed)",
                        "Cancel all (button)",
                        "Decide in your own words",
                        "Vague reply → Yes / No",
                        "Cancel while a Pal is working",
                      ][i]}
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            <div className="control-row">
              <button onClick={() => begin(s.demo || s.flow)}>
                <RotateCcw size={14} />
                {intro.restart}
              </button>
              <button
                disabled={!started}
                onClick={() => dispatch({ type: "PAUSE" })}
              >
                {s.paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                {s.paused ? intro.resume : intro.pause}
              </button>
            </div>
            {s.pending && (
              <button
                className="skip"
                onClick={() => dispatch({ type: "TICK" })}
              >
                {intro.skip}
              </button>
            )}
          </div>
          <p className="demo-note">
            {intro.note[0]}
            <br />
            {intro.note[1]}
          </p>
        </aside>
        <div
          className="phone-stage"
          style={{ "--device-scale": deviceScale } as CSSProperties}
        >
          <section className="phone" aria-label="Pal mobile prototype">
            <StatusBar />
            {!started ? (
              <div className="start-screen">
                <div className="start-pals">
                  <Pal size={136} />
                </div>
                <span className="eyebrow">YOUR PAL IN SHANGHAI</span>
                <h1>
                  A table for two.
                  <br />A ride to get there.
                </h1>
                <p>
                  Tell Main Pal what you need.
                  <br />
                  Your evening comes together.
                </p>
                <button
                  className="button primary"
                  onClick={() => begin("normal")}
                >
                  Try the normal flow <ArrowRight size={18} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => begin("exception")}
                >
                  What if 7:00 PM is full?
                </button>
                <small>Your dinner and ride, in one conversation</small>
                <div className="home-indicator" />
              </div>
            ) : (
              <>
                {profile && (
                  <Profile
                    s={s}
                    back={() => setProfile(false)}
                    open={(type) => setSheet({ type })}
                  />
                )}
                <div className={profile ? "chat-view hidden" : "chat-view"}>
                  <NavBar
                    s={s}
                    onWho={() => setSheet({ type: "who" })}
                    onMore={() => setMenu(!menu)}
                    onBack={() => setStarted(false)}
                  />
                  <AnimatePresence>
                    {menu && (
                      <motion.div
                        className="more-menu glass"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <button
                          onClick={() => {
                            setProfile(true);
                            setMenu(false);
                          }}
                        >
                          <UserRound size={18} />
                          Profile
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div
                    className="chat-scroll"
                    ref={chat}
                    onScroll={() => {
                      if (chat.current)
                        nearBottom.current =
                          chat.current.scrollHeight -
                            chat.current.scrollTop -
                            chat.current.clientHeight <
                          120;
                    }}
                    onClick={(e) => {
                      if (
                        s.pending &&
                        !s.paused &&
                        !(e.target as HTMLElement).closest(
                          "button,input,textarea,a,select",
                        )
                      )
                        dispatch({ type: "TICK" });
                    }}
                  >
                    <div
                      className="conversation"
                      role="log"
                      aria-label="Conversation with Main Pal"
                      aria-live="polite"
                    >
                      {s.messages.map((m, i) => (
                        <motion.div
                          key={m.id}
                          data-message={m.card || m.kind}
                          className={`message message-${m.kind} ${m.kind === "card" && m.card !== "tonight" && ((m.card === "denied" && !s.pickupNeeded) || (m.card !== "denied" && (m.version !== s.version || (m.card === "rideSuccess" && s.step === "complete")))) ? "answered-card" : ""}`}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {m.kind === "main" ? (
                            <div className="bubble main-bubble">{m.text}</div>
                          ) : m.kind === "alex" ? (
                            <div className="alex-wrap">
                              <div className="bubble alex-bubble">{m.text}</div>
                              <motion.span
                                key={
                                  activeReaction &&
                                  i ===
                                    s.messages
                                      .map((x) => x.kind)
                                      .lastIndexOf("alex")
                                    ? "reading"
                                    : "done"
                                }
                                className="reaction"
                                initial={reduced ? false : { scale: 0.6 }}
                                animate={{ scale: 1 }}
                              >
                                {activeReaction &&
                                i ===
                                  s.messages
                                    .map((x) => x.kind)
                                    .lastIndexOf("alex")
                                  ? "👀"
                                  : "👍"}
                              </motion.span>
                            </div>
                          ) : m.kind === "event" ? (
                            <div className="event">
                              {m.text?.includes("Dining & Mobility") ? (
                                <>
                                  {m.text.split(" · ")[0]} ·{" "}
                                  <Pal role="dining" state="mini" size={16} />
                                  <span>Dining Pal</span>
                                  <span>&</span>
                                  <Pal role="mobility" state="mini" size={16} />
                                  <span>Mobility Pal</span>
                                </>
                              ) : (
                                m.text
                              )}
                              {m.role && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <Pal
                                    role={m.role as Role}
                                    state="mini"
                                    size={16}
                                  />
                                  <span>
                                    {m.role === "dining"
                                      ? "Dining"
                                      : "Mobility"}{" "}
                                    Pal
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <Card
                              m={m}
                              s={s}
                              dispatch={dispatch}
                              open={setSheet}
                            />
                          )}
                        </motion.div>
                      ))}
                      {s.askAboutRide && (
                        <div className="ride-followup">
                          <button
                            className="chip"
                            onClick={() =>
                              dispatch({ type: "CANCEL_PROMPT", value: "ride" })
                            }
                          >
                            Yes
                          </button>
                          <button
                            className="chip"
                            onClick={() => dispatch({ type: "KEEP_RIDE" })}
                          >
                            No, keep the ride
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <InputBar
                    key={`${s.demo}-${started}-${demoRun}`}
                    s={s}
                    onSend={send}
                    onAdd={() => setSheet({ type: "actions" })}
                  />
                </div>
              </>
            )}
            {s.cancelStage && <CancelFlow s={s} dispatch={dispatch} />}
            <AnimatePresence>
              {sheet && (
                <Sheets
                  key={sheet.type}
                  sheet={sheet}
                  close={() => setSheet(null)}
                  s={s}
                  dispatch={dispatch}
                />
              )}
            </AnimatePresence>
          </section>
        </div>
        {debug && !sheet && !s.cancelStage && (
          <div className="mobile-demo-controls">
            <button
              onClick={() => {
                setStarted(false);
                setSheet(null);
              }}
            >
              Flows
            </button>
            <button onClick={() => begin(s.demo || s.flow)}>Restart</button>
            <button onClick={() => dispatch({ type: "PAUSE" })}>
              {s.paused ? "Resume" : "Pause"}
            </button>
            {s.pending && (
              <button onClick={() => dispatch({ type: "TICK" })}>
                Skip wait
              </button>
            )}
          </div>
        )}
      </main>
    </MotionConfig>
  );
}
