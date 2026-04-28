type IncomingMessageNotificationInput = {
  activeChannel: string;
  author: string;
  channel: string;
  notificationsMuted: boolean;
  selfName: string;
  visibilityState: DocumentVisibilityState;
};

export function shouldNotifyIncomingMessage(input: IncomingMessageNotificationInput) {
  if (input.notificationsMuted) return false;
  if (input.author === input.selfName) return false;
  return input.visibilityState === "hidden" || input.channel !== input.activeChannel;
}

