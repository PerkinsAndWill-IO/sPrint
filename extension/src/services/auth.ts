async function validate(
  redirectURL: string
): Promise<{ access_token: string; refresh_token: string }> {
  const url = redirectURL.split("?code=");

  const data = new URLSearchParams();
  data.append("grant_type", "authorization_code");
  data.append("code", url[1]);
  data.append("redirect_uri", url[0]);

  const res = await fetch(
    "https://developer.api.autodesk.com/authentication/v2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${getCredentials()}`,
      },
      body: data.toString(),
    }
  );

  const json = await res.json();
  return json;
}

export async function refreshToken() {
  const url = "https://developer.api.autodesk.com/authentication/v2/token";
  const { refresh_token } = await chrome.storage.local.get(["refresh_token"]);

  if (!refresh_token) return;

  const data = new URLSearchParams();
  data.append("grant_type", "refresh_token");
  data.append("refresh_token", refresh_token);
  data.append("scope", "data:read");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${getCredentials()}`,
    },
    body: data.toString(),
  });

  const json = await res.json();
  return json;
}

async function authorize() {
  const redirectURL = chrome.identity.getRedirectURL("oauth/callback/");

  let authURL =
    "https://developer.api.autodesk.com/authentication/v2/authorize";

  authURL += `?response_type=code`;
  authURL += `&client_id=${import.meta.env.VITE_APS_CLIENT_ID}`;
  authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
  authURL += `&scope=data:read`;

  console.log("redirectURL", redirectURL);
  console.log("authURL", authURL);

  return await chrome.identity.launchWebAuthFlow({
    interactive: true,
    url: authURL,
  });
}

//developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=AKAGTyBAdO0avtOzwUAvHDViTdY7VSKT&redirect_uri=https%3A%2F%2Fjhejkkfapdbmpfkjhdddjaegbiocolpl.chromiumapp.org%2Foauth%2Fcallback%2F&scope=data:read

export async function getAccessToken() {
  const url = await authorize();
  console.log(url);

  if (!url) return;
  return validate(url);
}

const getCredentials = () =>
  btoa(
    import.meta.env.VITE_APS_CLIENT_ID +
      ":" +
      import.meta.env.VITE_APS_CLIENT_SECRET
  );
