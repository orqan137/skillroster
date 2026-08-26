import { mkdir, rename, stat } from "node:fs/promises";
import { dirname, parse, resolve, sep } from "node:path";
import { GitTeamRepository } from "@skillspace/git";
import { runtimeConnection, saveTeamConnection } from "./local-config.js";

function contains(parent: string, child: string): boolean {
  const root = resolve(parent).toLowerCase();
  const target = resolve(child).toLowerCase();
  return target === root || target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

export async function moveActiveTeamDirectory(destination: string): Promise<string> {
  const connection = await runtimeConnection();
  if (!connection) throw new Error("활성 로스터 연결을 찾을 수 없습니다.");
  if (connection.source !== "local-config") {
    throw new Error("환경 변수로 연결한 로스터의 저장 경로는 화면에서 변경할 수 없습니다.");
  }

  const source = resolve(connection.directory);
  const target = resolve(destination.trim());
  if (!destination.trim()) throw new Error("새 로컬 clone 경로가 필요합니다.");
  if (source.toLowerCase() === target.toLowerCase()) return source;
  if (contains(source, target) || contains(target, source)) {
    throw new Error("현재 로스터 폴더의 내부 또는 상위 폴더로는 이동할 수 없습니다.");
  }
  if (parse(source).root.toLowerCase() !== parse(target).root.toLowerCase()) {
    throw new Error("다른 드라이브로는 바로 이동할 수 없습니다. 새 경로에서 로스터를 다시 연결해주세요.");
  }
  if (await stat(target).then(() => true, () => false)) {
    throw new Error("대상 경로가 이미 존재합니다. 존재하지 않는 새 폴더 경로를 입력해주세요.");
  }

  const repository = await GitTeamRepository.open(source);
  await repository.ensureClean();
  await mkdir(dirname(target), { recursive: true });
  await rename(source, target);
  try {
    await saveTeamConnection(connection.team, {
      directory: target,
      member: connection.member,
      ...(connection.remote ? { remote: connection.remote } : {}),
    });
  } catch (error) {
    await rename(target, source).catch(() => undefined);
    throw error;
  }
  return target;
}
