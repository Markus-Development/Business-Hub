"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NotionBlock, NotionRichText } from "@/lib/notion";

export function PageBodyRenderer({ blocks }: { blocks: NotionBlock[] }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      {renderBlocks(blocks)}
    </div>
  );
}

function renderBlocks(blocks: NotionBlock[]): ReactNode {
  // Group consecutive list-item blocks into a single <ul>/<ol> so they render as a list.
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bulleted_list_item" || b.type === "numbered_list_item") {
      const tag = b.type;
      const group: NotionBlock[] = [];
      while (i < blocks.length && blocks[i].type === tag) {
        group.push(blocks[i]);
        i++;
      }
      const isUl = tag === "bulleted_list_item";
      out.push(
        isUl ? (
          <ul key={group[0].id} className="ml-5 list-disc space-y-1">
            {group.map((g) => (
              <li key={g.id}>
                {renderRichText(g.data?.rich_text)}
                {renderBlockChildren(g)}
              </li>
            ))}
          </ul>
        ) : (
          <ol key={group[0].id} className="ml-5 list-decimal space-y-1">
            {group.map((g) => (
              <li key={g.id}>
                {renderRichText(g.data?.rich_text)}
                {renderBlockChildren(g)}
              </li>
            ))}
          </ol>
        ),
      );
      continue;
    }
    out.push(<BlockNode key={b.id} block={b} />);
    i++;
  }
  return out;
}

function BlockNode({ block }: { block: NotionBlock }) {
  const t = useT();
  const d = block.data ?? {};

  switch (block.type) {
    case "paragraph":
      return (
        <p>
          {renderRichText(d.rich_text)}
          {renderBlockChildren(block)}
        </p>
      );
    case "heading_1":
      return <h2 className="mt-4 text-base font-semibold text-foreground">{renderRichText(d.rich_text)}</h2>;
    case "heading_2":
      return <h3 className="mt-3 text-sm font-semibold text-foreground">{renderRichText(d.rich_text)}</h3>;
    case "heading_3":
      return <h4 className="mt-2 text-sm font-medium text-foreground">{renderRichText(d.rich_text)}</h4>;
    case "to_do":
      return (
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!d.checked}
            readOnly
            disabled
            className="mt-1 cursor-default"
            aria-hidden
          />
          <span className={cn("flex-1", d.checked && "text-muted-foreground line-through")}>
            {renderRichText(d.rich_text)}
            {renderBlockChildren(block)}
          </span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">
          {renderRichText(d.rich_text)}
          {renderBlockChildren(block)}
        </blockquote>
      );
    case "callout":
      return (
        <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-3">
          {d.icon?.type === "emoji" && (
            <span className="select-none text-base leading-tight" aria-hidden>
              {d.icon.emoji}
            </span>
          )}
          <div className="flex-1">
            {renderRichText(d.rich_text)}
            {renderBlockChildren(block)}
          </div>
        </div>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3">
          {d.language ? (
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {d.language}
            </div>
          ) : null}
          <code className="font-mono text-xs text-foreground">
            {(d.rich_text ?? []).map((r: NotionRichText) => r.plain_text).join("")}
          </code>
        </pre>
      );
    case "divider":
      return <hr className="my-2 border-border" />;
    case "toggle":
      return (
        <details className="rounded-md">
          <summary className="cursor-pointer select-none font-medium text-foreground">
            {renderRichText(d.rich_text)}
          </summary>
          <div className="ml-4 mt-1">{renderBlockChildren(block)}</div>
        </details>
      );
    default:
      return (
        <div className="text-xs italic text-muted-foreground">
          {t("blocks.unsupported")}: {block.type}
        </div>
      );
  }
}

function renderBlockChildren(block: NotionBlock): ReactNode {
  if (block.children && block.children.length > 0) {
    return <div className="mt-1">{renderBlocks(block.children)}</div>;
  }
  if (block.has_children) {
    return <MoreInNotionHint />;
  }
  return null;
}

function MoreInNotionHint() {
  const t = useT();
  return (
    <span className="ml-2 text-xs italic text-muted-foreground">{t("blocks.moreInNotion")}</span>
  );
}

function renderRichText(items: NotionRichText[] | undefined): ReactNode {
  if (!items || items.length === 0) return null;
  return items.map((r, i) => {
    let node: ReactNode = r.plain_text;
    if (r.annotations.code) {
      node = <code className="rounded bg-muted px-1 font-mono text-xs">{node}</code>;
    }
    if (r.annotations.bold) node = <strong>{node}</strong>;
    if (r.annotations.italic) node = <em>{node}</em>;
    if (r.annotations.strikethrough) node = <s>{node}</s>;
    if (r.href) {
      node = (
        <a
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {node}
        </a>
      );
    }
    return <span key={i}>{node}</span>;
  });
}
