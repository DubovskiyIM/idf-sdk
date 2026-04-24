import { describe, it, expect } from "vitest";
import { canonicalizeGrpcOperationId } from "./canonicalizeGrpcOperationIds.js";

describe("canonicalizeGrpcOperationId", () => {
  it("CRUD verbs: Create/List/Get/Update/Delete/Patch → canonical", () => {
    expect(canonicalizeGrpcOperationId("ApplicationService_Create")).toBe("createApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_List")).toBe("listApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_Get")).toBe("readApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_Update")).toBe("updateApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_Delete")).toBe("removeApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_Patch")).toBe("patchApplication");
  });

  it("Action verbs: Sync/Rollback/TerminateOperation → lowercase verb + Entity + Suffix", () => {
    expect(canonicalizeGrpcOperationId("ApplicationService_Sync")).toBe("syncApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_Rollback")).toBe("rollbackApplication");
    expect(canonicalizeGrpcOperationId("ApplicationService_TerminateOperation"))
      .toBe("terminateApplicationOperation");
  });

  it("Multi-word suffix: GetManifestsWithFiles / ListResourceEvents", () => {
    expect(canonicalizeGrpcOperationId("ApplicationService_GetManifestsWithFiles"))
      .toBe("readApplicationManifestsWithFiles");
    expect(canonicalizeGrpcOperationId("ApplicationService_ListResourceEvents"))
      .toBe("listApplicationResourceEvents");
    // Edge case: "PodLogs2" трактуется как verb=Pod + suffix=Logs2.
    // Semantically host мог бы хотеть readApplicationPodLogs, но heuristic
    // не отличает verbs от nouns — host оверрайдит в INTENT_RENAME при нужде.
    expect(canonicalizeGrpcOperationId("ApplicationService_PodLogs2"))
      .toBe("podApplicationLogs2");
  });

  it("Nested entity: ApplicationSet / AppProject (PascalCase preserved)", () => {
    expect(canonicalizeGrpcOperationId("ApplicationSetService_Create")).toBe("createApplicationSet");
    expect(canonicalizeGrpcOperationId("ApplicationSetService_Generate")).toBe("generateApplicationSet");
  });

  it("Plural-dedup: ListRepositories → listRepositories (not listRepositoryRepositories)", () => {
    expect(canonicalizeGrpcOperationId("RepositoryService_ListRepositories"))
      .toBe("listRepositories");
    expect(canonicalizeGrpcOperationId("RepositoryService_CreateRepository"))
      .toBe("createRepository");
    expect(canonicalizeGrpcOperationId("CertificateService_ListCertificates"))
      .toBe("listCertificates");
    expect(canonicalizeGrpcOperationId("CertificateService_DeleteCertificate"))
      .toBe("removeCertificate");
  });

  it("Compound verb+noun: RotateAuth / InvalidateCache / GetAppDetails", () => {
    expect(canonicalizeGrpcOperationId("ClusterService_RotateAuth")).toBe("rotateClusterAuth");
    expect(canonicalizeGrpcOperationId("ClusterService_InvalidateCache"))
      .toBe("invalidateClusterCache");
    expect(canonicalizeGrpcOperationId("RepositoryService_GetAppDetails"))
      .toBe("readRepositoryAppDetails");
  });

  it("Account/Session edge cases: CreateToken / UpdatePassword / GetUserInfo", () => {
    expect(canonicalizeGrpcOperationId("AccountService_CreateToken")).toBe("createAccountToken");
    expect(canonicalizeGrpcOperationId("AccountService_DeleteToken")).toBe("removeAccountToken");
    expect(canonicalizeGrpcOperationId("AccountService_UpdatePassword"))
      .toBe("updateAccountPassword");
    expect(canonicalizeGrpcOperationId("SessionService_GetUserInfo")).toBe("readSessionUserInfo");
  });

  it("ServerSideDiff / RevisionMetadata — одиночные PascalCase parts", () => {
    expect(canonicalizeGrpcOperationId("ApplicationService_ServerSideDiff"))
      .toBe("serverApplicationSideDiff");
    // ServerSideDiff parts = [Server, Side, Diff]. verb=server (no map → "server")
    // suffix = SideDiff. target = ApplicationSideDiff. result = serverApplicationSideDiff.
    // Semantically это не идеально, но consistent. Host при желании оверрайдит.

    expect(canonicalizeGrpcOperationId("ApplicationService_RevisionMetadata"))
      .toBe("revisionApplicationMetadata");
  });

  it("returns null для не-grpc-gateway operationId'ов", () => {
    expect(canonicalizeGrpcOperationId("getApplication")).toBeNull();
    expect(canonicalizeGrpcOperationId("POST_users")).toBeNull();
    expect(canonicalizeGrpcOperationId("fooBar")).toBeNull();
    expect(canonicalizeGrpcOperationId("ApplicationService")).toBeNull();  // no _
    expect(canonicalizeGrpcOperationId("")).toBeNull();
    expect(canonicalizeGrpcOperationId(null)).toBeNull();
    expect(canonicalizeGrpcOperationId(undefined)).toBeNull();
    expect(canonicalizeGrpcOperationId(123)).toBeNull();
  });

  it("не падает на пустом suffix (Service_Verb + ничего после)", () => {
    expect(canonicalizeGrpcOperationId("XService_Y")).toBe("yX");
  });

  it("ArgoCD fixture — 20+ canonical renames совпадают с INTENT_RENAME host-таблицей", () => {
    const cases = [
      ["ApplicationService_Create",     "createApplication"],
      ["ApplicationService_Sync",       "syncApplication"],
      ["ApplicationService_Rollback",   "rollbackApplication"],
      ["ApplicationService_Delete",     "removeApplication"],
      ["ApplicationService_Update",     "updateApplication"],
      ["ApplicationService_Get",        "readApplication"],
      ["ApplicationService_Patch",      "patchApplication"],
      ["ProjectService_Create",         "createProject"],
      ["ProjectService_Delete",         "removeProject"],
      ["ClusterService_Create",         "createCluster"],
      ["ClusterService_RotateAuth",     "rotateClusterAuth"],
      ["ClusterService_InvalidateCache","invalidateClusterCache"],
      ["RepositoryService_CreateRepository", "createRepository"],
      ["RepositoryService_DeleteRepository", "removeRepository"],
      ["ApplicationSetService_Create",  "createApplicationSet"],
      ["ApplicationSetService_Generate","generateApplicationSet"],
      ["CertificateService_CreateCertificate", "createCertificate"],
      ["GPGKeyService_Create",          "createGPGKey"],
      ["AccountService_CreateToken",    "createAccountToken"],
      ["AccountService_DeleteToken",    "removeAccountToken"],
    ];
    for (const [input, expected] of cases) {
      expect(canonicalizeGrpcOperationId(input), `${input} → ${expected}`)
        .toBe(expected);
    }
  });
});
