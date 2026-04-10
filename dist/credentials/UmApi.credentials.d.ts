import type { Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class UmApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: Icon;
    documentationUrl: string;
    properties: INodeProperties[];
    test?: ICredentialTestRequest | undefined;
}
export interface UmCreds {
    user: string;
    password: string;
    mfatoken: string;
}
