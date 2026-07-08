import { useCallback, useEffect, useRef, useState } from "react";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { showError, showSuccess } from "@/app/utils/error-handler";
import type { BookFile, Folder } from "@/app/types";
import {
  createFile,
  deleteFile,
  getFileById,
  updateFileContent
} from "@/app/pages/books/api/files";
import {
  createFolder,
  deleteFolder,
  getFoldersByBookAndCategory
} from "@/app/pages/books/api/folders";

interface UseFolderFileEditorOptions {
  bookId: string;
  category: string;
}

export function useFolderFileEditor({ bookId, category }: UseFolderFileEditorOptions) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFile, setSelectedFile] = useState<BookFile | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const textareaRef = useRef<TextAreaRef>(null);
  const isComposing = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedFileRef = useRef<BookFile | null>(null);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const fetchFolders = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }

      const result = await getFoldersByBookAndCategory(bookId, category);
      if (result.ok) {
        setFolders(result.data);
      } else {
        showError(result.error || "获取文件夹失败");
      }
      setIsLoading(false);
    },
    [bookId, category]
  );

  useEffect(() => {
    void (async () => {
      await fetchFolders(true);
    })();
  }, [fetchFolders]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const addFolder = useCallback(
    async (name: string) => {
      const result = await createFolder(bookId, category, name.trim());
      if (result.ok) {
        showSuccess("文件夹创建成功");
        await fetchFolders(false);
        return true;
      }
      showError(result.error || "创建文件夹失败");
      return false;
    },
    [bookId, category, fetchFolders]
  );

  const addFile = useCallback(
    async (folderId: string, name: string) => {
      const result = await createFile(folderId, name.trim());
      if (result.ok) {
        showSuccess("文件创建成功");
        await fetchFolders(false);
        setSelectedFile(result.data);
        return true;
      }
      showError(result.error || "创建文件失败");
      return false;
    },
    [fetchFolders]
  );

  const selectFile = useCallback(async (file: BookFile) => {
    const result = await getFileById(file.id);
    if (result.ok) {
      setSelectedFile(result.data);
    } else {
      showError(result.error || "获取文件内容失败");
      setSelectedFile(file);
    }
  }, []);

  const updateContent = useCallback(
    async (content: string) => {
      if (!selectedFile) {
        return;
      }

      setSelectedFile((prev) => (prev ? { ...prev, content } : null));

      if (isComposing.current) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const fileId = selectedFileRef.current?.id;
        if (!fileId) return;
        setSaveStatus("saving");
        const result = await updateFileContent(fileId, content);
        if (result.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          showError(result.error || "保存失败");
          setSaveStatus("idle");
        }
      }, 500);
    },
    [selectedFile]
  );

  const removeFile = useCallback(
    async (fileId: string) => {
      const result = await deleteFile(fileId);
      if (result.ok) {
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
        }
        showSuccess("文件删除成功");
        await fetchFolders(false);
      } else {
        showError(result.error || "删除文件失败");
      }
    },
    [fetchFolders, selectedFile]
  );

  const removeFolder = useCallback(
    async (folderId: string) => {
      const result = await deleteFolder(folderId);
      if (result.ok) {
        if (
          selectedFile &&
          folders
            .find((folder) => folder.id === folderId)
            ?.files.some((file) => file.id === selectedFile.id)
        ) {
          setSelectedFile(null);
        }
        showSuccess("文件夹删除成功");
        await fetchFolders(false);
      } else {
        showError(result.error || "删除文件夹失败");
      }
    },
    [fetchFolders, folders, selectedFile]
  );

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (event: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposing.current = false;
      void updateContent(event.currentTarget.value);
    },
    [updateContent]
  );

  return {
    folders,
    selectedFile,
    expandedFolders,
    isLoading,
    saveStatus,
    textareaRef,
    toggleFolder,
    addFolder,
    addFile,
    selectFile,
    updateContent,
    removeFile,
    removeFolder,
    handleCompositionStart,
    handleCompositionEnd
  };
}
