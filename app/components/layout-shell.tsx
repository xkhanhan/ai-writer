"use client";

import Link from "next/link";
import { Button } from "antd";
import { SettingOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { ThemeSwitcher } from "@/shared/ui/theme";

export function Topbar() {
  return (
    <header className="shell-topbar">
      <div className="shell-topbar-left">
        <Link href="/" className="shell-brand">
          AI Writer
        </Link>
        <div className="shell-topbar-divider" />
        <span className="shell-subtitle">小说创作工具</span>
      </div>
      <div className="shell-topbar-right">
        <ThemeSwitcher />
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => window.dispatchEvent(new CustomEvent("navigate-settings"))}
        />
      </div>
    </header>
  );
}

export function Footerbar({
  booksCount,
  hasApiKey,
}: {
  booksCount: number;
  hasApiKey: boolean;
}) {
  return (
    <footer className="shell-footer">
      <div className="shell-footer-group">
        <span className="shell-footer-item">
          <span className={hasApiKey ? "shell-ok" : "shell-bad"} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircleOutlined />
            AI: {hasApiKey ? "已配置" : "未配置"}
          </span>
        </span>
        <span className="shell-footer-item">书籍: {booksCount}</span>
      </div>
      <div className="shell-footer-group">
        <span className="shell-footer-item">阶段: MVP</span>
        <span className="shell-footer-item">v0.1.0</span>
      </div>
    </footer>
  );
}
