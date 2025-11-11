import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { getClientCredentials } from '../signalr';

const negotiate: AzureFunction = async function (context: Context, req: HttpRequest) {
  // The user ID (author token) is passed via query or body for personalized connections
  const userId = (req.query?.userId as string) || (req.body?.userId as string) || undefined;
  const { url, accessToken } = getClientCredentials(userId);
  context.res = {
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      url,
      accessToken,
    },
  };
};

export default negotiate;
