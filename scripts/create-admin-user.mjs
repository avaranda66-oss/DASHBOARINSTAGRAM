import { scryptSync, randomBytes } from 'crypto';

const SUPABASE_URL = 'https://nhmvempqyawzjqnsjjbu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? 'Admin';

if (!email || !password) {
    console.error('Uso: node create-admin-user.mjs <email> <senha> <nome>');
    process.exit(1);
}

// Hash igual ao auth.ts
function hashPassword(pwd) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(pwd, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

const password_hash = hashPassword(password);

const res = await fetch(`${SUPABASE_URL}/rest/v1/allowed_users`, {
    method: 'POST',
    headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ email: email.toLowerCase(), password_hash, name, role: 'admin', active: true }),
});

if (res.ok || res.status === 201 || res.status === 200) {
    console.log(`✓ Usuário criado: ${email}`);
} else {
    const err = await res.text();
    console.error('Erro:', res.status, err);
}
