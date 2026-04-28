#!/usr/bin/env node
// Genera certificado autofirmado para `npm run dev:https` si no existe.
// Detecta las IPs LAN del equipo y las incluye como SAN para que el móvil
// pueda conectar sin warnings extra.
//
// Destino por defecto: /tmp/vite-certs (override con VITE_CERT_DIR).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CERT_DIR = process.env.VITE_CERT_DIR || '/tmp/vite-certs';
const keyPath = path.join(CERT_DIR, 'key.pem');
const certPath = path.join(CERT_DIR, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log(`[certs] ya existen en ${CERT_DIR}`);
  process.exit(0);
}

fs.mkdirSync(CERT_DIR, { recursive: true });

const ips = new Set(['127.0.0.1']);
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const i of ifaces || []) {
    if (i.family === 'IPv4' && !i.internal) ips.add(i.address);
  }
}
const san =
  [...ips].map((ip) => `IP:${ip}`).join(',') + ',DNS:localhost';

console.log(`[certs] generando en ${CERT_DIR} con SAN=${san}`);

execSync(
  `openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes ` +
    `-keyout "${keyPath}" -out "${certPath}" ` +
    `-subj "/CN=keirost-dev" -addext "subjectAltName=${san}"`,
  { stdio: 'inherit' },
);

console.log('[certs] listo');
