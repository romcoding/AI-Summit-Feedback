import crypto from 'crypto';

// SignalR configuration retrieved from environment variables
const endpoint = process.env.SIGNALR_ENDPOINT!;
const accessKey = process.env.SIGNALR_ACCESS_KEY!;
const hubName = process.env.SIGNALR_HUB_NAME || 'askai';

// Generate a signed JWT for authenticating with the SignalR Service REST API
function generateAccessToken(audience: string, userId?: string, expiresInSeconds = 3600): string {
  const key = Buffer.from(accessKey, 'base64');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: any = {
    aud: audience,
    exp: now + expiresInSeconds,
    iat: now,
  };
  if (userId) {
    payload.sub = userId;
  }
  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const unsigned = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  const signature = crypto
    .createHmac('sha256', key)
    .update(unsigned)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${unsigned}.${signature}`;
}

// Get client credentials (URL and access token) for negotiating a SignalR connection
export function getClientCredentials(userId?: string): { url: string; accessToken: string } {
  const audience = `${endpoint}/client/?hub=${hubName}`;
  const accessToken = generateAccessToken(audience, userId);
  return { url: `${endpoint}`, accessToken };
}

// Broadcast a message to all clients in a session (group)
export async function broadcastToSession(sessionId: string, event: string, data: any): Promise<void> {
  const audience = `${endpoint}/api/v1/hubs/${hubName}`;
  const token = generateAccessToken(audience);
  const url = `${endpoint}/api/v1/hubs/${hubName}/groups/${sessionId}/:send?api-version=2023-10-02`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target: event, arguments: [data] }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to broadcast to session ${sessionId}: ${res.status} ${text}`);
  }
}

// Broadcast a message to a specific user
export async function broadcastToUser(userId: string, event: string, data: any): Promise<void> {
  const audience = `${endpoint}/api/v1/hubs/${hubName}`;
  const token = generateAccessToken(audience);
  const url = `${endpoint}/api/v1/hubs/${hubName}/users/${userId}/:send?api-version=2023-10-02`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target: event, arguments: [data] }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to broadcast to user ${userId}: ${res.status} ${text}`);
  }
}
