import { getSystemApp, isSystemApp } from ".";
import { ParsedApp, Repo } from "../types";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const parseApp = (app: any): ParsedApp => {
  const { address, appId, implementation, repoName, roles } = app;
  const { address: codeAddress } = implementation;
  const { registry, lastVersion } = app.repo || {};
  const { artifact: rawArtifact, contentUri } = lastVersion || {};
  let artifact, name;

  if (isSystemApp(appId)) {
    const systemApp = getSystemApp(appId)!;
    artifact = systemApp.artifact;
    name = systemApp.name;
  } else {
    artifact = JSON.parse(rawArtifact ?? null);
    name = repoName;
  }

  return {
    address,
    appId,
    artifact,
    codeAddress,
    contentUri,
    name,
    registryName: registry?.name,
    roles,
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const parseRepo = (repo: any): Repo => {
  const { artifact: rawArtifact, contentUri, codeAddress } = repo.lastVersion;

  return {
    artifact: JSON.parse(rawArtifact),
    contentUri,
    codeAddress,
  };
};
