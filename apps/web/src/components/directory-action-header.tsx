import { CreateActionButton } from "./create-action-button";
import { PageMotif } from "./page-motif";

export function DirectoryActionHeader({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <header className="page-header directory-header action-page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="header-action-group"><PageMotif /><CreateActionButton label={actionLabel} onClick={onAction} /></div></header>;
}
