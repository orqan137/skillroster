import { Plus } from "lucide-react";

export function CreateActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="create-action-button" type="button" onClick={onClick}><Plus size={18} /><span>{label}</span></button>;
}
