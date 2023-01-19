//is url base64 encoded or normal string?
export function checkUrl(prop: string): boolean {
  const urlRegex =
    /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\\/?%\s]*)\s*$/i;
  return urlRegex.test(prop);
}
