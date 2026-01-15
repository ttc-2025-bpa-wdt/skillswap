export interface IAuthToken {
    sub: string;
    iat: number;
    exp?: number;
}

export interface IEmailVerificationToken extends IAuthToken {
    email: string;
}
