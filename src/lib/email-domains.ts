export const ALLOWED_EMAIL_DOMAINS = [
  "@dms.eng.br",
  "@dmsmanutencao.com.br",
] as const;

export function isAllowedEmailDomain(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
}

export const ALLOWED_EMAIL_DOMAINS_ERROR = `Apenas e-mails com domínio ${ALLOWED_EMAIL_DOMAINS.join(
  " ou ",
)} são permitidos.`;
