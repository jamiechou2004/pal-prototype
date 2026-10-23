import { useState } from "react";
import { ArrowLeft, Plus, Search, Mic, ChevronRight } from "lucide-react";
import { Pal } from "../components/Pal";
import type { Role, State } from "../engine/script";
export function Profile({
  s,
  back,
  open,
}: {
  s: State;
  back: () => void;
  open: (type: string) => void;
}) {
  const [search, setSearch] = useState(false),
    [q, setQ] = useState("");
  const rows: Role[] = ["dining", "mobility"];
  const highlight = (name: string) => {
    const i = name.toLowerCase().indexOf(q.toLowerCase());
    return q && i >= 0 ? (
      <>
        {name.slice(0, i)}
        <mark>{name.slice(i, i + q.length)}</mark>
        {name.slice(i + q.length)}
      </>
    ) : (
      name
    );
  };
  return (
    <div className="profile">
      <div className="profile-nav">
        <button
          className="glass icon-button"
          aria-label="Back to chat"
          onClick={back}
        >
          <ArrowLeft />
        </button>
        {!search && (
          <button
            className="glass icon-button"
            aria-label="New Pal"
            onClick={() => open("new")}
          >
            <Plus />
          </button>
        )}
      </div>
      {!search && (
        <div className="profile-hero">
          <Pal size={112} />
          <h2>Main Pal</h2>
          <p>Your Pal in Shanghai · talks to the others for you</p>
        </div>
      )}
      <div className="profile-list">
        <p className="footnote">{search ? "Search results" : "Your Pals"}</p>
        {rows
          .filter((r) => `${r} pal`.includes(q.toLowerCase()))
          .map((role) => (
            <button
              className="profile-row"
              key={role}
              onClick={() => open("who")}
            >
              <Pal
                role={role}
                size={48}
                state={
                  s.tasks[role] === "Done"
                    ? "done"
                    : s.tasks[role] === "Working"
                      ? "working"
                      : "idle"
                }
              />
              <span>
                <strong>
                  {highlight(
                    `${role === "dining" ? "Dining" : "Mobility"} Pal`,
                  )}
                </strong>
                <small>
                  {s.tasks[role]} ·{" "}
                  {role === "dining"
                    ? "Restaurants & reservations"
                    : "Routes, fares & rides"}
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        {search && !rows.some((r) => `${r} pal`.includes(q.toLowerCase())) && (
          <p className="muted">No Pals found. Try “Dining” or “Mobility”.</p>
        )}
        {!search && (
          <button className="profile-row" onClick={() => open("new")}>
            <span className="dashed">
              <Plus />
            </span>
            <span>
              <strong>Set up a new Pal</strong>
              <small>
                Add a Pal for a new job, like translating or sightseeing
              </small>
            </span>
          </button>
        )}
      </div>
      <div className="profile-search">
        <div className="glass search-field">
          <Search size={20} />
          <input
            aria-label="Search Pals"
            placeholder="Search Pals"
            value={q}
            onFocus={() => setSearch(true)}
            onChange={(e) => setQ(e.target.value)}
          />
          <Mic size={19} />
        </div>
        {search && (
          <button
            className="text-button"
            onClick={() => {
              setQ("");
              setSearch(false);
            }}
          >
            Cancel
          </button>
        )}
      </div>
      <div className="home-indicator" />
    </div>
  );
}
