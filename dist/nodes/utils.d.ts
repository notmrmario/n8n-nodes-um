import { DateTime } from "luxon";
import TurnDown from "turndown";
export declare const td: TurnDown;
export declare function extraerCampo(html: string, nombreCampo: string): string | null;
export declare function parseTarea(html: string): {
    creado_por: string | undefined;
    inicio: DateTime<true> | DateTime<false>;
    fin: DateTime<true> | DateTime<false>;
    calificacion: string | undefined;
    adjuntos: {
        nombre: string;
        url: string;
    }[];
    informacion: string;
    tipo: string;
    info?: undefined;
    instrucciones?: undefined;
} | {
    info: {} | undefined;
    instrucciones: string;
    adjuntos: {
        nombre: string;
        url: string;
    }[];
    creado_por?: undefined;
    inicio?: undefined;
    fin?: undefined;
    calificacion?: undefined;
    informacion?: undefined;
    tipo?: undefined;
};
export declare function keys<T extends object>(o: T): (keyof T)[];
