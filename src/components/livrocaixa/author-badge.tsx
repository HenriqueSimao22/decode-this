import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type Autor = {
  user_id: string;
  nome: string;
  cor?: string | null;
  avatar_url?: string | null;
};

export function AuthorBadge({
  autor,
  size = 24,
  showName = false,
}: {
  autor?: Autor;
  size?: number;
  showName?: boolean;
}) {
  const nome = autor?.nome ?? "?";
  const cor = autor?.cor ?? "#6366f1";
  const inicial = nome.slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center gap-2 min-w-0" title={nome}>
      <Avatar style={{ width: size, height: size }} className="shrink-0">
        {autor?.avatar_url ? <AvatarImage src={autor.avatar_url} alt={nome} /> : null}
        <AvatarFallback
          className="text-white text-[10px] font-bold"
          style={{ background: cor }}
        >
          {inicial}
        </AvatarFallback>
      </Avatar>
      {showName && <span className="text-xs text-muted-foreground truncate">{nome}</span>}
    </div>
  );
}