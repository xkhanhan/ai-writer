"use client";

import { Button, Card, Divider, Form, Grid } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import type { AiConfig } from "@/app/types";
import { useAiConfig } from "./hooks/use-ai-config";
import ProviderSelector from "./components/provider-selector";
import BasicConfig from "./components/basic-config";
import ConnectionTest from "./components/connection-test";
import AdvancedJson from "./components/advanced-json";
import styles from "./index.module.css";

const { useBreakpoint } = Grid;

interface AiConfigFormProps {
  onBack: () => void;
  initialConfig?: AiConfig | null;
}

export default function AiConfigForm({ onBack, initialConfig }: AiConfigFormProps) {
  const screens = useBreakpoint();
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回首页
        </Button>
        <h2 className={styles.title}>AI 配置</h2>
      </div>

      <div className={styles.content}>
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
  );
}
