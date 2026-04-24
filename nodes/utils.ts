export const regex_adjuntos = /!\[.*?\]\(.*?\) *\[(.*?)\]\((.*?)\)/gms;

export function extraerCampo(html: string, nombreCampo: string) {
    // Paso 1: capturar contenido del <td>
    const regex = new RegExp(
        `<th>\\s*${nombreCampo}\\s*<\\/th>\\s*<td[^>]*>(.*?)<\\/td>`,
        'is'  // i = case insensitive, s = dotAll (el . incluye saltos de línea)
    );

    const match = html.match(regex);
    if (!match) return null;

    // Paso 2: limpiar etiquetas HTML y espacios
    return match[1].replace(/<[^>]+>/g, '').trim();
}

export function keys<T extends object>(o: T): (keyof T)[] {
    return Object.keys(o) as unknown as (keyof T)[];
}