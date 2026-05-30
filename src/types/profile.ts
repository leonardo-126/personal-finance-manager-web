export interface Profile {
  id: number;
  bio: string | null;
  /** URL pública da imagem retornada pela API. */
  avatar_photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInput {
  bio?: string | null;
  /** Arquivo de imagem selecionado para upload. */
  avatar_photo?: File | null;
}
