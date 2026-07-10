"use client";

import { useState } from "react";
import { Button, Card, Divider, Form, Grid, Select } from "antd";
import { SaveOutlined, SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { AiConfig, Book } from "@/app/types";
import { useAiConfig } from "./hooks/use-ai-config";
import ProviderSelector from "./components/provider-selector";
import BasicConfig from "./components/basic-config";
import ConnectionTest from "./components/connection-test";
import AdvancedJson from "./components/advanced-json";
import PromptLibrary from "@/app/pages/books/components/prompt-library";
import styles from "./index.module.css";

const { useBreakpoint } = Grid;

type SettingsTab = "ai-config" | "prompt-library";

interface AiConfigFormProps {
  onBack: () => void;
  initialConfig?: AiConfig | null;
  initialBooks?: Book[];
}

export default function AiConfigForm({ onBack, initialConfig, initialBooks = [] }: AiConfigFormProps) {
  const screens = useBreakpoint();
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-config");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(
    initialBooks.length > 0 ? initialBooks[0].id : null,
  );

  const {
    providerId,
    provider,
    apiFormat,
    baseUrl,
    apiKey,
    model,
    availableModels,
    contextSize,
    temperature,
    modelsLoading,
    testStatus,
    testMessage,
    advancedJson,
    jsonValid,
    jsonError,
    saving,
    handleProviderChange,
    handleApiFormatChange,
    handleBaseUrlChange,
    handleApiKeyChange,
    handleModelChange,
    handleContextSizeChange,
    handleTemperatureChange,
    handleAdvancedJsonChange,
    handleFetchModels,
    handleTestConnection,
    handleSave,
  } = useAiConfig(initialConfig);

  const canTest = Boolean(baseUrl && apiKey && model);
  const selectedBook = initialBooks.find((b) => b.id === selectedBookId) ?? null;

  return (
    <div className={styles.container}>
      {/* Left sidebar - tab navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>设置</h2>
        </div>
        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.tabItem} ${activeTab === "ai-config" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("ai-config")}
            type="button"
          >
            <SettingOutlined />
            AI 配置
          </button>
          <button
            className={`${styles.tabItem} ${activeTab === "prompt-library" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("prompt-library")}
            type="button"
          >
            <ThunderboltOutlined />
            提示词库
          </button>
        </nav>
      </aside>

      {/* Right content area */}
      <main className={styles.contentArea}>
        {activeTab === "ai-config" && (
          <div className={styles.tabContent}>
            <div className={styles.aiConfigTab}>
              <Form
                layout="vertical"
                requiredMark="optional"
                size={screens.md ? "middle" : "small"}
                className={styles.form}
              >
                <Card title="厂商与连接">
                  <ProviderSelector value={providerId} onChange={handleProviderChange} />

                  <Divider style={{ margin: "16px 0" }} />

                  <BasicConfig
                    provider={provider}
                    apiFormat={apiFormat}
                    baseUrl={baseUrl}
                    apiKey={apiKey}
                    model={model}
                    availableModels={availableModels}
                    contextSize={contextSize}
                    temperature={temperature}
                    modelsLoading={modelsLoading}
                    onApiFormatChange={handleApiFormatChange}
                    onBaseUrlChange={handleBaseUrlChange}
                    onApiKeyChange={handleApiKeyChange}
                    onModelChange={handleModelChange}
                    onContextSizeChange={handleContextSizeChange}
                    onTemperatureChange={handleTemperatureChange}
                    onFetchModels={handleFetchModels}
                  />
                </Card>

                <Card title="连通性测试">
                  <ConnectionTest
                    status={testStatus}
                    message={testMessage}
                    disabled={!canTest}
                    onTest={handleTestConnection}
                  />
                </Card>

                <Card title="高级配置 JSON">
                  <AdvancedJson
                    value={advancedJson}
                    valid={jsonValid}
                    error={jsonError}
                    onChange={handleAdvancedJsonChange}
                  />
                </Card>
              </Form>
            </div>
            <div className={styles.footer}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                size="large"
              >
                保存配置
              </Button>
            </div>
          </div>
        )}

        {activeTab === "prompt-library" && (
          <div className={styles.tabContent}>
            <div className={styles.bookSelector}>
              <span className={styles.bookSelectorLabel}>选择书籍：</span>
              <Select
                style={{ minWidth: 200 }}
                placeholder="请选择一本书"
                value={selectedBookId}
                onChange={setSelectedBookId}
                options={initialBooks.map((book) => ({
                  label: book.title,
                  value: book.id,
                }))}
                allowClear={false}
              />
            </div>
            <div className={styles.promptLibraryContent}>
              {selectedBook ? (
                <PromptLibrary book={selectedBook} />
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                  请先选择一本书
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
