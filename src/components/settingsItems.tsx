import { Activity, BellRing, Building2, CalendarClock, CalendarCheck, CreditCard, DatabaseBackup, FileLock2, Gauge, KeyRound, Mail, MessageCircle, Plug, Settings2, ShieldCheck, SlidersHorizontal, Smartphone, UserCircle, type LucideIcon } from "lucide-react";
import { canManageRules, canManageSystem, type Actor } from "@/lib/permissions";

export type SettingsItem = {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  tone: "blue" | "cyan" | "green" | "amber" | "violet" | "slate" | "rose";
  href?: string; // sem href = "em breve"
  group: string;
  can: (a: Actor) => boolean;
  who: string;
  inShell?: boolean; // tem página própria dentro de /configuracoes
};

const all = () => true;

export const SETTINGS_ITEMS: SettingsItem[] = [
  { key: "perfil", group: "Minha conta", label: "Perfil e senha", desc: "Contatos, troca de senha e seus dados (LGPD).", icon: UserCircle, tone: "blue", href: "/perfil", can: all, who: "Todos" },
  { key: "notif", group: "Minha conta", label: "Minhas notificações", desc: "Escolha o que receber no sistema e por e-mail.", icon: BellRing, tone: "cyan", can: all, who: "Todos" },
  { key: "sessoes", group: "Minha conta", label: "Sessões e dispositivos", desc: "Veja onde você está logado e encerre acessos.", icon: Smartphone, tone: "green", can: all, who: "Todos" },

  { key: "regras", group: "Regras e controle", label: "Regras de lançamento", desc: "Anexo obrigatório, campos exigidos, limites de valor e prazo retroativo.", icon: SlidersHorizontal, tone: "blue", href: "/configuracoes/regras", can: canManageRules, who: "Administrador · Financeiro", inShell: true },
  { key: "fechamento", group: "Regras e controle", label: "Fechamento do mês", desc: "Bloqueie lançamentos de meses já conferidos e reabra se preciso.", icon: CalendarCheck, tone: "violet", href: "/configuracoes/fechamento", can: canManageRules, who: "Administrador · Financeiro", inShell: true },
  { key: "alertas", group: "Regras e controle", label: "Alertas e limites", desc: "Aviso quando um colaborador passa de um valor no mês.", icon: Gauge, tone: "amber", can: canManageRules, who: "Administrador · Financeiro" },

  { key: "empresa", group: "Empresa e cadastros", label: "Dados da empresa", desc: "Nome, CNPJ e fuso horário usados nos relatórios e nas datas.", icon: Building2, tone: "slate", href: "/configuracoes/empresa", can: canManageSystem, who: "Administrador", inShell: true },
  { key: "cadastros", group: "Empresa e cadastros", label: "Cadastros básicos", desc: "Setores, categorias, centros de custo e projetos usados nas notas.", icon: Settings2, tone: "cyan", href: "/cadastros", can: canManageRules, who: "Administrador · Financeiro" },
  { key: "cartoes", group: "Empresa e cadastros", label: "Cartões corporativos", desc: "Cadastre cada cartão (final, titular, limite) e acompanhe o uso do mês.", icon: CreditCard, tone: "green", href: "/configuracoes/cartoes", can: canManageRules, who: "Administrador · Financeiro", inShell: true },

  { key: "emails", group: "Comunicação", label: "E-mails e avisos", desc: "Quem é avisado a cada nota lançada, revisada ou pendente.", icon: Mail, tone: "blue", can: canManageSystem, who: "Administrador" },
  { key: "resumos", group: "Comunicação", label: "Resumos automáticos", desc: "Relatório semanal ou mensal por e-mail para o financeiro.", icon: CalendarClock, tone: "violet", can: canManageRules, who: "Administrador · Financeiro" },
  { key: "whatsapp", group: "Comunicação", label: "WhatsApp", desc: "Avisos pelo WhatsApp (requer provedor contratado).", icon: MessageCircle, tone: "green", can: canManageSystem, who: "Administrador" },

  { key: "acesso", group: "Segurança e privacidade", label: "Política de acesso", desc: "Tamanho da senha, tentativas, bloqueio e tempo de sessão.", icon: KeyRound, tone: "rose", href: "/configuracoes/acesso", can: canManageSystem, who: "Administrador", inShell: true },
  { key: "2fa", group: "Segurança e privacidade", label: "Verificação em 2 etapas", desc: "Código no aplicativo autenticador para administrador e financeiro.", icon: ShieldCheck, tone: "green", can: canManageSystem, who: "Administrador" },
  { key: "lgpd", group: "Segurança e privacidade", label: "Privacidade e LGPD", desc: "Texto da política, versão aceita e retenção dos documentos.", icon: FileLock2, tone: "slate", can: canManageSystem, who: "Administrador" },

  { key: "api", group: "Integrações e dados", label: "API e tokens", desc: "Acesso de leitura para contabilidade, ERP e planilhas.", icon: Plug, tone: "cyan", href: "/integracoes", can: canManageSystem, who: "Administrador" },
  { key: "backup", group: "Integrações e dados", label: "Exportação e backup", desc: "Baixe todas as notas e anexos em um pacote.", icon: DatabaseBackup, tone: "blue", can: canManageSystem, who: "Administrador" },
  { key: "status", group: "Integrações e dados", label: "Status do sistema", desc: "Versão, banco, e-mail configurado e espaço usado pelos anexos.", icon: Activity, tone: "amber", href: "/configuracoes/status", can: canManageSystem, who: "Administrador", inShell: true },
];

export const TONE_BG: Record<SettingsItem["tone"], string> = {
  blue: "bg-brand-600", cyan: "bg-cyan-500", green: "bg-emerald-500", amber: "bg-amber-500", violet: "bg-violet-500", slate: "bg-slate-600", rose: "bg-rose-500",
};
