// Integración con Google como proveedor externo de autenticación (OAuth 2.0 / OpenID Connect).
//
// Flujo "authorization code" (el habitual en aplicaciones con servidor):
//   1. La app redirige al usuario a Google con su client_id, la URL de vuelta y un "state" aleatorio.
//   2. El usuario elige su cuenta y Google vuelve a la URL de vuelta con un código de un solo uso.
//   3. El SERVIDOR cambia ese código por un token (con el client_secret, que nunca llega al navegador)
//      y con el token pide a Google el email del usuario y si está verificado.
// La lógica (userService.loginWithOAuth) decide después qué hacer con ese email.

const AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * @param {object} options
 * @param {string} options.clientId GOOGLE_CLIENT_ID
 * @param {string} options.clientSecret GOOGLE_CLIENT_SECRET
 * @param {typeof fetch} [options.fetch] Las pruebas pasan uno falso para no llamar a Google
 */
function createGoogleOAuthClient({ clientId, clientSecret, fetch = globalThis.fetch }) {
  if (!clientId || !clientSecret) throw new Error('createGoogleOAuthClient necesita clientId y clientSecret');

  /** URL de Google a la que se manda al usuario para que inicie sesión. */
  function getAuthorizationUrl({ redirectUri, state }) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `${AUTHORIZATION_URL}?${params}`;
  }

  /**
   * Cambia el código de autorización por los datos del usuario.
   * @returns {Promise<{ subject: string, email: string, emailVerified: boolean }>}
   */
  async function getProfile({ code, redirectUri }) {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      throw new Error(`Google ha rechazado el código de autorización (HTTP ${tokenResponse.status})`);
    }
    const { access_token: accessToken } = await tokenResponse.json();

    const userInfoResponse = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!userInfoResponse.ok) {
      throw new Error(`No se han podido leer los datos del usuario de Google (HTTP ${userInfoResponse.status})`);
    }
    const info = await userInfoResponse.json();
    return { subject: info.sub, email: info.email, emailVerified: info.email_verified === true };
  }

  return { provider: 'google', name: 'Google', getAuthorizationUrl, getProfile };
}

/** Proveedores OAuth configurados (solo los que tienen sus variables de entorno). */
function createOAuthClients(oauthConfig) {
  return {
    google: oauthConfig?.google ? createGoogleOAuthClient(oauthConfig.google) : null,
  };
}

module.exports = { createGoogleOAuthClient, createOAuthClients };
