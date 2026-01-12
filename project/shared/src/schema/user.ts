export interface IUserCredential {
    passwordHash: string;
    passwordSalt: string;
}

export enum UserRole {
    User  = "USER",
    Admin = "ADMIN",
}

export interface IUser extends IUserCredential {
    id: string;
    email: string;
    handle: string;
    profileId: string;
    createdAt: Date;
    dob: Date;
    role: UserRole;
    firstName: string;
    lastName: string;
}
