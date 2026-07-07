import { message } from "antd";

export function showError(content: string) {
  message.error(content);
}

export function showSuccess(content: string) {
  message.success(content);
}

export function showWarning(content: string) {
  message.warning(content);
}

export function showInfo(content: string) {
  message.info(content);
}
