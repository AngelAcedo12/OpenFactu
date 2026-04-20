/**
 * Endpoints de correo por tenant.
 *
 *   GET  /api/email/config       — lee la config SMTP (sin password en claro)
 *   PUT  /api/email/config       — actualiza la config SMTP
 *   POST /api/email/verify       — prueba la conexión al SMTP (no envía)
 *   POST /api/email/test         — envía un email de prueba a una dirección
 *   POST /api/email/send         — envía correo arbitrario (uso interno)
 *
 * Requieren ADMIN o SUPERUSER (el contenido SMTP es sensible).
 */

import { Router } from 'express';
import {
  readConfig,
  writeConfig,
  verifyConnection,
  sendMail,
  type EmailConfig,
} from '../core/email/Mailer';
import { enqueueMail, mailQueue } from '../core/email/MailQueue';

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPERUSER') {
    return res.status(403).json({ error: 'Requiere ADMIN o SUPERUSER' });
  }
  next();
}

function redactPassword(cfg: EmailConfig): Omit<EmailConfig, 'password'> & { passwordSet: boolean } {
  const { password, ...rest } = cfg;
  return { ...rest, passwordSet: Boolean(password) };
}

router.use(requireAdmin);

router.get('/config', async (req: any, res) => {
  try {
    const cfg = await readConfig(req.tenantClient);
    res.json(redactPassword(cfg));
  } catch (e: any) {
    console.error('[Email.getConfig]', e);
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

router.put('/config', async (req: any, res) => {
  try {
    const patch = { ...req.body };
    // Si el cliente manda password vacía (porque solo escribe el resto), no
    // sobreescribimos la existente. Para limpiarla, el UI debe enviar
    // explícitamente `"clearPassword": true`.
    if (patch.clearPassword === true) patch.password = '';
    else if (patch.password === '' || patch.password === undefined) delete patch.password;
    delete patch.clearPassword;
    // Coerciones suaves.
    if (typeof patch.port === 'string') patch.port = Number(patch.port);
    if (typeof patch.secure === 'string') patch.secure = patch.secure === 'true';
    if (typeof patch.enabled === 'string') patch.enabled = patch.enabled === 'true';
    const next = await writeConfig(req.tenantClient, patch);
    res.json(redactPassword(next));
  } catch (e: any) {
    console.error('[Email.putConfig]', e);
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

router.post('/verify', async (req: any, res) => {
  // Si el body trae un override (el UI manda el formulario al vuelo), lo
  // usamos. Si no, cae a la config guardada en systemConfigs.
  const override = req.body && typeof req.body === 'object' ? { ...req.body } : undefined;
  if (override) {
    if (typeof override.port === 'string') override.port = Number(override.port);
    if (typeof override.secure === 'string') override.secure = override.secure === 'true';
  }
  const r = await verifyConnection(req.tenantClient, override);
  res.json(r);
});

/**
 * POST /api/email/test — el test SÍ se envía de forma sincrónica porque el
 * usuario está mirando el UI y quiere saber si funciona ahora mismo. Los
 * envíos reales del ERP van por la cola (/send).
 */
router.post('/test', async (req: any, res) => {
  const to = (req.body?.to as string) || req.user?.email;
  if (!to) return res.status(400).json({ error: 'Falta destinatario' });
  try {
    const result = await sendMail(req.tenantId, req.tenantClient, {
      to,
      subject: 'Keirost — prueba de correo',
      text:
        'Si recibes este mensaje, la configuración SMTP de tu empresa en Keirost ERP ' +
        'funciona correctamente.',
      html: `
        <div style="font-family:'DM Sans',system-ui,sans-serif;padding:24px;max-width:520px;background:#FAFBFC;border:1px solid #E2E8F0;border-radius:4px;">
          <h2 style="margin:0 0 12px 0;color:#0A1628;font-family:'Syne',sans-serif;font-weight:700;">
            Correo de prueba
          </h2>
          <p style="color:#2D3A4A;line-height:1.6;">
            Si ves este mensaje, la configuración SMTP de tu empresa en
            <strong style="color:#0D9488;">Keirost ERP</strong> funciona correctamente.
          </p>
          <p style="color:#94A3B8;font-size:12px;margin-top:24px;font-family:'DM Mono',monospace;">
            Enviado a las ${new Date().toLocaleString('es-ES')}.
          </p>
        </div>`,
    });
    res.json(result);
  } catch (e: any) {
    console.error('[Email.test]', e);
    res.status(500).json({ error: e?.message || 'Error al enviar' });
  }
});

/**
 * POST /api/email/send — envío DESATENDIDO. Enfila en la cola y responde
 * inmediatamente con el jobId. El SMTP se negocia en background con
 * reintentos exponenciales si falla (hasta 5 intentos). Consulta el estado
 * con GET /api/email/queue/:id.
 */
router.post('/send', async (req: any, res) => {
  try {
    const { to, subject, text, html, cc, bcc } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'Faltan to/subject' });
    const id = enqueueMail(req.tenantId, { to, subject, text, html, cc, bcc });
    res.status(202).json({ id, status: 'queued' });
  } catch (e: any) {
    console.error('[Email.send]', e);
    res.status(500).json({ error: e?.message || 'Error al encolar' });
  }
});

/**
 * GET /api/email/queue/:id — estado de un envío encolado.
 */
router.get('/queue/:id', (req: any, res) => {
  const item = mailQueue.peek(req.params.id);
  if (!item) return res.status(404).json({ error: 'Job no encontrado' });
  // No exponemos el body del email en el status — solo metadatos.
  const { input, ...meta } = item;
  res.json({ ...meta, to: input.to, subject: input.subject });
});

/**
 * GET /api/email/queue — snapshot de toda la cola (solo items de este tenant).
 */
router.get('/queue', (req: any, res) => {
  const all = mailQueue.list();
  res.json(all.filter((i) => i.tenantId === req.tenantId));
});

export default router;
