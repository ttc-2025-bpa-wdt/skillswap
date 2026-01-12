export interface IAuthToken {
    sub: string;
    iat: number;
    exp?: number;
}
