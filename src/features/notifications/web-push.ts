export async function subscribeWebPush(
  _uid: string,
  _requestPermission = false,
): Promise<'unsupported' | 'blocked' | 'not-requested' | 'failed' | 'enabled'> {
  return 'unsupported';
}

export async function unsubscribeWebPush(_uid: string): Promise<void> {}
