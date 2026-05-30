import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { profileService } from "@/Services/api";
import type { Profile as ProfileType } from "@/types/profile";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ProfileForm from "./ProfileForm";

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    profileService
      .get()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        // 404 = perfil ainda não criado: tratamos como ausente, não como erro.
        if (err instanceof ApiError && err.status === 404) {
          if (!cancelled) setProfile(null);
          return;
        }
        if (!cancelled) setError(t("profile.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaved = (saved: ProfileType) => {
    setProfile(saved);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <span className="text-sm text-muted-foreground">
          {t("profile.loading")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  // Sem perfil ainda: mostra direto o formulário de criação.
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.createTitle")}</CardTitle>
            <CardDescription>{t("profile.createDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm onSaved={handleSaved} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modo de edição de um perfil existente.
  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.editTitle")}</CardTitle>
            <CardDescription>{t("profile.editDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={profile}
              onSaved={handleSaved}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Visualização do perfil.
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              {profile.avatar_photo && (
                <AvatarImage
                  src={profile.avatar_photo}
                  alt={user?.name ?? t("profile.title")}
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user?.name ?? t("profile.title")}</CardTitle>
              {user?.email && (
                <CardDescription>{user.email}</CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
            {t("profile.edit")}
          </Button>
        </CardHeader>
        <CardContent>
          <h3 className="mb-1 text-sm font-medium">{t("profile.form.bio")}</h3>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {profile.bio?.trim() || t("profile.emptyBio")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
