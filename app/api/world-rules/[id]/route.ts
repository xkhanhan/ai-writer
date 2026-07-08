import { NextResponse } from "next/server";
import {
  getWorldRuleById,
  updateWorldRule,
  deleteWorldRule,
} from "@/server/storage/world-rule-store";

interface WorldRuleRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;
    const rule = await getWorldRuleById(id);

    if (!rule) {
      return NextResponse.json({ error: "规则不存在" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("获取世界规则失败:", error);
    return NextResponse.json({ error: "获取世界规则失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const rule = await updateWorldRule(id, body);

    if (!rule) {
      return NextResponse.json({ error: "规则不存在" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("更新世界规则失败:", error);
    return NextResponse.json({ error: "更新世界规则失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;
    const rule = await getWorldRuleById(id);

    if (rule?.isFixed) {
      return NextResponse.json({ error: "固定规则不可删除" }, { status: 403 });
    }

    const success = await deleteWorldRule(id);
    if (!success) {
      return NextResponse.json({ error: "规则不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除世界规则失败:", error);
    return NextResponse.json({ error: "删除世界规则失败" }, { status: 500 });
  }
}
