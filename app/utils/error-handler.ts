import { message } from "antd";
import { ApiError } from "@/app/api-client";

export function handleApiError(error: unknown, fallbackMessage = "操作失败"): string {
  let errorMessage = fallbackMessage;

  if (error instanceof ApiError) {
    errorMessage = error.message;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  message.error(errorMessage);
  return errorMessage;
}

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
