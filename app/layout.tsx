import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { loadPublicAiConfig } from "@/server/ai/ai-config-store";
import { listBooks } from "@/server/storage/book-store";
import { Topbar, Footerbar } from "./components/layout-shell";
import { ShellProvider } from "./components/shell-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Novel Writer",
  description: "Local AI-assisted novel writing workspace"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [books] = await Promise.all([
    listBooks()
  ]);
  const aiConfig = loadPublicAiConfig();

  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider locale={zhCN} theme={{
            token: {
              colorPrimary: '#2F5D50',
            },
          }}>
            <ShellProvider>
              <div className="shell-root">
                <Topbar />
                <main className="shell-main">{children}</main>
                <Footerbar booksCount={books.length} hasApiKey={aiConfig.hasApiKey} />
              </div>
            </ShellProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
