"use client";

import { useState, useCallback } from "react";
import { useCreationZone } from "@/app/pages/books/hooks/use-creation-zone";
import { NavigationTree } from "./components/navigation-tree";
import { CenterContent } from "./components/center-content";
import { AiPanel } from "./components/ai-panel";
import { VolumeModal } from "./components/volume-modal";
import styles from "./index.module.css";

interface CreationZoneProps {
  bookId: string;
}

export function CreationZone({ bookId }: CreationZoneProps) {
  const zone = useCreationZone(bookId);

  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  const [editingVolumeId, setEditingVolumeId] = useState<string | undefined>(undefined);

  const openVolumeModal = useCallback((volId?: string) => {
    setEditingVolumeId(volId);
    setVolumeModalOpen(true);
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.main}>
        <NavigationTree zone={zone} onOpenVolume={openVolumeModal} />
        <CenterContent bookId={bookId} zone={zone} />
        <AiPanel bookId={bookId} zone={zone} />
      </div>
      <VolumeModal
        open={volumeModalOpen}
        bookId={bookId}
        outline={zone.outline}
        volumeId={editingVolumeId}
        volumes={zone.volumes}
        onClose={() => { setVolumeModalOpen(false); setEditingVolumeId(undefined); }}
        onSave={zone.saveVolume}
      />
    </div>
  );
}
