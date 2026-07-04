export function getFileNameFromResponse(response: Response, defaultName: string): string {
    const header = response.headers.get('Content-Disposition');

    const match = header?.match(/filename="?([^"]+)"?/);

    return match?.[1] ?? defaultName;
}