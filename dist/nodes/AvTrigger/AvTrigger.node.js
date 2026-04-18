"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvTrigger = void 0;
const umUtils_1 = require("../umUtils");
const inactiveNodeStaticData = {};
class AvTrigger {
    constructor() {
        this.description = {
            displayName: "AulaVirtual Trigger",
            description: "Trigger para eventos de AulaVirtual",
            name: "avTrigger",
            version: 1,
            icon: "file:../av.svg",
            usableAsTool: true,
            polling: true,
            credentials: [{ name: "umApi", displayName: "Credencial AulaVirtual" }],
            defaults: {
                name: "Trigger AulaVirtual",
            },
            group: ["trigger"],
            inputs: [],
            outputs: `={{(() => {
            switch ($parameter["evento"]) {
                case "anuncio":
                    return [
                        { type: "main", displayName: "Nuevos" },
                        { type: "main", displayName: "Modificados" },
                    ];
                case "examen":
                    return [
                        { type: "main", displayName: "Nuevos/Notas" },
                        { type: "main", displayName: "Modificados" },
                    ];
                case "notificacion":
                    return [
                        { type: "main", displayName: "Notificaciones" },
                    ];
                case "tarea":
                    return [
                        { type: "main", displayName: "Tareas nuevas" },
                        { type: "main", displayName: "Notas tareas" },
                        { type: "main", displayName: "Acceso tareas modificado" },
                    ];
            }    
        })()}}`,
            properties: [
                {
                    displayName: "Evento",
                    name: "evento",
                    default: "notificacion",
                    type: "options",
                    placeholder: "Selecciona un evento",
                    options: [
                        { name: "Anuncios", value: "anuncio" },
                        { name: "Examenes", value: "examen" },
                        { name: "Notificaciones (Todo)", value: "notificacion" },
                        { name: "Tareas", value: "tarea" },
                    ]
                },
                {
                    displayName: "IDs De Sitio",
                    name: "sitios_ids_filtro",
                    type: "string",
                    typeOptions: {
                        multipleValues: true,
                        multipleValueButtonText: "Añadir ID de Sitio",
                    },
                    default: [],
                    description: "Solo pasarán los eventos que vengan de estos sitios. Deja vacío para recibir todos.",
                    placeholder: "ID"
                },
                {
                    displayName: "Entrada Aleatoria",
                    name: "noti_random",
                    type: "boolean",
                    default: false,
                    description: "Mostrar una entrada aleatoria en lugar de la más reciente (solo en modo de prueba)",
                }
            ]
        };
    }
    async poll() {
        const credentials = await this.getCredentials("umApi");
        const evento = this.getNodeParameter("evento");
        const ids_filtro = this.getNodeParameter("sitios_ids_filtro");
        const staticData = this.getWorkflow().active ? this.getWorkflowStaticData("node") : inactiveNodeStaticData;
        const active = this.getWorkflow().active;
        const random = this.getNodeParameter("noti_random");
        let notificaciones = await (0, umUtils_1.getAVEndpoint)(this, "/users/me/notifications", credentials);
        if (ids_filtro.length)
            notificaciones = notificaciones.filter(n => ids_filtro.includes(n.siteId));
        if (!staticData.seenIds)
            staticData.seenIds = [];
        else if (active)
            notificaciones = notificaciones.filter(n => staticData.seenIds.includes(n.id));
        let result;
        switch (evento) {
            case "notificacion": {
                result = [notificaciones.map(n => ({ json: n }))];
                break;
            }
            case "anuncio": {
                result = [
                    notificaciones.filter(n => umUtils_1.notiEventType["nuevo_anuncio"].includes(n.event)).map(n => ({ json: n })),
                    notificaciones.filter(n => umUtils_1.notiEventType["anuncio_modificado"].some(id => n.event.startsWith(id))).map(n => ({ json: n })),
                ];
                break;
            }
            case "examen": {
                result = [
                    notificaciones.filter(n => umUtils_1.notiEventType["nuevo_examen"].includes(n.event)).map(n => ({ json: n })),
                    notificaciones.filter(n => umUtils_1.notiEventType["examen_modificado"].some(id => n.event.startsWith(id))).map(n => ({ json: n })),
                ];
                break;
            }
            case "tarea": {
                result = [
                    notificaciones.filter(n => umUtils_1.notiEventType["nueva_tarea"].includes(n.event)).map(n => ({ json: n })),
                    notificaciones.filter(n => umUtils_1.notiEventType["nota_tarea"].includes(n.event)).map(n => ({ json: n })),
                    notificaciones.filter(n => umUtils_1.notiEventType["cambio_acceso_tarea"].includes(n.event)).map(n => ({ json: n }))
                ];
                break;
            }
        }
        if (!active)
            result = result.map(r => r ? [r[random ? Math.floor(Math.random() * r.length) : 0]] : []);
        if (evento == "tarea" || evento == "examen" || evento == "anuncio")
            for (let i = 0; i < result.length; i++)
                for (let j = 0; j < result[i].length; j++) {
                    const n = result[i][j];
                    result[i][j] = {
                        ...n,
                        json: { ...n.json, extra: await (0, umUtils_1.getAVInfo)(this, credentials, evento, n.json.url) },
                        pairedItem: { item: 0 },
                    };
                }
        return result;
    }
}
exports.AvTrigger = AvTrigger;
//# sourceMappingURL=AvTrigger.node.js.map