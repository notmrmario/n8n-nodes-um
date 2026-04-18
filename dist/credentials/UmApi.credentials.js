"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UmApi = void 0;
class UmApi {
    constructor() {
        this.name = 'umApi';
        this.displayName = 'AulaVirtual UM API';
        this.icon = "file:../nodes/av.svg";
        this.documentationUrl = 'https://github.com/org/@notmrmario/-um?tab=readme-ov-file#credentials';
        this.properties = [
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
                displayName: 'Token MFA (entrada.um.es)',
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
    }
}
exports.UmApi = UmApi;
//# sourceMappingURL=UmApi.credentials.js.map