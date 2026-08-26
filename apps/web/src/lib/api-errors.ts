import { RegistryDataError } from "@skillspace/core";
import { RepositoryStateError } from "@skillspace/git";
import { DocumentValidationError } from "@skillspace/schemas";
import { isGitAuthenticationError } from "./git-access.js";

export interface ApiFailure {
  status: number;
  body: { error: string; code: string; requestId: string };
  report: boolean;
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("요청 데이터가 허용 크기를 초과했습니다.");
    this.name = "PayloadTooLargeError";
  }
}

export class ApiInputError extends Error {
  readonly code = "INVALID_INPUT";
  constructor(message: string) {
    super(message);
    this.name = "ApiInputError";
  }
}

export class ApiNotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(message: string) {
    super(message);
    this.name = "ApiNotFoundError";
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyApiError(error: unknown, requestId: string): ApiFailure {
  if (error instanceof ApiInputError) {
    return { status: 400, body: { error: error.message, code: error.code, requestId }, report: false };
  }
  if (error instanceof ApiNotFoundError) {
    return { status: 404, body: { error: error.message, code: error.code, requestId }, report: false };
  }
  if (isGitAuthenticationError(error)) {
    return { status: 401, body: { error: "원격 Git 인증 또는 push 권한을 확인해주세요.", code: "GIT_AUTH_REQUIRED", requestId }, report: false };
  }
  if (error instanceof RegistryDataError || error instanceof DocumentValidationError) {
    return { status: 422, body: { error: message(error), code: "REGISTRY_DATA_INVALID", requestId }, report: false };
  }
  if (error instanceof RepositoryStateError) {
    return { status: 409, body: { error: error.message, code: error.code, requestId }, report: false };
  }
  if (error instanceof SyntaxError) {
    return { status: 400, body: { error: "요청 데이터의 JSON 형식이 올바르지 않습니다.", code: "INVALID_JSON", requestId }, report: false };
  }
  if (error instanceof PayloadTooLargeError) {
    return { status: 413, body: { error: error.message, code: "PAYLOAD_TOO_LARGE", requestId }, report: false };
  }
  const raw = message(error);
  if (/non-fast-forward|merge conflict|conflict|cannot rebase|would be overwritten/i.test(raw)) {
    return { status: 409, body: { error: "다른 팀원의 변경과 충돌했습니다. 최신 Git 상태를 받은 뒤 다시 시도해주세요.", code: "GIT_CONFLICT", requestId }, report: false };
  }
  if (/must match|must use|score must|release already exists|이미 등록|이미 존재|찾을 수 없|필요합니다|올바르지 않|같은 이름|비어 있지 않|공유할 수 없|삭제할 수 없|이동할 수 없|변경할 수 없|넘을 수 없|이하여야/i.test(raw)) {
    return { status: 400, body: { error: raw, code: "INVALID_INPUT", requestId }, report: false };
  }
  return { status: 500, body: { error: "처리 중 예상하지 못한 오류가 발생했습니다. 다시 시도해도 계속되면 요청 ID를 관리자에게 전달해주세요.", code: "INTERNAL_ERROR", requestId }, report: true };
}
