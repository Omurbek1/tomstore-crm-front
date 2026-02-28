export type MaterialType = "video" | "document" | "link" | "image" | "other";

export interface MaterialBaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingMaterial extends MaterialBaseEntity {
  title: string;
  description?: string;
  type: MaterialType;
  url: string;
  folderId?: string;
  lessonOrder?: number;
  thumbnailUrl?: string;
  createdById?: string;
  createdByName?: string;
  isPublished?: boolean;
}

export interface TrainingMaterialFolder extends MaterialBaseEntity {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface PaginatedMaterials {
  items: TrainingMaterial[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

