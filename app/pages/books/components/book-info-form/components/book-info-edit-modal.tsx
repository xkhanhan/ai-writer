"use client";

import { Form, Input, InputNumber, Select } from "antd";
import BaseModal from "@/shared/ui/base-modal";
import { BOOK_GENRES, BOOK_PLATFORMS } from "@/app/constants";
import type { Book, BookOptions, GenreTreeNode, UpdateBookDTO } from "@/app/types";
import styles from "./book-info-edit-modal.module.css";

interface BookInfoEditModalProps {
  open: boolean;
  book: Book;
  options: BookOptions | null;
  loading: boolean;
  onClose: () => void;
  onSave: (data: UpdateBookDTO) => Promise<void>;
}

export function BookInfoEditModal({ open, book, options, loading, onClose, onSave }: BookInfoEditModalProps) {
  const [form] = Form.useForm();

  const genreTree: GenreTreeNode[] =
    options?.genreTree ??
    BOOK_GENRES.map((g) => ({ value: g, label: g }));
  const platforms = options?.platforms ?? BOOK_PLATFORMS;

  const selectedGenre = Form.useWatch("genre", form);
  const subGenreOptions =
    genreTree
      .find((g) => g.value === selectedGenre)
      ?.children?.map((c) => ({ label: c.label, value: c.value })) ?? [];

  const initialTags = book.tags
    ? book.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const tags = Array.isArray(values.tags)
        ? (values.tags as string[]).join(",")
        : (values.tags as string) ?? "";
      await onSave({
        title: values.title,
        genre: values.genre ?? "",
        subGenre: values.subGenre ?? "",
        platform: values.platform ?? "",
        targetAudience: values.targetAudience ?? "",
        tags,
        writingStyle: values.writingStyle ?? "",
        targetWordCount: values.targetWordCount ?? 0,
        targetTotalWords: values.targetTotalWords ?? 0,
        referenceWorks: values.referenceWorks ?? "",
        sellingPoint: values.sellingPoint ?? "",
        description: values.description ?? "",
      });
    } catch {
      // validation error — antd handles display
    }
  };

  return (
    <BaseModal
      title="编辑书籍信息"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: book.title,
          genre: book.genre || undefined,
          subGenre: book.subGenre || undefined,
          platform: book.platform || undefined,
          targetAudience: book.targetAudience || undefined,
          tags: initialTags,
          writingStyle: book.writingStyle || undefined,
          targetWordCount: book.targetWordCount || undefined,
          targetTotalWords: book.targetTotalWords || undefined,
          referenceWorks: book.referenceWorks,
          sellingPoint: book.sellingPoint,
          description: book.description,
        }}
        requiredMark={false}
        className={styles.formWrap}
      >
        <Form.Item name="title" label="书名" rules={[{ required: true, message: "请输入书名" }]}>
          <Input placeholder="请输入书名" maxLength={60} showCount />
        </Form.Item>

        <div className={styles.formRow}>
          <Form.Item name="genre" label="题材" rules={[{ required: true, message: "请选择题材" }]} className={styles.halfWidth}>
            <Select placeholder="选择题材" options={genreTree.map((g) => ({ label: g.label, value: g.value }))} />
          </Form.Item>
          <Form.Item name="subGenre" label="子题材" rules={[{ required: true, message: "请选择子题材" }]} className={styles.halfWidth}>
            <Select placeholder="选择子题材" options={subGenreOptions} disabled={!selectedGenre} />
          </Form.Item>
        </div>

        <div className={styles.formRow}>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: "请选择发布平台" }]} className={styles.halfWidth}>
            <Select placeholder="选择发布平台" options={platforms.map((p) => ({ label: p, value: p }))} />
          </Form.Item>
          <Form.Item name="targetAudience" label="目标受众" rules={[{ required: true, message: "请选择目标受众" }]} className={styles.halfWidth}>
            <Select placeholder="选择目标受众" options={(options?.targetAudiences ?? []).map((a) => ({ label: a, value: a }))} />
          </Form.Item>
        </div>

        <Form.Item
          name="tags"
          label="标签"
          tooltip="输入标签后按回车添加，每个标签最多10个字符"
          normalize={(value: string[]) => value?.map((v) => v.slice(0, 10))}
        >
          <Select mode="tags" maxCount={10} maxTagTextLength={10} placeholder="输入标签，按回车添加" />
        </Form.Item>

        <Form.Item name="writingStyle" label="文笔文风" rules={[{ required: true, message: "请选择文笔文风" }]}>
          <Select placeholder="选择文笔文风" options={(options?.writingStyles ?? []).map((s) => ({ label: s, value: s }))} />
        </Form.Item>

        <div className={styles.formRow}>
          <Form.Item name="targetWordCount" label="每章字数" rules={[{ required: true, message: "请输入每章字数" }]} className={styles.halfWidth}>
            <InputNumber min={500} max={10000} step={500} placeholder="如 3000" className={styles.fullWidth} />
          </Form.Item>
          <Form.Item name="targetTotalWords" label="总字数（万字）" className={styles.halfWidth}>
            <InputNumber min={0} max={500} step={10} placeholder="如 200" className={styles.fullWidth} />
          </Form.Item>
        </div>

        <Form.Item name="referenceWorks" label="参考作品">
          <Input placeholder="如：凡人修仙传、斗破苍穹" maxLength={200} showCount />
        </Form.Item>

        <Form.Item name="sellingPoint" label="核心卖点" extra="影响 AI 生成重心">
          <Input placeholder="这本书的核心吸引力" maxLength={200} showCount />
        </Form.Item>

        <Form.Item name="description" label="简介" rules={[{ required: true, message: "请输入简介" }]}>
          <Input.TextArea rows={4} maxLength={300} showCount placeholder="请输入书籍简介" />
        </Form.Item>
      </Form>
    </BaseModal>
  );
}
