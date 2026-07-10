/**
 * Utility functions for operating on tag trees (TagCategory[]).
 */

import type { TagCategory } from "@/app/types";

/**
 * Find a node by id in a tag tree (recursive DFS).
 */
export function findInTree(
  nodes: TagCategory[],
  id: string
): TagCategory | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Collect all node ids from a tag tree into a Set.
 */
export function collectAllIds(tags: TagCategory[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: TagCategory[]) => {
    for (const n of nodes) {
      ids.add(n.id);
      if (n.children) walk(n.children);
    }
  };
  walk(tags);
  return ids;
}

/**
 * Search a tag tree by keyword. Returns a Set of all matching ids
 * (including ancestor ids so matched nodes remain visible in the tree).
 * Returns null if keyword is empty.
 */
export function searchMatch(
  tags: TagCategory[],
  keyword: string
): Set<string> | null {
  if (!keyword.trim()) return null;
  const lower = keyword.toLowerCase();
  const matched = new Set<string>();

  interface FlatNode {
    node: TagCategory;
    path: string[];
  }
  const flat: FlatNode[] = [];
  const walk = (nodes: TagCategory[], path: string[]) => {
    for (const n of nodes) {
      flat.push({ node: n, path: [...path, n.id] });
      if (n.children) walk(n.children, [...path, n.id]);
    }
  };
  walk(tags, []);

  for (const { node, path } of flat) {
    if (
      node.name.toLowerCase().includes(lower) ||
      node.code?.toLowerCase().includes(lower) ||
      node.description?.toLowerCase().includes(lower)
    ) {
      for (const id of path) matched.add(id);
    }
  }
  return matched;
}
