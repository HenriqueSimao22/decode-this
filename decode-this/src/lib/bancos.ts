// Lista de bancos suportados para cartões de crédito, com cor padrão.
export type Banco = { codigo: string; nome: string; cor: string; inicial: string };

export const BANCOS: Banco[] = [
  { codigo: "nubank", nome: "Nubank", cor: "#820ad1", inicial: "N" },
  { codigo: "itau", nome: "Itaú", cor: "#ec7000", inicial: "I" },
  { codigo: "bradesco", nome: "Bradesco", cor: "#cc092f", inicial: "B" },
  { codigo: "santander", nome: "Santander", cor: "#ec0000", inicial: "S" },
  { codigo: "bb", nome: "Banco do Brasil", cor: "#fae128", inicial: "BB" },
  { codigo: "caixa", nome: "Caixa Econômica", cor: "#005ca9", inicial: "C" },
  { codigo: "inter", nome: "Inter", cor: "#ff7a00", inicial: "I" },
  { codigo: "c6", nome: "C6 Bank", cor: "#242424", inicial: "C6" },
  { codigo: "btg", nome: "BTG Pactual", cor: "#0a2540", inicial: "B" },
  { codigo: "xp", nome: "XP Investimentos", cor: "#000000", inicial: "XP" },
  { codigo: "sicoob", nome: "Sicoob", cor: "#003641", inicial: "S" },
  { codigo: "sicredi", nome: "Sicredi", cor: "#3fa535", inicial: "S" },
  { codigo: "banrisul", nome: "Banrisul", cor: "#00549f", inicial: "B" },
  { codigo: "safra", nome: "Safra", cor: "#003a70", inicial: "S" },
  { codigo: "pagbank", nome: "PagBank / PagSeguro", cor: "#00a868", inicial: "P" },
  { codigo: "mercadopago", nome: "Mercado Pago", cor: "#00b1ea", inicial: "MP" },
  { codigo: "picpay", nome: "PicPay", cor: "#21c25e", inicial: "P" },
  { codigo: "neon", nome: "Neon", cor: "#00d1ff", inicial: "N" },
  { codigo: "next", nome: "Next", cor: "#00ff5f", inicial: "N" },
  { codigo: "original", nome: "Original", cor: "#00ae4d", inicial: "O" },
  { codigo: "will", nome: "Will Bank", cor: "#ffcb00", inicial: "W" },
  { codigo: "digio", nome: "Digio", cor: "#0067b1", inicial: "D" },
  { codigo: "ame", nome: "Ame Digital", cor: "#ff0037", inicial: "A" },
  { codigo: "trigg", nome: "Trigg", cor: "#f6a800", inicial: "T" },
  { codigo: "porto", nome: "Porto Seguro", cor: "#003da5", inicial: "P" },
  { codigo: "credicard", nome: "Credicard", cor: "#e60000", inicial: "C" },
  { codigo: "amex", nome: "American Express", cor: "#006fcf", inicial: "AX" },
  { codigo: "renner", nome: "Renner", cor: "#e30613", inicial: "R" },
  { codigo: "riachuelo", nome: "Riachuelo", cor: "#e50019", inicial: "R" },
  { codigo: "ca", nome: "C&A", cor: "#f39200", inicial: "C&A" },
  { codigo: "marisa", nome: "Marisa", cor: "#e5007e", inicial: "M" },
  { codigo: "havan", nome: "Havan", cor: "#ffce00", inicial: "H" },
  { codigo: "latam", nome: "Latam Pass Itaú", cor: "#e30613", inicial: "L" },
  { codigo: "smiles", nome: "Smiles Bradesco", cor: "#ff5000", inicial: "S" },
  { codigo: "localiza", nome: "Localiza", cor: "#00a651", inicial: "L" },
  { codigo: "bmg", nome: "BMG", cor: "#f57c00", inicial: "B" },
  { codigo: "pan", nome: "Banco Pan", cor: "#00aeef", inicial: "P" },
  { codigo: "cetelem", nome: "Cetelem", cor: "#00915a", inicial: "C" },
  { codigo: "genial", nome: "Genial", cor: "#0e1e3f", inicial: "G" },
  { codigo: "modalmais", nome: "Modalmais", cor: "#ff5b00", inicial: "M" },
  { codigo: "outro", nome: "Outro", cor: "#6366f1", inicial: "?" },
];

export const BANDEIRAS = [
  { codigo: "visa", nome: "Visa" },
  { codigo: "mastercard", nome: "Mastercard" },
  { codigo: "elo", nome: "Elo" },
  { codigo: "amex", nome: "American Express" },
  { codigo: "hipercard", nome: "Hipercard" },
  { codigo: "diners", nome: "Diners" },
  { codigo: "outro", nome: "Outro" },
];

export function getBanco(codigo: string): Banco {
  return BANCOS.find((b) => b.codigo === codigo) ?? BANCOS[BANCOS.length - 1];
}