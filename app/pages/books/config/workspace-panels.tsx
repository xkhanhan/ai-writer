import React from "react";
import {
  ReadOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  TagsOutlined,
  EditOutlined,
  PushpinOutlined,
  BookOutlined,
  AuditOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { ActivePanel, Book } from "@/app/types";
import BookInfoDashboard from "../components/book-info-form";
import WorldRules from "../components/world-rules";
import SettingsLibrary from "../components/settings-library";
import TagLibrary from "../components/tag-library";
import ForeshadowLibrary from "../components/foreshadow-library";
import { CreationZone } from "../components/creation-zone";
import ContentLibrary from "../components/content-library";
import FactLibrary from "../components/fact-library";
import PromptLibrary from "../components/prompt-library";
import { WorkspacePanel } from "../components/workspace-panel";

export interface WorkspacePanelProps {
  book: Book;
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

export interface WorkspacePanelConfig {
  key: ActivePanel;
  title: string;
  icon: React.ReactNode;
  category?: string;
  component: (props: WorkspacePanelProps) => React.ReactNode;
}

export const workspacePanels: WorkspacePanelConfig[] = [
  {
    key: "info",
    title: "书籍信息",
    icon: <ReadOutlined />,
    component: ({ book }) => (
      <WorkspacePanel key={book.id} mode="content">
        <BookInfoDashboard book={book} />
      </WorkspacePanel>
    ),
  },
  {
    key: "world-rules",
    title: "世界规则",
    icon: <AppstoreOutlined />,
    category: "world-rules",
    component: ({ book, activeId, onActiveChange }) => (
      <WorldRules
        key={book.id}
        book={book}
        activeId={activeId}
        onActiveChange={onActiveChange}
      />
    ),
  },
  {
    key: "settings",
    title: "设定库",
    icon: <FileTextOutlined />,
    category: "settings",
    component: ({ book, activeId, onActiveChange }) => (
      <SettingsLibrary
        key={book.id}
        book={book}
        activeId={activeId}
        onActiveChange={onActiveChange}
      />
    ),
  },
  {
    key: "tag-library",
    title: "标签库",
    icon: <TagsOutlined />,
    component: ({ book }) => <TagLibrary key={book.id} book={book} />,
  },
  {
    key: "creation",
    title: "创作区",
    icon: <EditOutlined />,
    category: "creation",
    component: ({ book }) => (
      <WorkspacePanel key={book.id} mode="content">
        <CreationZone bookId={book.id} />
      </WorkspacePanel>
    ),
  },
  {
    key: "foreshadow",
    title: "伏笔库",
    icon: <PushpinOutlined />,
    component: ({ book }) => (
      <WorkspacePanel key={book.id} mode="content">
        <ForeshadowLibrary book={book} />
      </WorkspacePanel>
    ),
  },
  {
    key: "archive",
    title: "正文库",
    icon: <BookOutlined />,
    category: "archive",
    component: ({ book }) => (
      <WorkspacePanel key={book.id} mode="content">
        <ContentLibrary book={book} />
      </WorkspacePanel>
    ),
  },
  {
    key: "fact-library",
    title: "事实库",
    icon: <AuditOutlined />,
    component: ({ book }) => <FactLibrary key={book.id} book={book} />,
  },
  {
    key: "prompt-library",
    title: "提示词库",
    icon: <SettingOutlined />,
    component: ({ book }) => (
      <WorkspacePanel key={book.id} mode="content">
        <PromptLibrary book={book} />
      </WorkspacePanel>
    ),
  },
];
