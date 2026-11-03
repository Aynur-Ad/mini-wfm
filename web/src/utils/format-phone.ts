// Görüntüleme biçimi API'ye gönderilen ham 10 haneli değeri değiştirmez.
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  if (!/^5[0-9]{9}$/.test(phone)) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`;
}