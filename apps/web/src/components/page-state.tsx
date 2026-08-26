import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useRosterShell } from "@/lib/roster-shell-context";
import { AppShell } from "./app-shell";

export function PageState({ message, onRetry, requestId }: { message: string; onRetry?: () => void; requestId?: string | null }) {
  const shell = useRosterShell();
  const content = <main className="page-state"><span className={`page-state-symbol${onRetry ? " error" : " loading"}`}>{onRetry ? <AlertTriangle size={25} /> : <LoaderCircle size={25} />}</span><h1>{message}</h1>{requestId && <p>요청 ID: <code>{requestId}</code></p>}{onRetry && <button className="button primary" type="button" onClick={onRetry}><RefreshCw size={15} />다시 불러오기</button>}</main>;
  return shell ? <AppShell member={shell.member} teamName={shell.teamName}>{content}</AppShell> : content;
}
