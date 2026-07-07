export interface AiProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: 'openai' | 'anthropic' | 'custom';
  defaultModel: string;
  models: string[];
  temperatureRange: [number, number];
  maxContextSize: number;
  isCustom?: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiFormat: 'openai',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    temperatureRange: [0, 2],
    maxContextSize: 128000,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    apiFormat: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    temperatureRange: [0, 1],
    maxContextSize: 200000,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiFormat: 'custom',
    defaultModel: 'gemini-pro',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
    temperatureRange: [0, 2],
    maxContextSize: 32000,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai',
    apiFormat: 'openai',
    defaultModel: 'mistral-small-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium'],
    temperatureRange: [0, 1],
    maxContextSize: 32000,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiFormat: 'openai',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
    temperatureRange: [0, 2],
    maxContextSize: 64000,
  },
  {
    id: 'baidu',
    name: '百度文心',
    baseUrl: 'https://aip.baidubce.com',
    apiFormat: 'custom',
    defaultModel: 'ernie-4.0-turbo-8k',
    models: ['ernie-4.0-turbo-8k', 'ernie-3.5-8k', 'ernie-speed-128k'],
    temperatureRange: [0, 1],
    maxContextSize: 128000,
  },
  {
    id: 'aliyun',
    name: '阿里通义',
    baseUrl: 'https://dashscope.aliyuncs.com',
    apiFormat: 'openai',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    temperatureRange: [0, 2],
    maxContextSize: 1000000,
  },
  {
    id: 'zhipu',
    name: '智谱GLM',
    baseUrl: 'https://open.bigmodel.cn',
    apiFormat: 'openai',
    defaultModel: 'glm-4-flash',
    models: ['glm-4', 'glm-4-flash', 'glm-4v'],
    temperatureRange: [0, 1],
    maxContextSize: 128000,
  },
  {
    id: 'moonshot',
    name: '月之暗面Kimi',
    baseUrl: 'https://api.moonshot.cn',
    apiFormat: 'openai',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    temperatureRange: [0, 1],
    maxContextSize: 128000,
  },
  {
    id: 'spark',
    name: '讯飞星火',
    baseUrl: 'https://spark-api-open.xf-yun.com',
    apiFormat: 'openai',
    defaultModel: 'generalv3.5',
    models: ['generalv3.5', '4.0Ultra', 'max-32k'],
    temperatureRange: [0, 1],
    maxContextSize: 32000,
  },
  {
    id: 'tencent',
    name: '腾讯混元',
    baseUrl: 'https://hunyuan.tencentcloudapi.com',
    apiFormat: 'custom',
    defaultModel: 'hunyuan-lite',
    models: ['hunyuan-lite', 'hunyuan-standard', 'hunyuan-pro'],
    temperatureRange: [0, 1],
    maxContextSize: 32000,
  },
  {
    id: 'doubao',
    name: '字节豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    apiFormat: 'openai',
    defaultModel: 'doubao-lite-4k',
    models: ['doubao-lite-4k', 'doubao-pro-4k', 'doubao-lite-32k'],
    temperatureRange: [0, 1],
    maxContextSize: 32000,
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    baseUrl: 'https://{resource}.openai.azure.com',
    apiFormat: 'openai',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
    temperatureRange: [0, 2],
    maxContextSize: 128000,
  },
  {
    id: 'aws',
    name: 'AWS Bedrock',
    baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
    apiFormat: 'custom',
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    models: ['anthropic.claude-3-sonnet-20240229-v1:0', 'anthropic.claude-3-haiku-20240307-v1:0'],
    temperatureRange: [0, 1],
    maxContextSize: 200000,
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    apiFormat: 'openai',
    defaultModel: '',
    models: [],
    temperatureRange: [0, 2],
    maxContextSize: 1000000,
    isCustom: true,
  },
];

export function getProviderById(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}

export function getDefaultProvider(): AiProvider {
  return AI_PROVIDERS[0];
}
