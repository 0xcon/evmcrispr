import { Address, App, AppArtifactCache, ParsedApp, PermissionMap } from "../types";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const buildAppPermissions = (artifactRoles: any, currentPermissions: any[]): PermissionMap => {
  const appPermissions = artifactRoles.reduce((roleMap: PermissionMap, role: any) => {
    roleMap.set(role.bytes, { manager: "", grantees: new Set() });
    return roleMap;
  }, new Map());

  currentPermissions.forEach((role) => {
    if (appPermissions.has(role.roleHash)) {
      appPermissions.set(role.roleHash, {
        ...appPermissions.get(role.roleHash),
        manager: role.manager,
        grantees: new Set(role.grantees.map(({ granteeAddress }: { granteeAddress: Address }) => granteeAddress)),
      });
    }
  });

  return appPermissions;
};

export const buildApp = (parsedApp: ParsedApp, appResourcesCache: AppArtifactCache): App | null => {
  const { address, codeAddress, contentUri, name, registryName, roles } = parsedApp;

  if (!appResourcesCache.has(codeAddress)) {
    return null;
  }
  const { abiInterface, roles: artifactRoles } = appResourcesCache.get(codeAddress)!;

  return {
    abiInterface,
    address,
    codeAddress,
    contentUri,
    name,
    permissions: buildAppPermissions(artifactRoles, roles),
    registryName,
  };
};
