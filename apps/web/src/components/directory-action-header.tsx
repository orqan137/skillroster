import { CreateActionButton } from "./create-action-button";
import { PageMotif } from "./page-motif";

export function DirectoryActionHeader({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel: string; onAction: () => void }) {
  return <header className="page-header directory-header action-page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><div className="header-action-group"><PageMotif /><CreateActionButton label={actionLabel} onClick={onAction} /></div></header>;
}
