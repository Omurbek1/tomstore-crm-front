import { Modal, Tag } from "antd";
import { toSafeExternalUrl, toSafeMediaUrl } from "../../../security/url";
import type { TrainingMaterial } from "../../../entities/material/model/types";

type Props = {
  material: TrainingMaterial | null;
  onCancel: () => void;
  isDirectVideoFile: (url?: string | null) => boolean;
  toVideoEmbedUrl: (url?: string | null) => string | undefined;
};

export const MaterialPreviewModal = ({
  material,
  onCancel,
  isDirectVideoFile,
  toVideoEmbedUrl,
}: Props) => {
  return (
    <Modal
      open={!!material}
      title={material?.title || "Видео"}
      footer={null}
      width={860}
      onCancel={onCancel}
    >
      {material?.type === "video" ? (
        isDirectVideoFile(material.url) ? (
          <video controls className="w-full rounded border" src={toSafeMediaUrl(material.url)} />
        ) : (
          <iframe
            title="video-preview"
            src={toVideoEmbedUrl(material.url) || ""}
            className="w-full h-[420px] rounded border"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )
      ) : (() => {
        const safeMaterialUrl = toSafeExternalUrl(material?.url);
        return safeMaterialUrl ? (
          <a href={safeMaterialUrl} target="_blank" rel="noopener noreferrer">
            Открыть материал
          </a>
        ) : (
          <Tag color="red">Невалидная ссылка</Tag>
        );
      })()}
    </Modal>
  );
};
