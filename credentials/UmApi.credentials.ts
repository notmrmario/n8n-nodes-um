import type {
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UmApi implements ICredentialType {
	name = 'umApi';

	displayName = 'AulaVirtual UM API';
	icon: Icon = "file:../nodes/av.svg";

	// Link to your community node's README
	documentationUrl = 'https://github.com/org/@notmrmario/-um?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: "Usuario",
			name: "user",
			type: "string",
			required: true,
			default: "",
			placeholder: "tu@um.es",
		},
		{
			displayName: "Contraseña",
			name: "password",
			type: "string",
			required: true,
			typeOptions: {
				password: true
			},
			default: "",
		},
		{
			displayName: 'Token MFA',
			name: 'mfatoken',
			type: 'string',
			typeOptions: {
				password: true,
				expirable: true,
			},
			required: true,
			default: '',
		},
	];

	test?: ICredentialTestRequest | undefined;
}

export interface UmCreds {
	user: string;
	password: string;
	mfatoken: string;
}