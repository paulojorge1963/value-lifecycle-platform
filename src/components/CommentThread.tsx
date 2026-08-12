"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/lib/actions";

interface CommentDTO {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string; // ISO
}

function when(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CommentThread({
  entityType,
  entityId,
  studyId,
  trackId,
  comments,
  currentUserId,
  currentUserRole,
  accent = "ve",
}: {
  entityType: string;
  entityId: string;
  studyId?: string | null;
  trackId?: string | null;
  comments: CommentDTO[];
  currentUserId: string;
  currentUserRole: string;
  accent?: "ve" | "vr";
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ring = accent === "vr" ? "focus:ring-vr-200 focus:border-vr-500" : "focus:ring-ve-200 focus:border-ve-500";
  const btn = accent === "vr" ? "btn-vr" : "btn-ve";
  const avatarBg = accent === "vr" ? "bg-vr-100 text-vr-700" : "bg-ve-100 text-ve-700";

  function submit() {
    const text = body.trim();
    if (!text) return;
    start(async () => {
      try {
        await addComment({ entityType, entityId, body: text, studyId: studyId ?? null, trackId: trackId ?? null });
        setBody("");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to comment");
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      try {
        await deleteComment(id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">Discussion</h2>
        <span className="text-xs text-ink-400">{comments.length} comment{comments.length === 1 ? "" : "s"}</span>
      </div>

      <div className="space-y-3">
        {comments.map((c) => {
          const canDelete = c.authorId === currentUserId || currentUserRole === "ADMIN";
          return (
            <div key={c.id} className="flex gap-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarBg}`}>{initials(c.authorName)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">{c.authorName}</span>
                  <span className="text-xs text-ink-400">{when(c.createdAt)}</span>
                  {canDelete && (
                    <button className="ml-auto text-xs text-ink-400 hover:text-red-500" disabled={pending} onClick={() => remove(c.id)}>delete</button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink-700">{c.body}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && <p className="text-sm text-ink-500">No comments yet — start the discussion.</p>}
      </div>

      <div className="mt-4 border-t border-ink-100 pt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className={`w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-400">⌘/Ctrl + Enter to post</span>
          <button className={btn} disabled={pending || !body.trim()} onClick={submit}>{pending ? "Posting…" : "Comment"}</button>
        </div>
      </div>
    </div>
  );
}
