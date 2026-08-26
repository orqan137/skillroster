import { CreateActionButton } from "./create-action-button";

export function DirectoryActionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return <header className="page-header directory-header action-page-header"><h1>{title}</h1><div className="header-action-group"><CreateActionButton label={actionLabel} onClick={onAction} /></div></header>;
}
