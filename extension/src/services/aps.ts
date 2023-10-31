import { APSManifest } from "../types";

export async function getModelManifest(
  urn: string,
  token: string
): Promise<{ data: APSManifest; error?: string } | undefined> {
  const headers = new Headers();
  headers.append("Authorization", token);
  headers.append("Access-Control-Allow-Origin", "*");

  const requestOptions = {
    method: "GET",
    headers: headers,
  };

  const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`;
  const res = await fetch(url, requestOptions);
  const data = await res.json();

  if (res.status != 200) {
    const error = data.errorCode;
    return { data, error };
  }

  return { data };
}

export async function getUserInfo(token: string) {
  const url = `https://api.userprofile.autodesk.com/userinfo`;

  const headers = new Headers();
  headers.append("Authorization", token);
  headers.append("Content-Type", "application/json");

  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  const data = await res.json();
  return data;
}
