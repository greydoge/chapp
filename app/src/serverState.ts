export type ServerChannels = Record<string, string>;

export function renameServerEntries(
  servers: string[],
  activeChannelsByServer: ServerChannels,
  currentServer: string,
  nextServer: string,
  currentChannel: string,
) {
  const nextServers = servers.map((server) => (server === currentServer ? nextServer : server));
  const nextMap = Object.fromEntries(
    Object.entries(activeChannelsByServer).map(([server, channel]) => [server === currentServer ? nextServer : server, channel]),
  );

  nextMap[nextServer] = currentChannel;

  return {
    servers: nextServers,
    activeChannelsByServer: nextMap,
  };
}

export function deleteServerEntries(
  servers: string[],
  activeChannelsByServer: ServerChannels,
  currentServer: string,
  fallbackServer: string | null,
  fallbackChannel: string,
) {
  const nextServers = servers.filter((server) => server !== currentServer);
  const nextMap = Object.fromEntries(Object.entries(activeChannelsByServer).filter(([server]) => server !== currentServer));

  if (fallbackServer) {
    nextMap[fallbackServer] = fallbackChannel;
  }

  return {
    servers: nextServers,
    activeChannelsByServer: nextMap,
  };
}
