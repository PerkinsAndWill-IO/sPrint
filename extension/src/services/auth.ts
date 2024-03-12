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

//https://auth.autodesk.com/as/kOAJJqMpBa/resume/as/authorization.ping?opentoken=T1RLAQJLC1-bQZ6_YMtWVmZTUFaot7LFIBBEtE60eDYKpYrnvZXHrirhAADQWVtyeu5yt2fBvF99cQ0LCp0lxN9lgK_Pvcw28SOb8gAI-PkZ4l_Q_51LGtyJxWu1ntZ4G0UCBOA1MsbuYiD2Vy-rncKBRYzWb8-rqa4NPlINd2CskSYijKbaKl1ZawpjRQP50S1l5f_s4bBHgDPW0a3oKrapA9hsnFkRx8_TyYU1JgDAEP5Zhgack9vA0ybV29QeSjS9MIYs7ztiv1bnNpYod_GVrS9aNjCgfCFb_zxKB08LfhVv4DAgUP0I06nmo6QJIOCXZ2Bjvtr-Yp6eZQ**&lang=en
async function authorize() {
  const redirectURL = chrome.identity.getRedirectURL("oauth/callback/");

  let authURL =
    "https://developer.api.autodesk.com/authentication/v2/authorize";

  authURL += `?response_type=code`;
  authURL += `&client_id=${import.meta.env.VITE_APS_CLIENT_ID}`;
  authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
  authURL += `&scope=data:read`;

  console.log("redirectURL", redirectURL);
  console.log("clinet id", import.meta.env.VITE_APS_CLIENT_ID);
  console.log("authURL", authURL);

  return await chrome.identity.launchWebAuthFlow({
    interactive: true,
    url: authURL,
  });
}

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

// https://developer.api.autodesk.com/authentication/v2/authorize?
// response_type=code
// &client_id=AKAGTyBAdO0avtOzwUAvHDViTdY7VSKT
// &redirect_uri=https%3A%2F%2Flhicbhifoceknmkdmnddkealibininnc.chromiumapp.org%2Foauth%2Fcallback%2F
// &scope=data:read

// https://developer.api.autodesk.com/authentication/v2/authorize?
// response_type=code
// &client_id=AKAGTyBAdO0avtOzwUAvHDViTdY7VSKT
// &redirect_uri=https%3A%2F%2Fnapcofanfhdeefchiihhlpnldbnbljpa.chromiumapp.org%2Foauth%2Fcallback%2F
// &scope=data:read
