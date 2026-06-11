export function hideCredentials(value = '') {
  try {
    const url = new URL(value);
    if (url.username || url.password) {
      url.username = '***';
      url.password = '';
    }
    for (const key of [...url.searchParams.keys()]) {
      if (/(token|password|passwd|secret|key|auth|credential)/i.test(key)) {
        url.searchParams.set(key, '***');
      }
    }
    return url.toString();
  } catch {
    return String(value).replace(/:\/\/[^/@]+@/, '://***@');
  }
}
