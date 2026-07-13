/**
 * Agent Scenes API — returns available scenes.
 */

import { NextResponse } from "next/server";
import { getAllScenes } from "@/server/ai/agent/scene-registry";

// GET /api/ai/agent/scenes
export async function GET() {
  try {
    const scenes = getAllScenes().map((scene) => ({
      id: scene.id,
      name: scene.name,
      description: scene.description,
      icon: scene.icon,
      functionKey: scene.functionKey,
      quickActions: scene.quickActions,
    }));

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("Get scenes error:", error);
    return NextResponse.json(
      { error: "Failed to get scenes" },
      { status: 500 }
    );
  }
}
