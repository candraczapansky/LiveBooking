import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fragment } from "react";

type LegacyNavItem = { id: string; label: string; href?: string };
type NavLeaf = { label: string; href: string };
type NavNode = { label: string; children: NavRenderable[] };
type NavRenderable = LegacyNavItem | NavLeaf | NavNode;

function isNode(item: NavRenderable): item is NavNode {
  return (item as any)?.children && Array.isArray((item as any).children);
}

function isLegacy(item: NavRenderable): item is LegacyNavItem {
  return (item as any)?.label && ((item as any)?.id !== undefined);
}

function normalizeToLeaf(item: NavRenderable): NavLeaf | null {
  if (isNode(item)) return null;
  if (isLegacy(item)) {
    const href = item.href ? item.href : `#${item.id}`;
    return { label: item.label, href };
  }
  return item as NavLeaf;
}

export default function HelpNav({ items }: { items: NavRenderable[] }) {
  const renderItems = (nodes: NavRenderable[], depth = 0) => (
    <div className={depth === 0 ? "space-y-2" : "space-y-1"}>
      {nodes.map((node, idx) => (
        <Fragment key={(isLegacy(node) ? node.id : node.label) + String(idx)}>
          {isNode(node) ? (
            <div className="mb-1">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mt-2">
                {node.label}
              </div>
              <div className="ml-3 border-l border-gray-200 dark:border-gray-700 pl-3 mt-1">
                {renderItems(node.children, depth + 1)}
              </div>
            </div>
          ) : (
            (() => {
              const leaf = normalizeToLeaf(node);
              if (!leaf) return null;
              return (
                <div>
                  <a href={leaf.href} className="text-sm text-primary hover:underline">
                    {leaf.label}
                  </a>
                </div>
              );
            })()
          )}
        </Fragment>
      ))}
    </div>
  );

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <Card>
        <CardHeader>
          <CardTitle>Help Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <nav>{renderItems(items)}</nav>
        </CardContent>
      </Card>
    </aside>
  );
}


