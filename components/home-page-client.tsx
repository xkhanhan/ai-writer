"use client";

import { FormEvent, useState } from "react";
import type { Book } from "@/lib/storage/books";

type BooksResponse =
  | { success: true; books: Book[] }
  | { success: false; error: string };

type CreateBookResponse =
  | { success: true; book: Book }
  | { success: false; error: string };

type AiConfigResponse =
  | {
      success: true;
      config: {
        baseUrl: string;
        model: string;
        hasApiKey: boolean;
      };
    }
  | { success: false; error: string };

type SimpleSuccess = { success: true };
type ErrorResponse = { success: false; error: string };
type ChatResponse =
  | { success: true; content: string }
  | { success: false; error: string };

const defaultPrompt = "帮我写一段测试文本。";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function HomePageClient(props: {
  initialBooks: Book[];
  initialHasApiKey: boolean;
}) {
  const [books, setBooks] = useState<Book[]>(props.initialBooks);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState("");
  const [configSaved, setConfigSaved] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [hasApiKey, setHasApiKey] = useState(props.initialHasApiKey);

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState("");
  const [chatError, setChatError] = useState("");

  async function refreshBooks() {
    setBooksLoading(true);
    setBooksError("");

    try {
      const response = await fetch("/api/books");
      const data = (await response.json()) as BooksResponse;

      if (!response.ok || !data.success) {
        setBooksError(data.success ? "书籍读取失败。" : data.error);
        return;
      }

      setBooks(data.books);
    } catch {
      setBooksError("无法连接本地后端。");
    } finally {
      setBooksLoading(false);
    }
  }

  async function openConfigModal() {
    setShowConfigModal(true);
    setConfigLoading(true);
    setConfigError("");
    setConfigSaved("");

    try {
      const response = await fetch("/api/ai/config");
      const data = (await response.json()) as AiConfigResponse;

      if (!response.ok || !data.success) {
        setConfigError(data.success ? "AI 配置读取失败。" : data.error);
        return;
      }

      setBaseUrl(data.config.baseUrl);
      setModel(data.config.model);
      setHasApiKey(data.config.hasApiKey);
      setApiKey("");
    } catch {
      setConfigError("无法读取 AI 配置。");
    } finally {
      setConfigLoading(false);
    }
  }

  async function handleCreateBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateError("");
    setCreateLoading(true);

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          description: createDescription
        })
      });

      const data = (await response.json()) as CreateBookResponse;

      if (!response.ok || !data.success) {
        setCreateError(data.success ? "创建书籍失败。" : data.error);
        return;
      }

      setCreateTitle("");
      setCreateDescription("");
      setShowCreateModal(false);
      await refreshBooks();
    } catch {
      setCreateError("创建书籍失败，请稍后重试。");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setConfigSaving(true);
    setConfigError("");
    setConfigSaved("");

    try {
      const response = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model
        })
      });

      const data = (await response.json()) as SimpleSuccess | ErrorResponse;

      if (!response.ok || !data.success) {
        setConfigError(data.success ? "AI 配置保存失败。" : data.error);
        return;
      }

      setHasApiKey(true);
      setApiKey("");
      setConfigSaved("AI 配置已保存。");
    } catch {
      setConfigError("AI 配置保存失败，请稍后重试。");
    } finally {
      setConfigSaving(false);
    }
  }

  async function handleChatTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setChatLoading(true);
    setChatError("");
    setChatResult("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = (await response.json()) as ChatResponse;

      if (!response.ok || !data.success) {
        setChatError(data.success ? "AI 测试失败。" : data.error);
        return;
      }

      setChatResult(data.content);
    } catch {
      setChatError("无法连接本地后端。");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-frame">
        <section className="hero">
          <div className="hero-main">
            <p className="eyebrow">Phase 1</p>
            <h1 className="hero-title">AI 小说创作工具</h1>
            <p className="hero-copy">
              这一阶段只做首页、书籍入口、AI 配置和基础调用链路。先把本地前后端、数据保存和 AI
              返回跑通，再进入第二阶段的创作工作台。
            </p>
            <div className="hero-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => setShowCreateModal(true)}
              >
                创建新书
              </button>
              <button className="secondary-btn" type="button" onClick={openConfigModal}>
                AI 配置
              </button>
            </div>
            <div className="meta-grid">
              <article className="meta-card">
                <p className="meta-label">当前书籍数</p>
                <p className="meta-value">{books.length}</p>
              </article>
              <article className="meta-card">
                <p className="meta-label">AI 配置状态</p>
                <p className="meta-value">{hasApiKey ? "已配置" : "未配置"}</p>
              </article>
              <article className="meta-card">
                <p className="meta-label">阶段范围</p>
                <p className="meta-value">首页 MVP</p>
              </article>
            </div>
          </div>

          <aside className="hero-side">
            <span className={`status-pill ${hasApiKey ? "" : "off"}`}>
              {hasApiKey ? "AI 已就绪" : "AI 未配置"}
            </span>
            <h2 className="side-title">当前能力边界</h2>
            <p className="side-copy">
              书籍创作页面、提示词管理、工作流编排和状态系统都还没有进入本阶段实现。
            </p>
            <div className="side-actions">
              <button className="ghost-btn" type="button" onClick={openConfigModal}>
                查看 AI 配置
              </button>
            </div>
          </aside>
        </section>

        <section className="content-grid">
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">已有书籍</h2>
                <p className="section-copy">第一阶段只维护最基础的书籍记录。</p>
              </div>
              <div className="section-actions">
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                >
                  创建新书
                </button>
              </div>
            </div>

            {booksLoading ? <p className="hint">书籍加载中...</p> : null}
            {booksError ? <div className="error-box">{booksError}</div> : null}

            {!booksLoading && !booksError && books.length === 0 ? (
              <div className="empty-card">
                <h3 className="book-title">还没有书籍</h3>
                <p className="empty-copy">先创建一本新书，第二阶段再进入正式创作。</p>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                >
                  立即创建
                </button>
              </div>
            ) : null}

            {!booksLoading && books.length > 0 ? (
              <div className="books-grid">
                {books.map((book) => (
                  <article key={book.id} className="book-card">
                    <div>
                      <h3 className="book-title">{book.title}</h3>
                      <p className="book-copy">
                        {book.description || "暂无简介。"}
                      </p>
                    </div>
                    <div className="book-meta">
                      <span>创建于 {formatDate(book.createdAt)}</span>
                      <span>更新于 {formatDate(book.updatedAt)}</span>
                    </div>
                    <button className="ghost-btn" type="button" disabled>
                      第二阶段开放创作页
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <div className="stack">
            <section className="section-card">
              <div className="section-header">
                <div>
                  <h2 className="section-title">AI 配置</h2>
                  <p className="section-copy">配置通过后端保存，前端不会拿到完整 API Key。</p>
                </div>
              </div>
              <div className="note-box">
                <p className="hint">
                  当前状态：{hasApiKey ? "已配置 API Key" : "未配置 API Key"}
                </p>
              </div>
              <div className="section-actions">
                <button className="secondary-btn" type="button" onClick={openConfigModal}>
                  打开配置
                </button>
              </div>
            </section>

            <section className="section-card">
              <div className="section-header">
                <div>
                  <h2 className="section-title">AI 测试链路</h2>
                  <p className="section-copy">用于验证前端、后端和 AI 平台之间的最小闭环。</p>
                </div>
              </div>

              <form className="stack" onSubmit={handleChatTest}>
                <div className="field">
                  <label htmlFor="prompt">测试 Prompt</label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button className="primary-btn" type="submit" disabled={chatLoading}>
                    {chatLoading ? "请求中..." : "发送给 AI"}
                  </button>
                </div>
                {chatError ? <div className="error-box">{chatError}</div> : null}
                <div className="result-box">
                  {chatResult || "AI 返回结果会显示在这里。"}
                </div>
              </form>
            </section>
          </div>
        </section>
      </div>

      {showCreateModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-book-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Books</p>
                <h2 id="create-book-title" className="modal-title">
                  创建新书
                </h2>
              </div>
              <button
                className="close-btn"
                type="button"
                aria-label="关闭创建新书"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
              >
                ×
              </button>
            </div>

            <form className="stack" onSubmit={handleCreateBook}>
              <div className="field">
                <label htmlFor="book-title">书名</label>
                <input
                  id="book-title"
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="field">
                <label htmlFor="book-description">简介</label>
                <textarea
                  id="book-description"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  maxLength={500}
                />
              </div>
              {createError ? <div className="error-box">{createError}</div> : null}
              <div className="form-actions">
                <button className="primary-btn" type="submit" disabled={createLoading}>
                  {createLoading ? "创建中..." : "确认创建"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showConfigModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="ai-config-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">AI Config</p>
                <h2 id="ai-config-title" className="modal-title">
                  AI 配置
                </h2>
              </div>
              <button
                className="close-btn"
                type="button"
                aria-label="关闭 AI 配置"
                onClick={() => setShowConfigModal(false)}
              >
                ×
              </button>
            </div>

            {configLoading ? <p className="hint">读取配置中...</p> : null}

            <form className="stack" onSubmit={handleSaveConfig}>
              <div className="field">
                <label htmlFor="api-key">
                  API Key {hasApiKey ? "（当前已配置，留空则保持不变）" : ""}
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={hasApiKey ? "如需替换，请输入新的 API Key" : "请输入 API Key"}
                />
              </div>
              <div className="field">
                <label htmlFor="base-url">Base URL</label>
                <input
                  id="base-url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="model">Model</label>
                <input
                  id="model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                />
              </div>
              {configError ? <div className="error-box">{configError}</div> : null}
              {configSaved ? <div className="note-box">{configSaved}</div> : null}
              <div className="form-actions">
                <button className="primary-btn" type="submit" disabled={configSaving}>
                  {configSaving ? "保存中..." : "保存配置"}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                >
                  关闭
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
