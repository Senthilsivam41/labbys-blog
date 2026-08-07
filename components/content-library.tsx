"use client";

import { useMemo, useState } from "react";
import { ContentCard } from "./content-card";
import { TOPICS, type ContentRecord, type Topic } from "@/lib/types";

export function ContentLibrary({ items, emptyTitle, emptyCopy }: { items: ContentRecord[]; emptyTitle: string; emptyCopy: string }) {
  const [topic, setTopic] = useState<"All" | Topic>("All");
  const filtered = useMemo(() => topic === "All" ? items : items.filter((item) => item.topic === topic), [items, topic]);

  return (
    <>
      <div className="filter-row" aria-label="Filter content by topic">
        {(["All", ...TOPICS] as const).map((option) => (
          <button key={option} type="button" className={topic === option ? "filter active" : "filter"} onClick={() => setTopic(option)} aria-pressed={topic === option}>{option}</button>
        ))}
      </div>
      {filtered.length ? <div className="card-grid">{filtered.map((item) => <ContentCard key={`${item.kind}-${item.id}`} item={item} />)}</div> : <EmptyState title={emptyTitle} copy={emptyCopy} />}
    </>
  );
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span className="empty-orbit" aria-hidden="true">S</span><div><span className="eyebrow">The lab is open</span><h2>{title}</h2><p>{copy}</p></div></div>;
}
