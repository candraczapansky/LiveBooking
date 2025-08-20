import { PermissionsStorage } from './permissions';
import { UsersStorage } from './users';

export interface IStorage {
  // User methods
  getAllUsers(): Promise<any[]>;
  getUserById(id: number): Promise<any | null>;
  getUserByUsername(username: string): Promise<any | null>;
  getUserByEmail(email: string): Promise<any | null>;
  createUser(data: any): Promise<any>;
  updateUser(id: number, data: any): Promise<any | null>;
  deleteUser(id: number): Promise<void>;

  // Permission methods
  getAllPermissions(): Promise<any[]>;
  getPermission(id: number): Promise<any | null>;
  getPermissionsByCategory(category: string): Promise<any[]>;
  createPermission(data: any): Promise<any>;
  updatePermission(id: number, data: any): Promise<any | null>;
  deletePermission(id: number): Promise<void>;

  // Permission Group methods
  getAllPermissionGroups(): Promise<any[]>;
  getPermissionGroup(id: number): Promise<any | null>;
  createPermissionGroup(data: any): Promise<any>;
  updatePermissionGroup(id: number, data: any): Promise<any | null>;
  deletePermissionGroup(id: number): Promise<void>;

  // Permission Group Mapping methods
  getPermissionGroupMappings(groupId: number): Promise<any[]>;
  createPermissionGroupMapping(data: any): Promise<any>;
  deletePermissionGroupMappings(groupId: number): Promise<void>;

  // User Permission Group methods
  getUserPermissionGroups(userId: number): Promise<any[]>;
  getUserPermissionGroup(userId: number, groupId: number): Promise<any | null>;
  createUserPermissionGroup(data: any): Promise<any>;
  deleteUserPermissionGroup(id: number): Promise<void>;

  // User Direct Permission methods
  getUserDirectPermissions(userId: number): Promise<any[]>;
  getUserDirectPermission(userId: number, permissionId: number): Promise<any | null>;
  createUserDirectPermission(data: any): Promise<any>;
  updateUserDirectPermission(id: number, data: any): Promise<any>;
  deleteUserDirectPermission(id: number): Promise<void>;
  // Duplicates removed below
  getUserPermissions(userId: number): Promise<any>;
  assignPermissionGroupToUser(userId: number, groupId: number): Promise<void>;
}

export class Storage implements IStorage {
  private permissionsStorage: PermissionsStorage;
  private usersStorage: UsersStorage;

  constructor() {
    this.permissionsStorage = new PermissionsStorage();
    this.usersStorage = new UsersStorage();
  }

  // User methods
  getAllUsers() { return this.usersStorage.getAllUsers(); }
  getUserById(id: number) { return this.usersStorage.getUserById(id); }
  getUserByUsername(username: string) { return this.usersStorage.getUserByUsername(username); }
  getUserByEmail(email: string) { return this.usersStorage.getUserByEmail(email); }
  createUser(data: any) { return this.usersStorage.createUser(data); }
  updateUser(id: number, data: any) { return this.usersStorage.updateUser(id, data); }
  deleteUser(id: number) { return this.usersStorage.deleteUser(id); }

  // Permission methods
  getAllPermissions() { return this.permissionsStorage.getAllPermissions(); }
  getPermission(id: number) { return this.permissionsStorage.getPermission(id); }
  getPermissionsByCategory(category: string) { return this.permissionsStorage.getPermissionsByCategory(category); }
  createPermission(data: any) { return this.permissionsStorage.createPermission(data); }
  updatePermission(id: number, data: any) { return this.permissionsStorage.updatePermission(id, data); }
  deletePermission(id: number) { return this.permissionsStorage.deletePermission(id); }

  // Permission Group methods
  getAllPermissionGroups() { return this.permissionsStorage.getAllPermissionGroups(); }
  getPermissionGroup(id: number) { return this.permissionsStorage.getPermissionGroup(id); }
  createPermissionGroup(data: any) { return this.permissionsStorage.createPermissionGroup(data); }
  updatePermissionGroup(id: number, data: any) { return this.permissionsStorage.updatePermissionGroup(id, data); }
  deletePermissionGroup(id: number) { return this.permissionsStorage.deletePermissionGroup(id); }

  // Permission Group Mapping methods
  getPermissionGroupMappings(groupId: number) { return this.permissionsStorage.getPermissionGroupMappings(groupId); }
  createPermissionGroupMapping(data: any) { return this.permissionsStorage.createPermissionGroupMapping(data); }
  deletePermissionGroupMappings(groupId: number) { return this.permissionsStorage.deletePermissionGroupMappings(groupId); }

  // User Permission Group methods
  getUserPermissionGroups(userId: number) { return this.permissionsStorage.getUserPermissionGroups(userId); }
  getUserPermissionGroup(userId: number, groupId: number) { return this.permissionsStorage.getUserPermissionGroup(userId, groupId); }
  createUserPermissionGroup(data: any) { return this.permissionsStorage.createUserPermissionGroup(data); }
  deleteUserPermissionGroup(id: number) { return this.permissionsStorage.deleteUserPermissionGroup(id); }

  // User Direct Permission methods
  getUserDirectPermissions(userId: number) { return this.permissionsStorage.getUserDirectPermissions(userId); }
  getUserDirectPermission(userId: number, permissionId: number) { return this.permissionsStorage.getUserDirectPermission(userId, permissionId); }
  createUserDirectPermission(data: any) { return this.permissionsStorage.createUserDirectPermission(data); }
  updateUserDirectPermission(id: number, data: any) { return this.permissionsStorage.updateUserDirectPermission(id, data); }
  deleteUserDirectPermission(id: number) { return this.permissionsStorage.deleteUserDirectPermission(id); }
  getUserPermissions(userId: number) { return this.permissionsStorage.getUserPermissions(userId); }
  assignPermissionGroupToUser(userId: number, groupId: number) { return this.permissionsStorage.assignPermissionGroupToUser(userId, groupId); }
}

