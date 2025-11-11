import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { generateAccessToken, signalRConfig } from "../signalr";

const negotiate: AzureFunction = async function (context: Context, req: HttpRequest) {
  const userId = (req.query?.userId as string) || (req.body?.userId as string) || undefined;
  const { endpoint, hubName } = signalRConfig;
  const url = `${endpoint}/client/?hub=${hubName}`;
  const accessToken = generateAccessToken(url, userId);
  context.res = {
    headers: {
      "Content-Type": "application/json"
    },
    body: {
      url,
      accessToken
    }
  };
};

export default negotiate;
