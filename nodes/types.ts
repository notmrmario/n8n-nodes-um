import type { DateTimeMaybeValid } from "luxon";

export const dateFormat = "d MMM yyyy H:mm";

export const SakaiToolType = {
    "sakai.announcements": "Anuncios",
    "sakai.schedule": "Calendario",
    "sakai.resources": "Recursos",
    "sakai.iframe": "ContenidoWeb",
    "sakai.assignment.grades": "Tareas",
    "sakai.samigo": "Examenes",
    "sakai.gradebookng": "Calificaciones",
    "sakai.messages": "MensajesPrivados",
    "sakai.chat": "Chat",
    "sakai.forums": "Foros",
    "sakai.site.roster2": "Participantes",
    "sakai.sitestats": "Estadisticas",
    "sakai.umugdocenteng": "GuiasDocentes",
    "sakai.umucorrige": "TestPresenciales",
    "sakai.umullamamientos": "Llamamientos",
    "sakai.umuactas": "Actas",
    "sakai.umualumnado": "AlumnadoOficial",
    "sakai.sections": "InformacionGrupos",
    "sakai.opencast": "VideoClases",
    "sakai.zoomlti": "VideoConferencia",
    "sakai.siteinfo": "InformacionSitio",
} as const;

export type Endpoint =
    | "ninguno"
    | "anuncio_url"
    | "herramientas"
    | "notificaciones"
    | "sitios"
    | "tareas"
    | "tarea_url";

export type EventoFiltro =
    | "notificaciones"
    | "tareas";

export type Sitio = {
    image: string | null;
    pinned: boolean;
    siteId: string;
    title: string;
    tools: {
        title: string;
        hasAlerts: boolean;
        url: string;
        iconClass: string;
        id: keyof typeof SakaiToolType;
    }[];
    url: string;
}

// type SakaiToolType = 
//     | "sakai.announcements"
//     | "sakai.schedule"
//     | "sakai.resources"
//     | "sakai.iframe"
//     | "sakai.assignment.grades"
//     | "sakai.samigo"
//     | "sakai.gradebookng"
//     | "sakai.messages"
//     | "sakai.chat"
//     | "sakai.forums"
//     | "sakai.site.roster2"
//     | "sakai.sitestats"
//     | "sakai.siteinfo"
//     | "sakai.umugdocenteng"
//     | "sakai.umucorrige"
//     | "sakai.umullamamientos"
//     | "sakai.umuactas"
//     | "sakai.umualumnado";

export type Tarea = {
    titulo: string;
    url: string;
    estado: string;
    inicio: DateTimeMaybeValid;
    fin: DateTimeMaybeValid;
}

export type Herramienta = {
    titulo: string;
    url: string;
    id: string;
}

export type Notificacion = {
    id: number;
    fromUser: string;
    toUser: string;
    event: string;
    ref: string;
    title: string;
    siteId: string;
    url: string;
    eventDate: number;
    deferred: boolean;
    viewed: boolean;
    tool: keyof typeof SakaiToolType;
    fromDisplayName: string;
    formattedEventDate: string | DateTimeMaybeValid;
    siteTitle: string;
}