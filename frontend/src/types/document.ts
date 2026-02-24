export interface DocumentSummary {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
}

export interface DocumentUploadResult {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
}

export interface PaginatedDocuments {
  items: DocumentSummary[];
  page: number;
  page_size: number;
  has_more: boolean;
}
