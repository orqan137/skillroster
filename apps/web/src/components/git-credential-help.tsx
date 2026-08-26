import { CheckCircle2, ExternalLink, KeyRound, ShieldCheck, Terminal, X } from "lucide-react";
import { useModalBehavior } from "@/lib/use-modal-behavior";

function remoteHost(remote: string): string {
  try {
    if (/^https?:\/\//i.test(remote)) return new URL(remote).hostname;
  } catch {
    return "원격 Git 서버";
  }
  return remote.match(/@([^:/]+)[:/]/)?.[1] ?? "원격 Git 서버";
}

export function GitCredentialHelp({ remote, checking, onClose, onRetry }: { remote: string; checking: boolean; onClose: () => void; onRetry: () => void }) {
  useModalBehavior(onClose);
  const host = remoteHost(remote);
  const github = host.toLowerCase() === "github.com";
  const sshTarget = host === "원격 Git 서버" ? "git@<Git 서버 주소>" : `git@${host}`;
  return <div className="modal-backdrop"><button className="modal-backdrop-dismiss" type="button" tabIndex={-1} onClick={onClose} aria-label="Git 연결 안내 닫기" /><section className="credential-modal" role="alertdialog" aria-modal="true" aria-label="Git 연결 안내">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <span className="credential-symbol"><KeyRound size={25} /></span>
    <span className="eyebrow">Git 연결 필요</span>
    <h2>{host} 인증 필요</h2>
    <p>비밀번호와 토큰은 저장하지 않음 · 이 컴퓨터의 Git 인증 설정 사용</p>
    <div className="credential-methods">
      <section><span><Terminal size={18} /></span><div><strong>{github ? "가장 간단한 방법" : "HTTPS 인증"}</strong><p>터미널에서 명령 실행 후 브라우저 로그인</p><code>{github ? "gh auth login" : "git ls-remote <원격 Git 주소>"}</code>{github && <a href="https://cli.github.com/" target="_blank" rel="noreferrer">GitHub CLI 설치 안내 <ExternalLink size={13} /></a>}</div></section>
      <section><span><ShieldCheck size={18} /></span><div><strong>SSH 사용</strong><p>SSH 키의 Git 서버 계정 등록 여부 확인</p><code>ssh -T {sshTarget}</code></div></section>
    </div>
    <div className="credential-os-note"><CheckCircle2 size={17} /><p><strong>Windows</strong>: Git Credential Manager · <strong>macOS</strong>: Keychain 또는 SSH Agent</p></div>
    <footer><button className="button" type="button" onClick={onClose}>나중에 하기</button><button className="button primary" type="button" disabled={checking} onClick={onRetry}>{checking ? "연결 확인 중…" : "설정 완료, 다시 확인"}</button></footer>
  </section></div>;
}
