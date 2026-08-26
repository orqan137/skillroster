import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

export function PageState({ message, onRetry, requestId }: { message: string; onRetry?: () => void; requestId?: string | null }) {
  return <main className="page-state"><span className={`page-state-symbol${onRetry ? " error" : " loading"}`}>{onRetry ? <AlertTriangle size={25} /> : <LoaderCircle size={25} />}</span><span className="eyebrow">SKILLROSTER</span><h1>{message}</h1>{requestId && <p>요청 ID: <code>{requestId}</code></p>}{onRetry && <button className="button primary" type="button" onClick={onRetry}><RefreshCw size={15} />다시 불러오기</button>}</main>;
}
