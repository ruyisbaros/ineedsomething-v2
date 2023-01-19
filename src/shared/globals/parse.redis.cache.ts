
export function parseJson(prop: string): any {
    try {
        return JSON.parse(prop)
    } catch (error) {
        return prop;
    }
}