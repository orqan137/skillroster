import { resolve } from "node:path";
import { GitTeamRepository } from "@skillspace/git";
import { defaultTeamDirectory, saveTeamConnection } from "./local-config.js";

export interface InitializeTeamRequest {
  team: string;
  displayName: string;
  owner: string;
  ownerName: string;
  email: string;
  remote: string;
  directory?: string;
}

export interface JoinTeamRequest {
  member: string;
  displayName: string;
  email: string;
  remote: string;
  directory: string;
}

export async function initializeTeam(input: InitializeTeamRequest) {
  const team = input.team.trim();
  const displayName = input.displayName.trim();
  const owner = input.owner.trim();
  const ownerName = input.ownerName.trim();
  const email = input.email.trim();
  const remote = input.remote.trim();
  const directory = resolve(input.directory?.trim() || defaultTeamDirectory(team));
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slugPattern.test(team) || !slugPattern.test(owner)) {
    throw new Error("팀 ID와 사용자 ID는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }
  if (!displayName || !ownerName || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("팀 이름, 사용자 이름, 올바른 이메일을 입력해주세요.");
  }
  if (!remote) {
    throw new Error("빈 원격 Git 저장소 주소가 필요합니다.");
  }

  const repository = await GitTeamRepository.initialize({
    directory,
    remote,
    name: team,
    displayName,
    owner,
    ownerDisplayName: ownerName,
    ownerEmail: email,
    identity: { name: ownerName, email },
  });
  await saveTeamConnection(team, { remote, directory, member: owner });

  return {
    ok: true as const,
    team,
    directory,
    remote,
    revision: await repository.revision(),
  };
}

export async function joinTeam(input: JoinTeamRequest) {
  const member = input.member.trim();
  const displayName = input.displayName.trim();
  const email = input.email.trim();
  const remote = input.remote.trim();
  const directoryInput = input.directory.trim();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(member)) {
    throw new Error("사용자 ID는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }
  if (!displayName || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("이름과 올바른 이메일을 입력해주세요.");
  }
  if (!remote) throw new Error("팀장이 초기화한 원격 Git 저장소 주소가 필요합니다.");
  if (!directoryInput) throw new Error("로컬 clone 경로가 필요합니다.");
  const directory = resolve(directoryInput);

  const repository = await GitTeamRepository.join({
    remote,
    directory,
    member,
    displayName,
    email,
    identity: { name: displayName, email },
  });
  const snapshot = await repository.snapshot();
  const team = snapshot.team.metadata.name;
  await saveTeamConnection(team, { remote, directory, member });
  return { ok: true as const, team, directory, remote, revision: await repository.revision() };
}
