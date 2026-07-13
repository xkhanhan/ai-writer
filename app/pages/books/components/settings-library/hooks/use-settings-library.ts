"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Form } from "antd";
import type {
  SettingEntity,
  SettingCategory,
  SettingLevel,
  TagCategory,
  CreateSettingEntityDTO,
} from "@/app/types";
import {
  STATUS_FIELD_TEMPLATES,
  CATEGORY_FIELD_TEMPLATES,
} from "@/app/types";
import {
  fetchSettingEntities,
  createSettingEntity,
  updateSettingEntity,
  deleteSettingEntity,
} from "@/app/pages/books/api/setting-entities";
import { useTagTree } from "@/shared/hooks/use-tag-tree";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { CAT_ORDER } from "@/app/constants/settings";

export interface UseSettingsLibraryReturn {
  entities: SettingEntity[];
  loading: boolean;
  activeEntity: SettingEntity | null;
  openGroups: Record<SettingCategory, boolean>;
  grouped: Record<SettingCategory, SettingEntity[]>;
  tagNameMap: Map<string, string>;
  form: ReturnType<typeof Form.useForm>[0];
  modalOpen: boolean;
  modalCat: SettingCategory;
  editing: SettingEntity | null;
  toggleGroup: (cat: SettingCategory) => void;
  openCreate: (cat: SettingCategory) => void;
  openEdit: (entity: SettingEntity) => void;
  handleSave: () => Promise<void>;
  handleDelete: (entity: SettingEntity) => void;
  handleToggleDeprecated: (entity: SettingEntity) => Promise<void>;
  setModalOpen: (open: boolean) => void;
}

export function useSettingsLibrary(
  bookId: string,
  activeId: string | undefined,
  onActiveChange: ((id: string) => void) | undefined
): UseSettingsLibraryReturn {
  const [entities, setEntities] = useState<SettingEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const { tags: tagTree } = useTagTree(bookId);
  const tagNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (tags: TagCategory[]) => {
      for (const t of tags) {
        map.set(t.id, t.name);
        if (t.children) walk(t.children);
      }
    };
    walk(tagTree);
    return map;
  }, [tagTree]);

  const [openGroups, setOpenGroups] = useState<Record<SettingCategory, boolean>>({
    character: false,
    location: false,
    faction: false,
    item: false,
    other: false,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCat, setModalCat] = useState<SettingCategory>("character");
  const [editing, setEditing] = useState<SettingEntity | null>(null);
  const [form] = Form.useForm();

  // Stabilize onActiveChange reference to prevent useEffect infinite loops
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const activeEntity = useMemo(
    () => entities.find((e) => e.id === activeId) ?? null,
    [entities, activeId]
  );

  const grouped = useMemo(() =>
    CAT_ORDER.reduce(
      (acc, cat) => {
        acc[cat] = entities.filter((e) => e.category === cat);
        return acc;
      },
      {} as Record<SettingCategory, SettingEntity[]>
    ),
    [entities]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await fetchSettingEntities(bookId);
      if (!cancelled) {
        if (result.ok) {
          setEntities(result.data);
          const newOpen: Record<SettingCategory, boolean> = {
            character: false, location: false, faction: false, item: false, other: false,
          };
          for (const cat of CAT_ORDER) {
            if (result.data.some((e) => e.category === cat)) newOpen[cat] = true;
          }
          setOpenGroups(newOpen);
          if (result.data.length > 0) {
            const id = activeId && result.data.some((e) => e.id === activeId)
              ? activeId
              : result.data[0].id;
            onActiveChangeRef.current?.(id);
          }
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookId]);

  const toggleGroup = useCallback((cat: SettingCategory) => {
    setOpenGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const openCreate = useCallback(
    (cat: SettingCategory) => {
      setEditing(null);
      setModalCat(cat);
      const defaults: Record<string, unknown> = {
        name: "",
        level: "general",
        tagIds: [],
        description: "",
        appearance: "",
        traits: "",
        background: "",
        abilities: "",
        weaknesses: "",
      };
      for (const f of CATEGORY_FIELD_TEMPLATES[cat]) {
        defaults[f] = "";
      }
      for (const f of STATUS_FIELD_TEMPLATES[cat]) {
        defaults[f] = "";
      }
      form.resetFields();
      form.setFieldsValue(defaults);
      setModalOpen(true);
    },
    [form]
  );

  const openEdit = useCallback(
    (entity: SettingEntity) => {
      setEditing(entity);
      setModalCat(entity.category);
      form.resetFields();
      form.setFieldsValue({
        name: entity.name,
        level: entity.level,
        tagIds: entity.tagIds ?? [],
        description: entity.description,
        appearance: entity.appearance,
        traits: entity.traits,
        background: entity.background,
        abilities: entity.abilities,
        weaknesses: entity.weaknesses,
        ...entity.categoryFields,
        ...entity.statusFields,
      });
      setModalOpen(true);
    },
    [form]
  );

  const handleSave = useCallback(async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const {
      name, level, tagIds, description, appearance,
      traits, background, abilities, weaknesses, ...rest
    } = values;

    const categoryFields: Record<string, string> = {};
    for (const f of CATEGORY_FIELD_TEMPLATES[modalCat]) {
      if (rest[f] !== undefined) categoryFields[f] = rest[f];
    }

    const statusFields: Record<string, string> = {};
    for (const f of STATUS_FIELD_TEMPLATES[modalCat]) {
      if (rest[f] !== undefined) statusFields[f] = rest[f];
    }

    if (editing) {
      const dto = {
        name: name.trim(),
        level: level as SettingLevel,
        tagIds: tagIds as string[],
        description, appearance, traits, background, abilities, weaknesses,
        categoryFields, statusFields,
      };
      const result = await updateSettingEntity(editing.id, dto);
      if (!result.ok) {
        showError(result.error || "保存失败");
        return;
      }
      setEntities((prev) =>
        prev.map((e) => (e.id === result.data.id ? result.data : e))
      );
    } else {
      const dto: CreateSettingEntityDTO = {
        category: modalCat,
        name: name.trim(),
        level: level as SettingLevel,
        tagIds: tagIds as string[],
        description, appearance, traits, background, abilities, weaknesses,
        categoryFields, statusFields,
      };
      const result = await createSettingEntity(bookId, dto);
      if (!result.ok) {
        showError(result.error || "创建失败");
        return;
      }
      setEntities((prev) => [...prev, result.data]);
      onActiveChangeRef.current?.(result.data.id);
      setOpenGroups((prev) => ({ ...prev, [modalCat]: true }));
    }

    showSuccess(editing ? "保存成功" : "创建成功");
    setModalOpen(false);
  }, [form, modalCat, editing, bookId]);

  const handleDelete = useCallback(
    (entity: SettingEntity) => {
      confirmDelete(entity.name, async () => {
        const result = await deleteSettingEntity(entity.id);
        if (result.ok) {
          setEntities((prev) => prev.filter((e) => e.id !== entity.id));
          showSuccess("删除成功");
        } else {
          showError(result.error || "删除失败");
        }
      });
    },
    []
  );

  const handleToggleDeprecated = useCallback(async (entity: SettingEntity) => {
    const result = await updateSettingEntity(entity.id, {
      deprecated: !entity.deprecated,
    });
    if (result.ok) {
      setEntities((prev) =>
        prev.map((e) => (e.id === result.data.id ? result.data : e))
      );
    } else {
      showError(result.error || "更新废弃状态失败");
    }
  }, []);

  return {
    entities,
    loading,
    activeEntity,
    openGroups,
    grouped,
    tagNameMap,
    form,
    modalOpen,
    modalCat,
    editing,
    toggleGroup,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    handleToggleDeprecated,
    setModalOpen,
  };
}
