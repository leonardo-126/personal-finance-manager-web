import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { profileService } from "@/Services/api";
import type { Profile } from "@/types/profile";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ProfileFormProps extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  /** Perfil existente. Quando informado, o formulário entra em modo de edição. */
  profile?: Profile | null;
  /** Chamado após salvar com sucesso, recebendo o perfil atualizado. */
  onSaved?: (profile: Profile) => void;
  /** Chamado ao cancelar a edição (exibe o botão "Cancelar"). */
  onCancel?: () => void;
}

export default function ProfileForm({
  profile,
  onSaved,
  onCancel,
  className,
  ...props
}: ProfileFormProps) {
  const { t } = useTranslation();

  const isEditing = Boolean(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // URL exibida no preview: o blob do arquivo escolhido ou a foto atual.
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    profile?.avatar_photo ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gera/limpa o object URL do arquivo selecionado.
  useEffect(() => {
    if (!avatarFile) return;
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
  };

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input = { bio: bio.trim(), avatar_photo: avatarFile };
      const saved = isEditing
        ? await profileService.update(input)
        : await profileService.create(input);
      onSaved?.(saved);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("profile.form.genericError");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="avatar_photo">
            {t("profile.form.avatarPhoto")}
          </FieldLabel>
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              {previewUrl && (
                <AvatarImage src={previewUrl} alt={t("profile.form.avatarPhoto")} />
              )}
              <AvatarFallback>
                <Upload className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {avatarFile || profile?.avatar_photo
                  ? t("profile.form.changePhoto")
                  : t("profile.form.choosePhoto")}
              </Button>
              {avatarFile && (
                <span className="text-xs text-muted-foreground">
                  {avatarFile.name}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="avatar_photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
          <FieldDescription>
            {t("profile.form.avatarPhotoDescription")}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="bio">{t("profile.form.bio")}</FieldLabel>
          <Textarea
            id="bio"
            rows={4}
            placeholder={t("profile.form.bioPlaceholder")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-background"
          />
          <FieldDescription>
            {t("profile.form.bioDescription")}
          </FieldDescription>
        </Field>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Field orientation="horizontal" className="justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t("profile.form.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("profile.form.submitting")
              : isEditing
                ? t("profile.form.update")
                : t("profile.form.create")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
